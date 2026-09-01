import {
  buildPlayerIndex,
  mergeResults,
  parseCompletedResults,
  parsePlayerNextMatches,
  resolveRoundOnePlaceholders,
} from "./live-results-core.js";
import {
  ROUND_NAMES,
  ROUND_POINTS,
  potentialPointsForPick as potentialPoints,
  projectionForPlayers as projectionFor,
  simulateDivisionPool,
} from "./pool-simulator-core.js";

const ROUND_SHORT_NAMES = ["R128", "R64", "R32", "R16", "QF", "SF", "Final"];
const LOCK_AT = new Date("2026-08-30T15:00:00Z");
const STORAGE_KEY = "dexter-usopen-2026-bracket-v1";
const CLOUD_API_URL = "https://open-bracket-storage.dexterhbain.chatgpt.site";
const CLOUD_GAME_ID = "usopen-2026-brackets";
const CLOUD_RECORD_KIND = "usopen-bracket-v2";
const BASE_MATCH_PITCH = 104;
const MATCH_CARD_HEIGHT = 96;
const MIN_BRACKET_ZOOM = 0.15;
const MAX_BRACKET_ZOOM = 1.5;
const BRACKET_ZOOM_STEP = 0.1;
const LIVE_RESULTS_REFRESH_MS = 30000;
const PLAYER_COUNTDOWN_REFRESH_MS = 1000;
const POOL_SIMULATION_ITERATIONS = 4000;
const LIVE_RESULT_FEEDS = [
  {
    division: "men",
    groupingSlug: "mens-singles",
    url: "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
  },
  {
    division: "women",
    groupingSlug: "womens-singles",
    url: "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard",
  },
];

