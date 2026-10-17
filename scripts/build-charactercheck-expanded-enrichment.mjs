import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "charactercheck", "data");
const OUTPUT = path.join(DATA_DIR, "expanded-enrichment.js");
const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
const USER_AGENT = "DexterBainCharacterCheck/1.0 (https://dexterbain.com/charactercheck/)";
const CAST_OVERRIDES = {
  "the-mitchells-vs-the-machines": [["Katie Mitchell", "Abbi Jacobson"], ["Rick Mitchell", "Danny McBride"], ["Linda Mitchell", "Maya Rudolph"], ["Aaron Mitchell", "Mike Rianda"]],
  luca: [["Luca Paguro", "Jacob Tremblay"], ["Alberto Scorfano", "Jack Dylan Grazer"], ["Giulia Marcovaldo", "Emma Berman"], ["Ercole Visconti", "Saverio Raimondo"]],
  "turning-red": [["Mei Lee", "Rosalie Chiang"], ["Ming Lee", "Sandra Oh"], ["Miriam Mendelsohn", "Ava Morse"], ["Priya Mangal", "Maitreyi Ramakrishnan"]],
  elemental: [["Ember Lumen", "Leah Lewis"], ["Wade Ripple", "Mamoudou Athie"], ["Bernie Lumen", "Ronnie del Carmen"], ["Gale Cumulus", "Wendi McLendon-Covey"]],
  wish: [["Asha", "Ariana DeBose"], ["King Magnifico", "Chris Pine"], ["Valentino", "Alan Tudyk"], ["Queen Amaya", "Angelique Cabral"]],
  "raya-and-the-last-dragon": [["Raya", "Kelly Marie Tran"], ["Sisu", "Awkwafina"], ["Namaari", "Gemma Chan"], ["Tuk Tuk", "Alan Tudyk"]],
  "wreck-it-ralph": [["Wreck-It Ralph", "John C. Reilly"], ["Vanellope von Schweetz", "Sarah Silverman"], ["Fix-It Felix Jr.", "Jack McBrayer"], ["Sergeant Calhoun", "Jane Lynch"]],
  "big-hero-6": [["Hiro Hamada", "Ryan Potter"], ["Baymax", "Scott Adsit"], ["Go Go Tomago", "Jamie Chung"], ["Fred", "T.J. Miller"]],
  zootopia: [["Judy Hopps", "Ginnifer Goodwin"], ["Nick Wilde", "Jason Bateman"], ["Chief Bogo", "Idris Elba"], ["Dawn Bellwether", "Jenny Slate"]],
  tangled: [["Rapunzel", "Mandy Moore"], ["Flynn Rider", "Zachary Levi"], ["Mother Gothel", "Donna Murphy"], ["Maximus", "Frank Welker"]],
  "past-lives": [["Nora Moon", "Greta Lee"], ["Hae Sung", "Teo Yoo"], ["Arthur Zaturansky", "John Magaro"], ["Young Nora", "Moon Seung-ah"]],
};

