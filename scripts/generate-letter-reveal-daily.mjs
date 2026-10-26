import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import core from "../letterreveal/game-core.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const puzzlesPath = path.join(repositoryRoot, "letterreveal", "puzzles.json");
const dailyPath = path.join(repositoryRoot, "letterreveal", "daily.json");
const requestedDate = process.argv.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));

const puzzles = JSON.parse(fs.readFileSync(puzzlesPath, "utf8"));
const date = requestedDate || core.getPuzzleKey(new Date());
const index = core.getPuzzleIndex(date, puzzles.length);
const selected = puzzles[index];

if (!selected || core.normalizePhrase(selected.answer).length !== 15) {
  throw new Error("The selected Letter Reveal puzzle is invalid.");
}

const daily = `${JSON.stringify({ date, index, ...selected }, null, 2)}\n`;
const previous = fs.existsSync(dailyPath) ? fs.readFileSync(dailyPath, "utf8") : "";

if (previous === daily) {
  console.log(`Letter Reveal ${date} is already current.`);
} else {
  fs.writeFileSync(dailyPath, daily);
  console.log(`Prepared Letter Reveal ${date}: ${selected.answer}`);
}