const state = {
  data: { men: null, women: null },
  results: { men: {}, women: {} },
  nextMatches: { men: {}, women: {} },
  resultsUpdatedAt: "",
  liveFeedConnected: false,
  liveFeedChecked: false,
  meta: { displayName: "", title: "My 2026 US Open Bracket", scope: "both" },
  picks: { men: {}, women: {} },
  activeDivision: "men",
  started: false,
  submitted: false,
  readOnly: false,
  entryId: "",
  completedAt: "",
  divisionCompletedAt: { men: "", women: "" },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimer;
let saveTimer;
let cloudSyncPromise;
let publicEntriesPromise;
let publicBracketEntries = [];
let publicEntriesLoaded = false;
let bracketZoom = 1;

function officialResult(division, round, matchIndex) {
  return state.results[division]?.[pickKey(round, matchIndex)] || null;
}

function completedResultCount(division) {
  return Object.keys(state.results[division] || {}).length;
}

function hasCompletedResults() {
  return completedResultCount("men") + completedResultCount("women") > 0;
}

function installedResults() {
  return [
    ...Object.values(state.results.men || {}),
    ...Object.values(state.results.women || {}),
  ];
}

function installResultsDocument(document, { merge = true } = {}) {
  const next = { men: {}, women: {} };
  const results = merge
    ? mergeResults(installedResults(), document?.results || [])
    : document?.results || [];
  for (const result of results) {
    if (!["men", "women"].includes(result.division)) continue;
    if (!Number.isInteger(result.round) || result.round < 1 || result.round > 7) continue;
    if (!Number.isInteger(result.matchIndex) || result.matchIndex < 1 || result.matchIndex > matchCount(result.round)) continue;
    if (!Number.isInteger(result.winnerDrawPosition) || result.winnerDrawPosition < 1 || result.winnerDrawPosition > 128) continue;
    next[result.division][pickKey(result.round, result.matchIndex)] = result;
  }
  const prior = JSON.stringify(state.results);
  state.results = next;
  state.resultsUpdatedAt = String(document?.updatedAt || "");
  return prior !== JSON.stringify(next);
}

async function fetchDirectLiveResults() {
  const observedAt = new Date().toISOString();
  const responses = await Promise.allSettled(LIVE_RESULT_FEEDS.map(async (feed) => {
    const response = await fetch(`${feed.url}?v=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${feed.division} live feed returned ${response.status}`);
    return { ...feed, payload: await response.json() };
  }));

  const liveResults = [];
  const nextMatches = { men: state.nextMatches.men, women: state.nextMatches.women };
  let connectedFeeds = 0;
  for (const response of responses) {
    if (response.status !== "fulfilled") {
      console.warn(response.reason);
      continue;
    }
    connectedFeeds += 1;
    const { division, groupingSlug, payload } = response.value;
    const resolved = resolveRoundOnePlaceholders(state.data[division], payload, { groupingSlug });
    state.data[division] = resolved.draw;
    const playerIndex = buildPlayerIndex(resolved.draw);
    const parsed = parseCompletedResults(payload, {
      division,
      groupingSlug,
      playerIndex,
      observedAt,
    });
    const schedules = parsePlayerNextMatches(payload, {
      division,
      groupingSlug,
      playerIndex,
      observedAt,
    });
    nextMatches[division] = schedules.matches;
    liveResults.push(...parsed.results);
    if (parsed.skipped.length) console.warn(`Skipped ${parsed.skipped.length} unmapped ${division} result(s).`);
    if (schedules.skipped.length) console.warn(`Skipped ${schedules.skipped.length} unmapped ${division} schedule entry(s).`);
  }

  if (!connectedFeeds) throw new Error("All live result feeds are unavailable");
  const stableSchedule = (key, value) => key === "observedAt" ? undefined : value;
  const scheduleChanged = JSON.stringify(state.nextMatches, stableSchedule) !== JSON.stringify(nextMatches, stableSchedule);
  state.nextMatches = nextMatches;
  return {
    tournament: "2026 US Open",
    updatedAt: observedAt,
    results: mergeResults(installedResults(), liveResults),
    scheduleChanged,
  };
}

function renderLiveResultsStatus() {
  const status = $("#live-results-status");
  if (!status) return;
  const men = completedResultCount("men");
  const women = completedResultCount("women");
  if (!state.liveFeedConnected) {
    const connectionLabel = state.liveFeedChecked ? "reconnecting" : "connecting";
    status.textContent = men || women
      ? `Live results are ${connectionLabel}. Showing ${men + women} saved final result${men + women === 1 ? "" : "s"}.`
      : `Live results are ${connectionLabel}. Saved picks were not changed.`;
    return;
  }
  if (!men && !women) {
    status.textContent = "Waiting for the first completed main-draw match. Until then, each leaderboard stays ordered by who finished first.";
    return;
  }
  const updated = new Date(state.resultsUpdatedAt);
  const updatedLabel = Number.isNaN(updated.getTime())
    ? "recently"
    : updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
  status.textContent = `Live scoring: ${men} men's and ${women} women's final result${men + women === 1 ? "" : "s"}. Checked automatically at ${updatedLabel}.`;
}

async function loadSavedResults() {
  try {
    const response = await fetch(`./data/results.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Saved result request failed: ${response.status}`);
    const changed = installResultsDocument(await response.json());
    renderLiveResultsStatus();
    return changed;
  } catch (error) {
    console.warn(error);
    renderLiveResultsStatus();
    return false;
  }
}

async function refreshLiveResults({ repaint = false } = {}) {
  let changed = false;
  try {
    const liveDocument = await fetchDirectLiveResults();
    changed = installResultsDocument(liveDocument) || liveDocument.scheduleChanged || changed;
    state.liveFeedConnected = true;
  } catch (error) {
    console.warn(error);
    state.liveFeedConnected = false;
  }
  state.liveFeedChecked = true;

  renderLiveResultsStatus();
  if (changed && repaint) {
    if (state.started) renderBracket();
    if (publicEntriesLoaded) renderPublicLists(publicBracketEntries);
  }
  return state.liveFeedConnected;
}

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

function isDivisionComplete(division) {
  return numberOfPicks(division) === 127;
}

function completedDivisions() {
  return visibleDivisions().filter(isDivisionComplete);
}

function championFor(division) {
  return playerByPosition(division, state.picks[division][pickKey(7, 1)]);
}

function bracketStatsForDivision(division, picks = state.picks[division]) {
  let points = 0;
  let upsets = 0;
  for (let round = 1; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const selected = Number(picks[pickKey(round, matchIndex)]);
      if (!selected) continue;
      const players = participantsFor(division, round, matchIndex, picks);
      const projection = projectionFor(players);
      const selectedIndex = players.findIndex((player) => player?.drawPosition === selected);
      if (!projection || selectedIndex < 0) continue;
      const probability = projection[selectedIndex];
      points += potentialPoints(round, probability);
      if (probability < 45) upsets += 1;
    }
  }
  return { points, upsets };
}

function selectedBracketStats() {
  return visibleDivisions().reduce((total, division) => {
    const stats = bracketStatsForDivision(division);
    return { points: total.points + stats.points, upsets: total.upsets + stats.upsets };
  }, { points: 0, upsets: 0 });
}

function liveScoreForEntry(entry) {
  let points = 0;
  let correct = 0;
  let decided = 0;
  for (const result of Object.values(state.results[entry.scope] || {})) {
    const key = pickKey(result.round, result.matchIndex);
    const selectedPosition = Number(entry.picks[key]);
    if (!selectedPosition) continue;
    decided += 1;
    if (selectedPosition !== Number(result.winnerDrawPosition)) continue;

    correct += 1;
    const players = participantsFor(entry.scope, result.round, result.matchIndex, entry.picks);
    const projection = projectionFor(players);
    const selectedIndex = players.findIndex((player) => player?.drawPosition === selectedPosition);
    const probability = projection?.[selectedIndex];
    points += probability == null ? ROUND_POINTS[result.round - 1] : potentialPoints(result.round, probability);
  }
  return { points, correct, decided };
}

