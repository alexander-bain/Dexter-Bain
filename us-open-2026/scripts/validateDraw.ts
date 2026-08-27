import { buildMatchDefinitions } from "../src/lib/bracket";
import { draws } from "../src/lib/data";
import { drawSchema } from "../src/lib/drawValidation";

for (const division of ["men", "women"] as const) {
  const draw = drawSchema.parse(draws[division]);
  const matches = buildMatchDefinitions(division);
  const names = draw.players.map((player) => player.name.toLocaleLowerCase());
  const duplicateNames = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
  if (duplicateNames.length) throw new Error(`${division}: duplicate player names: ${duplicateNames.join(", ")}`);
  if (matches.filter((match) => match.round === 1).length !== 64) throw new Error(`${division}: expected 64 first-round matches.`);
  if (matches.length !== 127) throw new Error(`${division}: expected 127 matches.`);
  for (const match of matches.filter((item) => item.round > 1)) {
    if (typeof match.sourceOne !== "string" || typeof match.sourceTwo !== "string") throw new Error(`${division}: invalid feeder for ${match.key}.`);
  }
  console.log(`${division}: 128 slots, 64 first-round matches, 127 total matches, ${draw.players.filter((player) => player.entryType === "tbd").length} unresolved slots.`);
}
