// server.js
// Simple Node/Express backend for Hillview Middle School Teacher Simulator
// Uses OpenAI for fully generative scenarios, scoring, and images.

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/minigames") ||
    req.path.startsWith("/api/notifications")
  ) {
    res.set("Cache-Control", "no-store");
  }
  next();
});

const minigamesDataFile =
  process.env.MINIGAMES_DATA_FILE ||
  path.join(process.cwd(), "minigames-data.json");
const minigamesDataUrl =
  process.env.MINIGAMES_DATA_URL ||
  process.env.JSONBLOB_MINIGAMES_URL ||
  "https://jsonblob.com/api/jsonBlob/019e21af-3cb6-7800-a7b6-87088450104d";
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "";
const databaseSsl =
  databaseUrl && process.env.DATABASE_SSL !== "false"
    ? { rejectUnauthorized: false }
    : false;
let databasePoolPromise = null;
let databaseReadyPromise = null;
let minigamesWriteQueue = Promise.resolve();
const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const notificationsDataFile =
  process.env.NOTIFICATIONS_DATA_FILE ||
  path.join(process.cwd(), "notifications-data.json");
const notificationsDataUrl =
  process.env.NOTIFICATIONS_DATA_URL ||
  process.env.JSONBLOB_NOTIFICATIONS_URL ||
  "";
let notificationsWriteQueue = Promise.resolve();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:notifications@dexterbain.com";
const notificationAdminToken = process.env.NOTIFICATION_ADMIN_TOKEN || "";
let webpushClientPromise = null;
let vapidKeysPromise = null;
const resultCheckCooldowns = new Map();
const resultCheckCooldownMs = Number(process.env.MINIGAMES_RESULT_CHECK_COOLDOWN_MS) || 60000;
const maxAutoResultQuestions = 24;

// IMPORTANT: set this in your environment on Render, don't hardcode it in code
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: clamp a number
function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

// Utility: small randomness so AI deltas don't feel too linear
function addNoise(n, spread = 2) {
  const wiggle = Math.floor(Math.random() * (spread * 2 + 1)) - spread; // -spread..+spread
  return n + wiggle;
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanGameId(value) {
  return cleanText(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}

function cleanRoomCode(value) {
  return cleanText(value, 16).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function isValidRoomCode(value) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(cleanRoomCode(value));
}

function minigamesInitialData() {
  return { games: {}, customGames: [] };
}

async function getDatabasePool() {
  if (!databaseUrl) {
    return null;
  }

  databasePoolPromise ||= import("pg").then(({ Pool }) => (
    new Pool({
      connectionString: databaseUrl,
      ssl: databaseSsl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  ));

  return databasePoolPromise;
}

async function ensureDatabase() {
  const pool = await getDatabasePool();
  if (!pool) {
    return null;
  }

  databaseReadyPromise ||= pool.query(`
    CREATE TABLE IF NOT EXISTS dexterbain_kv (
      key text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await databaseReadyPromise;
  return pool;
}

async function readDatabaseJson(key, fallbackData) {
  const pool = await ensureDatabase();
  if (!pool) {
    return null;
  }

  const result = await pool.query(
    "SELECT data FROM dexterbain_kv WHERE key = $1",
    [key]
  );

  return result.rows[0]?.data || fallbackData;
}

async function writeDatabaseJson(key, data) {
  const pool = await ensureDatabase();
  if (!pool) {
    return false;
  }

  await pool.query(
    `INSERT INTO dexterbain_kv (key, data, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key)
     DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [key, JSON.stringify(data)]
  );

  return true;
}

function minigamesStorageMode() {
  if (databaseUrl) {
    return "postgres";
  }
  if (minigamesDataUrl) {
    return "remote-json";
  }
  return "local-json";
}

function notificationsStorageMode() {
  if (databaseUrl) {
    return "postgres";
  }
  if (notificationsDataUrl) {
    return "remote-json";
  }
  return "local-json";
}

function normalizeMinigamesData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return minigamesInitialData();
  }

  data.games =
    data.games && typeof data.games === "object" && !Array.isArray(data.games)
      ? data.games
      : {};
  data.customGames = Array.isArray(data.customGames) ? data.customGames : [];

  for (const [gameId, game] of Object.entries(data.games)) {
    if (!game || typeof game !== "object" || Array.isArray(game)) {
      data.games[gameId] = { entries: [], rooms: {} };
      continue;
    }

    game.entries = Array.isArray(game.entries) ? game.entries : [];
    game.results =
      game.results && typeof game.results === "object" && !Array.isArray(game.results)
        ? game.results
        : {};
    game.rooms =
      game.rooms && typeof game.rooms === "object" && !Array.isArray(game.rooms)
        ? game.rooms
        : {};

    for (const [roomCode, room] of Object.entries(game.rooms)) {
      if (!room || typeof room !== "object" || Array.isArray(room)) {
        game.rooms[roomCode] = {
          code: roomCode,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          entries: [],
        };
        continue;
      }

      room.code = cleanRoomCode(room.code || roomCode) || roomCode;
      room.createdAt = room.createdAt || new Date().toISOString();
      room.updatedAt = room.updatedAt || null;
      room.entries = Array.isArray(room.entries) ? room.entries : [];
    }
  }

  return data;
}

function publicCustomGame(game) {
  const questions = Array.isArray(game?.questions) ? game.questions : [];
  return {
    id: cleanGameId(game?.id),
    name: cleanText(game?.name, 64),
    type: "Custom",
    summary: cleanText(game?.summary, 180),
    creator: cleanText(game?.creator, 24),
    createdAt: game?.createdAt || null,
    closesAt: game?.closesAt || null,
    questions: questions
      .map((question) => ({
        id: cleanGameId(question?.id),
        text: cleanText(question?.text, 120),
        autoSource: cleanResultSourceUrl(question?.autoSource),
        answers: Array.isArray(question?.answers)
          ? question.answers
              .map((answer) => ({
                id: cleanGameId(answer?.id),
                label: cleanText(answer?.label, 80),
                odds: clamp(Number(answer?.odds) || 50, 1, 99),
                points: clamp(Number(answer?.points) || 10, 1, 999),
              }))
              .filter((answer) => answer.id && answer.label)
          : [],
      }))
      .filter((question) => question.id && question.text && question.answers.length >= 2),
  };
}

function cleanCustomGamePayload(body) {
  const name = cleanText(body?.name, 64);
  const summary = cleanText(body?.summary, 180);
  const creator = cleanText(body?.creator, 24);
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
  const questions = rawQuestions.slice(0, 12).map((rawQuestion, questionIndex) => {
    const text = cleanText(rawQuestion?.text, 120);
    const answers = (Array.isArray(rawQuestion?.answers) ? rawQuestion.answers : [])
      .slice(0, 8)
      .map((rawAnswer) => {
        const label = cleanText(rawAnswer?.label, 80);
        return {
          id: cleanGameId(rawAnswer?.id) || `a-${crypto.randomUUID().slice(0, 8)}`,
          label,
          odds: clamp(Number(rawAnswer?.odds) || 50, 1, 99),
          points: clamp(Number(rawAnswer?.points) || 10, 1, 999),
        };
      })
      .filter((answer) => answer.label);

    return {
      id: cleanGameId(rawQuestion?.id) || `q-${questionIndex + 1}`,
      text,
      autoSource: cleanResultSourceUrl(rawQuestion?.autoSource),
      answers,
    };
  }).filter((question) => question.text && question.answers.length >= 2);

  return { name, summary, creator, questions };
}

async function readMinigamesData() {
  if (databaseUrl) {
    const databaseData = normalizeMinigamesData(
      await readDatabaseJson("minigames", minigamesInitialData())
    );
    const remoteData = minigamesDataUrl
      ? await readRemoteMinigamesData().catch(() => null)
      : null;
    const localData = await readLocalMinigamesData().catch(() => null);

    if (isEmptyMinigamesData(databaseData)) {
      const migrationData = !isEmptyMinigamesData(remoteData)
        ? remoteData
        : !isEmptyMinigamesData(localData)
          ? localData
          : null;

      if (migrationData) {
        await writeDatabaseJson("minigames", migrationData);
        return normalizeMinigamesData(migrationData);
      }
    }

    return databaseData;
  }

  if (minigamesDataUrl) {
    const remoteData = await readRemoteMinigamesData();
    const localData = await readLocalMinigamesData().catch(() => null);

    if (isEmptyMinigamesData(remoteData) && !isEmptyMinigamesData(localData)) {
      await writeRemoteMinigamesData(localData).catch((err) => {
        console.warn("Minigames remote migration failed:", err);
      });
      return localData;
    }

    return remoteData;
  }

  return readLocalMinigamesData();
}

async function readLocalMinigamesData() {
  try {
    const raw = await fs.readFile(minigamesDataFile, "utf8");
    const data = JSON.parse(raw);
    return normalizeMinigamesData(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return minigamesInitialData();
    }
    throw err;
  }
}

async function writeMinigamesData(data) {
  if (databaseUrl) {
    await writeDatabaseJson("minigames", data);
    await writeLocalMinigamesData(data).catch((err) => {
      console.warn("Minigames local backup write failed:", err);
    });
    return;
  }

  if (minigamesDataUrl) {
    try {
      await writeRemoteMinigamesData(data);
    } catch (err) {
      console.warn("Minigames remote store write failed; using local backup:", err);
    }
    await writeLocalMinigamesData(data).catch((err) => {
      console.warn("Minigames local backup write failed:", err);
    });
    return;
  }

  await writeLocalMinigamesData(data);
}

async function writeLocalMinigamesData(data) {
  await fs.mkdir(path.dirname(minigamesDataFile), { recursive: true });
  const tempFile = `${minigamesDataFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempFile, minigamesDataFile);
}

async function readRemoteMinigamesData() {
  const response = await fetch(minigamesDataUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DexterBainMinigames/1.0",
    },
  });

  if (response.status === 404) {
    return minigamesInitialData();
  }

  if (!response.ok) {
    throw new Error(`Remote minigames store returned ${response.status}`);
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return minigamesInitialData();
  }

  return normalizeMinigamesData(JSON.parse(raw));
}

async function writeRemoteMinigamesData(data) {
  const response = await fetch(minigamesDataUrl, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DexterBainMinigames/1.0",
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Remote minigames store save failed with ${response.status}`);
  }
}