function rankedEntries(entries) {
  const scored = entries.map((entry) => ({ ...entry, liveScore: liveScoreForEntry(entry) }));
  if (!entries.length || completedResultCount(entries[0].scope) === 0) {
    return scored.sort((first, second) => new Date(first.completedAt).getTime() - new Date(second.completedAt).getTime());
  }
  return scored.sort((first, second) => (
    second.liveScore.points - first.liveScore.points
      || second.liveScore.correct - first.liveScore.correct
      || second.possiblePoints - first.possiblePoints
      || new Date(first.completedAt).getTime() - new Date(second.completedAt).getTime()
  ));
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
  const priorCompletedAt = state.completedAt;
  const hadDivisionCompletion = Object.values(state.divisionCompletedAt).some(Boolean);
  const now = new Date().toISOString();
  if (!state.entryId) {
    const source = bracketIdentitySource();
    state.entryId = `${stableHash(source)}-${stableHash([...source].reverse().join(""))}`;
  }
  if (!state.completedAt) state.completedAt = now;

  const divisionFallback = !hadDivisionCompletion && priorCompletedAt ? priorCompletedAt : now;
  for (const division of completedDivisions()) {
    if (!state.divisionCompletedAt[division]) state.divisionCompletedAt[division] = divisionFallback;
  }
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
    divisionCompletedAt: state.divisionCompletedAt,
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
    state.divisionCompletedAt = {
      men: String(saved.divisionCompletedAt?.men || ""),
      women: String(saved.divisionCompletedAt?.women || ""),
    };
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
    d: {
      m: state.divisionCompletedAt.men,
      w: state.divisionCompletedAt.women,
    },
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

function savedDraftEntryId() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.started ? String(saved.entryId || "") : "";
  } catch {
    return "";
  }
}

