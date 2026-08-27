import { describe, expect, it } from "vitest";
import { sortLeaderboard } from "../src/lib/leaderboard";

describe("leaderboard ordering", () => {
  it("uses score, maximum, correct picks, then earliest submission", () => {
    const base = { displayName: "A", slug: "a", submittedAt: "2026-08-27T10:00:00Z" };
    const rows = sortLeaderboard([
      { ...base, id: "late", combinedScore: 20, maximumPossible: 200, correctPicks: 8, submittedAt: "2026-08-27T11:00:00Z" },
      { ...base, id: "leader", combinedScore: 21, maximumPossible: 100, correctPicks: 4 },
      { ...base, id: "max", combinedScore: 20, maximumPossible: 201, correctPicks: 7 },
      { ...base, id: "early", combinedScore: 20, maximumPossible: 200, correctPicks: 8 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["leader", "max", "early", "late"]);
  });
});
