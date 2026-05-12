import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigamesPath = path.join(repoRoot, "minigames", "index.html");
const sourceUrl = "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182";
const pointsUrl = "https://api.weather.gov/points/37.453,-122.182";
const startMarker = "      // DAILY_WEATHER_GAME_START";
const endMarker = "      // DAILY_WEATHER_GAME_END";
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function targetDate() {
  const argDate = process.argv.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  if (argDate) {
    const [year, month, day] = argDate.split("-").map(Number);
    return new Date(year, month - 1, day, 6, 0, 0);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function slugDate(date) {
  return dayKey(date).replaceAll("-", "");
}

function lockDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 0, 0);
}

function labelDate(date) {
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ""));
}

function chance(highConfidence, lowConfidence, isLikely) {
  return isLikely ? highConfidence : lowConfidence;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "dexterbain.com minigames weather generator"
    }
  });

  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function isDatePeriod(period, date) {
  return typeof period?.startTime === "string" && period.startTime.slice(0, 10) === dayKey(date);
}

async function loadForecast(date) {
  try {
    const points = await fetchJson(pointsUrl);
    const forecastUrl = points?.properties?.forecast;
    if (!forecastUrl) {
      throw new Error("No forecast URL returned by weather service.");
    }

    const forecast = await fetchJson(forecastUrl);
    const periods = forecast?.properties?.periods || [];
    const dayPeriod = periods.find((period) => isDatePeriod(period, date) && period.isDaytime) ||
      periods.find((period) => isDatePeriod(period, date)) ||
      periods[0];
    const nightPeriod = periods.find((period) => isDatePeriod(period, date) && !period.isDaytime) ||
      periods.find((period) => period?.number > dayPeriod?.number) ||
      dayPeriod;

    return {
      dayPeriod,
      nightPeriod,
      source: "weather.gov"
    };
  } catch (error) {
    console.warn(error.message);
    return {
      dayPeriod: {
        temperature: 70,
        windSpeed: "5 to 10 mph",
        shortForecast: "Partly Sunny",
        detailedForecast: "Partly sunny, with a high near 70. Light west wind."
      },
      nightPeriod: {
        temperature: 54,
        windSpeed: "5 mph",
        shortForecast: "Mostly Clear",
        detailedForecast: "Mostly clear, with a low around 54."
      },
      source: "fallback"
    };
  }
}