function loadSharedBracket() {
  if (!location.hash.startsWith("#bracket=")) return false;
  try {
    const payload = decodeJsonPayload(location.hash.slice("#bracket=".length));
    if (![1, 2].includes(payload.v) || !["men", "women", "both"].includes(payload.s)) throw new Error("Invalid bracket");
    const sharedEntryId = String(payload.i || "");
    if (sharedEntryId && sharedEntryId === savedDraftEntryId()) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      return false;
    }
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
    state.entryId = sharedEntryId;
    state.completedAt = String(payload.c || "");
    state.divisionCompletedAt = {
      men: String(payload.d?.m || payload.c || ""),
      women: String(payload.d?.w || payload.c || ""),
    };
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
    divisionCompletedAt: state.divisionCompletedAt,
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
  if (!completedDivisions().length) return false;
  if (cloudSyncPromise) return cloudSyncPromise;

  ensureCompletionIdentity();
  if (!state.readOnly) saveDraft();
  setPublishStatus("Your picks are safe on this device. Adding each completed draw to its leaderboard…");

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
    setPublishStatus("Saved publicly. Each completed draw is now on its leaderboard, and unfinished picks remain editable.", "saved");
    if (announce) showToast("Completed draw added to the leaderboard.");
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

function splitCloudBracket(row, data) {
  const scope = ["men", "women", "both"].includes(data.share.s) ? data.share.s : "both";
  const divisions = scope === "both" ? ["men", "women"] : [scope];
  return divisions.map((division) => {
    const compactPicks = data.share.p?.[division[0]] || [];
    const picks = expandCompactPicks(compactPicks);
    const stats = bracketStatsForDivision(division, picks);
    const champion = playerByPosition(division, picks[pickKey(7, 1)])?.name || "";
    const divisionShare = {
      ...data.share,
      s: division,
      p: { [division[0]]: compactPicks },
      d: { [division[0]]: data.share.d?.[division[0]] || "" },
    };
    return {
      displayName: String(data.share.n || "Bracket maker").slice(0, 40),
      title: String(data.share.t || "2026 US Open Bracket").slice(0, 80),
      scope: division,
      shareHash: `#bracket=${encodeJsonPayload(divisionShare)}`,
      completedAt: data.share.d?.[division[0]] || data.divisionCompletedAt?.[division] || data.completedAt || data.share.c || row.savedAt,
      possiblePoints: stats.points,
      upsetPicks: stats.upsets,
      champion,
      pickCount: Object.keys(picks).length,
      picks,
    };
  });
}

async function fetchPublicBracketEntries() {
  return (await fetchCloudRows())
    .map((row) => ({ row, data: unpackCloudPicks(row.picks) }))
    .filter(({ data }) => data?.kind === CLOUD_RECORD_KIND && data?.share)
    .flatMap(({ row, data }) => splitCloudBracket(row, data))
    .filter((entry) => entry.pickCount === 127)
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

function publicBracketLink(entry) {
  const link = document.createElement("a");
  link.className = "leaderboard-view";
  link.href = publicBracketUrl(entry);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = completedResultCount(entry.scope) > 0 ? "See picks ✓✕" : "View bracket ↗";
  return link;
}

function leaderboardRow(entry, index) {
  const row = document.createElement("article");
  row.className = "leaderboard-row";
  const place = document.createElement("strong");
  place.className = "leaderboard-place";
  place.textContent = `#${index + 1}`;
  const bracket = document.createElement("a");
  bracket.className = "leaderboard-bracket leaderboard-bracket-link";
  bracket.href = publicBracketUrl(entry);
  bracket.target = "_blank";
  bracket.rel = "noopener";
  bracket.setAttribute("aria-label", `View ${entry.title} by ${entry.displayName}`);
  const name = document.createElement("strong");
  const details = document.createElement("span");
  name.textContent = entry.title;
  details.textContent = `by ${entry.displayName} · ${scopeLabel(entry.scope)}`;
  bracket.append(name, details);
  const completed = document.createElement("span");
  completed.className = "leaderboard-completed";
  completed.textContent = completedResultCount(entry.scope) > 0
    ? `${entry.liveScore.correct} correct of ${entry.liveScore.decided} final`
    : `${ordinal(index + 1)} to finish · ${completionLabel(entry.completedAt)}`;
  const value = document.createElement("span");
  value.className = "leaderboard-value";
  value.textContent = completedResultCount(entry.scope) > 0
    ? `${entry.liveScore.points.toLocaleString()} pts`
    : `${entry.possiblePoints.toLocaleString()} pts · ${entry.upsetPicks} upset${entry.upsetPicks === 1 ? "" : "s"}`;
  const view = publicBracketLink(entry);
  row.append(place, bracket, completed, value, view);
  return row;
}

function poolForecastSeed(scope, entries) {
  const winners = Object.values(state.results[scope] || {}).map((result) => [
    result.round,
    result.matchIndex,
    result.winnerDrawPosition,
  ]);
  return JSON.stringify({
    scope,
    winners,
    entries: entries.map((entry) => [entry.shareHash, entry.completedAt]),
  });
}

function forecastChanceLabel(chance) {
  if (chance > 0 && chance < 0.1) return "<0.1%";
  return `${chance >= 10 ? chance.toFixed(0) : chance.toFixed(1)}%`;
}

function forecastEntryRow(forecast, index, totalEntries) {
  const row = document.createElement("article");
  row.className = "pool-forecast-row";

  const place = document.createElement("span");
  place.className = "pool-forecast-place";
  place.textContent = `#${index + 1}`;

  const identity = document.createElement("div");
  identity.className = "pool-forecast-identity";
  const title = document.createElement("a");
  title.href = publicBracketUrl(forecast.entry);
  title.target = "_blank";
  title.rel = "noopener";
  title.textContent = forecast.entry.title;
  const maker = document.createElement("span");
  maker.textContent = `by ${forecast.entry.displayName}`;
  identity.append(title, maker);

  const chance = document.createElement("div");
  chance.className = "pool-forecast-chance";
  const chanceValue = document.createElement("strong");
  const chanceLabel = document.createElement("span");
  chanceValue.textContent = forecastChanceLabel(forecast.winChance);
  chanceLabel.textContent = "chance to win";
  chance.append(chanceValue, chanceLabel);

  const numbers = document.createElement("div");
  numbers.className = "pool-forecast-numbers";
  const finish = document.createElement("span");
  const projected = document.createElement("span");
  const maximum = document.createElement("span");
  finish.innerHTML = `<strong>#${forecast.averageFinish.toFixed(1)}</strong> average finish`;
  projected.innerHTML = `<strong>${Math.round(forecast.projectedPoints).toLocaleString()}</strong> projected pts`;
  maximum.innerHTML = `<strong>${forecast.maxPossiblePoints.toLocaleString()}</strong> maximum pts`;
  numbers.append(finish, projected, maximum);

  const path = document.createElement("p");
  path.className = "pool-forecast-path";
  if (forecast.maxPossiblePoints <= forecast.currentPoints) {
    path.textContent = "No remaining picks can add points.";
  } else if (forecast.bestPath) {
    path.textContent = `Best path: ${forecast.bestPath.playerName} wins ${forecast.bestPath.roundName} · ${forecast.bestPath.support}/${totalEntries} picked it.`;
  } else {
    path.textContent = "Best path depends on shared remaining picks.";
  }

  row.append(place, identity, chance, numbers, path);
  return row;
}

function poolForecastCard(scope, entries) {
  const card = document.createElement("article");
  card.className = "pool-forecast-card";

  const heading = document.createElement("div");
  heading.className = "pool-forecast-card-heading";
  const headingCopy = document.createElement("div");
  const kicker = document.createElement("span");
  const title = document.createElement("h4");
  kicker.textContent = scopeLabel(scope);
  title.textContent = `${scope === "men" ? "Men's" : "Women's"} pool forecast`;
  headingCopy.append(kicker, title);
  const badge = document.createElement("strong");
  badge.textContent = `${POOL_SIMULATION_ITERATIONS.toLocaleString()} simulations`;
  heading.append(headingCopy, badge);
  card.append(heading);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "pool-forecast-empty";
    empty.textContent = `No completed ${scopeLabel(scope).toLowerCase()} brackets to simulate yet.`;
    card.append(empty);
    return card;
  }

  const simulation = simulateDivisionPool({
    entries,
    players: state.data[scope]?.players || [],
    results: Object.values(state.results[scope] || {}),
    iterations: POOL_SIMULATION_ITERATIONS,
    seed: poolForecastSeed(scope, entries),
  });

  if (simulation.importantMatch) {
    const swing = document.createElement("div");
    swing.className = "pool-swing-match";
    const label = document.createElement("span");
    const matchup = document.createElement("strong");
    const detail = document.createElement("small");
    const [first, second] = simulation.importantMatch.players;
    const schedule = nextMatchForPlayer(scope, first.drawPosition) || nextMatchForPlayer(scope, second.drawPosition);
    label.textContent = "Biggest swing match";
    matchup.textContent = `${first.name} vs ${second.name}`;
    detail.textContent = `${first.support} need ${first.name} · ${second.support} need ${second.name} · ${simulation.importantMatch.roundName}${schedule ? ` · ${playerCountdownText(schedule)}` : ""}`;
    swing.append(label, matchup, detail);
    card.append(swing);
  }

  const list = document.createElement("div");
  list.className = "pool-forecast-list";
  simulation.forecasts.forEach((forecast, index) => {
    list.append(forecastEntryRow(forecast, index, entries.length));
  });
  card.append(list);
  return card;
}

function renderPoolForecast(entries) {
  const grid = $("#pool-forecast-grid");
  if (!grid) return;
  grid.replaceChildren(
    poolForecastCard("men", entries.filter((entry) => entry.scope === "men")),
    poolForecastCard("women", entries.filter((entry) => entry.scope === "women")),
  );
  $("#pool-forecast-status").textContent = "Forecasts recalculate after every live results check. Tied first-place simulations are split evenly.";
}

function pickFinderPlayers() {
  return ["men", "women"].flatMap((division) => (
    (state.data[division]?.players || []).map((player) => ({ ...player, division }))
  ));
}

function populatePickFinderPlayers() {
  const options = $("#pick-player-options");
  options.replaceChildren();
  for (const player of pickFinderPlayers().sort((first, second) => first.name.localeCompare(second.name))) {
    const option = document.createElement("option");
    option.value = player.name;
    option.label = scopeLabel(player.division);
    options.append(option);
  }
}

function matchingPickFinderPlayer(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { matches: [] };
  const players = pickFinderPlayers();
  const exact = players.filter((player) => player.name.toLowerCase() === normalized);
  if (exact.length === 1) return { player: exact[0], matches: exact };
  const matches = players.filter((player) => player.name.toLowerCase().includes(normalized));
  if (matches.length === 1) return { player: matches[0], matches };
  return { matches };
}

function pickFinderDecision(entry, player, round) {
  const position = Number(player.drawPosition);
  const roundName = ROUND_NAMES[round - 1];
  if (round > 1) {
    const priorMatch = Math.ceil(position / (2 ** (round - 1)));
    if (Number(entry.picks[pickKey(round - 1, priorMatch)]) !== position) {
      return {
        outcome: "LOSE",
        detail: `Picked ${player.name} to lose before ${roundName}.`,
      };
    }
  }

  const matchIndex = Math.ceil(position / (2 ** round));
  const selectedPosition = Number(entry.picks[pickKey(round, matchIndex)]);
  if (selectedPosition === position) {
    return {
      outcome: "WIN",
      detail: `Picked ${player.name} to win in ${roundName}.`,
    };
  }

  const selectedPlayer = playerByPosition(entry.scope, selectedPosition);
  return {
    outcome: "LOSE",
    detail: selectedPlayer
      ? `Picked ${selectedPlayer.name} over ${player.name} in ${roundName}.`
      : `Picked ${player.name} to lose in ${roundName}.`,
  };
}

function pickFinderResult(entry, player, round) {
  const decision = pickFinderDecision(entry, player, round);
  const article = document.createElement("article");
  article.className = "pick-finder-result";

  const bracket = document.createElement("div");
  const title = document.createElement("strong");
  const maker = document.createElement("span");
  title.textContent = entry.title;
  maker.textContent = `by ${entry.displayName}`;
  bracket.append(title, maker);

  const pick = document.createElement("div");
  pick.className = "pick-finder-pick";
  const outcome = document.createElement("strong");
  const detail = document.createElement("span");
  outcome.className = decision.outcome === "WIN" ? "is-win" : "is-loss";
  outcome.textContent = decision.outcome;
  detail.textContent = decision.detail;
  pick.append(outcome, detail);

  article.append(bracket, pick, publicBracketLink(entry));
  return article;
}

function renderPickFinder() {
  const input = $("#pick-player-search");
  const results = $("#pick-finder-results");
  const status = $("#pick-finder-status");
  const round = Number($("#pick-round-select").value || 1);
  const query = input.value.trim();
  results.replaceChildren();

  if (!query) {
    status.textContent = "Start typing a player’s name.";
    return;
  }

  const { player, matches } = matchingPickFinderPlayer(query);
  if (!player) {
    status.textContent = matches.length
      ? `${matches.length} players match. Choose a full name from the list.`
      : "No player matches that search.";
    return;
  }

  input.value = player.name;
  if (!publicEntriesLoaded) {
    status.textContent = "Loading everyone’s picks…";
    return;
  }

  const entries = publicBracketEntries.filter((entry) => entry.scope === player.division);
  if (!entries.length) {
    status.textContent = `No completed ${scopeLabel(player.division).toLowerCase()} brackets are available yet.`;
    return;
  }

  for (const entry of entries) results.append(pickFinderResult(entry, player, round));
  status.textContent = `${entries.length} bracket pick${entries.length === 1 ? "" : "s"} for ${player.name} in ${ROUND_NAMES[round - 1]}.`;
}

function renderPublicLists(entries) {
  publicBracketEntries = entries;
  publicEntriesLoaded = true;
  const menLeaderboard = $("#leaderboard-men-body");
  const womenLeaderboard = $("#leaderboard-women-body");
  const directory = $("#public-bracket-list");
  menLeaderboard.replaceChildren();
  womenLeaderboard.replaceChildren();
  directory.replaceChildren();

  const menEntries = rankedEntries(entries.filter((entry) => entry.scope === "men"));
  const womenEntries = rankedEntries(entries.filter((entry) => entry.scope === "women"));

  $$("[data-leaderboard-value-heading]").forEach((heading) => {
    heading.textContent = completedResultCount(heading.dataset.leaderboardValueHeading) > 0 ? "Score" : "Bracket value";
  });

  for (const [divisionEntries, leaderboard, label] of [
    [menEntries, menLeaderboard, "men's"],
    [womenEntries, womenLeaderboard, "women's"],
  ]) {
    if (!divisionEntries.length) {
      leaderboard.append(emptyList(`No completed ${label} brackets yet.`, `The first completed ${label} bracket will take first place.`));
      continue;
    }
    divisionEntries.forEach((entry, index) => leaderboard.append(leaderboardRow(entry, index)));
  }

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "◎";
    const heading = document.createElement("h3");
    heading.textContent = "No completed draws yet";
    const copy = document.createElement("p");
    copy.textContent = "The first real completed draw will appear here automatically.";
    empty.append(icon, heading, copy);
    directory.append(empty);
  } else {
    const divisionPlaces = { men: 0, women: 0 };
    entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "public-bracket-card";
      const cardPlace = document.createElement("span");
      cardPlace.className = "public-card-place";
      divisionPlaces[entry.scope] += 1;
      cardPlace.textContent = `${entry.scope === "men" ? "M" : "W"}${String(divisionPlaces[entry.scope]).padStart(2, "0")}`;
      const cardCopy = document.createElement("div");
      const cardTitle = document.createElement("h3");
      const cardDetails = document.createElement("p");
      const champions = document.createElement("small");
      cardTitle.textContent = entry.title;
      cardDetails.textContent = `by ${entry.displayName} · ${scopeLabel(entry.scope)} · ${ordinal(divisionPlaces[entry.scope])} completed`;
      champions.textContent = entry.champion ? `Champion: ${entry.champion}` : scopeLabel(entry.scope);
      cardCopy.append(cardTitle, cardDetails, champions);
      const cardLink = publicBracketLink(entry);
      card.append(cardPlace, cardCopy, cardLink);
      directory.append(card);
    });
  }

  const rankingCopy = hasCompletedResults() ? "Ranked by live points." : "Ranked by who finished first.";
  const status = `${menEntries.length} men's bracket${menEntries.length === 1 ? "" : "s"} · ${womenEntries.length} women's bracket${womenEntries.length === 1 ? "" : "s"}. ${rankingCopy} Combined entries are split into one bracket per draw.`;
  $("#leaderboard-status").textContent = status;
  $("#directory-status").textContent = status;
  renderPoolForecast(entries);
  renderPickFinder();
}

