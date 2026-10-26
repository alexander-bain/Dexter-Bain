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
const scoreStoreSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "score-store.js"), "utf8");
const accountPageSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "account", "index.html"), "utf8");
const accountScriptSource = fs.readFileSync(path.join(repositoryRoot, "letterreveal", "account", "account.js"), "utf8");

assert.match(appSource, /const TARGET_LETTERS = 15;/, "Every daily puzzle must contain fifteen letters.");
assert.match(appSource, /const FREE_REVEALS = 1;/, "Every fresh daily puzzle must begin with one revealed letter.");
assert.match(appSource, /const RESET_CODE = "CENA";/, "Typing CENA must remain the puzzle reset code.");
assert.match(appSource, /function resetGuess\(\)/, "The keypad reset must clear only the current guess.");
assert.match(appSource, /setStatus\("Wrong", "is-wrong"\)/, "An incorrect full guess must show one Wrong message.");
assert.doesNotMatch(appSource, /tile\.classList\.add\("is-wrong"\)/, "Incorrect guesses must not reveal which letters are wrong.");
assert.match(pageSource, /id="knownValue">1 \/ 15</, "The initial revealed-letter count must show one of fifteen.");
assert.match(pageSource, /class="letter-table known-table"/, "The top table must keep its green styling hook.");
assert.match(pageSource, /data-key="RESET"[^>]*>Reset<\/button>/, "Reset must remain beside Delete on the keypad.");
assert.ok(pageSource.indexOf('data-key="RESET"') < pageSource.indexOf('data-key="DELETE"'), "Reset must appear directly before Delete.");
assert.ok(
  pageSource.indexOf('id="hintText"') < pageSource.indexOf('id="knownLabel"'),
  "The hint must appear above the known-letter label."
);
assert.match(styleSource, /\.hint-heading h1[\s\S]*font-size: clamp\(1\.35rem, 6vw, 1\.75rem\)/, "The hint must remain visually prominent.");
assert.match(styleSource, /\.known-table \{[\s\S]*background: var\(--green\)/, "The complete top table must remain green.");
assert.match(pageSource, /id="scoreChart"[\s\S]*hidden/, "The score chart must stay hidden until the puzzle is solved.");
assert.match(pageSource, /href="account\/"/, "The game must link to the account page.");
assert.match(appSource, /scoreStore\.recordScore\(puzzleKey, state\.credits\)/, "A completed puzzle must save its score.");
assert.match(scoreStoreSource, /crypto\.subtle/, "Passwords must be hashed with the browser's cryptography API.");
assert.match(scoreStoreSource, /PBKDF2/, "Local password hashes must use PBKDF2.");
assert.match(scoreStoreSource, /\{ label: "≤5"/, "The score graph must include a five-or-less bucket.");
assert.match(accountPageSource, /Saved only on this device for now/, "The account page must explain the local-only limitation.");
assert.match(accountScriptSource, /scoreStore\.createAccount/, "The account page must support creating an account.");

for (const source of [appSource, pageSource, scoreStoreSource, accountPageSource, accountScriptSource]) {
  assert.doesNotMatch(source, /supabase/i, "The temporary account system must not depend on Supabase.");
}

assert.ok(puzzles.length >= 100, "The puzzle bank should include at least 100 phrases.");
assert.equal(new Set(puzzles.map((puzzle) => puzzle.answer.toLowerCase())).size, puzzles.length, "Puzzle answers must be unique.");

for (const puzzle of puzzles) {
  assert.equal(core.normalizePhrase(puzzle.answer).length, 15, `${puzzle.answer} must contain exactly fifteen letters.`);
  assert.ok(Math.max(...core.getWordLengths(puzzle.answer)) <= 8, `${puzzle.answer} has a word that is too wide for a phone.`);
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
assert.equal(revealOrder.length, 15, "Every reveal order must contain fifteen positions.");
assert.equal(new Set(revealOrder).size, 15, "Every reveal position must be unique.");
assert.deepEqual(revealOrder, core.getRevealOrder(daily.date, daily.answer), "The reveal order must be stable for the day.");

console.log(`Letter Reveal checks passed for ${puzzles.length} daily phrases.`);
