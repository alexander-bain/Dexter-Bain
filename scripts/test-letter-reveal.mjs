import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import core from "../letterreveal/game-core.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const puzzles = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "letterreveal", "puzzles.json"), "utf8"));
const daily = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "letterreveal", "daily.json"), "utf8"));

assert.ok(puzzles.length >= 100, "The puzzle bank should include at least 100 phrases.");
assert.equal(new Set(puzzles.map((puzzle) => puzzle.answer.toLowerCase())).size, puzzles.length, "Puzzle answers must be unique.");

for (const puzzle of puzzles) {
  assert.equal(core.normalizePhrase(puzzle.answer).length, 10, `${puzzle.answer} must contain exactly ten letters.`);
  assert.ok(puzzle.hint.length >= 12, `${puzzle.answer} needs a useful hint.`);
}

assert.equal(core.getPuzzleKey(new Date("2026-10-25T13:29:00Z")), "2026-10-24", "The puzzle must not change before 6:30 AM PDT.");
assert.equal(core.getPuzzleKey(new Date("2026-10-25T13:30:00Z")), "2026-10-25", "The puzzle must change at 6:30 AM PDT.");
assert.equal(core.getPuzzleKey(new Date("2026-12-01T14:29:00Z")), "2026-11-30", "The cutoff must work in Pacific Standard Time.");
assert.equal(core.getPuzzleKey(new Date("2026-12-01T14:30:00Z")), "2026-12-01", "The winter cutoff must change at 6:30 AM Pacific.");

const dailyIndex = core.getPuzzleIndex(daily.date, puzzles.length);
assert.equal(daily.index, dailyIndex, "daily.json must use the deterministic puzzle index.");
assert.deepEqual(
  { answer: daily.answer, hint: daily.hint },
  puzzles[dailyIndex],
  "daily.json must match its puzzle-bank entry."
);

const revealOrder = core.getRevealOrder(daily.date, daily.answer);
assert.equal(revealOrder.length, 10, "Every reveal order must contain ten positions.");
assert.equal(new Set(revealOrder).size, 10, "Every reveal position must be unique.");
assert.deepEqual(revealOrder, core.getRevealOrder(daily.date, daily.answer), "The reveal order must be stable for the day.");

console.log(`Letter Reveal checks passed for ${puzzles.length} daily phrases.`);
