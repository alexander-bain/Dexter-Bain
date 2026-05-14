import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigamesPath =
  process.env.MINIGAMES_HTML_PATH ||
  path.join(repoRoot, "minigames", "index.html");
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

function lockDate(date, hour, minute = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);
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
  if (process.env.MINIGAMES_WEATHER_OFFLINE === "1") {
    return fallbackForecast();
  }

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
    return fallbackForecast();
  }
}

function fallbackForecast() {
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
  const skyText = `${day.shortForecast || ""} ${day.detailedForecast || ""}`;
  const nightText = `${night.shortForecast || ""} ${night.detailedForecast || ""}`;
  const rainLikely = includesAny(skyText, ["rain", "shower", "thunderstorm", "drizzle"]);
  const sky = skyBucket(skyText);
  const wind = windBucket(`${day.windSpeed || ""} ${day.detailedForecast || ""}`);
  const dateLabel = labelDate(date);
  const idDate = slugDate(date);
  const warmByNoonThreshold = Math.max(60, Math.round((high - 5) / 5) * 5);
  const peakThreshold = Math.max(warmByNoonThreshold + 5, Math.round(high / 5) * 5);
  const coolDownThreshold = Math.max(55, Math.round((high - 8) / 5) * 5);
  const locks = {
    warmByNoon: lockDate(date, 12).toISOString(),
    afternoonPeak: lockDate(date, 14).toISOString(),
    sky: lockDate(date, 15).toISOString(),
    rain: lockDate(date, 16).toISOString(),
    wind: lockDate(date, 17).toISOString(),
    earlyEvening: lockDate(date, 18).toISOString()
  };

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

  const likelyBreaksWarmByNoon = high >= warmByNoonThreshold && !includesAny(skyText, ["fog", "cold"]);
  const likelyBreaksPeak = high >= peakThreshold;
  const likelyCoolsBySix = high <= coolDownThreshold || includesAny(nightText, ["cool", "clear"]);

  return `      {
        id: "daily-weather-${idDate}",
        name: ${jsString(`Menlo Park Day Watch - ${dateLabel}`)},
        type: "Weather",
        month: ${date.getMonth()},
        day: ${date.getDate()},
        summary: ${jsString(`Generated at 6 AM for ${dateLabel}: time-based weather calls, all settled by 6 PM. Forecast: ${day.shortForecast || "local forecast"}, high near ${high}.`)},
        questions: [
          question(${jsString(`By noon, will it have broken ${warmByNoonThreshold} degrees?`)}, [
            answer("Yes", ${likelyBreaksWarmByNoon ? 64 : 36}, "yes"),
            answer("No", ${likelyBreaksWarmByNoon ? 36 : 64}, "no")
          ], "${idDate}-warm-by-noon", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.warmByNoon)} }),
          question(${jsString(`By 2 PM, will it have broken ${peakThreshold} degrees?`)}, [
            answer("Yes", ${likelyBreaksPeak ? 58 : 32}, "yes"),
            answer("No", ${likelyBreaksPeak ? 42 : 68}, "no")
          ], "${idDate}-afternoon-peak", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.afternoonPeak)} }),
          question(${jsString("At 3 PM, what will the sky feel closest to?")}, [
            answer("Mostly sunny", ${skyOdds["mostly-sunny"][0]}, "mostly-sunny"),
            answer("Partly cloudy", ${skyOdds["partly-cloudy"][0]}, "partly-cloudy"),
            answer("Mostly cloudy", ${skyOdds["mostly-cloudy"][0]}, "mostly-cloudy"),
            answer("Rain likely", ${skyOdds["rain-likely"][0]}, "rain-likely")
          ], "${idDate}-sky-3pm", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.sky)} }),
          question(${jsString("By 4 PM, will rain have shown up in the forecast or conditions?")}, [
            answer("Yes", ${rainLikely ? 62 : 18}, "yes"),
            answer("No", ${rainLikely ? 38 : 82}, "no")
          ], "${idDate}-rain-by-4pm", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.rain)} }),
          question("By 5 PM, how windy will it sound?", [
            answer("Light wind", ${windOdds["light-wind"][0]}, "light-wind"),
            answer("Noticeable breeze", ${windOdds["noticeable-breeze"][0]}, "noticeable-breeze"),
            answer("Windy", ${windOdds["windy"][0]}, "windy")
          ], "${idDate}-wind-by-5pm", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.wind)} }),
          question(${jsString(`At 6 PM, will it be below ${coolDownThreshold} degrees again?`)}, [
            answer("Yes", ${likelyCoolsBySix ? 54 : 32}, "yes"),
            answer("No", ${likelyCoolsBySix ? 46 : 68}, "no")
          ], "${idDate}-below-${coolDownThreshold}-by-6pm", { autoSource: menloParkWeatherSource, lockAt: ${jsString(locks.earlyEvening)} })
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
