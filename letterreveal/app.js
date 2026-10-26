import core from "./game-core.js";

(function startLetterReveal() {
  "use strict";

  const STORAGE_PREFIX = "letter-reveal-v2:";
  const STARTING_CREDITS = 10;
  const FREE_REVEALS = 2;
  const RESET_CODE = "CENA";

  const elements = {
    creditsValue: document.querySelector("#creditsValue"),
    guessBoard: document.querySelector("#guessBoard"),
    guessStatus: document.querySelector("#guessStatus"),
    hintText: document.querySelector("#hintText"),
    keypad: document.querySelector("#keypad"),
    knownBoard: document.querySelector("#knownBoard"),
    knownValue: document.querySelector("#knownValue"),
    revealButton: document.querySelector("#revealButton")
  };

  let puzzleKey;
  let puzzle;
  let answer;
  let wordLengths;
  let revealOrder;
  let state;
  let activeIndex = -1;
  let newlyRevealed = -1;
  let resetSequence = "";
  let wrongPositions = new Set();

  function isValidPuzzle(candidate) {
    return candidate
      && typeof candidate.answer === "string"
      && typeof candidate.hint === "string"
      && core.normalizePhrase(candidate.answer).length === 10;
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }

  async function loadPuzzle() {
    const puzzles = await loadJson(`puzzles.json?v=${encodeURIComponent(puzzleKey)}`);
    if (!Array.isArray(puzzles) || !puzzles.length || puzzles.some((item) => !isValidPuzzle(item))) {
      throw new Error("The puzzle list is invalid.");
    }

    const fallback = puzzles[core.getPuzzleIndex(puzzleKey, puzzles.length)];
    try {
      const daily = await loadJson(`daily.json?v=${encodeURIComponent(puzzleKey)}`);
      if (daily.date === puzzleKey && isValidPuzzle(daily)) return daily;
    } catch (error) {
      // The deterministic fallback keeps the puzzle available if the daily file is late.
    }
    return fallback;
  }

  function createFreshState() {
    const revealed = revealOrder.slice(0, FREE_REVEALS);
    const guess = Array(answer.length).fill("");
    revealed.forEach((index) => { guess[index] = answer[index]; });
    return { answer, credits: STARTING_CREDITS, guess, revealed, solved: false };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${puzzleKey}`));
      if (!saved || saved.answer !== answer || !Array.isArray(saved.guess) || !Array.isArray(saved.revealed)) {
        return createFreshState();
      }

      const revealed = [...new Set(saved.revealed)]
        .filter((index) => Number.isInteger(index) && index >= 0 && index < answer.length);
      if (revealed.length < FREE_REVEALS) return createFreshState();

      const guess = Array.from({ length: answer.length }, (_, index) => (
        revealed.includes(index)
          ? answer[index]
          : String(saved.guess[index] || "").replace(/[^a-z]/gi, "").slice(0, 1).toUpperCase()
      ));

      return {
        answer,
        credits: Math.max(0, Math.min(STARTING_CREDITS, Number(saved.credits) || 0)),
        guess,
        revealed,
        solved: Boolean(saved.solved)
      };
    } catch (error) {
      return createFreshState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${puzzleKey}`, JSON.stringify(state));
    } catch (error) {
      // The game remains playable if storage is unavailable.
    }
  }

  function editablePositions() {
    return Array.from({ length: answer.length }, (_, index) => index)
      .filter((index) => !state.revealed.includes(index));
  }

  function firstEmptyPosition() {
    return editablePositions().find((index) => !state.guess[index]) ?? editablePositions()[0] ?? -1;
  }

  function nextEmptyPosition(afterIndex) {
    const positions = editablePositions();
    const start = Math.max(0, positions.indexOf(afterIndex) + 1);
    return positions.slice(start).find((index) => !state.guess[index])
      ?? positions.slice(0, start).find((index) => !state.guess[index])
      ?? afterIndex;
  }

  function createWordRows(container, createTile) {
    container.replaceChildren();
    let letterIndex = 0;
    wordLengths.forEach((length) => {
      const word = document.createElement("div");
      word.className = "word-row";
      for (let offset = 0; offset < length; offset += 1) {
        word.append(createTile(letterIndex));
        letterIndex += 1;
      }
      container.append(word);
    });
  }

  function renderKnownBoard() {
    const revealed = new Set(state.revealed);
    createWordRows(elements.knownBoard, (index) => {
      const tile = document.createElement("span");
      const isKnown = revealed.has(index) || state.solved;
      tile.className = `letter-tile ${isKnown ? "is-known" : "is-unknown"}${index === newlyRevealed ? " is-new" : ""}`;
      tile.textContent = isKnown ? answer[index] : "•";
      tile.setAttribute("aria-label", isKnown ? `Letter ${index + 1}: ${answer[index]}` : `Letter ${index + 1}: unknown`);
      return tile;
    });
  }

  function renderGuessBoard() {
    createWordRows(elements.guessBoard, (index) => {
      const tile = document.createElement("button");
      const isGiven = state.revealed.includes(index);
      tile.type = "button";
      tile.className = "guess-tile";
      tile.textContent = state.guess[index] || "";
      tile.dataset.index = String(index);
      tile.setAttribute("aria-label", `Guess letter ${index + 1}${state.guess[index] ? `: ${state.guess[index]}` : ""}`);

      if (isGiven) tile.classList.add("is-given");
      if (!state.solved && !isGiven && index === activeIndex) tile.classList.add("is-active");
      if (wrongPositions.has(index)) tile.classList.add("is-wrong");
      if (state.solved) tile.classList.add("is-correct");

      tile.disabled = isGiven || state.solved;
      if (!tile.disabled) {
        tile.addEventListener("click", () => {
          activeIndex = index;
          wrongPositions.clear();
          setStatus("");
          renderGuessBoard();
        });
      }
      return tile;
    });
  }

  function setStatus(message, className = "") {
    elements.guessStatus.textContent = message;
    elements.guessStatus.className = className;
  }

  function render() {
    elements.hintText.textContent = puzzle.hint;
    elements.knownValue.textContent = `${state.revealed.length} / 10`;
    elements.revealButton.disabled = state.solved || state.credits <= 0 || state.revealed.length >= answer.length;
    elements.revealButton.querySelector("span").textContent = state.solved ? "Score" : "Reveal letter";
    elements.creditsValue.textContent = state.solved ? `${state.credits} credits` : `${state.credits} left`;
    elements.keypad.querySelectorAll("button").forEach((key) => { key.disabled = false; });
    if (state.solved) setStatus("Solved", "is-win");
    renderKnownBoard();
    renderGuessBoard();
    newlyRevealed = -1;
  }

  function finishGame() {
    state.solved = true;
    state.guess = answer.split("");
    state.revealed = Array.from({ length: answer.length }, (_, index) => index);
    wrongPositions.clear();
    saveState();
    render();
  }

  function checkCompletedGuess() {
    if (state.guess.some((letter) => !letter)) return false;
    if (state.guess.join("") === answer) {
      finishGame();
      return true;
    }

    wrongPositions = new Set(
      state.guess.map((letter, index) => (letter !== answer[index] ? index : -1)).filter((index) => index >= 0)
    );
    activeIndex = [...wrongPositions][0] ?? firstEmptyPosition();
    setStatus("Try again", "is-wrong");
    renderGuessBoard();
    return false;
  }

  function resetPuzzle() {
    state = createFreshState();
    activeIndex = firstEmptyPosition();
    newlyRevealed = -1;
    resetSequence = "";
    wrongPositions.clear();
    setStatus("");
    saveState();
    render();
  }

  function trackResetCode(letter) {
    resetSequence = `${resetSequence}${letter}`.slice(-RESET_CODE.length);
    if (resetSequence !== RESET_CODE) return false;
    resetPuzzle();
    return true;
  }

  function enterLetter(letter) {
    if (!/^[A-Z]$/.test(letter)) return;
    if (trackResetCode(letter)) return;
    if (state.solved) return;
    if (activeIndex < 0 || state.revealed.includes(activeIndex)) activeIndex = firstEmptyPosition();
    if (activeIndex < 0) return;

    state.guess[activeIndex] = letter;
    wrongPositions.clear();
    setStatus("");
    const enteredIndex = activeIndex;
    activeIndex = nextEmptyPosition(enteredIndex);
    saveState();
    renderGuessBoard();
    checkCompletedGuess();
  }

  function deleteLetter() {
    resetSequence = "";
    if (state.solved) return;
    const positions = editablePositions();
    if (!positions.length) return;
    if (!positions.includes(activeIndex)) activeIndex = positions[positions.length - 1];

    if (state.guess[activeIndex]) {
      state.guess[activeIndex] = "";
    } else {
      const currentPosition = positions.indexOf(activeIndex);
      const earlier = [...positions.slice(0, currentPosition)].reverse().find((index) => state.guess[index]);
      const fallback = [...positions].reverse().find((index) => state.guess[index]);
      const target = earlier ?? fallback;
      if (target !== undefined) {
        activeIndex = target;
        state.guess[target] = "";
      }
    }

    wrongPositions.clear();
    setStatus("");
    saveState();
    renderGuessBoard();
  }

  function revealLetter() {
    if (state.solved || state.credits <= 0) return;
    const revealed = new Set(state.revealed);
    const next = revealOrder.find((index) => !revealed.has(index));
    if (next === undefined) return;

    state.credits -= 1;
    state.revealed.push(next);
    state.guess[next] = answer[next];
    newlyRevealed = next;
    wrongPositions.clear();
    setStatus("");
    activeIndex = firstEmptyPosition();
    saveState();

    if (state.revealed.length === answer.length || state.guess.join("") === answer) {
      finishGame();
    } else {
      render();
    }
  }

  function bindEvents() {
    elements.revealButton.addEventListener("click", revealLetter);
    elements.keypad.addEventListener("click", (event) => {
      const key = event.target.closest("button[data-key]")?.dataset.key;
      if (!key) return;
      if (key === "DELETE") deleteLetter();
      else enterLetter(key);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteLetter();
      } else if (/^[a-z]$/i.test(event.key)) {
        enterLetter(event.key.toUpperCase());
      }
    });
    window.setInterval(() => {
      if (core.getPuzzleKey(new Date()) !== puzzleKey) window.location.reload();
    }, 60_000);
  }

  async function init() {
    puzzleKey = core.getPuzzleKey(new Date());
    puzzle = await loadPuzzle();
    answer = core.normalizePhrase(puzzle.answer);
    wordLengths = core.getWordLengths(puzzle.answer);
    revealOrder = core.getRevealOrder(puzzleKey, answer);
    state = loadState();
    activeIndex = state.solved ? -1 : firstEmptyPosition();
    bindEvents();
    render();
  }

  init().catch(() => {
    elements.hintText.textContent = "Refresh to load today’s puzzle.";
    elements.revealButton.disabled = true;
    elements.keypad.querySelectorAll("button").forEach((key) => { key.disabled = true; });
  });
}());
