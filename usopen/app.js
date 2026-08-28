const ROUND_NAMES = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinals",
  "Semifinals",
  "Final",
];

const ROUND_SHORT_NAMES = ["R128", "R64", "R32", "R16", "QF", "SF", "Final"];
const ROUND_POINTS = [1, 2, 4, 8, 16, 32, 64];
const LOCK_AT = new Date("2026-08-30T15:00:00Z");
const STORAGE_KEY = "dexter-usopen-2026-bracket-v1";
const CLOUD_API_URL = "https://dexter-bain.onrender.com";
const CLOUD_GAME_ID = "usopen-2026-brackets";
const CLOUD_RECORD_KIND = "usopen-bracket-v2";
const BASE_MATCH_PITCH = 104;
const MATCH_CARD_HEIGHT = 96;

const state = {
  data: { men: null, women: null },
  meta: { displayName: "", title: "My 2026 US Open Bracket", scope: "both" },
  picks: { men: {}, women: {} },
  activeDivision: "men",
  started: false,
  submitted: false,
  readOnly: false,
  entryId: "",
  completedAt: "",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimer;
let saveTimer;
let cloudSyncPromise;
let publicEntriesPromise;

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

function ratingForPlayer(player) {
  if (!player) return null;
  if (player.seed) return 1900 - 55 * Math.log2(Number(player.seed));
  const entryRatings = {
    direct: 1500,
    wildcard: 1475,
    tbd: 1450,
  };
  return entryRatings[player.entryType] || 1500;
}

function projectionFor(players) {
  if (!players[0] || !players[1]) return null;
  const firstRating = ratingForPlayer(players[0]);
  const secondRating = ratingForPlayer(players[1]);
  const rawFirst = 100 / (1 + 10 ** ((secondRating - firstRating) / 400));
  const first = Math.round(Math.min(95, Math.max(5, rawFirst)));
  return [first, 100 - first];
}

function upsetMultiplier(probability) {
  if (probability >= 45) return 1;
  if (probability >= 35) return 1.5;
  if (probability >= 25) return 2;
  if (probability >= 15) return 3;
  return 4;
}

function potentialPoints(round, probability) {
  return Math.round(ROUND_POINTS[round - 1] * upsetMultiplier(probability));
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

function selectedBracketStats() {
  let points = 0;
  let upsets = 0;
  for (const division of visibleDivisions()) {
    for (let round = 1; round <= 7; round += 1) {
      for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
        const selected = Number(state.picks[division][pickKey(round, matchIndex)]);
        if (!selected) continue;
        const players = participantsFor(division, round, matchIndex);
        const projection = projectionFor(players);
        const selectedIndex = players.findIndex((player) => player?.drawPosition === selected);
        if (!projection || selectedIndex < 0) continue;
        const probability = projection[selectedIndex];
        points += potentialPoints(round, probability);
        if (probability < 45) upsets += 1;
      }
    }
  }
  return { points, upsets };
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function bracketIdentitySource() {
  return JSON.stringify({
    n: state.meta.displayName,
    t: state.meta.title,
    s: state.meta.scope,
    p: state.picks,
  });
}

function ensureCompletionIdentity() {
  if (!state.entryId) {
    const source = bracketIdentitySource();
    state.entryId = `${stableHash(source)}-${stableHash([...source].reverse().join(""))}`;
  }
  if (!state.completedAt) state.completedAt = new Date().toISOString();
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
    started: state.started,
    entryId: state.entryId,
    completedAt: state.completedAt,
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
    state.entryId = String(saved.entryId || "");
    state.completedAt = String(saved.completedAt || "");
    state.started = true;
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function sharePayloadObject() {
  const compactPicks = {};
  for (const division of visibleDivisions()) {
    compactPicks[division[0]] = [];
    for (let round = 1; round <= 7; round += 1) {
      for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
        compactPicks[division[0]].push(Number(state.picks[division][pickKey(round, matchIndex)]) || 0);
      }
    }
  }
  return {
    v: 2,
    n: state.meta.displayName,
    t: state.meta.title,
    s: state.meta.scope,
    p: compactPicks,
    i: state.entryId,
    c: state.completedAt,
  };
}

function encodeJsonPayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeJsonPayload(value) {
  let encoded = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  encoded += "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function encodeSharePayload() {
  return encodeJsonPayload(sharePayloadObject());
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
    const payload = decodeJsonPayload(location.hash.slice("#bracket=".length));
    if (![1, 2].includes(payload.v) || !["men", "women", "both"].includes(payload.s)) throw new Error("Invalid bracket");
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
    state.entryId = String(payload.i || "");
    state.completedAt = String(payload.c || "");
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

function cloudEntryKey() {
  return `ob-${state.entryId}`.slice(0, 24);
}

function cloudEntriesUrl() {
  return `${CLOUD_API_URL}/api/minigames/${encodeURIComponent(CLOUD_GAME_ID)}/entries`;
}

function packCloudPicks(payload) {
  const encoded = encodeJsonPayload(payload);
  const chunks = {};
  for (let cursor = 0, index = 0; cursor < encoded.length; cursor += 80, index += 1) {
    chunks[`data_${String(index).padStart(2, "0")}`] = encoded.slice(cursor, cursor + 80);
  }
  if (Object.keys(chunks).length > 30) throw new Error("Bracket record is too large for shared storage");
  return chunks;
}

function unpackCloudPicks(picks) {
  try {
    const encoded = Object.entries(picks || {})
      .filter(([key, value]) => /^data_\d+$/.test(key) && typeof value === "string")
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([, value]) => value)
      .join("");
    return encoded ? decodeJsonPayload(encoded) : null;
  } catch {
    return null;
  }
}

function cloudBracketData(savedAt) {
  const stats = selectedBracketStats();
  return {
    kind: CLOUD_RECORD_KIND,
    share: sharePayloadObject(),
    completedAt: state.completedAt || savedAt,
    possiblePoints: stats.points,
    upsetPicks: stats.upsets,
    menChampion: championFor("men")?.name || "",
    womenChampion: championFor("women")?.name || "",
  };
}

async function fetchCloudRows() {
  const response = await fetch(cloudEntriesUrl(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.entries) ? payload.entries : [];
}

async function fetchExistingCloudEntry() {
  const key = cloudEntryKey().toLowerCase();
  const rows = await fetchCloudRows();
  const row = rows.find((entry) => String(entry.name || "").toLowerCase() === key);
  return row ? { ...row, data: unpackCloudPicks(row.picks) } : null;
}

function setPublishStatus(message, status = "working") {
  const element = $("#publish-status");
  if (!element) return;
  element.textContent = message;
  element.dataset.status = status;
}

async function postCloudBracket(savedAt) {
  const response = await fetch(cloudEntriesUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: cloudEntryKey(),
      picks: packCloudPicks(cloudBracketData(savedAt)),
      notify: "none",
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Leaderboard save failed: ${response.status}`);
  }
  return response.json();
}

async function syncCompletedBracket({ announce = false } = {}) {
  if (completedPicks() !== requiredPicks()) return false;
  if (cloudSyncPromise) return cloudSyncPromise;

  ensureCompletionIdentity();
  if (!state.readOnly) saveDraft();
  setPublishStatus("Your picks are safe on this device. Adding this bracket to the public leaderboard…");

  cloudSyncPromise = (async () => {
    const existing = await fetchExistingCloudEntry();
    const savedAt = existing?.savedAt || new Date().toISOString();
    state.completedAt = existing?.data?.completedAt || state.completedAt || savedAt;

    // Shared links are snapshots. Once the owner updates a bracket, opening an
    // older read-only link must not overwrite the owner's current public name.
    if (state.readOnly && existing) return true;

    const result = await postCloudBracket(savedAt);

    if (!existing) {
      const savedRow = (result.entries || []).find(
        (entry) => String(entry.name || "").toLowerCase() === cloudEntryKey().toLowerCase(),
      );
      if (savedRow?.savedAt) {
        state.completedAt = savedRow.savedAt;
        await postCloudBracket(savedRow.savedAt);
      }
    }

    if (!state.readOnly) saveDraft();
    setPublishStatus("Saved publicly. Your picks are still stored on this device, and the bracket is now on the leaderboard.", "saved");
    if (announce) showToast("Bracket added to the leaderboard.");
    publicEntriesPromise = null;
    refreshPublicLists(true);
    return true;
  })();

  try {
    return await cloudSyncPromise;
  } catch (error) {
    console.warn(error);
    setPublishStatus("Your picks and share link are safe. The public leaderboard could not connect yet; it will retry when this bracket is opened again.", "offline");
    if (announce) showToast("Picks saved locally. Leaderboard connection will retry.");
    return false;
  } finally {
    cloudSyncPromise = null;
  }
}

async function fetchPublicBracketEntries() {
  return (await fetchCloudRows())
    .map((row) => ({ row, data: unpackCloudPicks(row.picks) }))
    .filter(({ data }) => data?.kind === CLOUD_RECORD_KIND && data?.share)
    .map(({ row, data }) => ({
      displayName: String(data.share.n || "Bracket maker").slice(0, 40),
      title: String(data.share.t || "2026 US Open Bracket").slice(0, 80),
      scope: ["men", "women", "both"].includes(data.share.s) ? data.share.s : "both",
      shareHash: `#bracket=${encodeJsonPayload(data.share)}`,
      completedAt: data.completedAt || data.share.c || row.savedAt,
      possiblePoints: Number(data.possiblePoints) || 0,
      upsetPicks: Number(data.upsetPicks) || 0,
      menChampion: String(data.menChampion || ""),
      womenChampion: String(data.womenChampion || ""),
    }))
    .sort((first, second) => new Date(first.completedAt).getTime() - new Date(second.completedAt).getTime());
}

function ordinal(number) {
  const tens = number % 100;
  if (tens >= 11 && tens <= 13) return `${number}th`;
  return `${number}${({ 1: "st", 2: "nd", 3: "rd" })[number % 10] || "th"}`;
}

function completionLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Completion time unavailable";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scopeLabel(scope) {
  if (scope === "men") return "Men's draw";
  if (scope === "women") return "Women's draw";
  return "Both draws";
}

