import { readFile, writeFile } from "node:fs/promises";

const apiUrl =
  process.env.SKIP_FOR_WISHES_API_URL ||
  "https://secure2.wish.org/site/CRTeamraiserAPI?method=getParticipants&api_key=mu3fefod&v=1.0&fr_id=7471&first_name=Dexter&last_name=Bain&response_format=json";

const configPaths = [
  "skip-for-wishes-src/public/config.js",
  "skip-for-wishes/config.js"
];

const configPrefix = "window.skipForWishesConfig = ";
const dryRun = process.argv.includes("--dry-run");

function parseConfig(source) {
  const trimmed = source.trim();
  if (!trimmed.startsWith(configPrefix) || !trimmed.endsWith(";")) {
    throw new Error("Skip for Wishes config has an unexpected format.");
  }
  return JSON.parse(trimmed.slice(configPrefix.length, -1));
}

function toDollars(value, fieldName) {
  const cents = Number(value);
  if (!Number.isFinite(cents) || cents < 0) {
    throw new Error(`Make-A-Wish returned an invalid ${fieldName}.`);
  }
  return cents / 100;
}

function formatUpdateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

function formatConfig(config) {
  return `${configPrefix}${JSON.stringify(config, null, 2)};\n`;
}

const response = await fetch(apiUrl, {
  headers: {
    Accept: "application/json",
    "User-Agent": "Skip-for-Wishes-progress-sync/1.0"
  }
});

if (!response.ok) {
  throw new Error(`Make-A-Wish progress request failed with status ${response.status}.`);
}

const payload = await response.json();
const participantValue = payload?.getParticipantsResponse?.participant;
const participants = Array.isArray(participantValue)
  ? participantValue
  : [participantValue].filter(Boolean);
const participant = participants.find((item) => String(item.consId) === "11514783");

if (!participant) {
  throw new Error("The Skip for Wishes Make-A-Wish campaign was not found.");
}

const personalPageUrl = new URL(participant.personalPageUrl);
if (personalPageUrl.protocol !== "https:" || personalPageUrl.hostname !== "secure2.wish.org") {
  throw new Error("Make-A-Wish returned an unexpected fundraiser URL.");
}

const currentSource = await readFile(configPaths[0], "utf8");
const currentConfig = parseConfig(currentSource);
const raised = toDollars(participant.amountRaised, "amount raised");
const goal = toDollars(participant.goal, "goal");

if (goal <= 0) {
  throw new Error("Make-A-Wish returned a fundraiser goal of zero.");
}

const progressChanged =
  currentConfig.fundraiserUrl !== personalPageUrl.href ||
  currentConfig.raised !== raised ||
  currentConfig.goal !== goal;

const nextConfig = {
  ...currentConfig,
  fundraiserUrl: personalPageUrl.href,
  raised,
  goal,
  lastUpdated: progressChanged ? formatUpdateTime(new Date()) : currentConfig.lastUpdated
};

const nextSource = formatConfig(nextConfig);
if (dryRun) {
  process.stdout.write(nextSource);
  process.exit(0);
}

let changed = false;
for (const configPath of configPaths) {
  const existingSource = await readFile(configPath, "utf8");
  if (existingSource !== nextSource) {
    await writeFile(configPath, nextSource);
    changed = true;
  }
}

console.log(
  changed
    ? `Synced Skip for Wishes: $${raised.toLocaleString("en-US")} raised of $${goal.toLocaleString("en-US")}.`
    : "Skip for Wishes progress is already current."
);
