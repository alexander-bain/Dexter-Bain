const ROUND_NAMES = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinals",
  "Semifinals",
  "Final",
];

const ROUND_POINTS = [1, 2, 4, 8, 16, 32, 64];
const LOCK_AT = new Date("2026-08-30T15:00:00Z");
const STORAGE_KEY = "dexter-usopen-2026-bracket-v1";

const state = {
  data: { men: null, women: null },
  meta: { displayName: "", title: "My 2026 US Open Bracket", scope: "both" },
  picks: { men: {}, women: {} },
  activeDivision: "men",
  round: 1,
  started: false,
  submitted: false,
  readOnly: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimer;
let saveTimer;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function isLocked() {
  return Date.now() >= LOCK_AT.getTime();
}

function visibleDivisions() {
  if (state.meta.scope === "both") return ["men", "women"];
  return [state.meta.scope];
}

function playerByPosition(division, position) {
  return state.data[division]?.players.find((player) => player.drawPosition === Number(position)) || null;
}

function pickKey(round, matchIndex) {
  return `${round}-${matchIndex}`;
}

function matchCount(round) {
  return 2 ** (7 - round);
}

function participantsFor(division, round, matchIndex, picks = state.picks[division]) {
  if (round === 1) {
    return [
      playerByPosition(division, (matchIndex - 1) * 2 + 1),
      playerByPosition(division, (matchIndex - 1) * 2 + 2),
    ];
  }

  const firstWinner = picks[pickKey(round - 1, matchIndex * 2 - 1)];
  const secondWinner = picks[pickKey(round - 1, matchIndex * 2)];
  return [playerByPosition(division, firstWinner), playerByPosition(division, secondWinner)];
}

function normalizePicks(division, picks) {
  for (let round = 2; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const key = pickKey(round, matchIndex);
      if (!picks[key]) continue;
      const allowed = participantsFor(division, round, matchIndex, picks)
        .filter(Boolean)
        .map((player) => player.drawPosition);
      if (!allowed.includes(Number(picks[key]))) delete picks[key];
    }
  }
  return picks;
}

function numberOfPicks(division) {
  return Object.keys(state.picks[division]).length;
}

function requiredPicks() {
  return visibleDivisions().length * 127;
}

function completedPicks() {
  return visibleDivisions().reduce((total, division) => total + numberOfPicks(division), 0);
}

function championFor(division) {
  return playerByPosition(division, state.picks[division][pickKey(7, 1)]);
}