function publicBracketUrl(entry) {
  return `${location.origin}${location.pathname}${entry.shareHash}`;
}

function emptyList(title, copy) {
  const empty = document.createElement("div");
  empty.className = "leaderboard-empty";
  const strong = document.createElement("strong");
  const span = document.createElement("span");
  strong.textContent = title;
  span.textContent = copy;
  empty.append(strong, span);
  return empty;
}

function renderPublicLists(entries) {
  const leaderboard = $("#leaderboard-body");
  const directory = $("#public-bracket-list");
  leaderboard.replaceChildren();
  directory.replaceChildren();

  if (!entries.length) {
    leaderboard.append(emptyList("No completed brackets yet.", "The first real completed bracket will take first place."));
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "◎";
    const heading = document.createElement("h3");
    heading.textContent = "No completed brackets yet";
    const copy = document.createElement("p");
    copy.textContent = "The first real completed bracket will appear here automatically.";
    empty.append(icon, heading, copy);
    directory.append(empty);
  } else {
    entries.forEach((entry, index) => {
      const row = document.createElement("article");
      row.className = "leaderboard-row";
      const place = document.createElement("strong");
      place.className = "leaderboard-place";
      place.textContent = `#${index + 1}`;
      const bracket = document.createElement("div");
      bracket.className = "leaderboard-bracket";
      const name = document.createElement("strong");
      const details = document.createElement("span");
      name.textContent = entry.title;
      details.textContent = `by ${entry.displayName} · ${scopeLabel(entry.scope)}`;
      bracket.append(name, details);
      const completed = document.createElement("span");
      completed.className = "leaderboard-completed";
      completed.textContent = `${ordinal(index + 1)} to finish · ${completionLabel(entry.completedAt)}`;
      const value = document.createElement("span");
      value.className = "leaderboard-value";
      value.textContent = `${entry.possiblePoints.toLocaleString()} pts · ${entry.upsetPicks} upset${entry.upsetPicks === 1 ? "" : "s"}`;
      const view = document.createElement("a");
      view.className = "leaderboard-view";
      view.href = publicBracketUrl(entry);
      view.target = "_blank";
      view.rel = "noopener";
      view.textContent = "View bracket ↗";
      row.append(place, bracket, completed, value, view);
      leaderboard.append(row);

      const card = document.createElement("article");
      card.className = "public-bracket-card";
      const cardPlace = document.createElement("span");
      cardPlace.className = "public-card-place";
      cardPlace.textContent = String(index + 1).padStart(2, "0");
      const cardCopy = document.createElement("div");
      const cardTitle = document.createElement("h3");
      const cardDetails = document.createElement("p");
      const champions = document.createElement("small");
      cardTitle.textContent = entry.title;
      cardDetails.textContent = `by ${entry.displayName} · ${ordinal(index + 1)} completed`;
      champions.textContent = [entry.menChampion && `Men: ${entry.menChampion}`, entry.womenChampion && `Women: ${entry.womenChampion}`].filter(Boolean).join(" · ") || scopeLabel(entry.scope);
      cardCopy.append(cardTitle, cardDetails, champions);
      const cardLink = view.cloneNode(true);
      card.append(cardPlace, cardCopy, cardLink);
      directory.append(card);
    });
  }

  const status = entries.length === 1
    ? "1 real completed bracket, ordered by first completion."
    : `${entries.length} real completed brackets, ordered by first completion.`;
  $("#leaderboard-status").textContent = status;
  $("#directory-status").textContent = status;
}

