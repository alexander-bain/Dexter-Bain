/* One in a Million · game controller · release 2026-11-10-oiam-v2 */
(function () {
  "use strict";

  const STATE_KEY = "one-in-a-million-match-v1";
  const COLLECTION_KEY = "one-in-a-million-collection-v1";
  const SOUND_KEY = "one-in-a-million-sound-v1";
  const DICE_GLYPHS = ["", "1", "2", "3", "4", "5", "6"];
  const PLAYER_COLORS = ["#ff6a98", "#50dff5", "#ffe05b", "#a98aff", "#58d49c", "#ff984d"];
  const awards = window.OIAMRules.buildAwards();
  const awardsById = new Map(awards.map((award) => [award.id, award]));

  const setupView = document.querySelector("#setupView");
  const gameView = document.querySelector("#gameView");
  const playPanel = document.querySelector("#playPanel");
  const scoreboard = document.querySelector("#scoreboard");
  const historyList = document.querySelector("#historyList");
  const historyCount = document.querySelector("#historyCount");
  const collectionCount = document.querySelector("#collectionCount");
  const liveRegion = document.querySelector("#liveRegion");
  const toastElement = document.querySelector("#toast");

  let state = loadState();
  let draftPlayers = state && state.players ? state.players.map((player) => player.name) : ["Player 1", "Player 2"];
  let selectedDie = 0;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
  let audioContext = null;
  let toastTimer = 0;
  let revealToken = 0;
  const knownAwards = loadCollection();

  if (state && state.phase === "reveal") {
    state.phase = "multiplier";
    saveState();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
    })[character]);
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY));
      if (!parsed || !Array.isArray(parsed.players) || !parsed.players.length) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    if (!state) localStorage.removeItem(STATE_KEY);
    else localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function loadCollection() {
    try {
      const values = JSON.parse(localStorage.getItem(COLLECTION_KEY));
      return new Set(Array.isArray(values) ? values.filter((id) => awardsById.has(id)) : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveCollection() {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify([...knownAwards]));
    updateCollectionCount();
  }

  function updateCollectionCount() {
    collectionCount.textContent = knownAwards.size;
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastTimer = window.setTimeout(() => { toastElement.hidden = true; }, 2600);
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(() => { liveRegion.textContent = message; }, 30);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function tone(frequency, duration = 0.08, type = "sine", volume = 0.045, delay = 0) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch (error) {
      // Sound is optional; the game remains complete if a browser blocks audio.
    }
  }

  function playAwardSound(award) {
    const rank = ["common", "rare", "epic", "boss", "legendary", "millionaire"].indexOf(award.tier);
    tone(300 + rank * 105, 0.09 + rank * 0.018, rank >= 3 ? "triangle" : "sine", 0.04);
    if (rank >= 4) tone(450 + rank * 90, 0.14, "sine", 0.025, 0.055);
  }

  function celebration(big = false) {
    const layer = document.querySelector("#confettiLayer");
    const colors = ["#ff5d8f", "#ffe45e", "#3de4ff", "#b889ff", "#54d39d", "#ffffff"];
    const total = big ? 75 : 42;
    layer.replaceChildren();
    for (let index = 0; index < total; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--fall", `${1.9 + Math.random() * 1.5}s`);
      piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
      piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      layer.append(piece);
    }
    window.setTimeout(() => layer.replaceChildren(), 3900);
  }

  function currentPlayer() {
    return state.players[state.current];
  }

  function currentRound() {
    const turnsPlayed = state.players.reduce((total, player) => total + player.turns, 0);
    return Math.min(state.rounds, Math.floor(turnsPlayed / state.players.length) + 1);
  }

  function matchIsOver() {
    return state.players.every((player) => player.turns >= state.rounds);
  }

  function diceHTML(dice) {
    return dice.map((value) => DICE_GLYPHS[value]).join(" ");
  }

  function render() {
    updateCollectionCount();
    updateSoundButton();
    if (!state) {
      setupView.hidden = false;
      gameView.hidden = true;
      renderSetupPlayers();
      return;
    }
    setupView.hidden = true;
    gameView.hidden = false;
    renderScoreboard();
    renderHistory();
    renderPlayPanel();
  }

  function renderSetupPlayers() {
    const fields = document.querySelector("#playerFields");
    fields.innerHTML = draftPlayers.map((name, index) => `
      <label class="player-field">
        <span class="player-number">P${index + 1}</span>
        <span class="sr-only">Player ${index + 1} name</span>
        <input type="text" value="${escapeHTML(name)}" maxlength="18" autocomplete="off" data-player-name="${index}" />
        <button class="remove-player" type="button" data-remove-player="${index}" aria-label="Remove player ${index + 1}" ${draftPlayers.length <= 2 ? "hidden" : ""}>×</button>
      </label>`).join("");
    document.querySelector("#addPlayerButton").hidden = draftPlayers.length >= 6;

    fields.querySelectorAll("[data-player-name]").forEach((input) => {
      input.addEventListener("input", () => { draftPlayers[Number(input.dataset.playerName)] = input.value; });
    });
    fields.querySelectorAll("[data-remove-player]").forEach((button) => {
      button.addEventListener("click", () => {
        draftPlayers.splice(Number(button.dataset.removePlayer), 1);
        renderSetupPlayers();
      });
    });
  }

  function renderScoreboard() {
    scoreboard.innerHTML = state.players.map((player, index) => `
      <article class="score-card ${index === state.current && state.phase !== "finished" ? "is-active" : ""}" style="--player:${PLAYER_COLORS[index]}">
        <span class="score-avatar">${escapeHTML(player.name.slice(0, 1).toUpperCase())}</span>
        <span class="score-copy"><span class="score-name">${escapeHTML(player.name)}</span><span class="score-turns">${player.turns}/${state.rounds} turns</span></span>
        <strong class="score-points">${player.score.toLocaleString("en-US")}</strong>
      </article>`).join("");
  }

  function renderHistory() {
    historyCount.textContent = state.history.length;
    if (!state.history.length) {
      historyList.innerHTML = '<p class="empty-note">The first roll is waiting.</p>';
      return;
    }
    historyList.innerHTML = [...state.history].reverse().slice(0, 12).map((roll) => `
      <article class="history-item">
        <span class="history-player">${escapeHTML(roll.player)}</span>
        <span class="history-total">+${roll.total.toLocaleString("en-US")}</span>
        <span class="history-dice" aria-label="Dice ${roll.dice.join(", ")}">${diceHTML(roll.dice)} <small>×${roll.multiplier}</small></span>
      </article>`).join("");
  }

  function renderPlayPanel() {
    if (state.phase === "entry") renderEntry();
    else if (state.phase === "reveal" || state.phase === "multiplier") renderReveal();
    else if (state.phase === "final") renderFinal();
    else renderWinner();
  }

  function renderEntry() {
    const player = currentPlayer();
    selectedDie = Math.max(0, Math.min(selectedDie, 5));
    if (state.dice[selectedDie] != null && state.dice.includes(null)) selectedDie = state.dice.indexOf(null);
    playPanel.innerHTML = `
      <div class="turn-head">
        <div>
          <p class="turn-label">${escapeHTML(player.name)}’s turn</p>
          <h2>Roll six real dice.</h2>
          <p>Then record the results below, in any consistent order.</p>
        </div>
        <div class="round-badge"><div><strong>${currentRound()}/${state.rounds}</strong><span>ROUND</span></div></div>
      </div>
      <div class="dice-entry">
        <p class="entry-label">Tap a slot, then choose its number</p>
        <div class="dice-grid" role="group" aria-label="Six dice results">
          ${state.dice.map((value, index) => `
            <button class="die-slot ${value ? "is-filled" : ""} ${selectedDie === index ? "is-selected" : ""}" type="button" data-die-slot="${index}" data-position="${index + 1}" aria-label="Die ${index + 1}${value ? `: ${value}` : ": empty"}" aria-pressed="${selectedDie === index}">${value ? DICE_GLYPHS[value] : "?"}</button>
          `).join("")}
        </div>
        <div class="number-pad" aria-label="Choose a die number">
          ${[1,2,3,4,5,6].map((value) => `<button class="number-key" type="button" data-die-value="${value}" aria-label="Enter ${value}"><span class="number-key-value">${value}</span></button>`).join("")}
        </div>
        <div class="entry-actions">
          <button class="clear-button" type="button" id="clearDice">Clear</button>
          <button class="primary-button go-button" type="button" id="goButton" ${state.dice.some((value) => value == null) ? "disabled" : ""}>GO! <span aria-hidden="true">⚡</span></button>
        </div>
        <p class="keyboard-hint">Keyboard: 1–6 to enter · Backspace to erase · Enter to GO</p>
      </div>`;

    playPanel.querySelectorAll("[data-die-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedDie = Number(button.dataset.dieSlot);
        renderEntry();
      });
    });
    playPanel.querySelectorAll("[data-die-value]").forEach((button) => {
      button.addEventListener("click", () => setDieValue(Number(button.dataset.dieValue)));
    });
    document.querySelector("#clearDice").addEventListener("click", () => {
      state.dice = Array(6).fill(null);
      selectedDie = 0;
      saveState();
      renderEntry();
      tone(190, .06, "square", .025);
    });
    document.querySelector("#goButton").addEventListener("click", scoreRoll);
  }

  function setDieValue(value) {
    if (!state || state.phase !== "entry") return;
    state.dice[selectedDie] = value;
    tone(250 + value * 45, .055, "sine", .028);
    const nextEmpty = state.dice.findIndex((die, index) => die == null && index > selectedDie);
    if (nextEmpty >= 0) selectedDie = nextEmpty;
    else if (state.dice.includes(null)) selectedDie = state.dice.indexOf(null);
    else selectedDie = Math.min(5, selectedDie + 1);
    saveState();
    renderEntry();
  }

  function scoreRoll() {
    if (state.dice.some((value) => value == null)) {
      toast("Enter all six dice first.");
      return;
    }
    const matches = window.OIAMRules.analyze(state.dice, awards).sort((a, b) => a.points - b.points || b.matches - a.matches || a.id.localeCompare(b.id));
    state.matchIds = matches.map((award) => award.id);
    state.newIds = matches.filter((award) => !knownAwards.has(award.id)).map((award) => award.id);
    state.base = matches.reduce((total, award) => total + award.points, 0);
    for (const award of matches) knownAwards.add(award.id);
    saveCollection();
    state.phase = "reveal";
    saveState();
    renderScoreboard();
    renderReveal();
    announce(`${matches.length} discoveries found. Revealing now.`);
    runReveal();
  }

  function awardCardHTML(award, isNew, pending) {
    return `
      <article class="award-card ${pending ? "pending" : "revealed"}" data-award-card="${award.id}" data-tier="${award.tier}">
        <span class="award-emoji" aria-hidden="true">${award.emoji}</span>
        <div class="award-name">${escapeHTML(award.name)} ${isNew ? '<span class="new-tag">NEW</span>' : ""}</div>
        <div class="award-description">${escapeHTML(award.description)}</div>
        <div class="award-meta"><span>${award.tierLabel} · ${award.odds}</span><span class="award-points">+${award.points}</span></div>
      </article>`;
  }

  function renderReveal() {
    const matches = state.matchIds.map((id) => awardsById.get(id)).filter(Boolean);
    const isAnimating = state.phase === "reveal";
    const newIds = new Set(state.newIds || []);
    playPanel.innerHTML = `
      <div class="reveal-head">
        <div class="dice-strip" aria-label="Dice ${state.dice.join(", ")}">${state.dice.map((value) => `<span>${DICE_GLYPHS[value]}</span>`).join("")}</div>
        <h2>${isAnimating ? "Checking 200 discoveries…" : `${matches.length} discoveries!`}</h2>
        <p>${isAnimating ? "Every match stacks. The rarest reveals land last." : "Now roll one extra die for your multiplier."}</p>
        <div class="live-score"><strong id="liveBaseScore">${isAnimating ? 0 : state.base}</strong><span>BASE POINTS</span></div>
      </div>
      <div class="award-list">
        ${matches.map((award) => awardCardHTML(award, newIds.has(award.id), isAnimating)).join("")}
      </div>
      <section class="multiplier-stage" id="multiplierStage" ${isAnimating ? "hidden" : ""}>
        <h3>Roll one more real die 🎲</h3>
        <p>Enter what it lands on. Your whole base score gets multiplied.</p>
        <div class="multiplier-controls">
          <input class="multiplier-input" id="multiplierInput" type="number" inputmode="numeric" min="1" max="6" placeholder="× ?" aria-label="Multiplier from 1 to 6" />
          <button class="primary-button multiplier-submit" id="multiplierSubmit" type="button">REVEAL FINAL SCORE</button>
        </div>
        <div class="multiplier-quick" aria-label="Quick multiplier choices">
          ${[1,2,3,4,5,6].map((value) => `<button type="button" data-multiplier="${value}">×${value}</button>`).join("")}
        </div>
      </section>`;
    bindMultiplierControls();
  }

  async function runReveal() {
    const token = ++revealToken;
    const cards = [...playPanel.querySelectorAll("[data-award-card]")];
    const score = document.querySelector("#liveBaseScore");
    let total = 0;
    await wait(250);
    for (const card of cards) {
      if (token !== revealToken || !state || state.phase !== "reveal") return;
      const award = awardsById.get(card.dataset.awardCard);
      card.classList.remove("pending");
      card.classList.add("revealed");
      total += award.points;
      score.textContent = total;
      playAwardSound(award);
      if (award.tier === "legendary" || award.tier === "millionaire") celebration(false);
      await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 10 : 175 + award.points * 8);
    }
    if (token !== revealToken || !state || state.phase !== "reveal") return;
    state.phase = "multiplier";
    saveState();
    const stage = document.querySelector("#multiplierStage");
    stage.hidden = false;
    playPanel.querySelector(".reveal-head h2").textContent = `${cards.length} discoveries!`;
    playPanel.querySelector(".reveal-head p").textContent = "Now roll one extra die for your multiplier.";
    announce(`Reveal complete. Base score ${state.base}. Roll one die and enter the multiplier.`);
    tone(520, .12, "triangle", .035);
    stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.querySelector("#multiplierInput").focus({ preventScroll: true });
  }

  function bindMultiplierControls() {
    const input = document.querySelector("#multiplierInput");
    document.querySelectorAll("[data-multiplier]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.multiplier;
        tone(300 + Number(button.dataset.multiplier) * 55, .06, "sine", .028);
      });
    });
    document.querySelector("#multiplierSubmit").addEventListener("click", finishScore);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finishScore();
    });
  }

  function finishScore() {
    const input = document.querySelector("#multiplierInput");
    const multiplier = Number(input.value);
    if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 6) {
      toast("The multiplier die must be 1, 2, 3, 4, 5, or 6.");
      input.focus();
      return;
    }
    const player = currentPlayer();
    const total = state.base * multiplier;
    state.multiplier = multiplier;
    state.total = total;
    player.score += total;
    player.turns += 1;
    player.best = Math.max(player.best || 0, total);
    state.history.push({
      player: player.name,
      dice: [...state.dice],
      multiplier,
      base: state.base,
      total,
      discoveries: state.matchIds.length
    });
    state.phase = "final";
    saveState();
    render();
    celebration(multiplier === 6 || total >= 75);
    tone(420, .18, "triangle", .05);
    tone(590, .2, "triangle", .04, .09);
    tone(780, .24, "sine", .035, .18);
    announce(`${player.name} scores ${total} points.`);
  }

  function renderFinal() {
    const player = currentPlayer();
    playPanel.innerHTML = `
      <div class="final-card">
        <div class="final-inner">
          <div class="final-kicker">${escapeHTML(player.name)}’s finished score</div>
          <div class="final-dice" aria-label="Dice ${state.dice.join(", ")}">${diceHTML(state.dice)}</div>
          <div class="final-equation"><span>${state.base} base</span><span>×</span><b>${state.multiplier}</b></div>
          <p class="final-score">${state.total.toLocaleString("en-US")}</p>
          <p class="final-score-label">points</p>
          <p class="final-details">${state.matchIds.length} discoveries · ${state.newIds.length} new to your collection</p>
          <button class="primary-button" id="nextTurnButton" type="button">${matchIsOver() ? "SEE THE WINNER 🏆" : `PASS TO ${escapeHTML(state.players[(state.current + 1) % state.players.length].name.toUpperCase())} →`}</button>
        </div>
      </div>`;
    document.querySelector("#nextTurnButton").addEventListener("click", nextTurn);
  }

  function nextTurn() {
    if (matchIsOver()) {
      state.phase = "finished";
    } else {
      state.current = (state.current + 1) % state.players.length;
      state.phase = "entry";
      state.dice = Array(6).fill(null);
      state.matchIds = [];
      state.newIds = [];
      state.base = 0;
      state.multiplier = null;
      state.total = 0;
      selectedDie = 0;
    }
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderWinner() {
    const ranking = [...state.players].sort((a, b) => b.score - a.score || b.best - a.best);
    const topScore = ranking[0].score;
    const winners = ranking.filter((player) => player.score === topScore);
    const winnerText = winners.length > 1 ? `${winners.map((player) => player.name).join(" & ")} tie!` : `${winners[0].name} wins!`;
    playPanel.innerHTML = `
      <div class="winner-view">
        <div class="winner-crown" aria-hidden="true">👑</div>
        <p class="final-kicker">MATCH COMPLETE</p>
        <h2>${escapeHTML(winnerText)}</h2>
        <p>${topScore.toLocaleString("en-US")} points after ${state.rounds} turns each.</p>
        <div class="podium">
          ${ranking.map((player, index) => `
            <article class="podium-row">
              <span class="podium-place">${index + 1}</span>
              <span class="podium-name">${escapeHTML(player.name)}</span>
              <span class="podium-score">${player.score.toLocaleString("en-US")}</span>
            </article>`).join("")}
        </div>
        <button class="primary-button" id="playAgainButton" type="button">PLAY AGAIN 🎲</button>
      </div>`;
    document.querySelector("#playAgainButton").addEventListener("click", resetMatch);
  }

  function resetMatch() {
    revealToken += 1;
    if (state && state.players) draftPlayers = state.players.map((player) => player.name);
    state = null;
    localStorage.removeItem(STATE_KEY);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startMatch(event) {
    event.preventDefault();
    const names = draftPlayers.map((name) => name.trim());
    const blankIndex = names.findIndex((name) => !name);
    if (blankIndex >= 0) {
      toast(`Player ${blankIndex + 1} needs a name.`);
      document.querySelector(`[data-player-name="${blankIndex}"]`).focus();
      return;
    }
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
      toast("Give every player a different name.");
      return;
    }
    const rounds = Number(document.querySelector("#roundSelect").value);
    state = {
      version: 1,
      players: names.map((name) => ({ name, score: 0, turns: 0, best: 0 })),
      rounds,
      current: 0,
      phase: "entry",
      dice: Array(6).fill(null),
      matchIds: [],
      newIds: [],
      base: 0,
      multiplier: null,
      total: 0,
      history: []
    };
    saveState();
    render();
    tone(300, .08, "triangle", .035);
    tone(470, .12, "triangle", .03, .08);
  }

  function updateSoundButton() {
    const button = document.querySelector("#soundButton");
    button.textContent = soundEnabled ? "🔊" : "🔇";
    button.setAttribute("aria-pressed", String(soundEnabled));
    button.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    button.title = soundEnabled ? "Sound on" : "Sound off";
  }

  function showDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function renderRulebook() {
    const query = document.querySelector("#ruleSearch").value.trim().toLowerCase();
    const tier = document.querySelector("#tierFilter").value;
    const filtered = awards.filter((award) => {
      const matchesTier = tier === "all" || award.tier === tier;
      const haystack = `${award.name} ${award.description} ${award.group} ${award.tierLabel}`.toLowerCase();
      return matchesTier && (!query || haystack.includes(query));
    });
    document.querySelector("#ruleResultCount").textContent = `${filtered.length} ${filtered.length === 1 ? "discovery" : "discoveries"} shown · ${knownAwards.size} found`;
    document.querySelector("#rulebookList").innerHTML = filtered.map((award) => `
      <article class="rule-card ${knownAwards.has(award.id) ? "is-found" : ""}" data-tier="${award.tier}">
        <span class="rule-card-emoji">${award.emoji}</span>
        <h3>${escapeHTML(award.name)}</h3>
        <p>${escapeHTML(award.description)}</p>
        <div class="rule-card-meta"><span>${award.tierLabel} · ${award.points} pt${award.points === 1 ? "" : "s"}</span><span>${award.odds}</span></div>
        <span class="rule-card-group">${escapeHTML(award.group)} · ${knownAwards.has(award.id) ? "FOUND" : "NOT FOUND YET"}</span>
      </article>`).join("");
  }

  document.querySelector("#setupForm").addEventListener("submit", startMatch);
  document.querySelector("#addPlayerButton").addEventListener("click", () => {
    if (draftPlayers.length >= 6) return;
    draftPlayers.push(`Player ${draftPlayers.length + 1}`);
    renderSetupPlayers();
    document.querySelector(`[data-player-name="${draftPlayers.length - 1}"]`).select();
  });
  document.querySelector("#soundButton").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
    updateSoundButton();
    if (soundEnabled) tone(520, .1, "sine", .035);
  });
  document.querySelector("#howButton").addEventListener("click", () => showDialog(document.querySelector("#howDialog")));
  document.querySelector("#rulesButton").addEventListener("click", () => {
    renderRulebook();
    showDialog(document.querySelector("#rulesDialog"));
  });
  document.querySelector("#ruleSearch").addEventListener("input", renderRulebook);
  document.querySelector("#tierFilter").addEventListener("change", renderRulebook);
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(document.querySelector(`#${button.dataset.close}`)));
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); });
  });
  document.querySelector("#newMatchButton").addEventListener("click", () => {
    if (window.confirm("Start a new match? The current match scores will be cleared.")) resetMatch();
  });

  document.addEventListener("keydown", (event) => {
    if (!state || state.phase !== "entry" || document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (/^[1-6]$/.test(event.key)) {
      event.preventDefault();
      setDieValue(Number(event.key));
    } else if (event.key === "Backspace") {
      event.preventDefault();
      const filled = state.dice.map((value, index) => value ? index : -1).filter((index) => index >= 0);
      if (filled.length) {
        selectedDie = filled[filled.length - 1];
        state.dice[selectedDie] = null;
        saveState();
        renderEntry();
      }
    } else if (event.key === "Enter" && state.dice.every(Boolean)) {
      event.preventDefault();
      scoreRoll();
    }
  });

  renderRulebook();
  render();
})();
