import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import core from "../letterreveal/game-core.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const puzzles = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "letterreveal", "puzzles.json"), "utf8"));
const daily = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "letterreveal", "daily.json"), "utf8"));
const appSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "app.js"), "utf8");
const pageSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "styles.css"), "utf8");

assert.match(appSource, /const FREE_REVEALS = 2;/, "Every fresh daily puzzle must begin with two revealed letters.");
assert.match(appSource, /const RESET_CODE = "CENA";/, "Typing CENA must remain the puzzle reset code.");
assert.match(appSource, /function resetGuess\(\)/, "The keypad reset must clear only the current guess.");
assert.match(pageSource, /id="knownValue">2 \/ 10</, "The initial revealed-letter count must show two of ten.");
assert.match(pageSource, /class="letter-table known-table"/, "The top table must keep its green styling hook.");
assert.match(pageSource, /data-key="RESET"[^>]*>Reset<\/button>/, "Reset must remain beside Delete on the keypad.");
assert.ok(pageSource.indexOf('data-key="RESET"') < pageSource.indexOf('data-key="DELETE"'), "Reset must appear directly before Delete.");
assert.ok(
  pageSource.indexOf('id="hintText"') < pageSource.indexOf('id="knownLabel"'),
  "The hint must appear above the known-letter label."
);
assert.match(styleSource, /\.hint-heading h1[\s\S]*font-size: clamp\(1\.35rem, 6vw, 1\.75rem\)/, "The hint must remain visually prominent.");
assert.match(styleSource, /\.known-table \{[\s\S]*background: var\(--green\)/, "The complete top table must remain green.");

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