function renderPublicListError() {
  const message = "The shared leaderboard could not connect. Saved picks on this device were not changed.";
  $("#leaderboard-status").textContent = message;
  $("#directory-status").textContent = message;
  $("#leaderboard-body").replaceChildren(emptyList("Leaderboard temporarily unavailable.", "Open this page again to retry."));
  $("#public-bracket-list").replaceChildren(emptyList("Public brackets temporarily unavailable.", "Open this page again to retry."));
}

async function refreshPublicLists(force = false) {
  $("#leaderboard-status").textContent = "Loading real completed brackets…";
  $("#directory-status").textContent = "Loading real completed brackets…";
  if (force) publicEntriesPromise = null;
  if (!publicEntriesPromise) publicEntriesPromise = fetchPublicBracketEntries();
  try {
    renderPublicLists(await publicEntriesPromise);
  } catch (error) {
    console.warn(error);
    publicEntriesPromise = null;
    renderPublicListError();
  }
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  $$("[data-view-link]").forEach((button) => button.classList.toggle("is-active", button.dataset.viewLink === name));
  $("#site-nav").classList.remove("is-open");
  $("#menu-button").setAttribute("aria-expanded", "false");
  if (name === "create" && state.started) showBuilder();
  if (name === "browse" || name === "leaderboard") refreshPublicLists();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function shortPlayerName(player) {
  const pieces = player.name.trim().split(/\s+/);
  return pieces.length > 1 ? pieces.at(-1) : player.name;
}

function makePlayerButton({
  player,
  selectedPosition,
  division,
  round,
  matchIndex,
  slot,
  players,
  projection,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "player-button";
  const matchupReady = Boolean(players[0] && players[1]);

  if (!player) {
    const sourceMatch = matchIndex * 2 - (slot === 0 ? 1 : 0);
    button.disabled = true;
    button.innerHTML = `<span class="player-copy"><span class="player-name">Winner of M${sourceMatch}</span><span class="entry-note">Pick the earlier round first</span></span><span class="probability">—</span><span class="pick-points">—</span>`;
    return button;
  }

  const probability = projection?.[slot];
  const points = probability == null ? null : potentialPoints(round, probability);
  const isModelPick = probability != null && probability > projection[1 - slot];
  const isUpset = probability != null && probability < 45;

  const copy = document.createElement("span");
  copy.className = "player-copy";
  const name = document.createElement("span");
  name.className = `player-name${player.entryType === "tbd" ? " tbd-label" : ""}`;
  if (player.seed) {
    const seed = document.createElement("span");
    seed.className = "seed";
    seed.textContent = player.seed;
    name.append(seed);
  }
  name.append(document.createTextNode(player.name));
  if (isModelPick) {
    const model = document.createElement("span");
    model.className = "model-label";
    model.textContent = "MODEL";
    name.append(model);
  }
  const entry = document.createElement("span");
  entry.className = "entry-note";
  entry.textContent = player.countryCode || (player.entryType === "tbd" ? "QUALIFIER TBD" : "ENTRY");
  copy.append(name, entry);

  const chance = document.createElement("span");
  chance.className = "probability";
  chance.textContent = probability == null ? "—" : `${probability}%`;

  const value = document.createElement("span");
  value.className = `pick-points${isUpset ? " has-upset-bonus" : ""}`;
  value.textContent = points == null ? "—" : `+${points}`;

  button.append(copy, chance, value);
  button.classList.toggle("is-selected", Number(selectedPosition) === player.drawPosition);
  button.classList.toggle("is-model-pick", isModelPick);
  button.classList.toggle("is-upset", isUpset);
  button.setAttribute(
    "aria-label",
    `${Number(selectedPosition) === player.drawPosition ? "Selected: " : "Pick "}${player.seed ? `seed ${player.seed} ` : ""}${player.name}${probability == null ? "" : `, ${probability} percent projected win chance, worth ${points} ${points === 1 ? "point" : "points"} if correct`}`,
  );
  button.title = probability == null
    ? "Complete both sides of this matchup first"
    : `${player.name}: ${probability}% projected win chance · ${points} possible points`;
  button.disabled = !matchupReady || state.readOnly || isLocked();
  button.addEventListener("click", () => selectPlayer(division, round, matchIndex, player.drawPosition));
  return button;
}

function makeMatchCard(division, round, matchIndex) {
  const players = participantsFor(division, round, matchIndex);
  const projection = projectionFor(players);
  const selectedPosition = state.picks[division][pickKey(round, matchIndex)];
  const card = document.createElement("article");
  card.className = `match-card ${matchIndex % 2 === 1 ? "is-upper" : "is-lower"}`;
  card.setAttribute("aria-label", `${ROUND_NAMES[round - 1]} match ${matchIndex}`);

  const roundStride = BASE_MATCH_PITCH * 2 ** (round - 1);
  const top = roundStride / 2 - MATCH_CARD_HEIGHT / 2 + (matchIndex - 1) * roundStride;
  card.style.top = `${top}px`;
  card.style.setProperty("--half-step", `${roundStride / 2}px`);

  const shell = document.createElement("div");
  shell.className = "match-card-shell";

  const header = document.createElement("div");
  header.className = "match-card-header";
  const number = document.createElement("span");
  number.textContent = `M${String(matchIndex).padStart(2, "0")}`;
  const call = document.createElement("strong");
  if (!projection) {
    call.textContent = round === 1 ? "Projection unavailable" : "Awaiting earlier picks";
  } else if (projection[0] === projection[1]) {
    call.textContent = "Model: toss-up · 50–50";
  } else {
    const modelIndex = projection[0] > projection[1] ? 0 : 1;
    call.textContent = `Model: ${shortPlayerName(players[modelIndex])} · ${projection[modelIndex]}%`;
  }
  header.append(number, call);

  const options = document.createElement("div");
  options.className = "player-options";
  players.forEach((player, slot) => {
    options.append(makePlayerButton({
      player,
      selectedPosition,
      division,
      round,
      matchIndex,
      slot,
      players,
      projection,
    }));
  });
  shell.append(header, options);
  card.append(shell);

  if (round < 7) {
    const connector = document.createElement("span");
    connector.className = "connector-branch";
    connector.setAttribute("aria-hidden", "true");
    card.append(connector);
  }
  return card;
}

function renderBracket() {
  const division = state.activeDivision;
  const board = $("#bracket-board");
  board.replaceChildren();

  for (let round = 1; round <= 7; round += 1) {
    const column = document.createElement("section");
    column.className = "round-column";
    column.dataset.round = String(round);
    column.setAttribute("aria-label", ROUND_NAMES[round - 1]);

    const header = document.createElement("header");
    header.className = "round-column-header";
    const copy = document.createElement("span");
    copy.innerHTML = `<small>Round ${round}</small><strong>${ROUND_NAMES[round - 1]}</strong>`;
    const points = document.createElement("span");
    points.className = "round-base-points";
    points.innerHTML = `<strong>${ROUND_POINTS[round - 1]}</strong><small>base pts</small>`;
    header.append(copy, points);

    const matches = document.createElement("div");
    matches.className = "bracket-matches";
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      matches.append(makeMatchCard(division, round, matchIndex));
    }
    column.append(header, matches);
    board.append(column);
  }

  renderProgress();
  renderRoundJumps();
}

function renderProgress() {
  const completed = completedPicks();
  const required = requiredPicks();
  const percentage = Math.round((completed / required) * 100);
  const stats = selectedBracketStats();
  $("#progress-copy").textContent = `${completed} of ${required} picks complete`;
  $("#progress-percent").textContent = `${percentage}%`;
  $("#progress-bar").style.width = `${percentage}%`;
  $("#potential-points").textContent = `${stats.points.toLocaleString()} pts`;
  $("#upset-picks").textContent = String(stats.upsets);
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
      renderDivisionTabs();
      renderBracket();
      $("#bracket-scroller").scrollLeft = 0;
      saveDraft();
    });
    tabs.append(button);
  }
}

