import { ROUND_POINTS } from "./bracket";
import type { BracketPicks, OfficialResult, ScoreSummary } from "./types";

export function scoreBracket(picks: BracketPicks, results: OfficialResult[]): ScoreSummary {
  const eliminated = new Set<number>();
  for (const result of results) {
    if (result.status !== "completed" || !result.winner) continue;
    if (result.participantOne && result.participantOne !== result.winner) eliminated.add(result.participantOne);
    if (result.participantTwo && result.participantTwo !== result.winner) eliminated.add(result.participantTwo);
  }

  let points = 0;
  let maximumPossible = 0;
  let correctPicks = 0;
  let scoredPicks = 0;

  for (const result of results) {
    const pick = picks[result.key];
    if (!pick) continue;
    const value = ROUND_POINTS[result.round];
    if (result.status === "completed") {
      scoredPicks += 1;
      if (pick === result.winner) {
        points += value;
        maximumPossible += value;
        correctPicks += 1;
      }
    } else if (!eliminated.has(pick)) {
      maximumPossible += value;
    }
  }

  return { points, maximumPossible, correctPicks, scoredPicks };
}
