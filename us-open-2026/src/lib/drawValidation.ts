import { z } from "zod";

const playerSchema = z.object({
  drawPosition: z.number().int().min(1).max(128),
  name: z.string().min(2),
  countryCode: z.string().length(3).nullable(),
  seed: z.number().int().min(1).max(32).nullable(),
  entryType: z.enum(["seed", "direct", "wildcard", "qualifier", "lucky-loser", "tbd"]),
});

export const drawSchema = z.object({
  division: z.enum(["men", "women"]),
  sourceMetadata: z.array(z.object({
    sourceName: z.string().min(3),
    sourcePage: z.string().url(),
    checkedAt: z.string().datetime(),
  })).min(1),
  players: z.array(playerSchema).length(128),
}).superRefine((draw, context) => {
  const positions = draw.players.map((player) => player.drawPosition);
  if (new Set(positions).size !== 128 || positions.some((position, index) => position !== index + 1)) {
    context.addIssue({ code: "custom", path: ["players"], message: "Draw positions must be unique and ordered 1 through 128." });
  }
  const seeds = draw.players.filter((player) => player.seed !== null).map((player) => player.seed);
  if (new Set(seeds).size !== seeds.length) {
    context.addIssue({ code: "custom", path: ["players"], message: "Seed numbers must be unique within a division." });
  }
});