function renderRoundJumps() {
  const jumps = $("#round-jumps");
  jumps.replaceChildren();
  ROUND_SHORT_NAMES.forEach((name, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => {
      const column = $(`.round-column[data-round="${index + 1}"]`);
      $("#bracket-scroller").scrollTo({ left: Math.max(0, column.offsetLeft - 16), behavior: "smooth" });
    });
    jumps.append(button);
  });
}

function showBuilder() {
  $("#setup-card").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#builder").hidden = false;
  $("#builder-title").textContent = state.meta.title;
  $("#builder-byline").textContent = `By ${state.meta.displayName}`;
  $("#new-bracket").hidden = state.readOnly;
  $$(".rename-bracket").forEach((button) => { button.hidden = state.readOnly; });
  $("#save-state").lastChild.textContent = state.readOnly
    ? " Shared bracket · read only"
    : isLocked()
      ? " Brackets are locked"
      : " Saved on this device";
  renderDivisionTabs();
  renderBracket();
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
  renderBracket();
  saveDraft();

  if (completedPicks() === requiredPicks()) {
    ensureCompletionIdentity();
    saveDraft();
    syncCompletedBracket({ announce: true });
  }

  const currentRoundComplete = Array.from({ length: matchCount(round) }, (_, index) => pickKey(round, index + 1))
    .every((roundKey) => state.picks[division][roundKey]);
  if (currentRoundComplete && round < 7) showToast(`${ROUND_NAMES[round - 1]} complete. The next round is ready.`);
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
  const stats = selectedBracketStats();
  summary.append(summaryArticle("Completed picks", `${complete} / ${required}`));
  summary.append(summaryArticle("Possible points", stats.points.toLocaleString()));
  summary.append(summaryArticle("Upset picks", String(stats.upsets)));
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
  ensureCompletionIdentity();
  const encoded = encodeSharePayload();
  const url = `${location.origin}${location.pathname}#bracket=${encoded}`;
  state.submitted = true;
  $("#builder").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = false;
  $("#share-url").value = url;
  saveDraft();
  history.replaceState(null, "", `#bracket=${encoded}`);
  syncCompletedBracket({ announce: true });
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

function openRenameDialog() {
  if (state.readOnly) return;
  const dialog = $("#rename-dialog");
  const input = $("#rename-bracket-input");
  input.value = state.meta.title;
  dialog.showModal();
  input.focus();
  input.select();
}

async function renameBracket(event) {
  event.preventDefault();
  const title = String(new FormData(event.currentTarget).get("bracketName") || "").trim();
  if (!title || state.readOnly) return;

  const changed = title !== state.meta.title;
  state.meta.title = title;
  $("#builder-title").textContent = title;
  $("#bracket-title").value = title;
  $("#rename-dialog").close();
  if (!changed) return;

  saveDraft();

  if (state.submitted) {
    const encoded = encodeSharePayload();
    const url = `${location.origin}${location.pathname}#bracket=${encoded}`;
    $("#share-url").value = url;
    history.replaceState(null, "", `#bracket=${encoded}`);
  }

  if (completedPicks() === requiredPicks()) {
    if (cloudSyncPromise) await cloudSyncPromise.catch(() => false);
    const synced = await syncCompletedBracket();
    showToast(synced ? "Bracket name updated everywhere." : "Name saved here. The leaderboard will retry shortly.");
    return;
  }

  showToast("Bracket name updated. Your picks did not change.");
}

function resetBracket() {
  if (state.started && completedPicks() > 0 && !window.confirm("Start a new bracket and remove this saved draft from this device?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.meta = { displayName: "", title: "My 2026 US Open Bracket", scope: "both" };
  state.picks = { men: {}, women: {} };
  state.activeDivision = "men";
  state.started = false;
  state.submitted = false;
  state.readOnly = false;
  state.entryId = "";
  state.completedAt = "";
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
  $$("[data-view-link]").forEach((button) => {
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

  $("#review-bracket").addEventListener("click", showReview);
  $$(".rename-bracket").forEach((button) => button.addEventListener("click", openRenameDialog));
  $("#rename-bracket-form").addEventListener("submit", renameBracket);
  $("#cancel-rename").addEventListener("click", () => $("#rename-dialog").close());
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
      syncCompletedBracket();
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
      if (completedPicks() === requiredPicks()) {
        ensureCompletionIdentity();
        saveDraft();
        syncCompletedBracket();
      }
    }
  } catch (error) {
    console.error(error);
    $("#setup-card").innerHTML = `<div class="empty-state"><span aria-hidden="true">!</span><h3>The verified draw could not load</h3><p>Please refresh the page. No replacement players or invented matchups will be shown.</p></div>`;
  }
}

initialize();