function saveDraft() {
  if (state.readOnly) return;
  const saveState = $("#save-state");
  saveState.classList.add("is-saving");
  saveState.lastChild.textContent = " Saving…";
  const payload = {
    meta: state.meta,
    picks: state.picks,
    activeDivision: state.activeDivision,
    round: state.round,
    started: state.started,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState.classList.remove("is-saving");
    saveState.lastChild.textContent = " Saved on this device";
  }, 320);
}

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.started || !saved.meta || !saved.picks) return false;
    state.meta = { ...state.meta, ...saved.meta };
    state.picks = {
      men: normalizePicks("men", { ...(saved.picks.men || {}) }),
      women: normalizePicks("women", { ...(saved.picks.women || {}) }),
    };
    state.activeDivision = visibleDivisions().includes(saved.activeDivision)
      ? saved.activeDivision
      : visibleDivisions()[0];
    state.round = Math.min(7, Math.max(1, Number(saved.round) || 1));
    state.started = true;
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function encodeSharePayload() {
  const compactPicks = {};
  for (const division of visibleDivisions()) {
    compactPicks[division[0]] = [];
    for (let round = 1; round <= 7; round += 1) {
      for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
        compactPicks[division[0]].push(Number(state.picks[division][pickKey(round, matchIndex)]) || 0);
      }
    }
  }
  const payload = JSON.stringify({
    v: 1,
    n: state.meta.displayName,
    t: state.meta.title,
    s: state.meta.scope,
    p: compactPicks,
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function expandCompactPicks(values = []) {
  const picks = {};
  let cursor = 0;
  for (let round = 1; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const value = Number(values[cursor]);
      if (value) picks[pickKey(round, matchIndex)] = value;
      cursor += 1;
    }
  }
  return picks;
}

function loadSharedBracket() {
  if (!location.hash.startsWith("#bracket=")) return false;
  try {
    let encoded = location.hash.slice("#bracket=".length).replaceAll("-", "+").replaceAll("_", "/");
    encoded += "=".repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (payload.v !== 1 || !["men", "women", "both"].includes(payload.s)) throw new Error("Invalid bracket");
    state.meta = {
      displayName: String(payload.n || "Bracket creator").slice(0, 40),
      title: String(payload.t || "2026 US Open Bracket").slice(0, 80),
      scope: payload.s,
    };
    state.picks = {
      men: normalizePicks("men", expandCompactPicks(payload.p?.m)),
      women: normalizePicks("women", expandCompactPicks(payload.p?.w)),
    };
    state.activeDivision = visibleDivisions()[0];
    state.round = 1;
    state.started = true;
    state.submitted = true;
    state.readOnly = true;
    return true;
  } catch {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    showToast("That share link is not valid.");
    return false;
  }
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  $$('[data-view-link]').forEach((button) => button.classList.toggle("is-active", button.dataset.viewLink === name));
  $("#site-nav").classList.remove("is-open");
  $("#menu-button").setAttribute("aria-expanded", "false");
  if (name === "create" && state.started) showBuilder();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function makePlayerButton(player, selectedPosition, division, round, matchIndex, slot) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "player-button";

  if (!player) {
    button.disabled = true;
    button.innerHTML = `<span class="player-name">Winner of Match ${matchIndex * 2 - (slot === 0 ? 1 : 0)}</span><span class="country">TBD</span>`;
    return button;
  }

  const name = document.createElement("span");
  name.className = `player-name${player.entryType === "tbd" ? " tbd-label" : ""}`;
  if (player.seed) {
    const seed = document.createElement("span");
    seed.className = "seed";
    seed.textContent = player.seed;
    name.append(seed);
  }
  name.append(document.createTextNode(player.name));

  const country = document.createElement("span");
  country.className = "country";
  country.textContent = player.countryCode || (player.entryType === "tbd" ? "TBD" : "—");

  button.append(name, country);
  button.classList.toggle("is-selected", Number(selectedPosition) === player.drawPosition);
  button.setAttribute(
    "aria-label",
    `${Number(selectedPosition) === player.drawPosition ? "Selected: " : "Pick "}${player.seed ? `seed ${player.seed} ` : ""}${player.name}`,
  );
  button.disabled = state.readOnly || isLocked();
  button.addEventListener("click", () => selectPlayer(division, round, matchIndex, player.drawPosition));
  return button;
}

function renderRound() {
  const division = state.activeDivision;
  const round = state.round;
  const grid = $("#round-grid");
  grid.replaceChildren();
  $("#round-label").textContent = `Round ${round} of 7 · ${division === "men" ? "Men's" : "Women's"} draw`;
  $("#round-name").textContent = ROUND_NAMES[round - 1];
  $("#previous-round").disabled = round === 1;
  $("#previous-round-bottom").disabled = round === 1;
  $("#next-round").disabled = round === 7;
  $("#next-round-bottom").disabled = round === 7;
  $("#next-round-bottom").textContent = round === 7 ? "Final round" : "Next round →";

  for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
    const card = document.createElement("article");
    card.className = "match-card";
    card.setAttribute("aria-label", `${ROUND_NAMES[round - 1]} match ${matchIndex}`);

    const number = document.createElement("span");
    number.className = "match-number";
    number.textContent = String(matchIndex).padStart(2, "0");

    const options = document.createElement("div");
    options.className = "player-options";
    const players = participantsFor(division, round, matchIndex);
    const selectedPosition = state.picks[division][pickKey(round, matchIndex)];
    players.forEach((player, slot) => options.append(makePlayerButton(player, selectedPosition, division, round, matchIndex, slot)));
    card.append(number, options);
    grid.append(card);
  }

  renderProgress();
}