async function loadCatalog() {
  const context = { window: {}, console };
  context.window = context;
  vm.createContext(context);
  const filenames = ["questions.js", "outcomes.js", "media.js", "title-questions.js", "expanded-catalog.js"];
  try {
    await fs.access(path.join(DATA_DIR, "expanded-catalog-2.js"));
    filenames.push("expanded-catalog-2.js");
  } catch {
    // The second expansion is optional while rebuilding the first release.
  }
  for (const filename of filenames) {
    const source = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
    vm.runInContext(source, context, { filename });
  }
  return Object.entries(context.MEDIA)
    .filter(([, media]) => media.catalogGenerated === true)
    .map(([id, media]) => ({
      id,
      title: media.officialTitle,
      type: media.type,
      catalogGeneration: media.catalogGeneration || 1,
    }));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function decodeEntities(value) {
  return value
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithRetry(url, { json = true, attempts = 4 } = {}) {
  let error;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 650 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return json ? response.json() : response.text();
    } catch (caught) {
      error = caught;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw error || new Error(`Unable to fetch ${url}`);
}

async function fetchShow(entry) {
  const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(entry.title)}&embed=cast`;
  const show = await fetchWithRetry(url);
  const cast = [];
  const seen = new Set();
  for (const credit of show?._embedded?.cast || []) {
    const character = credit.character?.name?.trim();
    const actor = credit.person?.name?.trim();
    const key = normalize(character);
    if (!character || !actor || seen.has(key)) continue;
    seen.add(key);
    cast.push([character, actor]);
    if (cast.length === 4) break;
  }
  return {
    title: show?.name || entry.title,
    poster: show?.image?.original || show?.image?.medium || "",
    sourceName: "TVmaze",
    sourceUrl: show?.url || url,
    premiered: show?.premiered || "",
    genres: Array.isArray(show?.genres) ? show.genres : [],
    cast,
  };
}

function findCast(html) {
  const markers = [
    /<h2[^>]+id="Cast"[^>]*>/i,
    /<h2[^>]+id="Voice_cast"[^>]*>/i,
    /<h2[^>]+id="Cast_and_characters"[^>]*>/i,
    /<h2[^>]+id="Characters"[^>]*>/i,
  ];
  let start = -1;
  for (const marker of markers) {
    const match = marker.exec(html);
    if (match && (start < 0 || match.index < start)) start = match.index + match[0].length;
  }
  if (start < 0) return [];
  const nextSection = html.indexOf("<section data-mw-section-id=", start);
  const chunk = html.slice(start, nextSection > start ? nextSection : start + 100000);
  const cast = [];
  const seen = new Set();
  for (const match of chunk.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = decodeEntities(match[1]).replace(/\[[^\]]*]/g, "").trim();
    const separator = /\s+(?:as|voices?|portrays?)\s+/i.exec(text);
    if (!separator) continue;
    const actor = text.slice(0, separator.index).replace(/^and\s+/i, "").trim();
    let character = text.slice(separator.index + separator[0].length).trim();
    character = character.split(/\s*:\s+|\s+[—–]\s+|,\s+/)[0].trim();
    if (character.includes(" / ")) character = character.split(" / ").slice(0, 2).join(" / ");
    if (actor.length < 2 || actor.length > 80 || character.length < 2 || character.length > 100) continue;
    const key = normalize(character);
    if (seen.has(key)) continue;
    seen.add(key);
    cast.push([character, actor]);
    if (cast.length === 4) break;
  }
  return cast;
}

async function fetchMovie(entry) {
  const searchTitle = entry.title
    .replace(/^Star Wars:\s*/i, "")
    .replace(/:\s*A Star Wars Story$/i, "");
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: `intitle:\"${searchTitle}\" film`,
    srnamespace: "0",
    srlimit: "5",
    format: "json",
    origin: "*",
  });
  const search = await fetchWithRetry(`https://en.wikipedia.org/w/api.php?${searchParams}`);
  const candidates = search?.query?.search || [];
  const target = normalize(searchTitle);
  const candidateScore = (candidate) => {
    const candidateTitle = normalize(candidate.title);
    const withoutFilmSuffix = candidateTitle.replace(/\s+(?:\d{4}\s+)?film$/, "").trim();
    if (withoutFilmSuffix === target) return 100;
    if (candidateTitle === target) return 95;
    if (withoutFilmSuffix.startsWith(`${target} `)) return 85;
    if (candidateTitle.includes(target)) return 70;
    if (normalize(candidate.snippet).includes(target)) return 45;
    return 0;
  };
  const page = [...candidates].sort((a, b) => candidateScore(b) - candidateScore(a))[0];
  if (!page?.title) throw new Error("No Wikipedia page found");

  const encodedPage = encodeURIComponent(page.title.replace(/ /g, "_"));
  const [summary, html] = await Promise.all([
    fetchWithRetry(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedPage}`),
    fetchWithRetry(`https://en.wikipedia.org/api/rest_v1/page/html/${encodedPage}`, { json: false }),
  ]);
  return {
    title: summary?.title || page.title,
    poster: summary?.originalimage?.source || summary?.thumbnail?.source || "",
    sourceName: "Wikipedia",
    sourceUrl: summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedPage}`,
    premiered: "",
    genres: [],
    cast: findCast(html),
  };
}

async function mapLimited(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        output[index] = await task(items[index]);
      } catch (error) {
        console.warn(`${items[index].title}: ${error.message}`);
        output[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

async function loadExisting() {
  try {
    const source = await fs.readFile(OUTPUT, "utf8");
    const match = source.match(/const ENRICHMENT = ([\s\S]*?);\n  for/);
    return match ? JSON.parse(match[1]) : {};
  } catch {
    return {};
  }
}

const entries = await loadCatalog();
const moviesOnly = process.argv.includes("--movies-only");
const missingOnly = process.argv.includes("--missing-only");
const newOnly = process.argv.includes("--new-only");
const existing = moviesOnly || missingOnly || newOnly ? await loadExisting() : {};
const targets = moviesOnly
  ? entries.filter((entry) => entry.type === "movie")
  : newOnly
    ? entries.filter((entry) => entry.catalogGeneration === 2 && !existing[entry.id])
    : missingOnly
      ? entries.filter((entry) => !existing[entry.id] || existing[entry.id].cast?.length !== 4)
      : entries;
const enriched = await mapLimited(targets, 6, async (entry) => {
  const data = entry.type === "show" ? await fetchShow(entry) : await fetchMovie(entry);
  if (CAST_OVERRIDES[entry.id]) data.cast = CAST_OVERRIDES[entry.id];
  return [entry.id, data];
});
const activeIds = new Set(entries.map((entry) => entry.id));
const data = Object.fromEntries(
  Object.entries({ ...existing, ...Object.fromEntries(enriched.filter(Boolean)) }).filter(([id]) =>
    activeIds.has(id),
  ),
);
const castCount = Object.values(data).filter((entry) => entry.cast?.length === 4).length;
const imageCount = Object.values(data).filter((entry) => entry.poster).length;

const source = `// Generated by scripts/build-charactercheck-expanded-enrichment.mjs.\n` +
`(() => {\n  \"use strict\";\n  const ROLE_ORDER = ${JSON.stringify(ROLE_ORDER)};\n  const ENRICHMENT = ${JSON.stringify(data, null, 2)};\n` +
`  for (const [id, data] of Object.entries(ENRICHMENT)) {\n` +
`    const media = window.MEDIA?.[id];\n    const outcomes = window.OUTCOMES?.[id];\n    if (!media || !outcomes) continue;\n` +
`    if (data.poster) {\n      media.poster = data.poster;\n      media.hero = data.poster;\n      media.questionImages = media.questionImages.map((image, index) => ({ ...image, url: data.poster, alt: media.officialTitle + \" promotional artwork for question \" + (index + 1), sourceName: data.sourceName, sourceUrl: data.sourceUrl }));\n    }\n` +
`    if (data.sourceName && data.sourceUrl) { media.sourceName = data.sourceName; media.sourceUrl = data.sourceUrl; }\n` +
`    if (data.premiered) media.premiered = data.premiered;\n    if (Array.isArray(data.genres) && data.genres.length) media.genres = data.genres;\n` +
`    if (Array.isArray(data.cast) && data.cast.length === ROLE_ORDER.length) {\n      ROLE_ORDER.forEach((role, index) => { outcomes[role].character = data.cast[index][0]; outcomes[role].actor = data.cast[index][1]; });\n    }\n` +
`  }\n  window.CHARACTER_CHECK_ENRICHMENT = Object.freeze({ titles: Object.keys(ENRICHMENT).length, fullCasts: ${castCount}, images: ${imageCount} });\n})();\n`;

await fs.writeFile(OUTPUT, source);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)}: ${Object.keys(data).length} titles, ${castCount} full casts, ${imageCount} images.`);
