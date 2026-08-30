#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildPlayerIndex, mergeResults, normalizePlayerName, parseCompletedResults, resolveRoundOnePlaceholders } from "./update-usopen-results.mjs";

const players = [
  { drawPosition: 1, name: "Alexander Zverev", entryType: "seed" },
  { drawPosition: 2, name: "Lorenzo Sonego", entryType: "direct" },
  { drawPosition: 3, name: "Félix Auger-Aliassime", entryType: "seed" },
  { drawPosition: 4, name: "Qualifier/Lucky Loser TBD 1", entryType: "tbd" },
];

const competition = ({ id, round, winner, loser, completed = true }) => ({
  id,
  round: { displayName: round },
  status: { type: { completed } },
  competitors: [
    { winner: true, athlete: { displayName: winner }, linescores: [{ value: 6 }, { value: 6 }] },
    { winner: false, athlete: { displayName: loser }, linescores: [{ value: 3 }, { value: 4 }] },
  ],
});

const payload = {
  events: [{
    name: "US Open",
    major: true,
    season: { year: 2026 },
    groupings: [{
      grouping: { slug: "mens-singles" },
      competitions: [
        competition({ id: 101, round: "Round 1", winner: "Alexander Zverev", loser: "Lorenzo Sonego" }),
        competition({ id: 102, round: "Round 2", winner: "Alexander Zverev", loser: "Felix Auger-Aliassime" }),
        competition({ id: 103, round: "Qualifying Final", winner: "Alexander Zverev", loser: "Lorenzo Sonego" }),
        competition({ id: 104, round: "Round 1", winner: "Unknown Player", loser: "Lorenzo Sonego" }),
        competition({ id: 105, round: "Round 1", winner: "Felix Auger-Aliassime", loser: "Qualifier Name", completed: false }),
      ],
    }],
  }],
};

assert.equal(normalizePlayerName("Félix Auger–Aliassime"), "felix auger aliassime");
const parsed = parseCompletedResults(payload, {
  division: "men",
  groupingSlug: "mens-singles",
  playerIndex: buildPlayerIndex({ players }),
  observedAt: "2026-08-30T18:00:00.000Z",
});

assert.equal(parsed.results.length, 2);
assert.deepEqual(parsed.results.map((result) => [result.round, result.matchIndex, result.winnerDrawPosition]), [
  [1, 1, 1],
  [2, 1, 1],
]);
assert.equal(parsed.skipped.length, 1);

const resolved = resolveRoundOnePlaceholders({ players, sourceMetadata: [] }, payload, {
  groupingSlug: "mens-singles",
  observedAt: "2026-08-30T18:00:00.000Z",
});
assert.equal(resolved.updates.length, 1);
assert.equal(resolved.draw.players[3].name, "Qualifier Name");
assert.equal(resolved.draw.players[3].drawPosition, 4);
assert.equal(resolved.draw.players[3].entryType, "qualifier-or-lucky-loser");

const prior = [{ ...parsed.results[0], winnerDrawPosition: 2, loserDrawPosition: 1 }];
const merged = mergeResults(prior, parsed.results);
assert.equal(merged.length, 2);
assert.equal(merged[0].winnerDrawPosition, 1);

console.log("US Open live-result mapping tests passed.");
