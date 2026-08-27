import { describe, expect, it } from "vitest";
import { buildMatchDefinitions, entrantsForMatch, isBracketComplete, replaceDrawSlot, selectWinner } from "../src/lib/bracket";
import { draws } from "../src/lib/data";
import type { BracketPicks } from "../src/lib/types";

describe("bracket advancement", () => {
  it("builds adjacent first-round matchups", () => {
    const first = buildMatchDefinitions("women")[0];
    expect([first.sourceOne, first.sourceTwo]).toEqual([1, 2]);
    expect(entrantsForMatch(first, {})).toEqual([1, 2]);
  });

  it("requires every selected draw match before submission", () => {
    const completeMen = Object.fromEntries(buildMatchDefinitions("men").map((match) => [match.key, 1]));
    expect(isBracketComplete("men", completeMen)).toBe(true);
    expect(isBracketComplete("both", completeMen)).toBe(false);
  });

  it("replaces a qualifier label without moving or replacing the slot", () => {
    const original = draws.men.players.find((player) => player.entryType === "tbd")!;
    const updated = replaceDrawSlot(draws.men.players, original.drawPosition, { name: "Verified Qualifier", countryCode: "USA", seed: null, entryType: "qualifier" });
    expect(updated).toHaveLength(128);
    expect(updated[original.drawPosition - 1]).toMatchObject({ drawPosition: original.drawPosition, name: "Verified Qualifier", entryType: "qualifier" });
  });

  it("clears later picks invalidated by an early change", () => {
    const picks: BracketPicks = {
      "men-r1-m1": 1, "men-r1-m2": 3, "men-r2-m1": 1,
      "men-r1-m3": 5, "men-r1-m4": 7, "men-r2-m2": 5,
      "men-r3-m1": 1,
    };
    const result = selectWinner("men", picks, "men-r1-m1", 2);
    expect(result.picks["men-r1-m1"]).toBe(2);
    expect(result.picks["men-r2-m1"]).toBeUndefined();
    expect(result.picks["men-r3-m1"]).toBeUndefined();
    expect(result.picks["men-r2-m2"]).toBe(5);
    expect(result.cleared).toEqual(["men-r2-m1", "men-r3-m1"]);
  });
});
