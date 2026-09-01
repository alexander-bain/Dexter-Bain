#!/usr/bin/env node

import assert from "node:assert/strict";
import { simulateDivisionPool } from "../usopen/pool-simulator-core.js";

const players = Array.from({ length: 128 }, (_, index) => ({
  drawPosition: index + 1,
  name: `Player ${index + 1}`,
  entryType: "direct",
  seed: index < 32 ? index + 1 : null,
}));

function completePicks(useBlockEnd) {
  const picks = {};
  for (let round = 1; round <= 7; round += 1) {
    const size = 2 ** round;
    const matches = 2 ** (7 - round);
    for (let matchIndex = 1; matchIndex <= matches; matchIndex += 1) {
      picks[`${round}-${matchIndex}`] = useBlockEnd
        ? matchIndex * size
        : (matchIndex - 1) * size + 1;
    }
  }
  return picks;
}

const entries = [
  { displayName: "First", title: "Favorites", picks: completePicks(false) },
  { displayName: "Second", title: "Underdogs", picks: completePicks(true) },
];

const results = [{
  division: "men",
  round: 1,
  matchIndex: 1,
  winnerDrawPosition: 1,
  loserDrawPosition: 2,
}];

const first = simulateDivisionPool({ entries, players, results, iterations: 800, seed: "fixed-test" });
const second = simulateDivisionPool({ entries, players, results, iterations: 800, seed: "fixed-test" });

assert.equal(first.iterations, 800);
assert.equal(first.forecasts.length, 2);
assert.equal(Math.round(first.forecasts.reduce((total, forecast) => total + forecast.winChance, 0)), 100);
assert.equal(first.importantMatch.round, 1);
assert.equal(first.importantMatch.players[0].support, 1);
assert.equal(first.importantMatch.players[1].support, 1);
assert.deepEqual(
  first.forecasts.map((forecast) => [forecast.entry.title, forecast.winChance, forecast.projectedPoints]),
  second.forecasts.map((forecast) => [forecast.entry.title, forecast.winChance, forecast.projectedPoints]),
);

const favorite = first.forecasts.find((forecast) => forecast.entry.title === "Favorites");
const underdog = first.forecasts.find((forecast) => forecast.entry.title === "Underdogs");
assert.equal(favorite.currentPoints, 1);
assert.equal(underdog.currentPoints, 0);
assert.ok(favorite.maxPossiblePoints >= favorite.currentPoints);
assert.ok(favorite.bestPath);

console.log("US Open pool-simulator tests passed.");
