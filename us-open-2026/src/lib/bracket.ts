import type { BracketPicks, Division, DrawPlayer, MatchDefinition, RoundNumber } from "./types";

export const ROUND_NAMES = ["", "Round of 128", "Round of 64", "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"] as const;
export const ROUND_POINTS = [0, 1, 2, 4, 8, 16, 32, 64] as const;

export function matchKey(division: Division, round: number, matchIndex: number) {
  return `${division}-r${round}-m${matchIndex}`;
}

export function buildMatchDefinitions(division: Division): MatchDefinition[] {
  const matches: MatchDefinition[] = [];
  for (let round = 1 as RoundNumber; round <= 7; round = (round + 1) as RoundNumber) {
    const count = 2 ** (7 - round);
    for (let matchIndex = 1; matchIndex <= count; matchIndex += 1) {
      matches.push({
        key: matchKey(division, round, matchIndex),
        division,
        round,
        matchIndex,
        sourceOne: round === 1 ? (matchIndex - 1) * 2 + 1 : matchKey(division, round - 1, matchIndex * 2 - 1),
        sourceTwo: round === 1 ? (matchIndex - 1) * 2 + 2 : matchKey(division, round - 1, matchIndex * 2),
      });
    }
  }
  return matches;
}

export function entrantsForMatch(match: MatchDefinition, picks: BracketPicks): number[] {
  const entrants = [match.sourceOne, match.sourceTwo]
    .map((source) => (typeof source === "number" ? source : picks[source]))
    .filter((position): position is number => Number.isInteger(position));
  return [...new Set(entrants)];
}

export function normalizePicks(division: Division, picks: BracketPicks) {
  const next = { ...picks };
  const cleared: string[] = [];
  for (const match of buildMatchDefinitions(division)) {
    const selected = next[match.key];
    if (selected && !entrantsForMatch(match, next).includes(selected)) {
      delete next[match.key];
      cleared.push(match.key);
    }
  }
  return { picks: next, cleared };
}

export function selectWinner(
  division: Division,
  current: BracketPicks,
  key: string,
  drawPosition: number,
) {
  return normalizePicks(division, { ...current, [key]: drawPosition });
}

export function completedPickCount(division: Division, picks: BracketPicks) {
  return buildMatchDefinitions(division).filter((match) => Boolean(picks[match.key])).length;
}

export function requiredPickCount(scope: Division | "both") {
  return scope === "both" ? 254 : 127;
}

export function isBracketComplete(scope: Division | "both", picks: BracketPicks) {
  if (scope === "both") return completedPickCount("men", picks) === 127 && completedPickCount("women", picks) === 127;
  return completedPickCount(scope, picks) === 127;
}

export function replaceDrawSlot(players: DrawPlayer[], drawPosition: number, replacement: Omit<DrawPlayer, "drawPosition">) {
  if (!players.some((player) => player.drawPosition === drawPosition)) throw new Error(`Draw position ${drawPosition} does not exist.`);
  return players.map((player) => player.drawPosition === drawPosition ? { ...replacement, drawPosition } : player);
}

export function findPlayer(players: DrawPlayer[], drawPosition: number | undefined) {
  return players.find((player) => player.drawPosition === drawPosition) ?? null;
}
