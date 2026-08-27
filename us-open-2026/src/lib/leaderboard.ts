import type { LeaderboardRow } from "./types";

export function sortLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) =>
    b.combinedScore - a.combinedScore ||
    b.maximumPossible - a.maximumPossible ||
    b.correctPicks - a.correctPicks ||
    new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime() ||
    a.displayName.localeCompare(b.displayName),
  );
}
