import { describe, expect, it } from "vitest";
import { buildMatchDefinitions } from "../src/lib/bracket";
import { draws } from "../src/lib/data";
import { drawSchema } from "../src/lib/drawValidation";

describe("official draw data", () => {
  it.each(["men", "women"] as const)("validates the %s draw", (division) => {
    const draw = drawSchema.parse(draws[division]);
    expect(draw.players).toHaveLength(128);
    expect(draw.players.map((player) => player.drawPosition)).toEqual(Array.from({ length: 128 }, (_, index) => index + 1));
    expect(draw.players.filter((player) => player.seed)).toHaveLength(32);
    expect(buildMatchDefinitions(division)).toHaveLength(127);
  });

  it("preserves the official men's quarter anchors", () => {
    expect(draws.men.players[0].name).toBe("Alexander Zverev");
    expect(draws.men.players[31].name).toBe("Alex de Minaur");
    expect(draws.men.players[32].name).toBe("Felix Auger-Aliassime");
    expect(draws.men.players[63].name).toBe("Flavio Cobolli");
    expect(draws.men.players[95].name).toBe("Novak Djokovic");
    expect(draws.men.players[127].name).toBe("Carlos Alcaraz");
  });

  it("keeps unresolved slots explicit", () => {
    for (const division of ["men", "women"] as const) {
      const unresolved = draws[division].players.filter((player) => player.entryType === "tbd");
      expect(unresolved.length).toBeGreaterThan(0);
      expect(unresolved.every((player) => player.name.includes("TBD"))).toBe(true);
    }
  });
});