function includesAny(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function windBucket(text) {
  const match = text.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  const speed = match ? Number(match[2] || match[1]) : 8;
  if (speed >= 16) return "windy";
  if (speed >= 9) return "noticeable-breeze";
  return "light-wind";
}

function skyBucket(text) {
  if (includesAny(text, ["rain", "shower", "thunderstorm", "drizzle"])) return "rain-likely";
  if (includesAny(text, ["mostly cloudy", "cloudy"])) return "mostly-cloudy";
  if (includesAny(text, ["mostly sunny", "sunny"])) return "mostly-sunny";
  if (includesAny(text, ["partly", "partly sunny"])) return "partly-cloudy";
  return "mostly-sunny";
}

function nightBucket(text, temp) {
  if (includesAny(text, ["rain", "shower", "drizzle"])) return "rainy";
  if (temp <= 51) return "chilly";
  if (includesAny(text, ["cloud", "overcast"])) return "cloudy-mild";
  return "clear-cool";
}

function weatherEvent(date, forecast) {
  const day = forecast.dayPeriod || {};
  const night = forecast.nightPeriod || day;
  const high = Number(day.temperature) || 70;
  const low = Number(night.temperature) || Math.max(45, high - 16);
  const lowEdge = Math.max(35, high - 5);
  const highEdge = high + 5;
  const skyText = `${day.shortForecast || ""} ${day.detailedForecast || ""}`;
  const nightText = `${night.shortForecast || ""} ${night.detailedForecast || ""}`;
  const rainLikely = includesAny(skyText, ["rain", "shower", "thunderstorm", "drizzle"]);
  const sky = skyBucket(skyText);
  const wind = windBucket(`${day.windSpeed || ""} ${day.detailedForecast || ""}`);
  const nightFeel = nightBucket(nightText, low);
  const dateLabel = labelDate(date);
  const idDate = slugDate(date);
  const lockAt = lockDate(date).toISOString();

  const skyOdds = {
    "mostly-sunny": [sky === "mostly-sunny" ? 42 : 18, "Mostly sunny"],
    "partly-cloudy": [sky === "partly-cloudy" ? 40 : 26, "Partly cloudy"],
    "mostly-cloudy": [sky === "mostly-cloudy" ? 38 : 19, "Mostly cloudy"],
    "rain-likely": [sky === "rain-likely" ? 36 : 9, "Rain likely"]
  };

  const windOdds = {
    "light-wind": [wind === "light-wind" ? 48 : 21, "Light wind"],
    "noticeable-breeze": [wind === "noticeable-breeze" ? 42 : 28, "Noticeable breeze"],
    "windy": [wind === "windy" ? 34 : 12, "Windy"]
  };

  const nightOdds = {
    "clear-cool": [nightFeel === "clear-cool" ? 38 : 22, "Clear and cool"],
    "cloudy-mild": [nightFeel === "cloudy-mild" ? 34 : 24, "Cloudy and mild"],
    "chilly": [nightFeel === "chilly" ? 30 : 18, "Chilly"],
    "rainy": [nightFeel === "rainy" ? 34 : 12, "Rainy"]
  };

  return `      {
        id: "daily-weather-${idDate}",
        name: ${jsString(`Menlo Park ${dateLabel} Weather`)},
        type: "Weather",
        month: ${date.getMonth()},
        day: ${date.getDate()},
        summary: ${jsString(`Generated at 6 AM for ${dateLabel}: ${day.shortForecast || "local forecast"}, high near ${high}, night near ${low}.`)},
        questions: [
          question(${jsString(`What will the ${dateLabel} high temperature be closest to?`)}, [
            answer(${jsString(`Under ${lowEdge} degrees`)}, ${chance(48, 18, high < lowEdge)}, "under-${lowEdge}"),
            answer(${jsString(`${lowEdge} to ${highEdge} degrees`)}, 50, "${lowEdge}-${highEdge}"),
            answer(${jsString(`${highEdge + 1} to ${highEdge + 8} degrees`)}, ${chance(35, 22, high > highEdge)}, "${highEdge + 1}-${highEdge + 8}"),
            answer(${jsString(`Over ${highEdge + 8} degrees`)}, 10, "over-${highEdge + 8}")
          ], "${idDate}-high-temp", { autoSource: menloParkWeatherSource, lockAt: ${jsString(lockAt)} }),
          question(${jsString("What will the main daytime sky be?")}, [
            answer("Mostly sunny", ${skyOdds["mostly-sunny"][0]}, "mostly-sunny"),
            answer("Partly cloudy", ${skyOdds["partly-cloudy"][0]}, "partly-cloudy"),
            answer("Mostly cloudy", ${skyOdds["mostly-cloudy"][0]}, "mostly-cloudy"),
            answer("Rain likely", ${skyOdds["rain-likely"][0]}, "rain-likely")
          ], "${idDate}-sky", { autoSource: menloParkWeatherSource, lockAt: ${jsString(lockAt)} }),
          question(${jsString(`Will rain be mentioned for ${dateLabel}?`)}, [
            answer("Yes", ${rainLikely ? 62 : 18}, "yes"),
            answer("No", ${rainLikely ? 38 : 82}, "no")
          ], "${idDate}-rain", { autoSource: menloParkWeatherSource, lockAt: ${jsString(lockAt)} }),
          question("How windy will it sound?", [
            answer("Light wind", ${windOdds["light-wind"][0]}, "light-wind"),
            answer("Noticeable breeze", ${windOdds["noticeable-breeze"][0]}, "noticeable-breeze"),
            answer("Windy", ${windOdds["windy"][0]}, "windy")
          ], "${idDate}-wind", { autoSource: menloParkWeatherSource, lockAt: ${jsString(lockAt)} }),
          question(${jsString(`What will the ${dateLabel} night feel like?`)}, [
            answer("Clear and cool", ${nightOdds["clear-cool"][0]}, "clear-cool"),
            answer("Cloudy and mild", ${nightOdds["cloudy-mild"][0]}, "cloudy-mild"),
            answer("Chilly", ${nightOdds["chilly"][0]}, "chilly"),
            answer("Rainy", ${nightOdds["rainy"][0]}, "rainy")
          ], "${idDate}-night", { autoSource: menloParkWeatherSource, lockAt: ${jsString(lockAt)} })
        ]
      },`;
}

function replaceGeneratedBlock(html, block) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Could not find daily weather game markers in minigames/index.html.");
  }

  return `${html.slice(0, start)}${startMarker}
${block}
${endMarker}${html.slice(end + endMarker.length)}`;
}

const date = targetDate();
const forecast = await loadForecast(date);
const html = fs.readFileSync(minigamesPath, "utf8");
const updated = replaceGeneratedBlock(html, weatherEvent(date, forecast));
fs.writeFileSync(minigamesPath, updated);

console.log(`Generated Menlo Park weather game for ${dayKey(date)} using ${forecast.source}.`);
