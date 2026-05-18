import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceHtml = path.join(repoRoot, "minigames", "index.html");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-weather-replace-"));
const testHtml = path.join(tempDir, "index.html");

function runGenerator(date) {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "generate-daily-weather-game.mjs"), date],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        MINIGAMES_HTML_PATH: testHtml,
        MINIGAMES_WEATHER_OFFLINE: "1",
      },
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(`Generator failed for ${date}: ${result.stderr || result.stdout}`);
  }
}

function dailyWeatherIds(html) {
  return [...html.matchAll(/id: "daily-weather-(\d{8})"/g)].map((match) => match[1]);
}

function generatedWeatherBlock(html) {
  const startMarker = "      // DAILY_WEATHER_GAME_START";
  const endMarker = "      // DAILY_WEATHER_GAME_END";
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Could not find the generated daily weather block.");
  }
  return html.slice(start, end);
}

function assertIncludesQuestions(block, idDate, questionIds, label) {
  for (const questionId of questionIds) {
    if (!block.includes(`"${idDate}-${questionId}"`)) {
      throw new Error(`${label} is missing the ${questionId} question.`);
    }
  }
}

function assertIncludesLockTimes(block, lockTimes, label) {
  for (const hour of lockTimes) {
    if (!block.includes(hour)) {
      throw new Error(`${label} is missing lock time ${hour}.`);
    }
  }
}

function countWeatherSources(block) {
  return [
    ...block.matchAll(/autoSource: "https:\/\/forecast\.weather\.gov\/MapClick\.php\?lat=37\.453&lon=-122\.182"/g)
  ].length;
}

fs.copyFileSync(sourceHtml, testHtml);

runGenerator("2026-05-12");
const firstRunHtml = fs.readFileSync(testHtml, "utf8");
if (!firstRunHtml.includes('id: "daily-weather-20260512"')) {
  throw new Error("The May 12 generated weather game was not created.");
}
const firstBlock = generatedWeatherBlock(firstRunHtml);
assertIncludesQuestions(firstBlock, "20260512", [
  "warm-by-noon",
  "gas-noon",
  "market-lunch",
  "local-headline",
  "rain-by-3pm",
  "sky-still-sunny",
  "weather-headline",
  "sports-headline",
  "music-four",
  "music-five",
  "wind-by-5pm",
  "sports-six",
  "sports-seven",
  "cool-tonight",
], "Weekday weather game");
if (countWeatherSources(firstBlock) !== 5) {
  throw new Error(`Expected 5 auto-scored weather questions on weekdays, found ${countWeatherSources(firstBlock)}.`);
}

runGenerator("2026-05-13");
const secondRunHtml = fs.readFileSync(testHtml, "utf8");
const ids = dailyWeatherIds(secondRunHtml);
const secondBlock = generatedWeatherBlock(secondRunHtml);

if (!secondRunHtml.includes('id: "daily-weather-20260513"')) {
  throw new Error("The May 13 generated weather game was not created.");
}

if (secondRunHtml.includes('id: "daily-weather-20260512"')) {
  throw new Error("The previous day's generated weather game was still present.");
}

if (ids.length !== 1) {
  throw new Error(`Expected exactly one generated daily weather game, found ${ids.length}.`);
}

assertIncludesQuestions(secondBlock, "20260513", [
  "warm-by-noon",
  "gas-noon",
  "market-lunch",
  "local-headline",
  "rain-by-3pm",
  "sky-still-sunny",
  "weather-headline",
  "sports-headline",
  "music-four",
  "music-five",
  "wind-by-5pm",
  "sports-six",
  "sports-seven",
  "cool-tonight",
], "Generated weekday weather game");
assertIncludesLockTimes(secondBlock, [
  "T19:00:00.000Z",
  "T19:15:00.000Z",
  "T20:00:00.000Z",
  "T21:00:00.000Z",
  "T22:00:00.000Z",
  "T23:00:00.000Z",
  "T00:00:00.000Z",
  "T01:00:00.000Z",
  "T02:00:00.000Z",
  "T03:00:00.000Z",
], "Generated weekday weather game");

runGenerator("2026-05-17");
const weekendHtml = fs.readFileSync(testHtml, "utf8");
const weekendBlock = generatedWeatherBlock(weekendHtml);

if (!weekendHtml.includes('id: "daily-weather-20260517"')) {
  throw new Error("The May 17 generated weather game was not created.");
}

if (weekendBlock.includes('"20260517-market-lunch"')) {
  throw new Error("Weekend weather game should not include the stock market question.");
}

assertIncludesQuestions(weekendBlock, "20260517", [
  "warm-by-noon",
  "gas-noon",
  "local-headline",
  "rain-by-3pm",
  "sky-still-sunny",
  "weather-headline",
  "sports-headline",
  "music-four",
  "music-five",
  "wind-by-5pm",
  "sports-six",
  "sports-seven",
  "cool-tonight",
], "Weekend weather game");

if (countWeatherSources(weekendBlock) !== 5) {
  throw new Error(`Expected 5 auto-scored weather questions on weekends, found ${countWeatherSources(weekendBlock)}.`);
}

assertIncludesLockTimes(weekendBlock, [
  "T19:00:00.000Z",
  "T19:15:00.000Z",
  "T21:00:00.000Z",
  "T22:00:00.000Z",
  "T23:00:00.000Z",
  "T00:00:00.000Z",
  "T01:00:00.000Z",
  "T02:00:00.000Z",
  "T03:00:00.000Z",
], "Weekend weather game");

console.log("Daily weather replacement test passed.");