function renderProgress() {
  const completed = completedPicks();
  const required = requiredPicks();
  const percentage = Math.round((completed / required) * 100);
  $("#progress-copy").textContent = `${completed} of ${required} picks complete`;
  $("#progress-percent").textContent = `${percentage}%`;
  $("#progress-bar").style.width = `${percentage}%`;
}

function renderDivisionTabs() {
  const tabs = $("#division-tabs");
  tabs.replaceChildren();
  for (const division of visibleDivisions()) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.textContent = division === "men" ? "Men's draw" : "Women's draw";
    button.setAttribute("aria-selected", String(state.activeDivision === division));
    button.addEventListener("click", () => {
      state.activeDivision = division;
      state.round = 1;
      renderDivisionTabs();
      renderRound();
      saveDraft();
    });
    tabs.append(button);
  }
}

function showBuilder() {
  $("#setup-card").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#builder").hidden = false;
  $("#builder-title").textContent = state.meta.title;
  $("#builder-byline").textContent = `By ${state.meta.displayName}`;
  $("#new-bracket").hidden = state.readOnly;
  $("#save-state").lastChild.textContent = state.readOnly
    ? " Shared bracket · read only"
    : isLocked()
      ? " Brackets are locked"
      : " Saved on this device";
  renderDivisionTabs();
  renderRound();
}

function selectPlayer(division, round, matchIndex, position) {
  if (state.readOnly || isLocked()) return;
  const key = pickKey(round, matchIndex);
  const before = state.picks[division];
  const trial = { ...before };
  if (Number(trial[key]) === Number(position)) delete trial[key];
  else trial[key] = position;
  normalizePicks(division, trial);

  const cleared = Object.keys(before).filter((existingKey) => existingKey !== key && before[existingKey] && !trial[existingKey]).length;
  if (cleared >= 3 && !window.confirm(`Changing this pick will clear ${cleared} later picks that depend on it. Continue?`)) return;

  state.picks[division] = trial;
  renderRound();
  saveDraft();

  const currentRoundComplete = Array.from({ length: matchCount(round) }, (_, index) => pickKey(round, index + 1))
    .every((roundKey) => state.picks[division][roundKey]);
  if (currentRoundComplete && round < 7) showToast(`${ROUND_NAMES[round - 1]} complete. The next round is ready.`);
}

function changeRound(direction) {
  state.round = Math.min(7, Math.max(1, state.round + direction));
  renderRound();
  saveDraft();
  $("#round-grid").scrollIntoView({ behavior: "smooth", block: "start" });
}

function summaryArticle(label, value) {
  const article = document.createElement("article");
  const heading = document.createElement("span");
  const strong = document.createElement("strong");
  heading.textContent = label;
  strong.textContent = value;
  article.append(heading, strong);
  return article;
}

function showReview() {
  $("#builder").hidden = true;
  $("#success-card").hidden = true;
  $("#submission-card").hidden = false;
  const summary = $("#summary-grid");
  summary.replaceChildren();
  const complete = completedPicks();
  const required = requiredPicks();
  summary.append(summaryArticle("Completed picks", `${complete} / ${required}`));
  summary.append(summaryArticle("Missing picks", String(required - complete)));
  for (const division of visibleDivisions()) {
    summary.append(summaryArticle(`${division === "men" ? "Men's" : "Women's"} champion`, championFor(division)?.name || "Not selected"));
  }
  const ready = complete === required;
  $("#submission-title").textContent = ready ? "Every pick is complete" : "Your bracket needs more picks";
  $("#submission-note").textContent = ready
    ? "Create a compact public link containing this exact bracket. It will open read-only on any device."
    : "Return to the bracket and complete every required match before creating a share link.";
  $("#submit-bracket").disabled = !ready || state.readOnly;
  $("#keep-editing").textContent = state.readOnly ? "View bracket" : "Keep editing";
}

function submitBracket() {
  if (completedPicks() !== requiredPicks()) return;
  const encoded = encodeSharePayload();
  const url = `${location.origin}${location.pathname}#bracket=${encoded}`;
  state.submitted = true;
  $("#builder").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = false;
  $("#share-url").value = url;
  saveDraft();
  history.replaceState(null, "", `#bracket=${encoded}`);
}

