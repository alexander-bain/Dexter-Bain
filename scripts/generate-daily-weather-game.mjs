import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigamesPath =
  process.env.MINIGAMES_HTML_PATH ||
  path.join(repoRoot, "minigames", "index.html");
const sourceUrl = "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182";
const pointsUrl = "https://api.weather.gov/points/37.453,-122.182";
const marketSource = "https://r.jina.ai/http://finance.yahoo.com/quote/%5EGSPC";
const localNewsSource = "https://r.jina.ai/http://www.mercurynews.com/";
const musicSource = "https://r.jina.ai/http://music.apple.com/us/charts/songs";
const sportsSource = "https://r.jina.ai/http://www.espn.com/scoreboard";
const gasSource = "https://r.jina.ai/http://gasprices.aaa.com/";
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "dexterbain.com minigames weather generator"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));

  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "dexterbain.com minigames weather generator"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));

  if (!response.ok) {
    throw new Error(`Text fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
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

function windSpeedMax(text) {
  const match = String(text || "").match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  return match ? Number(match[2] || match[1]) : 8;
}

function rotateSelection(items, count, seed) {
  if (!Array.isArray(items) || !items.length || count <= 0) {
    return [];
  }

  const start = Math.abs(Number(seed) || 0) % items.length;
  const total = Math.min(count, items.length);
  return Array.from({ length: total }, (_, index) => items[(start + index) % items.length]);
}

function countMatches(text, patterns) {
  const lower = String(text || "").toLowerCase();
  return patterns.reduce((total, pattern) => total + (lower.match(pattern) || []).length, 0);
}

function trendScore(text, positives, negatives) {
  return countMatches(text, positives) - countMatches(text, negatives);
}

function normalizeChoiceOdds(entries) {
  const totalScore = entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.score) || 1), 0);
  let assigned = 0;

  const normalized = entries.map((entry, index) => {
    if (index === entries.length - 1) {
      return {
        ...entry,
        odds: 100 - assigned
      };
    }

    const odds = clamp(Math.round((Math.max(1, Number(entry.score) || 1) / totalScore) * 100), 8, 70);
    assigned += odds;
    return {
      ...entry,
      odds
    };
  });

  const diff = normalized.reduce((sum, entry) => sum + entry.odds, 0) - 100;
  if (diff !== 0) {
    normalized[normalized.length - 1].odds -= diff;
  }

  return normalized.map(({ label, id, odds }) => ({ label, id, odds }));
}

function oddsFromLean(lean, fallback = 50) {
  if (!Number.isFinite(lean)) {
    return fallback;
  }
  return clamp(Math.round(50 + lean * 6), 30, 70);
}

function fallbackSignals(date, forecast) {
  const day = forecast.dayPeriod || {};
  const skyText = `${day.shortForecast || ""} ${day.detailedForecast || ""}`;
  const liveSportsLikely = !isWeekend(date) || includesAny(skyText, ["sun", "clear"]);

  return {
    likelyMarketUp: !includesAny(skyText, ["storm", "rain"]) && Number(day.temperature) >= 65,
    likelyGasUp: Number(day.temperature) >= 74,
    likelyMusicChanged: false,
    likelyNewNumberOne: false,
    likelySportsLive: liveSportsLikely,
    likelyWeatherLead: includesAny(skyText, ["rain", "shower", "thunderstorm", "wind"]),
    likelySportsLead: liveSportsLikely && isWeekend(date),
    localHeadlineOdds: normalizeChoiceOdds([
      { label: "Weather", id: "weather", score: includesAny(skyText, ["rain", "wind"]) ? 4 : 3 },
      { label: "Stocks", id: "stocks", score: isWeekend(date) ? 1 : 3 },
      { label: "Sports", id: "sports", score: liveSportsLikely ? 3 : 2 },
      { label: "Traffic", id: "traffic", score: 2 }
    ])
  };
}

async function loadSignals(date, forecast) {
  if (process.env.MINIGAMES_WEATHER_OFFLINE === "1") {
    return fallbackSignals(date, forecast);
  }

  try {
    const [marketText, newsText, musicText, sportsText, gasText] = await Promise.all([
      isWeekend(date) ? Promise.resolve("") : fetchText(marketSource).catch(() => ""),
      fetchText(localNewsSource).catch(() => ""),
      fetchText(musicSource).catch(() => ""),
      fetchText(sportsSource).catch(() => ""),
      fetchText(gasSource).catch(() => "")
    ]);

    const marketLean = trendScore(
      marketText,
      [/\bup\b/g, /\bhigher\b/g, /\bgain(?:s|ed)?\b/g, /\brall(?:y|ies|ied)\b/g, /\bgreen\b/g, /\bpositive\b/g],
      [/\bdown\b/g, /\blower\b/g, /\bloss(?:es)?\b/g, /\bfall(?:s|ing)?\b/g, /\bdecline(?:s|d)?\b/g, /\bred\b/g, /\bnegative\b/g]
    );
    const gasLean = trendScore(
      gasText,
      [/\bhigher\b/g, /\bup\b/g, /\brise(?:s|n)?\b/g, /\bincreas(?:e|ed|ing)\b/g],
      [/\blower\b/g, /\bdown\b/g, /\bdrop(?:s|ped|ping)?\b/g, /\bdecreas(?:e|ed|ing)\b/g]
    );
    const sportsLiveSignals = countMatches(sportsText, [/\blive\b/g, /\bin progress\b/g, /\bq[1-4]\b/g, /\bhalftime\b/g, /\bfinal\b/g]);
    const newsWeatherScore = countMatches(newsText, [/\bweather\b/g, /\brain\b/g, /\bstorm\b/g, /\bwind\b/g, /\bheat\b/g]);
    const newsStocksScore = isWeekend(date) ? 1 : countMatches(newsText, [/\bstock(?:s| market)?\b/g, /\bwall street\b/g, /\bnasdaq\b/g, /\bs&p\b/g]);
    const newsSportsScore = countMatches(newsText, [/\bsport(?:s)?\b/g, /\bgiants\b/g, /\bwarriors\b/g, /\b49ers\b/g, /\bashletics\b/g, /\bsharks\b/g]);
    const newsTrafficScore = countMatches(newsText, [/\btraffic\b/g, /\bcrash\b/g, /\bfreeway\b/g, /\broad\b/g, /\bcommute\b/g]);
    const musicChangeSignals = countMatches(musicText, [/\bnew\b/g, /\bdebut\b/g, /\bclimb(?:s|ing)?\b/g, /\brise(?:s|n)?\b/g, /\bupdated\b/g]);
    const sportsLeadSignals = countMatches(newsText, [/\bplayoff\b/g, /\bgame\b/g, /\bseries\b/g, /\bscore\b/g]) + sportsLiveSignals;

    return {
      likelyMarketUp: !isWeekend(date) && oddsFromLean(marketLean, 52) >= 50,
      likelyGasUp: oddsFromLean(gasLean, 54) >= 50,
      likelyMusicChanged: oddsFromLean(musicChangeSignals - 2, 40) >= 50,
      likelyNewNumberOne: oddsFromLean(musicChangeSignals - 4, 34) >= 50,
      likelySportsLive: oddsFromLean(sportsLiveSignals - 2, isWeekend(date) ? 62 : 54) >= 50,
      likelyWeatherLead: oddsFromLean(newsWeatherScore - Math.max(newsSportsScore, newsStocksScore), 40) >= 50,
      likelySportsLead: oddsFromLean(sportsLeadSignals - newsWeatherScore, isWeekend(date) ? 56 : 44) >= 50,
      localHeadlineOdds: normalizeChoiceOdds([
        { label: "Weather", id: "weather", score: newsWeatherScore + 2 },
        { label: "Stocks", id: "stocks", score: newsStocksScore + (isWeekend(date) ? 0 : 2) },
        { label: "Sports", id: "sports", score: newsSportsScore + sportsLiveSignals + 1 },
        { label: "Traffic", id: "traffic", score: newsTrafficScore + 1 }
      ])
    };
  } catch (error) {
    console.warn(error.message);
    return fallbackSignals(date, forecast);
  }
}

function yesNoQuestion({
  text,
  idSuffix,
  autoSource,
  lockAt,
  likely,
  yesOdds,
  yesLikely = 64,
  yesUnlikely = 36
}) {
  const computedYesOdds = clamp(
    Math.round(Number.isFinite(yesOdds) ? yesOdds : (likely ? yesLikely : yesUnlikely)),
    20,
    80
  );
  return {
    text,
    idSuffix,
    autoSource,
    lockAt,
    answers: [
      { label: "Yes", odds: computedYesOdds, id: "yes" },
      { label: "No", odds: 100 - computedYesOdds, id: "no" }
    ]
  };
}

function choiceQuestion({
  text,
  idSuffix,
  autoSource,
  lockAt,
  answers
}) {
  return {
    text,
    idSuffix,
    autoSource,
    lockAt,
    answers
  };
}

function renderQuestion(question, idDate) {
  return `          question(${jsString(question.text)}, [
            ${question.answers.map((answer) => `answer(${jsString(answer.label)}, ${Number(answer.odds)}, ${jsString(answer.id)})`).join(",\n            ")}
          ], "${idDate}-${question.idSuffix}", { autoSource: ${jsString(question.autoSource)}, lockAt: ${jsString(question.lockAt)} })`;
}

function dayWatchEvent(date, forecast, signals) {
  const day = forecast.dayPeriod || {};
  const night = forecast.nightPeriod || {};
  const high = Number(day.temperature) || 70;
  const low = Number(night.temperature) || 54;
  const skyText = `${day.shortForecast || ""} ${day.detailedForecast || ""}`;
  const sky = skyBucket(skyText);
  const windSpeed = windSpeedMax(day.windSpeed || night.windSpeed || "8 mph");
  const dateLabel = labelDate(date);
  const idDate = slugDate(date);
  const daySeed = Number(idDate);
  const weekend = isWeekend(date);
  const warmByNoonThreshold = Math.max(60, Math.round((high - 5) / 5) * 5);
  const locks = {
    warmByNoon: lockDate(date, 12).toISOString(),
    gasNoon: lockDate(date, 12, 15).toISOString(),
    marketLunch: lockDate(date, 13).toISOString(),
    localHeadline: lockDate(date, 14).toISOString(),
    weatherAfternoon: lockDate(date, 15).toISOString(),
    musicFour: lockDate(date, 16).toISOString(),
    weatherWind: lockDate(date, 17).toISOString(),
    sportsSix: lockDate(date, 18).toISOString(),
    sportsSeven: lockDate(date, 19).toISOString(),
    weatherNight: lockDate(date, 20).toISOString()
  };

  const likelyBreaksWarmByNoon = high >= warmByNoonThreshold && !includesAny(skyText, ["fog", "cold"]);
  const likelyRainLater = includesAny(skyText, ["rain", "shower", "drizzle", "thunderstorm"]);
  const likelySkySunnyLater = sky === "mostly-sunny" || sky === "partly-cloudy";
  const likelyWindyLater = windSpeed >= 12;
  const likelyNightCooler = low <= 60 || low <= high - 10;
  const likelyMarketUp = weekend ? false : Boolean(signals?.likelyMarketUp);
  const likelyGasUp = Boolean(signals?.likelyGasUp);
  const likelyMusicChanged = Boolean(signals?.likelyMusicChanged);
  const likelyNewNumberOne = Boolean(signals?.likelyNewNumberOne);
  const likelySportsLive = Boolean(signals?.likelySportsLive);
  const likelyWeatherLead = Boolean(signals?.likelyWeatherLead) || (sky === "rain-likely");
  const likelySportsLead = Boolean(signals?.likelySportsLead);
  const localHeadlineOdds = Array.isArray(signals?.localHeadlineOdds) && signals.localHeadlineOdds.length === 4
    ? signals.localHeadlineOdds
    : fallbackSignals(date, forecast).localHeadlineOdds;
  const weatherQuestions = rotateSelection([
    () => yesNoQuestion({
      text: `By noon, will it be warmer than ${warmByNoonThreshold} degrees?`,
      idSuffix: "warm-by-noon",
      autoSource: "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182",
      lockAt: locks.warmByNoon,
      likely: likelyBreaksWarmByNoon
    }),
    () => yesNoQuestion({
      text: "By 3 PM, will rain show up in the forecast?",
      idSuffix: "rain-by-3pm",
      autoSource: "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182",
      lockAt: locks.weatherAfternoon,
      likely: likelyRainLater
    }),
    () => yesNoQuestion({
      text: `By 5 PM, will the wind be stronger than ${Math.max(10, Math.round(windSpeed / 5) * 5)} mph?`,
      idSuffix: "wind-by-5pm",
      autoSource: "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182",
      lockAt: locks.weatherWind,
      likely: likelyWindyLater
    }),
    () => yesNoQuestion({
      text: "By 3 PM, will the sky still be mostly sunny?",
      idSuffix: "sky-still-sunny",
      autoSource: "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182",
      lockAt: locks.weatherAfternoon,
      likely: likelySkySunnyLater
    }),
    () => yesNoQuestion({
      text: "Tonight, will it stay cooler than 60 degrees?",
      idSuffix: "cool-tonight",
      autoSource: "https://forecast.weather.gov/MapClick.php?lat=37.453&lon=-122.182",
      lockAt: locks.weatherNight,
      likely: likelyNightCooler
    })
  ], weekend ? 5 : 4, daySeed);
  const moneyQuestionFactories = [
    () => yesNoQuestion({
      text: "By noon, will gas prices be higher than this morning?",
      idSuffix: "gas-noon",
      autoSource: gasSource,
      lockAt: locks.gasNoon,
      likely: likelyGasUp
    }),
    () => yesNoQuestion({
      text: "By 1 PM, will the stock market go up?",
      idSuffix: "market-lunch",
      autoSource: marketSource,
      lockAt: locks.marketLunch,
      likely: likelyMarketUp
    })
  ];
  const moneyQuestions = rotateSelection(
    weekend ? moneyQuestionFactories.slice(0, 1) : moneyQuestionFactories,
    weekend ? 1 : 2,
    daySeed + 7
  );
  const newsQuestions = rotateSelection([
    () => choiceQuestion({
      text: "By 2 PM, what will the local news talk about most?",
      idSuffix: "local-headline",
      autoSource: localNewsSource,
      lockAt: locks.localHeadline,
      answers: localHeadlineOdds
    }),
    () => yesNoQuestion({
      text: "By 3 PM, will weather be the top local news story?",
      idSuffix: "weather-headline",
      autoSource: localNewsSource,
      lockAt: lockDate(date, 15).toISOString(),
      likely: likelyWeatherLead,
      yesLikely: 60,
      yesUnlikely: 40
    }),
    () => yesNoQuestion({
      text: "By 4 PM, will sports be one of the top local news stories?",
      idSuffix: "sports-headline",
      autoSource: localNewsSource,
      lockAt: lockDate(date, 16).toISOString(),
      likely: likelySportsLead,
      yesLikely: 58,
      yesUnlikely: 42
    })
  ], 2, daySeed + 11);
  const musicQuestions = rotateSelection([
    () => yesNoQuestion({
      text: "By 4 PM, will the top Apple Music song be different?",
      idSuffix: "music-four",
      autoSource: musicSource,
      lockAt: locks.musicFour,
      likely: likelyMusicChanged
    }),
    () => yesNoQuestion({
      text: "By 5 PM, will a new song reach No. 1?",
      idSuffix: "music-five",
      autoSource: musicSource,
      lockAt: lockDate(date, 17).toISOString(),
      likely: likelyNewNumberOne
    })
  ], 1, daySeed + 23);
  const sportsQuestions = rotateSelection([
    () => yesNoQuestion({
      text: "By 6 PM, will the sports page still show a live game?",
      idSuffix: "sports-six",
      autoSource: sportsSource,
      lockAt: locks.sportsSix,
      likely: likelySportsLive
    }),
    () => yesNoQuestion({
      text: "By 7 PM, will the top sports story be about a live game?",
      idSuffix: "sports-seven",
      autoSource: sportsSource,
      lockAt: locks.sportsSeven,
      likely: likelySportsLive
    })
  ], 1, daySeed + 37);
  const selectedQuestions = [
    ...weatherQuestions,
    ...moneyQuestions,
    ...newsQuestions,
    ...musicQuestions,
    ...sportsQuestions
  ].map((questionFactory) => questionFactory()).sort((left, right) => {
    if (left.lockAt === right.lockAt) {
      return left.idSuffix.localeCompare(right.idSuffix);
    }
    return left.lockAt.localeCompare(right.lockAt);
  });

  return `      {
        id: "daily-weather-${idDate}",
        name: ${jsString(`Menlo Park Day Watch - ${dateLabel}`)},
        type: "Day",
        month: ${date.getMonth()},
        day: ${date.getDate()},
        summary: ${jsString(`Generated at 6 AM for ${dateLabel}: 10 simple questions about weather, money, news, music, and sports that settle through the day. Forecast: ${day.shortForecast || "local forecast"}, high near ${high}.`)},
        questions: [
${selectedQuestions.map((question) => renderQuestion(question, idDate)).join(",\n")}
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
const signals = await loadSignals(date, forecast);
const html = fs.readFileSync(minigamesPath, "utf8");
const updated = replaceGeneratedBlock(html, dayWatchEvent(date, forecast, signals));
fs.writeFileSync(minigamesPath, updated);

console.log(`Generated Menlo Park day watch for ${dayKey(date)} using ${forecast.source}.`);