function isEmptyMinigamesData(data) {
  if (!data || typeof data !== "object") {
    return true;
  }

  const gameCount =
    data.games && typeof data.games === "object" && !Array.isArray(data.games)
      ? Object.keys(data.games).length
      : 0;
  const customGameCount = Array.isArray(data.customGames) ? data.customGames.length : 0;

  return gameCount === 0 && customGameCount === 0;
}

async function updateMinigamesData(mutator) {
  const run = minigamesWriteQueue.then(async () => {
    const data = await readMinigamesData();
    const result = await mutator(data);
    await writeMinigamesData(data);
    return result;
  });

  minigamesWriteQueue = run.catch(() => {});
  return run;
}

function ensureGame(data, gameId) {
  data.games ||= {};
  data.games[gameId] ||= { entries: [], rooms: {}, results: {} };
  data.games[gameId].entries = Array.isArray(data.games[gameId].entries)
    ? data.games[gameId].entries
    : [];
  data.games[gameId].results =
    data.games[gameId].results &&
    typeof data.games[gameId].results === "object" &&
    !Array.isArray(data.games[gameId].results)
      ? data.games[gameId].results
      : {};
  data.games[gameId].rooms =
    data.games[gameId].rooms &&
    typeof data.games[gameId].rooms === "object" &&
    !Array.isArray(data.games[gameId].rooms)
      ? data.games[gameId].rooms
      : {};
  return data.games[gameId];
}

function cleanResultStatus(value) {
  return ["resolved", "pending", "needs-source"].includes(value)
    ? value
    : "pending";
}

