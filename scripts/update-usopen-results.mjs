#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis";
const USER_AGENT = "open-bracket-live-results/1.0 (github.com/alexander-bain/Dexter-Bain)";
const TOURNAMENT_NAME = "US Open";
const TOURNAMENT_YEAR = 2026;

const ROUND_BY_LABEL = new Map([
  ["round 1", 1],
  ["round 2", 2],
  ["round 3", 3],
  ["round 4", 4],
  ["quarterfinal", 5],
  ["quarterfinals", 5],
  ["semifinal", 6],
  ["semifinals", 6],
  ["final", 7],
]);

export function normalizePlayerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function playerNameKeys(value) {
  const normalized = normalizePlayerName(value);
  if (!normalized) return [];
  return [normalized, `tokens:${normalized.split(" ").sort().join(" ")}`];
}

export function buildPlayerIndex(draw) {
  const byName = new Map();
  for (const player of draw.players || []) {
    if (player.entryType === "tbd") continue;
    for (const key of playerNameKeys(player.name)) {
      const matches = byName.get(key) || [];
      matches.push(player);
      byName.set(key, matches);
    }
  }
  return byName;
}

function tournamentGrouping(payload, groupingSlug) {
  const event = (payload?.events || []).find((candidate) => (
    candidate?.name === TOURNAMENT_NAME
      && candidate?.season?.year === TOURNAMENT_YEAR
      && candidate?.major === true
  ));
  return (event?.groupings || []).find((candidate) => candidate?.grouping?.slug === groupingSlug) || null;
}

function competitorName(competitor) {
  return competitor?.athlete?.displayName || competitor?.roster?.displayName || "";
}

function competitorCountryCode(competitor) {
  const href = competitor?.athlete?.flag?.href || "";
  const match = href.match(/\/([a-z]{3})\.(?:png|svg)(?:\?|$)/i);
  return match ? match[1].toUpperCase() : null;
}

export function resolveRoundOnePlaceholders(draw, payload, { groupingSlug, observedAt }) {
  const nextDraw = structuredClone(draw);
  const grouping = tournamentGrouping(payload, groupingSlug);
  if (!grouping) return { draw: nextDraw, updates: [] };

  const playerIndex = buildPlayerIndex(nextDraw);
  const playerByPosition = new Map((nextDraw.players || []).map((player) => [player.drawPosition, player]));
  const updates = [];
  for (const competition of grouping.competitions || []) {
    if (String(competition?.round?.displayName || "").toLowerCase() !== "round 1") continue;
    const competitors = competition.competitors || [];
    if (competitors.length !== 2) continue;

    const matches = competitors.map((competitor) => onePlayer(playerIndex, competitorName(competitor)));
    const knownSlot = matches.findIndex(Boolean);
    if (knownSlot < 0 || matches.filter(Boolean).length !== 1) continue;
    const unknownSlot = knownSlot === 0 ? 1 : 0;
    const unknownName = competitorName(competitors[unknownSlot]);
    if (!unknownName || normalizePlayerName(unknownName) === "tbd") continue;
    if (onePlayer(playerIndex, unknownName)) continue;

    const knownPosition = matches[knownSlot].drawPosition;
    const placeholderPosition = knownPosition % 2 === 1 ? knownPosition + 1 : knownPosition - 1;
    const placeholder = playerByPosition.get(placeholderPosition);
    if (!placeholder || placeholder.entryType !== "tbd") continue;

    placeholder.name = unknownName;
    placeholder.countryCode = competitorCountryCode(competitors[unknownSlot]);
    placeholder.entryType = "qualifier-or-lucky-loser";
    for (const key of playerNameKeys(unknownName)) playerIndex.set(key, [placeholder]);
    updates.push({ drawPosition: placeholderPosition, name: unknownName });
  }

  return { draw: nextDraw, updates };
}

