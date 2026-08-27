import { describe, expect, it } from "vitest";
import { scoreBracket } from "../src/lib/scoring";
import type { OfficialResult } from "../src/lib/types";

describe("scoring", () => {
  const results: OfficialResult[] = [
    { key: "men-r1-m1", round: 1, status: "completed", participantOne: 1, participantTwo: 2, winner: 1 },
    { key: "men-r1-m2", round: 1, status: "completed", participantOne: 3, participantTwo: 4, winner: 4 },
    { key: "men-r2-m1", round: 2, status: "scheduled", participantOne: 1, participantTwo: 4, winner: null },
    { key: "men-r7-m1", round: 7, status: "scheduled", participantOne: null, participantTwo: null, winner: null },
  ];

  it("awards round values for correct completed picks", () => {
    expect(scoreBracket({ "men-r1-m1": 1, "men-r1-m2": 3 }, results)).toMatchObject({ points: 1, correctPicks: 1, scoredPicks: 2 });
  });

  it("counts only still-alive future picks toward maximum possible", () => {
    const score = scoreBracket({ "men-r1-m1": 1, "men-r1-m2": 3, "men-r2-m1": 1, "men-r7-m1": 3 }, results);
    expect(score.points).toBe(1);
    expect(score.maximumPossible).toBe(3);
  });

  it("combines independently scored men's and women's draws", () => {
    const women: OfficialResult[] = [{ key: "women-r2-m1", round: 2, status: "completed", participantOne: 1, participantTwo: 4, winner: 4 }];
    const menScore = scoreBracket({ "men-r1-m1": 1 }, results);
    const womenScore = scoreBracket({ "women-r2-m1": 4 }, women);
    expect(menScore.points + womenScore.points).toBe(3);
    expect(menScore.correctPicks + womenScore.correctPicks).toBe(2);
  });
});