function cleanResultSourceUrl(value) {
  const raw = cleanText(value, 300);
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanResult(result) {
  const questionId = cleanText(result?.questionId, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const answerId = cleanText(result?.answerId, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const status = cleanResultStatus(result?.status);

  if (!questionId) {
    return null;
  }

  return {
    questionId,
    answerId: status === "resolved" ? answerId : "",
    status: status === "resolved" && !answerId ? "pending" : status,
    source: cleanText(result?.source, 160),
    note: cleanText(result?.note, 220),
    checkedAt: result?.checkedAt || new Date().toISOString(),
  };
}

function publicResultsForGame(data, gameId) {
  const game = data.games?.[gameId];
  const results = game?.results && typeof game.results === "object" ? game.results : {};
  return Object.values(results)
    .map((result) => cleanResult(result))
    .filter(Boolean);
}

function cleanResultAnswers(question) {
  return (Array.isArray(question?.answers) ? question.answers : [])
    .slice(0, 8)
    .map((answer) => ({
      id: cleanText(answer?.id, 80).replace(/[^a-zA-Z0-9_-]/g, ""),
      label: cleanText(answer?.label, 80),
    }))
    .filter((answer) => answer.id && answer.label);
}

function stripSourceText(raw) {
  return String(raw || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function answerIdMatchingLabel(answers, label) {
  const needle = cleanText(label, 80).toLowerCase();
  return answers.find((answer) => {
    const answerId = cleanText(answer?.id, 80).toLowerCase();
    const answerLabel = cleanText(answer?.label, 80).toLowerCase();
    return answerId === needle || answerLabel === needle || answerLabel.includes(needle) || needle.includes(answerLabel);
  })?.id || "";
}

function extractEspnGameId(source) {
  const match = String(source || "").match(/gameId(?:=|\/)(\d{6,})/i);
  return match ? match[1] : "";
}

function parseEspnLineScore(sourceText) {
  const match = String(sourceText || "").match(
    /\|\s*\|\s*1\s*\|\s*2\s*\|\s*3\s*\|\s*4(?:\s*\|\s*(OT|2OT|3OT))?\s*\|\s*T\s*\|\s*\|\s*([A-Za-z .'-]+?)\s+[A-Z]{2}\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)(?:\s*\|\s*(\d+))?\s*\|\s*(\d+)\s*\|\s*\|\s*([A-Za-z .'-]+?)\s+[A-Z]{2}\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)(?:\s*\|\s*(\d+))?\s*\|\s*(\d+)\s*\|/i
  );
  if (!match) {
    return null;
  }

  const overtimeColumn = match[1] || "";
  const first = {
    name: cleanText(match[2], 80),
    q1: Number(match[3]),
    q2: Number(match[4]),
    q3: Number(match[5]),
    q4: Number(match[6]),
    ot: Number(match[7] || 0),
    total: Number(match[8]),
  };
  const second = {
    name: cleanText(match[9], 80),
    q1: Number(match[10]),
    q2: Number(match[11]),
    q3: Number(match[12]),
    q4: Number(match[13]),
    ot: Number(match[14] || 0),
    total: Number(match[15]),
  };

  return {
    overtime: Boolean(overtimeColumn) || /\bFinal\/OT\b|\bFinal\/2OT\b|\bFinal\/3OT\b/i.test(sourceText),
    teams: [first, second],
  };
}

function parseEspnRosterNames(sourceText, teamName) {
  const teamPattern = escapeRegExp(teamName);
  const sectionMatch = String(sourceText || "").match(
    new RegExp(`${teamPattern}\\s+starters\\s+([\\s\\S]*?)\\s+team\\s+MIN\\s+PTS`, "i")
  );
  if (!sectionMatch) {
    return [];
  }

  const names = [];
  const playerRegex = /([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)+)\s+[A-Z]\.\s*[A-Za-z.'-]+\s*#\d+/g;
  for (const match of sectionMatch[1].matchAll(playerRegex)) {
    names.push(cleanText(match[1], 80));
  }
  return names;
}

function resolveEspnNbaBoxScore(questionText, answers, sourceText) {
  const lineScore = parseEspnLineScore(sourceText);
  if (!lineScore || lineScore.teams.length !== 2) {
    return null;
  }

  const [teamA, teamB] = lineScore.teams;
  const teamAAnswer = answerIdMatchingLabel(answers, teamA.name);
  const teamBAnswer = answerIdMatchingLabel(answers, teamB.name);
  const tiedAnswer = answerIdMatchingLabel(answers, "tied");

  const pickLeader = (leftScore, rightScore) => {
    if (leftScore === rightScore && tiedAnswer) {
      return tiedAnswer;
    }
    return leftScore > rightScore ? teamAAnswer : teamBAnswer;
  };

  if (/after the first quarter/i.test(questionText)) {
    return { answerId: pickLeader(teamA.q1, teamB.q1), explanation: `${teamA.name} ${teamA.q1}, ${teamB.name} ${teamB.q1} after the first quarter.` };
  }

  if (/at halftime/i.test(questionText)) {
    return {
      answerId: pickLeader(teamA.q1 + teamA.q2, teamB.q1 + teamB.q2),
      explanation: `${teamA.name} ${teamA.q1 + teamA.q2}, ${teamB.name} ${teamB.q1 + teamB.q2} at halftime.`,
    };
  }

  if (/after three quarters/i.test(questionText)) {
    return {
      answerId: pickLeader(teamA.q1 + teamA.q2 + teamA.q3, teamB.q1 + teamB.q2 + teamB.q3),
      explanation: `${teamA.name} ${teamA.q1 + teamA.q2 + teamA.q3}, ${teamB.name} ${teamB.q1 + teamB.q2 + teamB.q3} after three quarters.`,
    };
  }

  if (/who wins/i.test(questionText)) {
    return {
      answerId: pickLeader(teamA.total, teamB.total),
      explanation: `${teamA.name} ${teamA.total}, ${teamB.name} ${teamB.total} in the final score.`,
    };
  }

  if (/winning margin/i.test(questionText)) {
    const diff = Math.abs(teamA.total - teamB.total);
    const marginLabel = diff <= 5 ? "1 to 5 points" : diff <= 10 ? "6 to 10 points" : "11+ points";
    return {
      answerId: answerIdMatchingLabel(answers, marginLabel),
      explanation: `The final margin was ${diff} points.`,
    };
  }

  if (/go to overtime/i.test(questionText)) {
    return {
      answerId: answerIdMatchingLabel(answers, lineScore.overtime ? "yes" : "no"),
      explanation: lineScore.overtime ? "The line score includes an overtime period." : "The line score ends after four quarters with no overtime period.",
    };
  }

  return null;
}

async function resolveEspnNbaFirstScore(questionText, answers, source, sourceText) {
  if (!/which team scores first/i.test(questionText)) {
    return null;
  }

  const playMatch = String(sourceText || "").match(/([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)+)\s+makes\b/i);
  if (!playMatch) {
    return null;
  }

  const gameId = extractEspnGameId(source);
  if (!gameId) {
    return null;
  }

  const boxScoreSource = `https://r.jina.ai/http://www.espn.com/nba/boxscore/_/gameId/${gameId}`;
  const boxScoreText = await fetchResultSource(boxScoreSource);
  const lineScore = parseEspnLineScore(boxScoreText);
  if (!lineScore || lineScore.teams.length !== 2) {
    return null;
  }

  const [teamA, teamB] = lineScore.teams;
  const scorer = cleanText(playMatch[1], 80);
  const teamAPlayers = parseEspnRosterNames(boxScoreText, teamA.name);
  const teamBPlayers = parseEspnRosterNames(boxScoreText, teamB.name);

  if (teamAPlayers.includes(scorer)) {
    return { answerId: answerIdMatchingLabel(answers, teamA.name), explanation: `${scorer} recorded the first made basket for ${teamA.name}.` };
  }
  if (teamBPlayers.includes(scorer)) {
    return { answerId: answerIdMatchingLabel(answers, teamB.name), explanation: `${scorer} recorded the first made basket for ${teamB.name}.` };
  }

  return null;
}

async function fetchResultSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(source, {
      headers: {
        Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.5",
        "User-Agent": "DexterBainMinigames/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`);
    }

    return stripSourceText(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

async function chooseAnswerFromSource(questionText, answers, sourceText) {
  if (!process.env.OPENAI_API_KEY || !answers.length || !sourceText) {
    return null;
  }

  const response = await openai.chat.completions.create({
    model: process.env.MINIGAMES_RESULT_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You score prediction-game questions from source text. Only choose an answer when the source clearly confirms it. Return JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          question: questionText,
          answers,
          sourceText,
          requiredJson:
            "Return {\"answerId\":\"one listed answer id or empty string\",\"confidence\":0-1,\"explanation\":\"short reason\"}. Use empty answerId if not confirmed.",
        }),
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  const answerId = cleanText(parsed.answerId, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const confidence = Number(parsed.confidence) || 0;
  const explanation = cleanText(parsed.explanation, 180);

  if (confidence < 0.72 || !answers.some((answer) => answer.id === answerId)) {
    return null;
  }

  return { answerId, explanation };
}

async function automaticResultForQuestion(question, questionIndex) {
  const questionId = cleanText(question?.id || `q-${questionIndex}`, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const text = cleanText(question?.text, 160);
  const source = cleanResultSourceUrl(question?.autoSource);
  const answers = cleanResultAnswers(question);

  if (!questionId) {
    return null;
  }

  if (source) {
    try {
      const sourceText = await fetchResultSource(source);
      if (/espn\.com\/nba\/boxscore/i.test(source)) {
        const parsedChoice = resolveEspnNbaBoxScore(text, answers, sourceText);
        if (parsedChoice?.answerId) {
          return {
            questionId,
            status: "resolved",
            answerId: parsedChoice.answerId,
            source,
            note: parsedChoice.explanation || "Confirmed from the ESPN box score.",
            checkedAt: new Date().toISOString(),
          };
        }
      }
      if (/espn\.com\/nba\/playbyplay/i.test(source)) {
        const parsedChoice = await resolveEspnNbaFirstScore(text, answers, source, sourceText);
        if (parsedChoice?.answerId) {
          return {
            questionId,
            status: "resolved",
            answerId: parsedChoice.answerId,
            source,
            note: parsedChoice.explanation || "Confirmed from the ESPN play-by-play.",
            checkedAt: new Date().toISOString(),
          };
        }
      }
      const choice = await chooseAnswerFromSource(text, answers, sourceText);
      if (choice?.answerId) {
        return {
          questionId,
          status: "resolved",
          answerId: choice.answerId,
          source,
          note: choice.explanation || "Confirmed by the connected result source.",
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        questionId,
        status: "pending",
        answerId: "",
        source,
        note: process.env.OPENAI_API_KEY
          ? "The source is connected, but it has not clearly confirmed one answer yet."
          : "The source is connected. Add an OpenAI API key on the server to choose the confirmed answer automatically.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        questionId,
        status: "pending",
        answerId: "",
        source,
        note: "The source is connected, but the site could not read it yet.",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  return {
    questionId,
    status: "needs-source",
    answerId: "",
    source: "",
    note: text
      ? "This question needs a reliable live source before the site can score it."
      : "Needs a reliable live source before scoring.",
    checkedAt: new Date().toISOString(),
  };
}

function ensureRoom(data, gameId, roomCode) {
  const game = ensureGame(data, gameId);
  const now = new Date().toISOString();
  game.rooms[roomCode] ||= {
    code: roomCode,
    createdAt: now,
    updatedAt: null,
    entries: [],
  };

  const room = game.rooms[roomCode];
  room.code = roomCode;
  room.createdAt ||= now;
  room.updatedAt ||= null;
  room.entries = Array.isArray(room.entries) ? room.entries : [];
  return room;
}

function existingRoom(data, gameId, roomCode) {
  const room = data.games?.[gameId]?.rooms?.[roomCode];
  if (!room || typeof room !== "object" || Array.isArray(room)) {
    return null;
  }

  room.code = roomCode;
  room.createdAt ||= new Date().toISOString();
  room.updatedAt ||= null;
  room.entries = Array.isArray(room.entries) ? room.entries : [];
  return room;
}

function roomSummary(room, roomCode) {
  const code = cleanRoomCode(room?.code || roomCode);
  const entries = Array.isArray(room?.entries) ? room.entries : [];
  return {
    code,
    createdAt: room?.createdAt || null,
    updatedAt: room?.updatedAt || null,
    entryCount: entries.filter((entry) => {
      const cleanEntry = publicEntry(entry);
      return cleanEntry.name && hasPicks(cleanEntry.picks);
    }).length,
  };
}

function resultCheckKey(req, gameId) {
  const forwardedFor = cleanText(req.get("x-forwarded-for"), 120).split(",")[0].trim();
  return `${gameId}:${forwardedFor || req.ip || "unknown"}`;
}

function shouldThrottleResultCheck(req, gameId) {
  const key = resultCheckKey(req, gameId);
  const now = Date.now();
  const lastChecked = resultCheckCooldowns.get(key) || 0;
  if (now - lastChecked < resultCheckCooldownMs) {
    return true;
  }

  resultCheckCooldowns.set(key, now);
  if (resultCheckCooldowns.size > 500) {
    const cutoff = now - resultCheckCooldownMs * 2;
    for (const [storedKey, checkedAt] of resultCheckCooldowns.entries()) {
      if (checkedAt < cutoff) {
        resultCheckCooldowns.delete(storedKey);
      }
    }
  }
  return false;
}

function cleanAutoResultQuestion(question, questionIndex) {
  const questionId = cleanText(question?.id || `q-${questionIndex}`, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  const lockAt = question?.lockAt ? new Date(question.lockAt) : null;
  if (!questionId || (lockAt && Number.isFinite(lockAt.getTime()) && lockAt > new Date())) {
    return null;
  }

  return {
    id: questionId,
    text: cleanText(question?.text, 160),
    autoSource: cleanResultSourceUrl(question?.autoSource),
    answers: cleanResultAnswers(question),
  };
}

function makeRoomCode() {
  return Array.from({ length: 6 }, () => {
    const index = crypto.randomInt(roomCodeAlphabet.length);
    return roomCodeAlphabet[index];
  }).join("");
}

function uniqueRoomCode(data, gameId) {
  const game = ensureGame(data, gameId);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = makeRoomCode();
    if (!game.rooms[code]) {
      return code;
    }
  }
  return "";
}

async function readNotificationsData() {
  if (databaseUrl) {
    const databaseData = await readDatabaseJson("notifications", { subscriptions: [] });
    const remoteData = notificationsDataUrl
      ? await readRemoteNotificationsData().catch(() => null)
      : null;
    const localData = await readLocalNotificationsData().catch(() => null);

    if (isEmptyNotificationsData(databaseData)) {
      const migrationData = !isEmptyNotificationsData(remoteData)
        ? remoteData
        : !isEmptyNotificationsData(localData)
          ? localData
          : null;

      if (migrationData) {
        await writeDatabaseJson("notifications", migrationData);
        return migrationData;
      }
    }

    return databaseData && typeof databaseData === "object" && !Array.isArray(databaseData)
      ? databaseData
      : { subscriptions: [] };
  }

  if (notificationsDataUrl) {
    const remoteData = await readRemoteNotificationsData();
    const localData = await readLocalNotificationsData().catch(() => null);

    if (isEmptyNotificationsData(remoteData) && !isEmptyNotificationsData(localData)) {
      await writeRemoteNotificationsData(localData).catch((err) => {
        console.warn("Notifications remote migration failed:", err);
      });
      return localData;
    }

    return remoteData;
  }

  return readLocalNotificationsData();
}

async function readLocalNotificationsData() {
  try {
    const raw = await fs.readFile(notificationsDataFile, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : { subscriptions: [] };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { subscriptions: [] };
    }
    throw err;
  }
}

async function writeNotificationsData(data) {
  if (databaseUrl) {
    await writeDatabaseJson("notifications", data);
    await writeLocalNotificationsData(data).catch((err) => {
      console.warn("Notifications local backup write failed:", err);
    });
    return;
  }

  if (notificationsDataUrl) {
    await writeRemoteNotificationsData(data);
    await writeLocalNotificationsData(data).catch((err) => {
      console.warn("Notifications local backup write failed:", err);
    });
    return;
  }

  await writeLocalNotificationsData(data);
}

async function writeLocalNotificationsData(data) {
  await fs.mkdir(path.dirname(notificationsDataFile), { recursive: true });
  const tempFile = `${notificationsDataFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempFile, notificationsDataFile);
}

async function readRemoteNotificationsData() {
  const response = await fetch(notificationsDataUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DexterBainNotifications/1.0",
    },
  });

  if (response.status === 404) {
    return { subscriptions: [] };
  }

  if (!response.ok) {
    throw new Error(`Remote notifications store returned ${response.status}`);
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return { subscriptions: [] };
  }

  const data = JSON.parse(raw);
  return data && typeof data === "object" && !Array.isArray(data)
    ? data
    : { subscriptions: [] };
}

async function writeRemoteNotificationsData(data) {
  const response = await fetch(notificationsDataUrl, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DexterBainNotifications/1.0",
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Remote notifications store save failed with ${response.status}`);
  }
}

function isEmptyNotificationsData(data) {
  if (!data || typeof data !== "object") {
    return true;
  }

  const subscriptionCount = Array.isArray(data.subscriptions)
    ? data.subscriptions.length
    : 0;
  return subscriptionCount === 0 && !data.vapidKeys;
}

async function updateNotificationsData(mutator) {
  const run = notificationsWriteQueue.then(async () => {
    const data = await readNotificationsData();
    data.subscriptions = Array.isArray(data.subscriptions)
      ? data.subscriptions
      : [];
    const result = await mutator(data);
    await writeNotificationsData(data);
    return result;
  });

  notificationsWriteQueue = run.catch(() => {});
  return run;
}

async function getStoredOrGeneratedVapidKeys() {
  if (vapidPublicKey && vapidPrivateKey) {
    return { publicKey: vapidPublicKey, privateKey: vapidPrivateKey };
  }

  vapidKeysPromise ||= updateNotificationsData(async (data) => {
    if (data.vapidKeys?.publicKey && data.vapidKeys?.privateKey) {
      return data.vapidKeys;
    }

    const module = await import("web-push");
    const webpush = module.default || module;
    const keys = webpush.generateVAPIDKeys();
    data.vapidKeys = keys;
    return keys;
  }).finally(() => {
    vapidKeysPromise = null;
  });

  return vapidKeysPromise;
}

async function getWebPushClient() {
  const keys = await getStoredOrGeneratedVapidKeys();
  if (!keys?.publicKey || !keys?.privateKey) {
    return null;
  }

  webpushClientPromise ||= import("web-push").then((module) => {
    const client = module.default || module;
    client.setVapidDetails(vapidSubject, keys.publicKey, keys.privateKey);
    return client;
  });

  return webpushClientPromise;
}

function cleanNotificationMode(value) {
  return ["win", "updates"].includes(value) ? value : "updates";
}

function cleanPushSubscription(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const endpoint = cleanText(value.endpoint, 2048);
  const p256dh = cleanText(value.keys?.p256dh, 256);
  const auth = cleanText(value.keys?.auth, 256);

  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
    return null;
  }

  return {
    endpoint,
    expirationTime:
      typeof value.expirationTime === "number" ? value.expirationTime : null,
    keys: { p256dh, auth },
  };
}

function getQuestionId(question, index) {
  return cleanText(question?.id || `q-${index}`, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}

function getQuestionAnswers(question) {
  return (Array.isArray(question?.answers) ? question.answers : [])
    .slice(0, 8)
    .map((answer) => ({
      id: cleanText(answer?.id, 80).replace(/[^a-zA-Z0-9_-]/g, ""),
      label: cleanText(answer?.label, 80),
      odds: clamp(Number(answer?.odds) || 50, 1, 99),
      points: clamp(Number(answer?.points) || 10, 1, 999),
    }))
    .filter((answer) => answer.id && answer.label);
}

function getSavedPick(picks, question, index) {
  if (Array.isArray(picks)) {
    return picks[index] || "";
  }

  if (picks && typeof picks === "object") {
    return picks[getQuestionId(question, index)] || "";
  }

  return "";
}

function normalizePickId(question, pick) {
  const answers = getQuestionAnswers(question);
  return answers.find((candidate) => candidate.id === pick || candidate.label === pick)?.id || cleanText(pick, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}

function scorePicks(questions, resultsMap, picks) {
  return questions.reduce((total, question, index) => {
    const questionId = getQuestionId(question, index);
    const result = resultsMap?.[questionId];
    if (!result || result.status !== "resolved" || !result.answerId) {
      return total;
    }

    const correctAnswerId = normalizePickId(question, result.answerId);
    const pickedAnswerId = normalizePickId(question, getSavedPick(picks, question, index));
    if (!pickedAnswerId || pickedAnswerId !== correctAnswerId) {
      return total;
    }

    const correctAnswer = getQuestionAnswers(question).find((answerOption) => answerOption.id === correctAnswerId);
    return total + (correctAnswer?.points || 0);
  }, 0);
}

function leaderboardForGame(questions, resultsMap, entries) {
  return entries
    .map((entry) => ({
      ...entry,
      score: scorePicks(questions, resultsMap, entry.picks),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function publicEntry(entry) {
  return {
    name: cleanText(entry?.name, 24),
    picks: cleanPicks(entry?.picks),
    savedAt: entry?.savedAt || null,
  };
}

function publicEntriesForGame(data, gameId) {
  const entries = data.games?.[gameId]?.entries || [];
  return entries
    .map((entry) => publicEntry(entry))
    .filter((entry) => entry.name && hasPicks(entry.picks));
}

function publicEntriesForRoom(data, gameId, roomCode) {
  const entries = data.games?.[gameId]?.rooms?.[roomCode]?.entries || [];
  return entries
    .map((entry) => publicEntry(entry))
    .filter((entry) => entry.name && hasPicks(entry.picks));
}

function cleanPicks(picks) {
  if (Array.isArray(picks)) {
    return picks.slice(0, 30).map((pick) => cleanText(pick, 80));
  }

  if (picks && typeof picks === "object") {
    return Object.fromEntries(
      Object.entries(picks)
        .slice(0, 30)
        .map(([questionId, answerId]) => [
          cleanText(questionId, 80).replace(/[^a-zA-Z0-9_-]/g, ""),
          cleanText(answerId, 80).replace(/[^a-zA-Z0-9_-]/g, ""),
        ])
        .filter(([questionId, answerId]) => questionId && answerId)
    );
  }

  return [];
}

function hasPicks(picks) {
  return Array.isArray(picks)
    ? picks.some(Boolean)
    : picks && typeof picks === "object" && Object.keys(picks).length > 0;
}

function notificationMatches(item, filter = {}) {
  if (!item || !item.subscription) {
    return false;
  }
  if (filter.gameId && item.gameId !== filter.gameId) {
    return false;
  }
  if (filter.roomCode !== undefined && (item.roomCode || "") !== filter.roomCode) {
    return false;
  }
  if (filter.playerName && item.playerName !== filter.playerName) {
    return false;
  }
  if (filter.notify === "win" && item.notify !== "win") {
    return false;
  }
  if (filter.notify === "updates" && item.notify !== "updates") {
    return false;
  }
  return true;
}

async function sendPushNotifications(payload, filter = {}) {
  let webpush;
  try {
    webpush = await getWebPushClient();
    if (!webpush) {
      return { sent: 0, removed: 0, skipped: true };
    }
  } catch (err) {
    console.error("Push setup error:", err);
    return { sent: 0, removed: 0, skipped: true };
  }

  const data = await readNotificationsData();
  const subscriptions = Array.isArray(data.subscriptions)
    ? data.subscriptions
    : [];
  const targets = subscriptions.filter((item) => notificationMatches(item, filter));
  let sent = 0;
  const staleEndpoints = new Set();

  await Promise.all(
    targets.map(async (item) => {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            title: cleanText(payload.title, 80) || "DexterBain Minigames",
            body: cleanText(payload.body, 220) || "Your minigame has an update.",
            tag: cleanText(payload.tag, 120) || `minigames-${item.gameId}`,
            data: {
              gameId: item.gameId,
              roomCode: item.roomCode || "",
              url: payload.url || "/minigames/",
            },
          })
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          staleEndpoints.add(item.subscription.endpoint);
          return;
        }
        console.error("Push send error:", err);
      }
    })
  );

  if (staleEndpoints.size > 0) {
    await updateNotificationsData((currentData) => {
      currentData.subscriptions = currentData.subscriptions.filter(
        (item) => !staleEndpoints.has(item.subscription?.endpoint)
      );
    });
  }

  return { sent, removed: staleEndpoints.size, skipped: false };
}

async function sendMinigameUpdateNotifications({
  gameId,
  gameName,
  changedQuestionIds = [],
}) {
  if (!gameId || !Array.isArray(changedQuestionIds) || changedQuestionIds.length === 0) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const cleanGameName = cleanText(gameName, 80);
  const title = cleanGameName ? `${cleanGameName} updated` : "Minigame update";
  const body =
    changedQuestionIds.length === 1
      ? "One weather question just got a confirmed answer. Open the game for your updated score."
      : `${changedQuestionIds.length} weather questions just got confirmed answers. Open the game for your updated score.`;

  return sendPushNotifications(
    {
      title,
      body,
      tag: `minigames-${gameId}-updates`,
      url: `/minigames/?game=${encodeURIComponent(gameId)}`,
    },
    {
      gameId,
      notify: "updates",
    }
  );
}

/**
 * POST /api/hillview-sim/scenario
 *
 * Body:
 * {
 *   month: "August" | ... | "June",
 *   round: number,
 *   stats: { learningScore, likabilityScore, studentsRemaining, classSize },
 *   usedScenarioIds: string[]
 * }
 *
 * Returns:
 * {
 *   id: string,
 *   title: string,
 *   prompt: string,
 *   options: [{ id, text }],
 *   imageUrl: string | null
 * }
 */
app.post("/api/hillview-sim/scenario", async (req, res) => {
  const { month, round, stats, usedScenarioIds } = req.body || {};
  const {
    learningScore = 50,
    likabilityScore = 50,
    studentsRemaining = stats?.classSize || 22,
    classSize = 22,
  } = stats || {};

  try {
    // 1) Ask GPT to invent a brand-new scenario + 4 options as JSON
    const scenarioCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are designing a highly replayable middle-school teaching game set at Hillview Middle School in Menlo Park.",
            "Every call you must invent a brand new, specific classroom situation for one calendar month of the school year.",
            "DO NOT reuse any previous scenario IDs passed in.",
            "Scenarios must be short, vivid, and always involve real tradeoffs.",
            "Return concise text that works well inside a small card on a game UI."
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            month,
            round,
            context: {
              learningScore,
              likabilityScore,
              studentsRemaining,
              classSize,
            },
            usedScenarioIds: usedScenarioIds || [],
          }),
        },
        {
          role: "user",
          content: [
            "Return STRICT JSON with this shape:",
            "{",
            '  "id": string,                  // unique id, new each time',
            '  "title": string,               // short label like \"Lab Disaster\" or \"Phone Chaos\"',
            '  "prompt": string,              // 2–4 sentence description, plain text, no markdown',
            '  "options": [',
            '    { "id": string, "text": string }, // exactly four distinct choices',
            "    ...",
            "  ]",
            "}",
            "",
            "Constraints:",
            "- id must NOT match any id in usedScenarioIds.",
            "- prompt should mention you are a teacher at Hillview Middle School and involve this month of the year.",
            "- options must clearly reflect tradeoffs (learning vs likability vs control vs sanity).",
            "- Keep text tight; avoid long speeches.",
          ].join("\n"),
        },
      ],
    });

    const rawScenario = scenarioCompletion.choices[0].message.content;
    let scenarioJson;
    try {
      scenarioJson = JSON.parse(rawScenario);
    } catch (e) {
      console.error("Failed to parse scenario JSON:", rawScenario);
      throw new Error("Scenario JSON parse error");
    }

    const scenario = {
      id:
        scenarioJson.id ||
        `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: scenarioJson.title || `${month} Situation`,
      prompt: scenarioJson.prompt || "A situation at Hillview Middle School.",
      options: Array.isArray(scenarioJson.options)
        ? scenarioJson.options.slice(0, 4).map((opt, index) => ({
            id: opt.id || `opt-${index + 1}`,
            text: opt.text || `Option ${index + 1}`,
          }))
        : [],
    };

    // 2) Generate a cartoon scenario image using gpt-image-1
    let imageUrl = null;
    try {
      const imgPrompt = [
        "Cartoon-style illustration, middle school classroom at Hillview Middle School in Menlo Park, California.",
        `Month: ${month}.`,
        "Show the situation described here, but do not include any text in the image:",
        scenario.prompt,
        "",
        "Colorful, clean lines, flat colors, slightly exaggerated expressions, friendly but chaotic vibe.",
        "No text, no logos, no brand names."
      ].join(" ");

      const imageResult = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imgPrompt,
        size: "1024x576",
        n: 1,
      });

      imageUrl = imageResult.data?.[0]?.url || null;
    } catch (imgErr) {
      console.error("Image generation error for scenario:", imgErr);
    }

    res.json({
      id: scenario.id,
      title: scenario.title,
      prompt: scenario.prompt,
      options: scenario.options,
      imageUrl,
    });
  } catch (err) {
    console.error("Scenario endpoint error:", err);
    res.status(500).json({ error: "Failed to generate scenario" });
  }
});

/**
 * POST /api/hillview-sim/evaluate
 *
 * Body:
 * {
 *   scenarioId: string,
 *   month: string,
 *   round: number,
 *   classSize: number,
 *   stats: { learningScore, likabilityScore, studentsRemaining },
 *   choice: { type: "option" | "custom", optionId?: string, customText?: string }
 * }
 *
 * Returns:
 * {
 *   learningDelta: number,
 *   likabilityDelta: number,
 *   studentsDelta: number,
 *   commentary: string,
 *   logHeadline: string,
 *   decisionImageUrl?: string
 * }
 */
app.post("/api/hillview-sim/evaluate", async (req, res) => {
  const { scenarioId, month, round, classSize, stats, choice } = req.body || {};
  const {
    learningScore = 50,
    likabilityScore = 50,
    studentsRemaining = classSize || 22,
  } = stats || {};

  // Hard filter on clearly violent/harmful answers before involving GPT
  const rawText = choice?.type === "custom" ? choice.customText || "" : "";
  const lower = rawText.toLowerCase();
  const violentPatterns = [
    /run (them|the students|the kids|my class|students|kids) over/,
    /run.*over.*(student|students|kid|kids|class)/,
    /kill/,
    /murder/,
    /shoot/,
    /stab/,
    /burn/,
    /set.*on fire/,
    /light.*on fire/,
    /hit/,
    /punch/,
    /beat up/,
    /hurt.*(student|students|kid|kids|child|children)/,
  ];
  const isCatastrophic = violentPatterns.some((re) => re.test(lower));

  try {
    let learningDelta = 0;
    let likabilityDelta = 0;
    let studentsDelta = 0;
    let commentary = "";
    let logHeadline = "";
    let decisionImageUrl = null;

    if (isCatastrophic) {
      // Skip GPT for scoring; just nuke the scores ourselves
      learningDelta = -25;
      likabilityDelta = -35;

      const baseStudentsLoss = Math.max(5, Math.round(classSize * 0.4));
      studentsDelta = -baseStudentsLoss;

      commentary =
        "This response would be completely unacceptable in a real school. Anything involving harm or threats to students is an immediate, catastrophic failure that would trigger serious intervention from administration and families.";
      logHeadline =
        "Catastrophic choice: safety and professionalism collapsed this month.";

      // Make a recap image that clearly shows consequences without being graphic
      try {
        const imgPrompt = [
          "Cartoon-style illustration, middle school classroom at Hillview Middle School.",
          "Teacher looks horrified as administrators and families point to a giant red 'NOT OK' sign.",
          "No actual violence, no blood. Focus on consequences and seriousness, not harm.",
          "Flat colors, clean lines, exaggerated shocked expressions, but still school-appropriate.",
          "No text in the image."
        ].join(" ");

        const imgRes = await openai.images.generate({
          model: "gpt-image-1",
          prompt: imgPrompt,
          size: "1024x576",
          n: 1,
        });
        decisionImageUrl = imgRes.data?.[0]?.url || null;
      } catch (imgErr) {
        console.error("Image generation error (catastrophic):", imgErr);
      }
    } else {
      // Use GPT to compute deltas + commentary, then add a bit of noise
      const evalCompletion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are evaluating a teacher's decision in a Hillview Middle School teaching simulator.",
              "The teacher is scored on three things: student learning (0-100), likability & respect (0-100), and students remaining in their class.",
              "Your job is to estimate how this decision would change learning and likability THIS month, not forever.",
              "You must also estimate how many students leave or join the class this month (studentsDelta).",
              "Return small-ish integer deltas (roughly in range -18 to +18) and clear, concise commentary.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              month,
              round,
              classSize,
              currentScores: {
                learningScore,
                likabilityScore,
                studentsRemaining,
              },
              scenarioId,
              choice,
            }),
          },
          {
            role: "user",
            content: [
              "Return STRICT JSON like this:",
              "{",
              '  "learningDelta": integer,',
              '  "likabilityDelta": integer,',
              '  "studentsDelta": integer,',
              '  "commentary": string,',
              '  "logHeadline": string,',
              '  "imagePrompt": string',
              "}",
              "",
              "Constraints:",
              "- learningDelta and likabilityDelta should almost always be between -18 and +18.",
              "- studentsDelta is usually between -4 and +4, but can reach -6 for truly awful social choices or +6 for legendary ones.",
              "- Commentary should be friendly but honest, and avoid jargon.",
              "- The imagePrompt should describe the scene and teacher's behavior in a safe, school-appropriate way, no self-harm, no gore, no graphic violence, no text.",
            ].join("\n"),
          },
        ],
      });

      const rawEval = evalCompletion.choices[0].message.content;
      let evalJson;
      try {
        evalJson = JSON.parse(rawEval);
      } catch (e) {
        console.error("Failed to parse evaluation JSON:", rawEval);
        throw new Error("Evaluation JSON parse error");
      }

      learningDelta = clamp(addNoise(evalJson.learningDelta ?? 0, 2), -20, 20);
      likabilityDelta = clamp(
        addNoise(evalJson.likabilityDelta ?? 0, 2),
        -20,
        20
      );
      studentsDelta = clamp(evalJson.studentsDelta ?? 0, -10, 10);
      commentary =
        evalJson.commentary || "The AI forgot to explain this decision.";
      logHeadline =
        evalJson.logHeadline ||
        `Learning ${learningDelta >= 0 ? "+" : ""}${learningDelta}, ` +
          `Likability ${likabilityDelta >= 0 ? "+" : ""}${likabilityDelta}, ` +
          `Students ${studentsDelta >= 0 ? "+" : ""}${studentsDelta}.`;

      // Recap image based on imagePrompt + a quick summary of the choice
      if (evalJson.imagePrompt) {
        try {
          // Build a choice summary for the image model
          let choiceSummary = "";
          if (choice?.type === "custom") {
            choiceSummary = `Teacher chose a custom response: "${(choice.customText || "").slice(
              0,
              200
            )}"`;
          } else if (choice?.type === "option" && choice.optionId) {
            choiceSummary = `Teacher chose option id "${choice.optionId}".`;
          }

          const imgPrompt = [
            "Cartoon-style illustration, middle school classroom at Hillview Middle School.",
            evalJson.imagePrompt,
            choiceSummary,
            "Flat colors, clean lines, slightly exaggerated expressions. No text in the image."
          ].join(" ");

          const imgRes = await openai.images.generate({
            model: "gpt-image-1",
            prompt: imgPrompt,
            size: "1024x576",
            n: 1,
          });
          decisionImageUrl = imgRes.data?.[0]?.url || null;
        } catch (imgErr) {
          console.error("Image generation error for decision:", imgErr);
        }
      }
    }

    res.json({
      learningDelta,
      likabilityDelta,
      studentsDelta,
      commentary,
      logHeadline,
      decisionImageUrl,
    });
  } catch (err) {
    console.error("Evaluate endpoint error:", err);
    res.status(500).json({ error: "Failed to evaluate decision" });
  }
});

app.get("/api/notifications/vapid-public-key", async (req, res) => {
  try {
    const keys = await getStoredOrGeneratedVapidKeys();
    res.json({
      configured: Boolean(keys?.publicKey),
      publicKey: keys?.publicKey || null,
    });
  } catch (err) {
    console.error("Notification key error:", err);
    res.status(500).json({ error: "Failed to prepare notification keys" });
  }
});

app.post("/api/notifications/subscribe", async (req, res) => {
  const subscription = cleanPushSubscription(req.body?.subscription);
  const gameId = cleanGameId(req.body?.gameId);
  const roomCode = req.body?.roomCode ? cleanRoomCode(req.body.roomCode) : null;
  const playerName = cleanText(req.body?.playerName, 24);
  const notify = cleanNotificationMode(req.body?.notify);

  if (!subscription || !gameId || !playerName) {
    res.status(400).json({ error: "Missing subscription, game, or player" });
    return;
  }

  try {
    await updateNotificationsData((data) => {
      const withoutCurrent = data.subscriptions.filter(
        (item) => item.subscription?.endpoint !== subscription.endpoint
      );

      withoutCurrent.push({
        subscription,
        gameId,
        roomCode,
        playerName,
        notify,
        userAgent: cleanText(req.get("user-agent"), 300),
        updatedAt: new Date().toISOString(),
      });

      data.subscriptions = withoutCurrent;
    });

    const sendResult = await sendPushNotifications(
      {
        title: "Notifications are on",
        body:
          notify === "win"
            ? "Win-only minigame alerts are ready."
            : "Minigame update alerts are ready.",
        tag: `minigames-confirm-${gameId}-${playerName}`,
      },
      { gameId, roomCode: roomCode || "", playerName }
    );

    res.json({ ok: true, gameId, roomCode, notify, sendResult });
  } catch (err) {
    console.error("Notification subscribe error:", err);
    res.status(500).json({ error: "Failed to save notification subscription" });
  }
});

app.delete("/api/notifications/subscribe", async (req, res) => {
  const subscription = cleanPushSubscription(req.body?.subscription);
  const endpoint = cleanText(req.body?.endpoint, 2048);
  const targetEndpoint = subscription?.endpoint || endpoint;

  if (!targetEndpoint) {
    res.status(400).json({ error: "Missing subscription endpoint" });
    return;
  }

  try {
    await updateNotificationsData((data) => {
      data.subscriptions = data.subscriptions.filter(
        (item) => item.subscription?.endpoint !== targetEndpoint
      );
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Notification unsubscribe error:", err);
    res.status(500).json({ error: "Failed to remove notification subscription" });
  }
});

app.post("/api/notifications/minigames/:gameId/send", async (req, res) => {
  const token = cleanText(req.get("authorization"), 300).replace(/^Bearer\s+/i, "");
  const gameId = cleanGameId(req.params.gameId);
  const roomCode = req.body?.roomCode ? cleanRoomCode(req.body.roomCode) : undefined;
  const notify = ["win", "updates"].includes(req.body?.notify)
    ? req.body.notify
    : undefined;
  const playerName = req.body?.playerName
    ? cleanText(req.body.playerName, 24)
    : undefined;
  const title = cleanText(req.body?.title, 80);
  const body = cleanText(req.body?.body, 220);

  if (!notificationAdminToken || token !== notificationAdminToken) {
    res.status(403).json({ error: "Notification send is not enabled" });
    return;
  }

  if (!gameId || !title || !body) {
    res.status(400).json({ error: "Missing game id, title, or body" });
    return;
  }

  try {
    const result = await sendPushNotifications(
      {
        title,
        body,
        tag: cleanText(req.body?.tag, 120) || `minigames-${gameId}`,
      },
      { gameId, roomCode, notify, playerName }
    );
    res.json({ ok: true, gameId, result });
  } catch (err) {
    console.error("Notification send error:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

app.get("/api/minigames/storage/status", async (req, res) => {
  try {
    if (databaseUrl) {
      const pool = await ensureDatabase();
      await pool.query("SELECT 1");
    }

    res.json({
      ok: true,
      minigames: minigamesStorageMode(),
      notifications: notificationsStorageMode(),
      databaseReady: Boolean(databaseUrl),
    });
  } catch (err) {
    console.error("Minigames storage status error:", err);
    res.status(500).json({
      ok: false,
      minigames: minigamesStorageMode(),
      notifications: notificationsStorageMode(),
      databaseReady: false,
      error: "Storage is not healthy",
    });
  }
});

app.get("/api/minigames/custom", async (req, res) => {
  try {
    const data = await readMinigamesData();
    res.json({
      games: data.customGames
        .map((game) => publicCustomGame(game))
        .filter((game) => game.id && game.name && game.questions.length >= 5),
    });
  } catch (err) {
    console.error("Custom minigames read error:", err);
    res.status(500).json({ error: "Failed to load custom minigames" });
  }
});

app.post("/api/minigames/custom", async (req, res) => {
  const payload = cleanCustomGamePayload(req.body);

  if (!payload.name || payload.questions.length < 5) {
    res.status(400).json({ error: "Custom games need a name and at least 5 complete questions" });
    return;
  }

  try {
    const result = await updateMinigamesData((data) => {
      data.customGames = Array.isArray(data.customGames) ? data.customGames : [];
      const now = new Date();
      const createdAt = now.toISOString();
      const closesAt = new Date(now.getTime() + 365 * 86400000).toISOString();
      const baseId = cleanGameId(payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) || "custom-game";
      let id = `custom-${baseId}`;
      let suffix = 2;
      const existingIds = new Set(data.customGames.map((game) => cleanGameId(game?.id)));
      while (existingIds.has(id)) {
        id = `custom-${baseId}-${suffix}`;
        suffix += 1;
      }

      const game = {
        id,
        name: payload.name,
        type: "Custom",
        summary: payload.summary || `A custom prediction game by ${payload.creator || "a player"}.`,
        creator: payload.creator,
        createdAt,
        closesAt,
        questions: payload.questions,
      };

      data.customGames.push(game);
      return { game: publicCustomGame(game) };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Custom minigames publish error:", err);
    res.status(500).json({ error: "Failed to publish custom minigame" });
  }
});

app.get("/api/minigames/:gameId/entries", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);

  if (!gameId) {
    res.status(400).json({ error: "Missing game id" });
    return;
  }

  try {
    const data = await readMinigamesData();
    res.json({ gameId, entries: publicEntriesForGame(data, gameId) });
  } catch (err) {
    console.error("Minigames read error:", err);
    res.status(500).json({ error: "Failed to load minigame entries" });
  }
});

app.post("/api/minigames/:gameId/entries", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);
  const name = cleanText(req.body?.name, 24);
  const notify = ["none", "win", "updates"].includes(req.body?.notify)
    ? req.body.notify
    : "none";
  const picks = cleanPicks(req.body?.picks);

  if (!gameId || !name || !hasPicks(picks)) {
    res.status(400).json({ error: "Missing name or picks" });
    return;
  }

  try {
    const payload = await updateMinigamesData((data) => {
      const game = ensureGame(data, gameId);
      const entries = game.entries.filter(
        (entry) =>
          cleanText(entry?.name, 24).toLowerCase() !== name.toLowerCase()
      );

      entries.push({
        name,
        picks,
        notify,
        savedAt: new Date().toISOString(),
      });

      game.entries = entries;
      return { gameId, entries: publicEntriesForGame(data, gameId) };
    });
    res.json(payload);
  } catch (err) {
    console.error("Minigames save error:", err);
    res.status(500).json({ error: "Failed to save minigame entry" });
  }
});

app.get("/api/minigames/:gameId/results", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);

  if (!gameId) {
    res.status(400).json({ error: "Missing game id" });
    return;
  }

  try {
    const data = await readMinigamesData();
    res.json({ gameId, results: publicResultsForGame(data, gameId) });
  } catch (err) {
    console.error("Minigames results read error:", err);
    res.status(500).json({ error: "Failed to load minigame results" });
  }
});

app.post("/api/minigames/:gameId/results/check", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);
  const gameName = cleanText(req.body?.gameName, 80);
  const questions = Array.isArray(req.body?.questions)
    ? req.body.questions.slice(0, maxAutoResultQuestions).map(cleanAutoResultQuestion).filter(Boolean)
    : [];

  if (!gameId) {
    res.status(400).json({ error: "Missing game id" });
    return;
  }

  try {
    if (shouldThrottleResultCheck(req, gameId)) {
      const data = await readMinigamesData();
      res.json({ gameId, results: publicResultsForGame(data, gameId), throttled: true });
      return;
    }

    let changedQuestionIds = [];
    const payload = await updateMinigamesData(async (data) => {
      const game = ensureGame(data, gameId);
      game.results ||= {};

      await Promise.all(questions.map(async (question, questionIndex) => {
        const questionId = question.id || `q-${questionIndex}`;
        if (!questionId) {
          return;
        }

        const previousResult = game.results[questionId];
        const result = await automaticResultForQuestion(question, questionIndex);
        if (result) {
          game.results[questionId] = result;
          const previousKey = JSON.stringify(previousResult || null);
          const nextKey = JSON.stringify(result || null);
          if (previousKey !== nextKey) {
            changedQuestionIds.push(questionId);
          }
        }
      }));

      return { gameId, results: publicResultsForGame(data, gameId) };
    });

    if (changedQuestionIds.length > 0) {
      await sendMinigameUpdateNotifications({
        gameId,
        gameName,
        changedQuestionIds,
      });
    }

    res.json(payload);
  } catch (err) {
    console.error("Minigames result check error:", err);
    res.status(500).json({ error: "Failed to check minigame results" });
  }
});

app.post("/api/minigames/:gameId/results", async (req, res) => {
  const token = cleanText(req.get("authorization"), 300).replace(/^Bearer\s+/i, "");
  const gameId = cleanGameId(req.params.gameId);
  const gameName = cleanText(req.body?.gameName, 80);
  const result = cleanResult(req.body);

  if (!notificationAdminToken || token !== notificationAdminToken) {
    res.status(403).json({ error: "Result updates are not enabled" });
    return;
  }

  if (!gameId || !result) {
    res.status(400).json({ error: "Missing game id or result" });
    return;
  }

  try {
    const payload = await updateMinigamesData((data) => {
      const game = ensureGame(data, gameId);
      game.results[result.questionId] = result;
      return { gameId, results: publicResultsForGame(data, gameId) };
    });

    await sendMinigameUpdateNotifications({
      gameId,
      gameName,
      changedQuestionIds: [result.questionId],
    });

    res.json(payload);
  } catch (err) {
    console.error("Minigames result update error:", err);
    res.status(500).json({ error: "Failed to save minigame result" });
  }
});

app.post("/api/minigames/:gameId/rooms", async (req, res) => {
  const token = cleanText(req.get("authorization"), 300).replace(/^Bearer\s+/i, "");
  const gameId = cleanGameId(req.params.gameId);
  const canRequestCode = notificationAdminToken && token === notificationAdminToken;
  const requestedCode = canRequestCode ? cleanRoomCode(req.body?.roomCode) : "";

  if (!gameId) {
    res.status(400).json({ error: "Missing game id" });
    return;
  }

  if (requestedCode && !isValidRoomCode(requestedCode)) {
    res.status(400).json({ error: "Room codes must be six characters from the shared room alphabet" });
    return;
  }

  try {
    const payload = await updateMinigamesData((data) => {
      const roomCode = requestedCode || uniqueRoomCode(data, gameId);
      if (!roomCode) {
        throw new Error("Room code generation failed");
      }

      const existingRoom = data.games?.[gameId]?.rooms?.[roomCode];
      const room = ensureRoom(data, gameId, roomCode);
      if (!existingRoom) {
        room.createdAt = new Date().toISOString();
      }
      room.updatedAt = room.updatedAt || null;

      return {
        gameId,
        room: roomSummary(room, roomCode),
        entries: publicEntriesForRoom(data, gameId, roomCode),
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("Minigames room create error:", err);
    res.status(500).json({ error: "Failed to create minigame room" });
  }
});

app.get("/api/minigames/:gameId/rooms/:roomCode", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);
  const roomCode = cleanRoomCode(req.params.roomCode);

  if (!gameId || !roomCode) {
    res.status(400).json({ error: "Missing game id or room code" });
    return;
  }

  if (!isValidRoomCode(roomCode)) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  try {
    const data = await readMinigamesData();
    const room = existingRoom(data, gameId, roomCode);

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    res.json({
      gameId,
      room: roomSummary(room, roomCode),
      entries: publicEntriesForRoom(data, gameId, roomCode),
    });
  } catch (err) {
    console.error("Minigames room read error:", err);
    res.status(500).json({ error: "Failed to load minigame room" });
  }
});

app.get("/api/minigames/:gameId/rooms/:roomCode/entries", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);
  const roomCode = cleanRoomCode(req.params.roomCode);

  if (!gameId || !roomCode) {
    res.status(400).json({ error: "Missing game id or room code" });
    return;
  }

  if (!isValidRoomCode(roomCode)) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  try {
    const data = await readMinigamesData();
    const room = existingRoom(data, gameId, roomCode);

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    res.json({
      gameId,
      room: roomSummary(room, roomCode),
      entries: publicEntriesForRoom(data, gameId, roomCode),
    });
  } catch (err) {
    console.error("Minigames room read error:", err);
    res.status(500).json({ error: "Failed to load minigame room entries" });
  }
});

app.post("/api/minigames/:gameId/rooms/:roomCode/entries", async (req, res) => {
  const gameId = cleanGameId(req.params.gameId);
  const roomCode = cleanRoomCode(req.params.roomCode);
  const name = cleanText(req.body?.name, 24);
  const notify = ["none", "win", "updates"].includes(req.body?.notify)
    ? req.body.notify
    : "none";
  const picks = cleanPicks(req.body?.picks);

  if (!gameId || !roomCode || !name || !hasPicks(picks)) {
    res.status(400).json({ error: "Missing room, name, or picks" });
    return;
  }

  if (!isValidRoomCode(roomCode)) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  try {
    const payload = await updateMinigamesData((data) => {
      const room = existingRoom(data, gameId, roomCode);
      if (!room) {
        const err = new Error("Room not found");
        err.statusCode = 404;
        throw err;
      }

      const savedAt = new Date().toISOString();
      const entries = room.entries.filter(
        (entry) =>
          cleanText(entry?.name, 24).toLowerCase() !== name.toLowerCase()
      );

      entries.push({
        name,
        picks,
        notify,
        savedAt,
      });

      room.entries = entries;
      room.updatedAt = savedAt;

      return {
        gameId,
        room: roomSummary(room, roomCode),
        entries: publicEntriesForRoom(data, gameId, roomCode),
      };
    });
    res.json(payload);
  } catch (err) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    console.error("Minigames room save error:", err);
    res.status(500).json({ error: "Failed to save minigame room entry" });
  }
});

// Basic health check
app.get("/", (req, res) => {
  res.send("Hillview Middle School Teacher Simulator API is running.");
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Hillview sim backend listening on port ${PORT}`);
});