function renderPublicListError() {
  publicBracketEntries = [];
  publicEntriesLoaded = false;
  const message = "The shared leaderboard could not connect. Saved picks on this device were not changed.";
  $("#leaderboard-status").textContent = message;
  $("#directory-status").textContent = message;
  $("#leaderboard-men-body").replaceChildren(emptyList("Leaderboard temporarily unavailable.", "Open this page again to retry."));
  $("#leaderboard-women-body").replaceChildren(emptyList("Leaderboard temporarily unavailable.", "Open this page again to retry."));
  $("#pool-forecast-grid")?.replaceChildren(emptyList("Pool forecast temporarily unavailable.", "Open this page again to retry."));
  $("#public-bracket-list").replaceChildren(emptyList("Public brackets temporarily unavailable.", "Open this page again to retry."));
  renderPickFinder();
}

async function refreshPublicLists(force = false) {
  $("#leaderboard-status").textContent = "Loading real completed draws…";
  $("#directory-status").textContent = "Loading real completed draws…";
  publicEntriesLoaded = false;
  renderPickFinder();
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

function nextMatchForPlayer(division, drawPosition) {
  return state.nextMatches[division]?.[drawPosition] || null;
}

function playerIsEliminated(division, drawPosition) {
  return Object.values(state.results[division] || {}).some((result) => (
    Number(result.loserDrawPosition) === Number(drawPosition)
  ));
}

function playerCountdownText(match, now = Date.now()) {
  if (!match) return "NEXT · TIME TBD";
  if (match.statusState === "in") return "LIVE NOW";
  if (!match.timeValid) return "NEXT · TIME TBD";

  const remaining = Date.parse(match.startAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "STARTING SOON";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  return days > 0 ? `NEXT · ${days}D ${clock}` : `NEXT · ${clock}`;
}

function updatePlayerCountdowns() {
  const now = Date.now();
  $$(".player-countdown").forEach((countdown) => {
    const match = countdown.dataset.hasSchedule === "true"
      ? {
          startAt: countdown.dataset.startAt,
          timeValid: countdown.dataset.timeValid === "true",
          statusState: countdown.dataset.statusState,
        }
      : null;
    countdown.textContent = playerCountdownText(match, now);
    countdown.classList.toggle("is-live", match?.statusState === "in");
    countdown.classList.toggle("is-tbd", !match || !match.timeValid);
  });
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
  result,
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
  const isSelected = Number(selectedPosition) === player.drawPosition;
  const isOfficialWinner = Number(result?.winnerDrawPosition) === player.drawPosition;
  const isOfficialLoser = Number(result?.loserDrawPosition) === player.drawPosition;
  const isSelectedCorrect = Boolean(result) && isSelected && isOfficialWinner;
  const isSelectedWrong = Boolean(result) && isSelected && !isOfficialWinner;
  const nextMatch = nextMatchForPlayer(division, player.drawPosition);
  const isEliminated = playerIsEliminated(division, player.drawPosition);

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
  if (isOfficialWinner || isSelectedWrong) {
    const resultStatus = document.createElement("span");
    resultStatus.className = `result-label${isSelectedWrong ? " is-wrong" : ""}`;
    resultStatus.textContent = isSelectedCorrect ? "CORRECT" : isSelectedWrong ? "WRONG" : "WINNER";
    name.append(resultStatus);
  }
  const entry = document.createElement("span");
  entry.className = "entry-note";
  if (isEliminated) {
    entry.textContent = "ELIMINATED";
  } else {
    entry.classList.add("player-countdown");
    entry.dataset.hasSchedule = String(Boolean(nextMatch));
    entry.dataset.startAt = nextMatch?.startAt || "";
    entry.dataset.timeValid = String(nextMatch?.timeValid === true);
    entry.dataset.statusState = nextMatch?.statusState || "";
    entry.textContent = playerCountdownText(nextMatch);
    const scheduledTime = nextMatch?.timeValid ? new Date(nextMatch.startAt).toLocaleString() : "Time to be announced";
    entry.title = nextMatch?.venue ? `${scheduledTime} · ${nextMatch.venue}` : scheduledTime;
  }
  copy.append(name, entry);

  const chance = document.createElement("span");
  chance.className = "probability";
  chance.textContent = probability == null ? "—" : `${probability}%`;

  const value = document.createElement("span");
  value.className = `pick-points${isUpset ? " has-upset-bonus" : ""}`;
  value.textContent = points == null ? "—" : `+${points}`;

  button.append(copy, chance, value);
  button.classList.toggle("is-selected", isSelected);
  button.classList.toggle("is-model-pick", isModelPick);
  button.classList.toggle("is-upset", isUpset);
  button.classList.toggle("is-official-winner", isOfficialWinner);
  button.classList.toggle("is-official-loser", isOfficialLoser);
  button.classList.toggle("is-pick-correct", isSelectedCorrect);
  button.classList.toggle("is-pick-wrong", isSelectedWrong);
  button.setAttribute(
    "aria-label",
    `${isSelected ? "Selected: " : "Pick "}${player.seed ? `seed ${player.seed} ` : ""}${player.name}${isSelectedCorrect ? ", correct pick" : isSelectedWrong ? ", wrong pick" : ""}, ${isEliminated ? "eliminated" : playerCountdownText(nextMatch).toLowerCase()}${probability == null ? "" : `, ${probability} percent projected win chance, worth ${points} ${points === 1 ? "point" : "points"} if correct`}`,
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
  const result = officialResult(division, round, matchIndex);
  const selectedPosition = state.picks[division][pickKey(round, matchIndex)];
  const selectedCorrect = Boolean(result) && Number(selectedPosition) === Number(result.winnerDrawPosition);
  const selectedWrong = Boolean(result) && Boolean(selectedPosition) && !selectedCorrect;
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
  if (result) {
    const winnerName = shortPlayerName(playerByPosition(division, result.winnerDrawPosition));
    call.textContent = selectedCorrect
      ? `Correct: ${winnerName}`
      : selectedWrong
        ? `Wrong: ${winnerName} won`
        : `Final: ${winnerName}`;
    card.classList.add("is-final");
    card.classList.toggle("is-pick-correct", selectedCorrect);
    card.classList.toggle("is-pick-wrong", selectedWrong);
  } else if (!projection) {
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
      result,
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
  updatePlayerCountdowns();
}

function renderProgress() {
  if (state.readOnly && completedResultCount(state.activeDivision) > 0) {
    const score = liveScoreForEntry({
      scope: state.activeDivision,
      picks: state.picks[state.activeDivision],
    });
    const wrong = score.decided - score.correct;
    const waiting = 127 - score.decided;
    const accuracy = score.decided ? Math.round((score.correct / score.decided) * 100) : 0;
    $("#progress-copy").textContent = `${score.correct} right · ${wrong} wrong · ${waiting} waiting`;
    $("#progress-percent").textContent = `${score.points.toLocaleString()} pts`;
    $("#progress-bar").style.width = `${accuracy}%`;
    const stats = selectedBracketStats();
    $("#potential-points").textContent = `${stats.points.toLocaleString()} pts`;
    $("#upset-picks").textContent = String(stats.upsets);
    return;
  }
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
      const scroller = $("#bracket-scroller");
      const left = scroller.scrollLeft + column.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
      scroller.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    });
    jumps.append(button);
  });
}

