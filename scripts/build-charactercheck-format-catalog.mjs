import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIRECTORY = path.join(ROOT, "charactercheck", "data");
const OUTPUT = path.join(DATA_DIRECTORY, "expanded-catalog-5.js");
const USER_AGENT = "DexterBainCharacterCheck/2.0 (https://dexterbain.com/charactercheck/about.html)";

const CATEGORIES = [
  {
    id: "kids-shows",
    label: "Kids' Shows",
    type: "kids",
    count: 1000,
    icon: "★",
    query: `{ ?item wdt:P31 wd:Q1273568. } UNION { ?item wdt:P136 wd:Q1273568. }`,
    limit: 2600,
  },
  {
    id: "documentaries",
    label: "Documentaries",
    type: "documentary",
    count: 1000,
    icon: "◎",
    query: `{ ?item wdt:P31 wd:Q93204. } UNION { ?item wdt:P136 wd:Q93204. }`,
    limit: 2600,
    required: [
      ["Q141336617", "You Can See Everything", "2026 documentary film directed by Nathan Fielder and Lance Oppenheim"],
    ],
  },
  {
    id: "game-shows",
    label: "Game Shows",
    type: "game-show",
    count: 1000,
    icon: "?",
    query: `{ ?item wdt:P31 wd:Q846662. } UNION { ?item wdt:P136 wd:Q846662. }`,
    limit: 1800,
  },
  {
    id: "reality-shows",
    label: "Reality Shows",
    type: "reality",
    count: 1000,
    icon: "!",
    query: `{ ?item wdt:P31 wd:Q3421644. } UNION { ?item wdt:P136 wd:Q182415. }`,
    limit: 2600,
    required: [
      ["Q10935299", "Nathan for You", "American television comedy series"],
      ["Q112915576", "The Rehearsal", "American docu-comedy television series"],
    ],
  },
  {
    id: "other-formats",
    label: "Short Films & Other Formats",
    type: "other",
    count: 1000,
    icon: "◆",
    query: `?item wdt:P31 wd:Q24862.`,
    limit: 2600,
  },
];

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeTitle(value).replace(/\s+/g, "-");
}

async function loadExistingCatalog() {
  const context = { window: {}, console };
  context.window = context;
  vm.createContext(context);
  for (const filename of [
    "questions.js",
    "outcomes.js",
    "media.js",
    "title-questions.js",
    "expanded-catalog.js",
    "expanded-catalog-2.js",
    "expanded-catalog-3.js",
    "expanded-catalog-4.js",
  ]) {
    vm.runInContext(
      await fs.readFile(path.join(DATA_DIRECTORY, filename), "utf8"),
      context,
      { filename },
    );
  }
  return {
    ids: new Set(Object.keys(context.MEDIA)),
    titles: new Set(Object.values(context.MEDIA).map((media) => normalizeTitle(media.officialTitle))),
  };
}

async function fetchJsonWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": USER_AGENT,
        },
      });
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 650 * attempt));
    }
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

async function fetchCandidates(category) {
  const query = `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?sitelinks WHERE {
      ${category.query}
      ?item wikibase:sitelinks ?sitelinks.
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
        ?item rdfs:label ?itemLabel.
        ?item schema:description ?itemDescription.
      }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT ${category.limit}
  `;
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const payload = await fetchJsonWithRetry(url);
  return payload.results.bindings.map((binding) => ({
    qid: binding.item.value.split("/").pop(),
    title: binding.itemLabel.value.trim(),
    description: binding.itemDescription?.value?.trim() || "",
    sitelinks: Number(binding.sitelinks.value),
  }));
}

const existing = await loadExistingCatalog();
const usedQids = new Set();
const usedTitles = new Set(existing.titles);
const usedIds = new Set(existing.ids);
const selected = [];