async function copyShareLink() {
  const input = $("#share-url");
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand("copy");
  }
  $("#copy-share-link").textContent = "Copied";
  showToast("Share link copied.");
  setTimeout(() => { $("#copy-share-link").textContent = "Copy link"; }, 1800);
}

function resetBracket() {
  if (state.started && completedPicks() > 0 && !window.confirm("Start a new bracket and remove this saved draft from this device?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.meta = { displayName: "", title: "My 2026 US Open Bracket", scope: "both" };
  state.picks = { men: {}, women: {} };
  state.activeDivision = "men";
  state.round = 1;
  state.started = false;
  state.submitted = false;
  state.readOnly = false;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  $("#builder").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#setup-card").hidden = false;
  $("#bracket-setup").reset();
  $("#bracket-setup input[value='both']").checked = true;
}

function updateCountdown() {
  const countdown = $("#countdown");
  const remaining = LOCK_AT.getTime() - Date.now();
  if (remaining <= 0) {
    countdown.textContent = "Locked";
    return;
  }
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  countdown.textContent = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
}

function bindEvents() {
  $$('[data-view-link]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showView(button.dataset.viewLink);
    });
  });

  $("#menu-button").addEventListener("click", () => {
    const open = $("#site-nav").classList.toggle("is-open");
    $("#menu-button").setAttribute("aria-expanded", String(open));
  });

  $("#bracket-setup").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.meta = {
      displayName: String(form.get("displayName") || "").trim(),
      title: String(form.get("bracketTitle") || "").trim() || "My 2026 US Open Bracket",
      scope: String(form.get("scope") || "both"),
    };
    if (state.meta.displayName.length < 2) return;
    state.activeDivision = visibleDivisions()[0];
    state.started = true;
    showBuilder();
    saveDraft();
  });

  $("#previous-round").addEventListener("click", () => changeRound(-1));
  $("#previous-round-bottom").addEventListener("click", () => changeRound(-1));
  $("#next-round").addEventListener("click", () => changeRound(1));
  $("#next-round-bottom").addEventListener("click", () => changeRound(1));
  $("#review-bracket").addEventListener("click", showReview);
  $("#keep-editing").addEventListener("click", showBuilder);
  $("#submit-bracket").addEventListener("click", submitBracket);
  $("#copy-share-link").addEventListener("click", copyShareLink);
  $("#new-bracket").addEventListener("click", resetBracket);
  $("#edit-after-submit").addEventListener("click", () => {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    state.submitted = false;
    showBuilder();
  });
}

async function initialize() {
  bindEvents();
  updateCountdown();
  setInterval(updateCountdown, 60000);

  try {
    const [menResponse, womenResponse] = await Promise.all([
      fetch("./data/men.json"),
      fetch("./data/women.json"),
    ]);
    if (!menResponse.ok || !womenResponse.ok) throw new Error("Draw files unavailable");
    const [men, women] = await Promise.all([menResponse.json(), womenResponse.json()]);
    if (men.players?.length !== 128 || women.players?.length !== 128) throw new Error("Draw validation failed");
    state.data.men = men;
    state.data.women = women;
    const placeholders = [...men.players, ...women.players].filter((player) => player.entryType === "tbd").length;
    $("#verified-count").textContent = men.players.length + women.players.length;
    $("#placeholder-count").textContent = placeholders;

    if (loadSharedBracket()) {
      showView("create");
      showBuilder();
      showToast("Opened a shared read-only bracket.");
      return;
    }

    if (loadDraft()) {
      $("#display-name").value = state.meta.displayName;
      $("#bracket-title").value = state.meta.title;
      const savedScope = $(`#bracket-setup input[value="${state.meta.scope}"]`);
      if (savedScope) savedScope.checked = true;
      $("#bracket-setup button[type='submit']").firstChild.textContent = "Resume saved bracket ";
      showView("create");
      showBuilder();
      showToast("Your saved bracket is ready to continue.");
    }
  } catch (error) {
    console.error(error);
    $("#setup-card").innerHTML = `<div class="empty-state"><span aria-hidden="true">!</span><h3>The verified draw could not load</h3><p>Please refresh the page. No replacement players or invented matchups will be shown.</p></div>`;
  }
}

initialize();