function updateBracketZoomControls() {
  $("#bracket-board").style.zoom = String(bracketZoom);
  $("#zoom-level").textContent = `${Math.round(bracketZoom * 100)}%`;
  $("#zoom-out").disabled = bracketZoom <= MIN_BRACKET_ZOOM;
  $("#zoom-in").disabled = bracketZoom >= MAX_BRACKET_ZOOM;
}

function setBracketZoom(value, preservePosition = true) {
  const scroller = $("#bracket-scroller");
  const oldMaximum = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const progress = preservePosition && oldMaximum > 0 ? scroller.scrollLeft / oldMaximum : 0;
  bracketZoom = Math.min(MAX_BRACKET_ZOOM, Math.max(MIN_BRACKET_ZOOM, Math.round(value * 100) / 100));
  updateBracketZoomControls();
  requestAnimationFrame(() => {
    const newMaximum = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = progress * newMaximum;
  });
}

function fitEntireBracket() {
  const scroller = $("#bracket-scroller");
  const board = $("#bracket-board");
  const fullWidth = board.getBoundingClientRect().width / bracketZoom;
  const fitZoom = (scroller.clientWidth - 4) / fullWidth;
  setBracketZoom(fitZoom, false);
  scroller.scrollTo({ left: 0, behavior: "smooth" });
}