for (const category of CATEGORIES) {
  const candidates = await fetchCandidates(category);
  const required = (category.required || []).map(([qid, title, description]) => ({
    qid,
    title,
    description,
    sitelinks: Number.MAX_SAFE_INTEGER,
  }));
  const categoryEntries = [];
  for (const candidate of [...required, ...candidates]) {
    const normalized = normalizeTitle(candidate.title);
    const id = slugify(candidate.title);
    if (
      !normalized ||
      !id ||
      candidate.title.length > 100 ||
      /^Q\d+$/.test(candidate.title) ||
      usedQids.has(candidate.qid) ||
      usedTitles.has(normalized) ||
      usedIds.has(id)
    ) continue;
    const entry = { ...candidate, id, category: category.id, type: category.type };
    categoryEntries.push(entry);
    usedQids.add(candidate.qid);
    usedTitles.add(normalized);
    usedIds.add(id);
    if (categoryEntries.length === category.count) break;
  }
  if (categoryEntries.length !== category.count) {
    throw new Error(`${category.label} produced ${categoryEntries.length} unique titles; expected ${category.count}.`);
  }
  for (const requiredEntry of required) {
    if (!categoryEntries.some((entry) => entry.qid === requiredEntry.qid)) {
      throw new Error(`${category.label} is missing required title: ${requiredEntry.title}.`);
    }
  }
  selected.push(...categoryEntries);
  console.log(`${category.label}: ${categoryEntries.length} titles selected.`);
}

if (selected.length !== 5000) throw new Error(`Expected 5,000 additions; found ${selected.length}.`);

const compactCategories = Object.fromEntries(CATEGORIES.map((category) => [category.id, {
  label: category.label,
  type: category.type,
  count: category.count,
  icon: category.icon,
}]));
const rows = selected.map(({ qid, title, description, sitelinks, category }) => [
  qid,
  title,
  description,
  sitelinks,
  category,
]);

