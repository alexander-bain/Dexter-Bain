#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  buildPlayerIndex,
  mergeResults,
  normalizePlayerName,
  parseCompletedResults,
  parsePlayerNextMatches,
  resolveRoundOnePlaceholders,
} from "../usopen/live-results-core.js";

export {
  buildPlayerIndex,
  mergeResults,
  normalizePlayerName,
  parseCompletedResults,
  parsePlayerNextMatches,
  resolveRoundOnePlaceholders,
};

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis";
const USER_AGENT = "open-bracket-live-results/1.0 (github.com/alexander-bain/Dexter-Bain)";

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