function showBuilder() {
  $("#setup-card").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#builder").hidden = false;
  $("#builder-title").textContent = state.meta.title;
  $("#builder-byline").textContent = `By ${state.meta.displayName}`;
  $("#new-bracket").hidden = state.readOnly;
  $("#return-to-my-bracket").hidden = !state.readOnly;
  $$(".rename-bracket").forEach((button) => { button.hidden = state.readOnly; });
  $("#save-state").lastChild.textContent = state.readOnly
    ? " Shared bracket · read only"
    : isLocked()
      ? " Brackets are locked"
      : " Saved on this device";
  updateBracketZoomControls();
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

  if (isDivisionComplete(division)) {
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

  if (completedDivisions().length) {
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
  state.divisionCompletedAt = { men: "", women: "" };
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  $("#builder").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#setup-card").hidden = false;
  $("#bracket-setup").reset();
  $("#bracket-setup input[value='both']").checked = true;
}

function returnToMyBracket() {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  state.meta = { displayName: "", title: "My 2026 US Open Bracket", scope: "both" };
  state.picks = { men: {}, women: {} };
  state.activeDivision = "men";
  state.started = false;
  state.submitted = false;
  state.readOnly = false;
  state.entryId = "";
  state.completedAt = "";
  state.divisionCompletedAt = { men: "", women: "" };

  if (loadDraft()) {
    showLoadedDraft();
    return;
  }

  $("#builder").hidden = true;
  $("#submission-card").hidden = true;
  $("#success-card").hidden = true;
  $("#setup-card").hidden = false;
  showView("create");
  showToast("Your shared view is closed. Start or resume your bracket here.");
}

function showLoadedDraft() {
  $("#display-name").value = state.meta.displayName;
  $("#bracket-title").value = state.meta.title;
  const savedScope = $(`#bracket-setup input[value="${state.meta.scope}"]`);
  if (savedScope) savedScope.checked = true;
  $("#bracket-setup button[type='submit']").firstChild.textContent = "Resume saved bracket ";
  showView("create");
  showBuilder();
  showToast("Your saved bracket is ready to continue.");
  if (completedDivisions().length) {
    ensureCompletionIdentity();
    saveDraft();
    syncCompletedBracket();
  }
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
      const view = button.dataset.viewLink;
      if (view === "create" && state.readOnly) {
        returnToMyBracket();
        return;
      }
      showView(view);
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
  $("#return-to-my-bracket").addEventListener("click", returnToMyBracket);
  $("#zoom-out").addEventListener("click", () => setBracketZoom(bracketZoom - BRACKET_ZOOM_STEP));
  $("#zoom-in").addEventListener("click", () => setBracketZoom(bracketZoom + BRACKET_ZOOM_STEP));
  $("#zoom-fit").addEventListener("click", fitEntireBracket);
  $("#pick-player-search").addEventListener("input", renderPickFinder);
  $("#pick-player-search").addEventListener("change", renderPickFinder);
  $("#pick-round-select").addEventListener("change", renderPickFinder);
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
  setInterval(updatePlayerCountdowns, PLAYER_COUNTDOWN_REFRESH_MS);
  setInterval(() => refreshLiveResults({ repaint: true }), LIVE_RESULTS_REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.data.men && state.data.women) {
      refreshLiveResults({ repaint: true });
    }
  });
  window.addEventListener("online", () => {
    if (state.data.men && state.data.women) refreshLiveResults({ repaint: true });
  });

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
    await loadSavedResults();
    refreshLiveResults({ repaint: true });
    populatePickFinderPlayers();
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

    if (loadDraft()) showLoadedDraft();
  } catch (error) {
    console.error(error);
    $("#setup-card").innerHTML = `<div class="empty-state"><span aria-hidden="true">!</span><h3>The verified draw could not load</h3><p>Please refresh the page. No replacement players or invented matchups will be shown.</p></div>`;
  }
}

initialize();
