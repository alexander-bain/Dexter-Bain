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
  const tokens = normalized.split(" ");
  const keys = [normalized, `tokens:${[...tokens].sort().join(" ")}`];
  // ESPN occasionally expands a nickname; onePlayer only accepts this key when it is unique.
  if (tokens.length > 1) keys.push(`initial-last:${tokens[0][0]}:${tokens.at(-1)}`);
  return keys;
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

function onePlayer(byName, name) {
  for (const key of playerNameKeys(name)) {
    const matches = byName.get(key) || [];
    if (matches.length === 1) return matches[0];
  }
  return null;
}

export function resolveRoundOnePlaceholders(draw, payload, { groupingSlug }) {
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

function schedulePriority(match) {
  if (match.statusState === "in") return 0;
  if (match.timeValid) return 1;
  return 2;
}

function earlierSchedule(first, second) {
  const priorityDifference = schedulePriority(first) - schedulePriority(second);
  if (priorityDifference !== 0) return priorityDifference < 0 ? first : second;

  const firstTime = Date.parse(first.startAt);
  const secondTime = Date.parse(second.startAt);
  if (Number.isNaN(firstTime)) return second;
  if (Number.isNaN(secondTime)) return first;
  return firstTime <= secondTime ? first : second;
}

export function parsePlayerNextMatches(payload, { division, groupingSlug, playerIndex, observedAt }) {
  const grouping = tournamentGrouping(payload, groupingSlug);
  if (!grouping) return { matches: {}, skipped: [] };

  const matches = new Map();
  const skipped = [];
  for (const competition of grouping.competitions || []) {
    const roundLabel = String(competition?.round?.displayName || "").toLowerCase();
    const round = ROUND_BY_LABEL.get(roundLabel);
    const statusState = String(competition?.status?.type?.state || "").toLowerCase();
    if (!round || competition?.status?.type?.completed === true || statusState === "post") continue;

    const startAt = String(competition?.startDate || competition?.date || "");
    if (statusState !== "in" && Number.isNaN(Date.parse(startAt))) continue;

    for (const competitor of competition.competitors || []) {
      const name = competitorName(competitor);
      if (!name || normalizePlayerName(name) === "tbd") continue;
      const player = onePlayer(playerIndex, name);
      if (!player) {
        skipped.push({ sourceMatchId: String(competition.id || ""), round, playerName: name });
        continue;
      }

      const match = {
        division,
        round,
        sourceMatchId: String(competition.id || ""),
        startAt,
        timeValid: competition?.timeValid === true,
        statusState,
        statusDetail: String(competition?.status?.type?.shortDetail || competition?.status?.type?.detail || ""),
        venue: String(competition?.venue?.court || competition?.venue?.fullName || ""),
        observedAt,
      };
      const existing = matches.get(player.drawPosition);
      matches.set(player.drawPosition, existing ? earlierSchedule(existing, match) : match);
    }
  }

  return { matches: Object.fromEntries(matches), skipped };
}

function resultKey(result) {
  return `${result.division}-${result.round}-${result.matchIndex}`;
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
