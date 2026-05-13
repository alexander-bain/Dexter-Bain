import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigamesPath =
  process.env.MINIGAMES_HTML_PATH ||
  path.join(repoRoot, "minigames", "index.html");

function pacificDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function requestedDateKey() {
  const argDate = process.argv.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  return argDate || pacificDateKey();
}

const dateKey = requestedDateKey();
const idDate = dateKey.replaceAll("-", "");
const html = fs.readFileSync(minigamesPath, "utf8");
const dailyWeatherIds = [...html.matchAll(/id: "daily-weather-(\d{8})"/g)].map((match) => match[1]);
const expectedId = `daily-weather-${idDate}`;

if (!html.includes(`id: "${expectedId}"`)) {
  throw new Error(`Expected ${expectedId} in minigames/index.html, found: ${dailyWeatherIds.join(", ") || "none"}`);
}

if (dailyWeatherIds.length !== 1) {
  throw new Error(`Expected exactly one generated daily weather game, found ${dailyWeatherIds.length}.`);
}

console.log(`Current daily weather game is present: ${expectedId}.`);
