import core from "./game-core.js";

(function startLetterReveal() {
  "use strict";

  const STORAGE_PREFIX = "letter-reveal-v1:";
  const STARTING_CREDITS = 10;
  const FREE_REVEALS = 3;

  const elements = {
    answerLine: document.querySelector("#answerLine"),
    clearButton: document.querySelector("#clearButton"),
    closeButton: document.querySelector("#closeButton"),
    creditsValue: document.querySelector("#creditsValue"),
    feedback: document.querySelector("#feedback"),
    finalScore: document.querySelector("#finalScore"),
    guessBoard: document.querySelector("#guessBoard"),
    guessButton: document.querySelector("#guessButton"),
    guessForm: document.querySelector("#guessForm"),
    hintText: document.querySelector("#hintText"),
    knownBoard: document.querySelector("#knownBoard"),
    knownValue: document.querySelector("#knownValue"),
    puzzleNumber: document.querySelector("#puzzleNumber"),
    resultDialog: document.querySelector("#resultDialog"),
    revealButton: document.querySelector("#revealButton"),
    shareButton: document.querySelector("#shareButton")
  };

  let puzzleKey;
  let puzzleNumber;
  let puzzle;
  let answer;
  let wordLengths;
  let revealOrder;
  let state;
  let wrongGuess = false;

  function isValidPuzzle(candidate) {
    return candidate
      && typeof candidate.answer === "string"
      && typeof candidate.hint === "string"
      && core.normalizePhrase(candidate.answer).length === 10;
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.json();
  }

  async function loadPuzzle() {
    const puzzles = await loadJson(`puzzles.json?v=${encodeURIComponent(puzzleKey)}`);
    if (!Array.isArray(puzzles) || puzzles.length === 0 || puzzles.some((item) => !isValidPuzzle(item))) {
      throw new Error("The daily puzzle list is invalid.");
    }

    const fallback = puzzles[core.getPuzzleIndex(puzzleKey, puzzles.length)];
    try {
      const daily = await loadJson(`daily.json?v=${encodeURIComponent(puzzleKey)}`);
      if (daily.date === puzzleKey && isValidPuzzle(daily)) {
        return daily;
      }
    } catch (error) {
      // The deterministic fallback keeps the daily game available if the daily file is late.
    }
    return fallback;
  }

  function createFreshState() {
    const revealed = revealOrder.slice(0, FREE_REVEALS);
    const guess = Array(answer.length).fill("");
    revealed.forEach((index) => {
      guess[index] = answer[index];
    });
    return {
      answer,
      credits: STARTING_CREDITS,
      guess,
      revealed,
      solved: false
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${puzzleKey}`));
      if (!saved || saved.answer !== answer || !Array.isArray(saved.revealed) || !Array.isArray(saved.guess)) {
        return createFreshState();
      }

      const revealed = [...new Set(saved.revealed)]
        .filter((index) => Number.isInteger(index) && index >= 0 && index < answer.length);
      if (revealed.length < FREE_REVEALS) {
        return createFreshState();
      }

      const guess = Array.from({ length: answer.length }, (_, index) => {
        if (revealed.includes(index)) return answer[index];
        return String(saved.guess[index] || "").replace(/[^a-z]/gi, "").slice(0, 1).toUpperCase();
      });

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
      // The game still works when private browsing blocks storage.
    }
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
      tile.className = `letter-tile${isKnown ? " is-known" : ""}`;
      tile.textContent = isKnown ? answer[index] : "•";
      tile.setAttribute("aria-label", isKnown ? `Letter ${index + 1}: ${answer[index]}` : `Letter ${index + 1}: unknown`);
      return tile;
    });
  }

  function nextEditableIndex(fromIndex, direction = 1) {
    let index = fromIndex + direction;
    while (index >= 0 && index < answer.length) {
      if (!state.revealed.includes(index)) return index;
      index += direction;
    }
    return -1;
  }

  function focusGuess(index) {
    const input = elements.guessBoard.querySelector(`[data-index="${index}"]`);
    if (input) {
      input.focus();
      input.select();
    }
  }

  function renderGuessBoard() {
    createWordRows(elements.guessBoard, (index) => {
      const input = document.createElement("input");
      const isGiven = state.revealed.includes(index);
      input.className = `guess-tile${isGiven ? " is-given" : ""}`;
      input.dataset.index = String(index);
      input.value = isGiven ? answer[index] : state.guess[index];
      input.maxLength = 1;
      input.inputMode = "text";
      input.autocomplete = "off";
      input.autocapitalize = "characters";
      input.spellcheck = false;
      input.readOnly = isGiven || state.solved;
      input.setAttribute("aria-label", `Guess letter ${index + 1}`);
      if (wrongGuess && input.value && input.value !== answer[index]) {
        input.classList.add("is-wrong");
      }

      input.addEventListener("focus", () => input.select());
      input.addEventListener("input", () => {
        const letter = input.value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase();
        input.value = letter;
        state.guess[index] = letter;
        wrongGuess = false;
        elements.feedback.textContent = "";
        saveState();
        if (letter) {
          const next = nextEditableIndex(index);
          if (next >= 0) focusGuess(next);
        }
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value) {
          const previous = nextEditableIndex(index, -1);
          if (previous >= 0) {
            event.preventDefault();
            state.guess[previous] = "";
            saveState();
            focusGuess(previous);
          }
        }
        if (event.key === "ArrowLeft") {
          const previous = nextEditableIndex(index, -1);
          if (previous >= 0) focusGuess(previous);
        }
        if (event.key === "ArrowRight") {
          const next = nextEditableIndex(index);
          if (next >= 0) focusGuess(next);
        }
      });
      return input;
    });
  }

  function render() {
    elements.creditsValue.textContent = String(state.credits);
    elements.knownValue.textContent = String(state.revealed.length);
    elements.hintText.textContent = puzzle.hint;
    elements.puzzleNumber.textContent = `Daily puzzle #${puzzleNumber}`;
    elements.revealButton.disabled = state.solved || state.credits <= 0 || state.revealed.length >= answer.length;
    elements.guessButton.disabled = state.solved;
    elements.clearButton.disabled = state.solved;
    renderKnownBoard();
    renderGuessBoard();
  }

  function showResult() {
    elements.answerLine.textContent = puzzle.answer;
    elements.finalScore.textContent = String(state.credits);
    if (!elements.resultDialog.open) {
      if (typeof elements.resultDialog.showModal === "function") {
        elements.resultDialog.showModal();
      } else {
        elements.resultDialog.setAttribute("open", "");
      }
    }
  }

  function finishGame() {
    state.solved = true;
    state.guess = answer.split("");
    state.revealed = Array.from({ length: answer.length }, (_, index) => index);
    saveState();
    render();
    window.setTimeout(showResult, 260);
  }

  function revealLetter() {
    if (state.solved || state.credits <= 0) return;
    const revealed = new Set(state.revealed);
    const next = revealOrder.find((index) => !revealed.has(index));
    if (next === undefined) return;

    state.credits -= 1;
    state.revealed.push(next);
    state.guess[next] = answer[next];
    wrongGuess = false;
    elements.feedback.textContent = `Letter ${next + 1} is ${answer[next]}.`;
    saveState();
    render();

    if (state.revealed.length === answer.length) {
      finishGame();
    }
  }

  function checkGuess(event) {
    event.preventDefault();
    if (state.solved) return;
    const entered = state.guess.join("");
    if (entered.length < answer.length) {
      elements.feedback.textContent = "Fill every box before checking your answer.";
      const firstEmpty = state.guess.findIndex((letter, index) => !letter && !state.revealed.includes(index));
      if (firstEmpty >= 0) focusGuess(firstEmpty);
      return;
    }
    if (entered === answer) {
      elements.feedback.textContent = "";
      finishGame();
      return;
    }
    wrongGuess = true;
    elements.feedback.textContent = "Not quite. Change the red letters and try again.";
    renderGuessBoard();
  }

  function clearGuess() {
    if (state.solved) return;
    state.guess = state.guess.map((letter, index) => (
      state.revealed.includes(index) ? answer[index] : ""
    ));
    wrongGuess = false;
    elements.feedback.textContent = "";
    saveState();
    renderGuessBoard();
    const firstEditable = nextEditableIndex(-1);
    if (firstEditable >= 0) focusGuess(firstEditable);
  }

  async function shareResult() {
    const text = `Letter Reveal #${puzzleNumber}\n${state.credits}/10 credits left\nhttps://dexterbain.com/letterreveal/`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Letter Reveal", text });
      } else {
        await navigator.clipboard.writeText(text);
        elements.shareButton.textContent = "Copied!";
        window.setTimeout(() => { elements.shareButton.textContent = "Share result"; }, 1400);
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        elements.shareButton.textContent = "Could not share";
        window.setTimeout(() => { elements.shareButton.textContent = "Share result"; }, 1400);
      }
    }
  }

  function closeResult() {
    if (typeof elements.resultDialog.close === "function") {
      elements.resultDialog.close();
    } else {
      elements.resultDialog.removeAttribute("open");
    }
  }

  function bindEvents() {
    elements.revealButton.addEventListener("click", revealLetter);
    elements.guessForm.addEventListener("submit", checkGuess);
    elements.clearButton.addEventListener("click", clearGuess);
    elements.shareButton.addEventListener("click", shareResult);
    elements.closeButton.addEventListener("click", closeResult);
    window.setInterval(() => {
      if (core.getPuzzleKey(new Date()) !== puzzleKey) window.location.reload();
    }, 60_000);
  }

  async function init() {
    puzzleKey = core.getPuzzleKey(new Date());
    puzzleNumber = core.getPuzzleNumber(puzzleKey);
    puzzle = await loadPuzzle();
    answer = core.normalizePhrase(puzzle.answer);
    wordLengths = core.getWordLengths(puzzle.answer);
    revealOrder = core.getRevealOrder(puzzleKey, answer);
    state = loadState();
    bindEvents();
    render();
    if (state.solved) window.setTimeout(showResult, 180);
  }

  init().catch(() => {
    elements.hintText.textContent = "Today’s puzzle could not load. Please refresh and try again.";
    elements.revealButton.disabled = true;
    elements.guessButton.disabled = true;
  });
}());
