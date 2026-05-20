import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minigamesPath =
  process.env.MINIGAMES_HTML_PATH ||
  path.join(repoRoot, "minigames", "index.html");
const apiBase = (process.env.MINIGAMES_API_BASE || "https://dexter-bain.onrender.com").replace(/\/+$/, "");
const dryRun = process.argv.includes("--dry-run");
const losAngelesDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date()).replaceAll("-", "");

function loadEventCatalog() {
  const html = fs.readFileSync(minigamesPath, "utf8");
  const start = html.indexOf("const menloParkWeatherSource");
  const eventStart = html.indexOf("const eventCatalog = [");
  const end = html.indexOf("\n    ];", eventStart);
  if (start === -1 || eventStart === -1 || end === -1) {
    throw new Error("Could not locate event catalog in minigames/index.html.");
  }

  const block = html.slice(start, end + 7);
  const script = `
function slugify(value){ return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item"; }
function pointsForOdds(odds){ return Math.max(10, Math.round(100 / Math.max(0.05, odds / 100))); }
function answer(label, odds, id = slugify(label)) { const chance = Math.min(95, Math.max(4, Number(odds) || 50)); return { id, label, odds: chance, points: pointsForOdds(chance) }; }
function question(text, answers, id = slugify(text), options = {}) { return { id, text, answers, autoSource: options.autoSource || "", lockAt: options.lockAt || "" }; }
${block}
module.exports = { eventCatalog };
`;

  const context = { module: { exports: {} }, exports: {}, console };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.module.exports.eventCatalog || [];
}

function currentDailyWeatherGame(eventCatalog) {
  const exactId = `daily-weather-${losAngelesDate}`;
  return eventCatalog.find((game) => game.id === exactId)
    || [...eventCatalog].reverse().find((game) => String(game?.id || "").startsWith("daily-weather-"))
    || null;
}

function lockedQuestions(game) {
  const now = Date.now();
  return (Array.isArray(game?.questions) ? game.questions : [])
    .filter((question) => {
      const lockAt = Date.parse(question?.lockAt || "");
      return Number.isFinite(lockAt) && lockAt <= now;
    })
    .map((question) => ({
      id: question.id,
      text: question.text,
      autoSource: question.autoSource || "",
      lockAt: question.lockAt || "",
      answers: (Array.isArray(question.answers) ? question.answers : []).map((answer) => ({
        id: answer.id,
        label: answer.label,
      })),
    }))
    .filter((question) => question.id && question.text && question.answers.length >= 2);
}

async function main() {
  const eventCatalog = loadEventCatalog();
  const game = currentDailyWeatherGame(eventCatalog);
  if (!game) {
    console.log("No daily weather game found.");
    return;
  }

  const questions = lockedQuestions(game);
  if (!questions.length) {
    console.log(`No locked questions to score for ${game.id}.`);
    return;
  }

  if (dryRun) {
    console.log(`Dry run: would check ${questions.length} locked questions for ${game.id}.`);
    return;
  }

  const response = await fetch(`${apiBase}/api/minigames/${encodeURIComponent(game.id)}/results/check`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gameName: game.name,
      questions,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Result check failed with ${response.status}: ${text}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  const resolved = results.filter((result) => result?.status === "resolved").length;
  console.log(`Checked ${questions.length} locked questions for ${game.id}. ${resolved} resolved results are stored.`);
}

await main();