function onePlayer(byName, name) {
  for (const key of playerNameKeys(name)) {
    const matches = byName.get(key) || [];
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function resultKey(result) {
  return `${result.division}-${result.round}-${result.matchIndex}`;
}

function scoreLine(competitor) {
  return (competitor?.linescores || []).map((set) => ({
    games: Number(set.value || 0),
    tiebreak: set.tiebreak == null ? null : Number(set.tiebreak),
  }));
}

export function parseCompletedResults(payload, { division, groupingSlug, playerIndex, observedAt }) {
  const grouping = tournamentGrouping(payload, groupingSlug);
  if (!grouping) return { results: [], skipped: [] };

  const results = [];
  const skipped = [];
  for (const competition of grouping.competitions || []) {
    const roundLabel = String(competition?.round?.displayName || "").toLowerCase();
    const round = ROUND_BY_LABEL.get(roundLabel);
    if (!round || competition?.status?.type?.completed !== true) continue;

    const competitors = competition.competitors || [];
    const winner = competitors.find((competitor) => competitor?.winner === true);
    const loser = competitors.find((competitor) => competitor !== winner);
    const winnerName = competitorName(winner);
    const loserName = competitorName(loser);
    const winnerPlayer = onePlayer(playerIndex, winnerName);
    const loserPlayer = onePlayer(playerIndex, loserName);
    if (!winnerPlayer || !loserPlayer) {
      skipped.push({ sourceMatchId: String(competition.id || ""), round, winnerName, loserName });
      continue;
    }

    const bracketSize = 2 ** round;
    const winnerMatchIndex = Math.ceil(winnerPlayer.drawPosition / bracketSize);
    const loserMatchIndex = Math.ceil(loserPlayer.drawPosition / bracketSize);
    if (winnerMatchIndex !== loserMatchIndex) {
      skipped.push({ sourceMatchId: String(competition.id || ""), round, winnerName, loserName });
      continue;
    }

    results.push({
      division,
      round,
      matchIndex: winnerMatchIndex,
      winnerDrawPosition: winnerPlayer.drawPosition,
      loserDrawPosition: loserPlayer.drawPosition,
      winnerName: winnerPlayer.name,
      loserName: loserPlayer.name,
      winnerScore: scoreLine(winner),
      loserScore: scoreLine(loser),
      sourceMatchId: String(competition.id || ""),
      observedAt,
    });
  }

  return { results, skipped };
}

export function mergeResults(existingResults, freshResults) {
  const merged = new Map();
  for (const result of existingResults || []) merged.set(resultKey(result), result);
  for (const result of freshResults || []) merged.set(resultKey(result), result);
  return [...merged.values()].sort((first, second) => (
    first.division.localeCompare(second.division)
      || first.round - second.round
      || first.matchIndex - second.matchIndex
  ));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Live feed returned ${response.status}`);
  return response.json();
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeDrawUpdates(filePath, draw, updates) {
  let source = await readFile(filePath, "utf8");
  const players = new Map((draw.players || []).map((player) => [player.drawPosition, player]));
  for (const update of updates) {
    const player = players.get(update.drawPosition);
    if (!player) throw new Error(`Draw position ${update.drawPosition} disappeared during update`);
    const countryCode = player.countryCode == null ? "null" : JSON.stringify(player.countryCode);
    const seed = player.seed == null ? "null" : String(player.seed);
    const replacement = `    { "drawPosition": ${player.drawPosition}, "name": ${JSON.stringify(player.name)}, "countryCode": ${countryCode}, "seed": ${seed}, "entryType": ${JSON.stringify(player.entryType)} },`;
    const pattern = new RegExp(`^    \\{ "drawPosition": ${player.drawPosition},.*\\},$`, "m");
    if (!pattern.test(source)) throw new Error(`Could not update draw position ${player.drawPosition} safely`);
    source = source.replace(pattern, replacement);
  }
  await writeFile(filePath, source, "utf8");
}

function stableResults(results) {
  return JSON.stringify((results || []).map(({ observedAt: _observedAt, ...result }) => result));
}

export async function updateResults({ rootDirectory } = {}) {
  const root = rootDirectory || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dataDirectory = path.join(root, "usopen", "data");
  const [menDraw, womenDraw, currentDocument, atpPayload, wtaPayload] = await Promise.all([
    readJson(path.join(dataDirectory, "men.json")),
    readJson(path.join(dataDirectory, "women.json")),
    readJson(path.join(dataDirectory, "results.json"), { results: [] }),
    fetchJson(`${ESPN_BASE_URL}/atp/scoreboard`),
    fetchJson(`${ESPN_BASE_URL}/wta/scoreboard`),
  ]);

  const observedAt = new Date().toISOString();
  const resolvedMen = resolveRoundOnePlaceholders(menDraw, atpPayload, {
    groupingSlug: "mens-singles",
    observedAt,
  });
  const resolvedWomen = resolveRoundOnePlaceholders(womenDraw, wtaPayload, {
    groupingSlug: "womens-singles",
    observedAt,
  });
  const men = parseCompletedResults(atpPayload, {
    division: "men",
    groupingSlug: "mens-singles",
    playerIndex: buildPlayerIndex(resolvedMen.draw),
    observedAt,
  });
  const women = parseCompletedResults(wtaPayload, {
    division: "women",
    groupingSlug: "womens-singles",
    playerIndex: buildPlayerIndex(resolvedWomen.draw),
    observedAt,
  });
  const results = mergeResults(currentDocument.results, [...men.results, ...women.results]);
  const skipped = [...men.skipped, ...women.skipped];
  for (const match of skipped) {
    console.warn(`Skipped unmapped ${match.roundLabel || `round ${match.round}`} match ${match.sourceMatchId}: ${match.winnerName} vs ${match.loserName}`);
  }
  const resultsChanged = stableResults(results) !== stableResults(currentDocument.results);
  const drawsChanged = resolvedMen.updates.length + resolvedWomen.updates.length > 0;
  if (!resultsChanged && !drawsChanged) {
    console.log(`No new completed matches. ${results.length} result(s) already saved.`);
    return { changed: false, results, skipped };
  }

  if (resolvedMen.updates.length) {
    await writeDrawUpdates(path.join(dataDirectory, "men.json"), resolvedMen.draw, resolvedMen.updates);
  }
  if (resolvedWomen.updates.length) {
    await writeDrawUpdates(path.join(dataDirectory, "women.json"), resolvedWomen.draw, resolvedWomen.updates);
  }
  if (resultsChanged) {
    const document = {
      tournament: "2026 US Open",
      updatedAt: observedAt,
      source: "ESPN public tennis feed (unofficial)",
      note: "Completed main-draw singles matches only. Existing results are preserved if the live feed temporarily omits them.",
      results,
    };
    await writeFile(path.join(dataDirectory, "results.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
  console.log(`Saved ${results.length} completed match result(s), resolved ${resolvedMen.updates.length + resolvedWomen.updates.length} draw placeholder(s), and skipped ${men.skipped.length + women.skipped.length} unmapped result(s) safely.`);
  return { changed: true, results, skipped };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  updateResults().catch((error) => {
    console.error(`US Open live-result update failed: ${error.message}`);
    process.exitCode = 1;
  });
}