const source = `// Generated by scripts/build-charactercheck-format-catalog.mjs.\n` +
`(() => {\n  "use strict";\n` +
`  const ENTRIES = ${JSON.stringify(rows, null, 2)};\n` +
`  const CATEGORIES = ${JSON.stringify(compactCategories, null, 2)};\n` +
`  const ROLE_BLUEPRINTS = {\n` +
`    kids: { heart: ["The Kind Teammate", "The friend who includes everyone"], mind: ["The Clever Solver", "The one with the bright plan"], spark: ["The Brave Starter", "The one who gets the adventure moving"], wildcard: ["The Imagination Expert", "The one who sees a surprising possibility"] },\n` +
`    documentary: { heart: ["The Compassionate Witness", "The person who never loses sight of people"], mind: ["The Careful Investigator", "The one who follows the evidence"], spark: ["The Bold Truth-Teller", "The one willing to ask the hard question"], wildcard: ["The Perspective Shifter", "The one who notices the overlooked angle"] },\n` +
`    "game-show": { heart: ["The Team Player", "The contestant everyone trusts"], mind: ["The Quiz Master", "The one who reads the board"], spark: ["The Showstopper", "The player who owns the moment"], wildcard: ["The Risk Taker", "The contestant who makes the daring play"] },\n` +
`    reality: { heart: ["The Trusted Ally", "The person people confide in"], mind: ["The Strategist", "The one thinking three moves ahead"], spark: ["The Scene Stealer", "The person who changes the energy"], wildcard: ["The Unpredictable Original", "The person nobody can script"] },\n` +
`    other: { heart: ["The Human Center", "The person who gives the story meaning"], mind: ["The Visual Thinker", "The one who understands the structure"], spark: ["The Bold Creator", "The person who makes one moment unforgettable"], wildcard: ["The Format Breaker", "The one who invents a new way through"] },\n` +
`  };\n` +
`  const WHY = { heart: "You notice people first, build trust quickly, and make every group stronger by helping others feel seen.", mind: "You study the clues, stay calm under pressure, and turn complicated situations into a clear next move.", spark: "You bring courage, momentum, and memorable energy when everyone else is waiting for something to happen.", wildcard: "You trust original instincts, find possibilities other people miss, and make every story more surprising." };\n` +
`  const normalizeTitle = (value) => String(value || "").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/&/g, "and").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();\n` +
`  const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");\n` +
`  function hashText(value) { let hash = 2166136261; for (const character of value) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }\n` +
`  function titleLines(title) { const words = title.split(/\\s+/); const lines = []; let line = ""; for (const word of words) { const next = line ? line + " " + word : word; if (next.length > 20 && line) { lines.push(line); line = word; } else line = next; } if (line) lines.push(line); if (lines.length <= 3) return lines; return [lines[0], lines[1], lines.slice(2).join(" ").slice(0, 25)]; }\n` +
`  function makeCover(title, categoryId) { const category = CATEGORIES[categoryId]; const hash = hashText(title + categoryId); const colors = { "kids-shows": ["#ffb703", "#fb7185", "#38bdf8"], documentaries: ["#2563eb", "#0f172a", "#14b8a6"], "game-shows": ["#7c3aed", "#f59e0b", "#ec4899"], "reality-shows": ["#ef4444", "#8b5cf6", "#06b6d4"], "other-formats": ["#0f766e", "#f97316", "#4338ca"] }[categoryId]; const lines = titleLines(title); const startY = 390 - (lines.length - 1) * 32; const titleText = lines.map((line, index) => '<tspan x="50" y="' + (startY + index * 64) + '">' + escapeXml(line) + '</tspan>').join(""); const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' + colors[hash % 3] + '"/><stop offset="1" stop-color="' + colors[(hash + 1) % 3] + '"/></linearGradient></defs><rect width="600" height="900" rx="28" fill="#10111a"/><path d="M0 0h600v315L0 520z" fill="url(#g)"/><circle cx="' + (110 + hash % 380) + '" cy="165" r="110" fill="#fff" opacity=".16"/><text x="300" y="205" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="110" font-weight="900">' + category.icon + '</text><text x="50" y="' + startY + '" fill="white" font-family="Arial,sans-serif" font-size="50" font-weight="800">' + titleText + '</text><rect x="50" y="705" width="500" height="2" fill="white" opacity=".3"/><text x="50" y="762" fill="white" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="2">' + escapeXml(category.label.toUpperCase()) + '</text><text x="50" y="820" fill="white" opacity=".72" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="4">CHARACTER CHECK</text></svg>'; return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }\n` +
`  if (!window.MEDIA || !window.OUTCOMES || !Array.isArray(window.FALLBACK_QUESTIONS)) throw new Error("The 5,000-title Character Check catalog must load first.");\n` +
`  const existingIds = new Set(Object.keys(window.MEDIA)); const existingTitles = new Set(Object.values(window.MEDIA).map((media) => normalizeTitle(media.officialTitle))); const counts = {};\n` +
`  for (const [qid, title, description, sitelinks, categoryId] of ENTRIES) { const category = CATEGORIES[categoryId]; const id = normalizeTitle(title).replace(/\\s+/g, "-"); const normalized = normalizeTitle(title); if (existingIds.has(id) || existingTitles.has(normalized)) throw new Error("Format catalog repeats a title: " + title); const cover = makeCover(title, categoryId); window.MEDIA[id] = { type: category.type, officialTitle: title, genres: [category.label], poster: cover, hero: cover, artworkFallback: cover, sourceName: "Wikidata", sourceUrl: "https://www.wikidata.org/wiki/" + qid, collection: categoryId, collectionLabel: category.label, catalogGenerated: true, catalogGeneration: 5, wikidataId: qid, sitelinks, description, questionImages: window.FALLBACK_QUESTIONS.map((_, index) => ({ url: cover, alt: title + " original Character Check artwork for question " + (index + 1), sourceName: "Character Check original artwork", sourceUrl: "./about.html#artwork" })) }; const blueprint = ROLE_BLUEPRINTS[category.type]; window.OUTCOMES[id] = Object.fromEntries(Object.entries(blueprint).map(([role, [character, label]]) => [role, { character, actor: category.label + " archetype", label, why: "For " + title + ", " + WHY[role].charAt(0).toLowerCase() + WHY[role].slice(1) }])); existingIds.add(id); existingTitles.add(normalized); counts[categoryId] = (counts[categoryId] || 0) + 1; }\n` +
`  for (const [categoryId, category] of Object.entries(CATEGORIES)) { if (counts[categoryId] !== category.count) throw new Error(category.label + " needs " + category.count + " titles"); }\n` +
`  window.CHARACTER_CHECK_COLLECTIONS = Object.freeze([...(window.CHARACTER_CHECK_COLLECTIONS || []), ...Object.entries(CATEGORIES).map(([id, category]) => Object.freeze({ id, label: category.label, count: category.count }))]);\n` +
`})();\n`;

await fs.writeFile(OUTPUT, source);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${selected.length.toLocaleString()} category titles.`);
