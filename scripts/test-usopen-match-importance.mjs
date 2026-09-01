#!/usr/bin/env node

import assert from "node:assert/strict";
import { rateMatchImportance } from "../usopen/match-importance-core.js";

const sharedPickAhead = rateMatchImportance({
  entries: [
    { id: "first", points: 30, pick: 12, pickPoints: 16 },
    { id: "second", points: 28, pick: 12, pickPoints: 16 },
    { id: "current", points: 24, pick: 12, pickPoints: 16 },
  ],
  currentEntryId: "current",
  selectedPosition: 12,
  selectedPoints: 16,
  round: 5,
});
assert.equal(sharedPickAhead.rating, 1);
assert.match(sharedPickAhead.reason, /cannot move you past/);

const differentLatePick = rateMatchImportance({
  entries: [
    { id: "first", points: 30, pick: 11, pickPoints: 16 },
    { id: "second", points: 28, pick: 11, pickPoints: 16 },
    { id: "current", points: 24, pick: 12, pickPoints: 64 },
  ],
  currentEntryId: "current",
  selectedPosition: 12,
  selectedPoints: 64,
  round: 6,
});
assert.ok(differentLatePick.rating >= 8);
assert.match(differentLatePick.reason, /help you move up/);

const protectedLead = rateMatchImportance({
  entries: [
    { id: "current", points: 40, pick: 12, pickPoints: 16 },
    { id: "second", points: 39, pick: 12, pickPoints: 16 },
    { id: "third", points: 37, pick: 12, pickPoints: 16 },
  ],
  currentEntryId: "current",
  selectedPosition: 12,
  selectedPoints: 16,
  round: 5,
});
assert.equal(protectedLead.rating, 1);
assert.match(protectedLead.reason, /cannot change your lead/);

const resolved = rateMatchImportance({
  entries: [
    { id: "current", points: 40, pick: 12, pickPoints: 16 },
    { id: "second", points: 39, pick: 11, pickPoints: 16 },
  ],
  currentEntryId: "current",
  selectedPosition: 12,
  selectedPoints: 16,
  round: 5,
  resolved: true,
});
assert.equal(resolved.rating, 1);
assert.match(resolved.reason, /final/);

const earlyLowLeverage = rateMatchImportance({
  entries: [
    { id: "first", points: 10, pick: 11, pickPoints: 1 },
    { id: "current", points: 9, pick: 12, pickPoints: 1 },
  ],
  currentEntryId: "current",
  selectedPosition: 12,
  selectedPoints: 1,
  round: 1,
});
assert.ok(differentLatePick.rating > earlyLowLeverage.rating);

console.log("US Open match-importance tests passed.");
