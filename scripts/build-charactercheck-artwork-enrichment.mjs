import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "charactercheck", "data");
const OUTPUT = path.join(DATA_DIR, "artwork-enrichment.js");
const CACHE = "/tmp/dexter-charactercheck-artwork-cache.json";
const USER_AGENT = "DexterBainCharacterCheck/3.0 (https://dexterbain.com/charactercheck/about.html)";
const RELATED_PROPERTIES = ["P674", "P161", "P725", "P371", "P710", "P921", "P57", "P170", "P58", "P162"];

async function loadCatalog() {
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
    "expanded-catalog-5.js",
    "expanded-enrichment.js",
    "verified-catalog.js",
  ]) {
    vm.runInContext(await fs.readFile(path.join(DATA_DIR, filename), "utf8"), context, { filename });
  }
  return Object.entries(context.MEDIA).map(([id, media]) => ({ id, ...media }));
}

async function readCache() {
  try {
    const cache = JSON.parse(await fs.readFile(CACHE, "utf8"));
    cache.tvmaze ||= {};
    return cache;
  } catch {
    return { entities: {}, pages: {}, people: {}, tvmaze: {} };
  }
}

async function writeCache(cache) {
  await fs.writeFile(CACHE, JSON.stringify(cache));
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function mapLimited(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function fetchJson(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      });
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 900));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 650));
    }
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

function claimValue(entity, property) {
  return entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
}

function claimIds(entity, property) {
  return (entity?.claims?.[property] || [])
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function commonsArtwork(filename, label) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return {
    url: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=1200`,
    sourceName: label ? `Wikimedia Commons · ${label}` : "Wikimedia Commons",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encoded}`,
    subject: label || "",
  };
}

function compactEntity(entity) {
  return {
    image: claimValue(entity, "P18") || "",
    enwiki: entity?.sitelinks?.enwiki?.title || "",
    related: RELATED_PROPERTIES.flatMap((property) => claimIds(entity, property)),
  };
}

async function fetchTitleEntities(entries, cache) {
  const missingQids = [...new Set(entries.map((entry) => entry.wikidataId).filter((qid) => qid && !cache.entities[qid]))];
  const batches = chunks(missingQids, 50);
  await mapLimited(batches, 5, async (batch, index) => {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.search = new URLSearchParams({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "claims|sitelinks",
      sitefilter: "enwiki",
      format: "json",
      origin: "*",
    });
    const payload = await fetchJson(url);
    Object.values(payload.entities || {}).forEach((entity) => {
      cache.entities[entity.id] = compactEntity(entity);
    });
    if ((index + 1) % 10 === 0 || index === batches.length - 1) {
      await writeCache(cache);
      console.log(`Wikidata title batches: ${index + 1}/${batches.length}`);
    }
  });
}

async function fetchWikipediaPages(entries, cache) {
  const pageTitles = [...new Set(entries
    .map((entry) => cache.entities[entry.wikidataId]?.enwiki)
    .filter((title) => title && !cache.pages[title]))];
  const batches = chunks(pageTitles, 20);
  await mapLimited(batches, 3, async (batch, index) => {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      prop: "pageimages|info",
      inprop: "url",
      piprop: "original|thumbnail",
      pithumbsize: "1200",
      titles: batch.join("|"),
      redirects: "1",
      format: "json",
      origin: "*",
    });
    const payload = await fetchJson(url);
    Object.values(payload.query?.pages || {}).forEach((page) => {
      cache.pages[page.title] = {
        image: page.original?.source || page.thumbnail?.source || "",
        sourceUrl: page.fullurl || "",
      };
    });
    // Redirected titles need to resolve back to the original lookup key.
    for (const redirect of payload.query?.redirects || []) {
      if (cache.pages[redirect.to]) cache.pages[redirect.from] = cache.pages[redirect.to];
    }
    for (const normalized of payload.query?.normalized || []) {
      if (cache.pages[normalized.to]) cache.pages[normalized.from] = cache.pages[normalized.to];
    }
    batch.forEach((title) => {
      if (!cache.pages[title]) cache.pages[title] = { image: "", sourceUrl: "" };
    });
    if ((index + 1) % 10 === 0 || index === batches.length - 1) {
      await writeCache(cache);
      console.log(`Wikipedia image batches: ${index + 1}/${batches.length}`);
    }
  });
}

async function fetchRelatedPeople(entries, cache) {
  const ids = [...new Set(entries.flatMap((entry) => cache.entities[entry.wikidataId]?.related || []))];
  const missing = ids.filter((id) => !cache.people[id]);
  const batches = chunks(missing, 20);
  async function fetchBatch(batch) {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.search = new URLSearchParams({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "claims|labels",
      languages: "en",
      languagefallback: "1",
      format: "json",
      origin: "*",
    });
    let payload;
    try {
      payload = await fetchJson(url);
    } catch (error) {
      if (batch.length === 1) {
        cache.people[batch[0]] = { label: batch[0], image: "" };
        console.warn(`Skipping unavailable related entity ${batch[0]}.`);
        return;
      }
      const middle = Math.ceil(batch.length / 2);
      await fetchBatch(batch.slice(0, middle));
      await fetchBatch(batch.slice(middle));
      return;
    }
    Object.values(payload.entities || {}).forEach((entity) => {
      cache.people[entity.id] = {
        label: entity.labels?.en?.value || entity.id,
        image: claimValue(entity, "P18") || "",
      };
    });
    batch.forEach((id) => {
      if (!cache.people[id]) cache.people[id] = { label: id, image: "" };
    });
  }

  await mapLimited(batches, 2, async (batch, index) => {
    await fetchBatch(batch);
    if ((index + 1) % 10 === 0 || index === batches.length - 1) {
      await writeCache(cache);
      console.log(`Related-person batches: ${index + 1}/${batches.length}`);
    }
  });
}

function normalizedTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chooseSpecificArtwork(entry, cache) {
  const entity = cache.entities[entry.wikidataId];
  const direct = commonsArtwork(entity?.image);
  if (direct) return { ...direct, alt: `${entry.officialTitle} artwork` };

  const page = entity?.enwiki ? cache.pages[entity.enwiki] : null;
  if (page?.image) {
    return {
      url: page.image,
      sourceName: "Wikipedia",
      sourceUrl: page.sourceUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(entity.enwiki.replace(/ /g, "_"))}`,
      alt: `${entry.officialTitle} promotional artwork`,
    };
  }

  for (const relatedId of entity?.related || []) {
    const person = cache.people[relatedId];
    const related = commonsArtwork(person?.image, person?.label);
    if (related) {
      return {
        ...related,
        alt: `${person.label}, associated with ${entry.officialTitle}`,
      };
    }
  }
  const tvmaze = cache.tvmaze?.[entry.id];
  if (tvmaze?.url) return tvmaze;
  return null;
}

async function fetchTvmazeArtwork(entries, cache) {
  const eligibleTypes = new Set(["show", "kids", "game-show", "reality", "documentary"]);
  const remaining = entries.filter((entry) =>
    eligibleTypes.has(entry.type) &&
    !chooseSpecificArtwork(entry, cache) &&
    !Object.hasOwn(cache.tvmaze, entry.id));

  await mapLimited(remaining, 6, async (entry, index) => {
    const url = new URL("https://api.tvmaze.com/search/shows");
    url.searchParams.set("q", entry.officialTitle);
    try {
      const results = await fetchJson(url, 10);
      const exact = results
        .map((result) => result.show)
        .find((show) => normalizedTitle(show?.name) === normalizedTitle(entry.officialTitle) && (show?.image?.original || show?.image?.medium));
      cache.tvmaze[entry.id] = exact ? {
        url: exact.image.original || exact.image.medium,
        sourceName: "TVmaze",
        sourceUrl: exact.url,
        alt: `${entry.officialTitle} promotional artwork`,
      } : null;
    } catch (error) {
      console.warn(`TVmaze lookup will retry later for ${entry.officialTitle}.`);
      return;
    }
    if ((index + 1) % 25 === 0 || index === remaining.length - 1) {
      await writeCache(cache);
      console.log(`TVmaze title lookups: ${index + 1}/${remaining.length}`);
    }
  });
}

const REPRESENTATIVE_ARTWORK = {
  "game-show": ["CBS Studios, \"The Price is Right\" - panoramio.jpg", "a representative game-show studio"],
  documentary: ["Man with a Movie Camera by Dziga Vertov.jpg", "a representative documentary image"],
  kids: ["Children's program with Buckeroo Mushers group, KTVA, 1957.jpg", "a representative children's television production"],
  reality: ["HDLA at Staples in Los Angeles - Uplink with multi-camera production.jpg", "a representative television production"],
  movie: ["16 mm Film camera.JPG", "a representative film camera"],
  show: ["1950's television.jpg", "a representative television image"],
  other: ["Bell and Howell 35mm wind up film camera. 1940's..jpg", "a representative filmed-media image"],
};

function chooseArtwork(entry, cache) {
  const specific = chooseSpecificArtwork(entry, cache);
  if (specific) return specific;
  const [filename, label] = REPRESENTATIVE_ARTWORK[entry.type] || REPRESENTATIVE_ARTWORK.other;
  const representative = commonsArtwork(filename, label);
  return {
    ...representative,
    sourceName: `Wikimedia Commons · ${label}`,
    alt: `${label} used when title-specific artwork is unavailable for ${entry.officialTitle}`,
  };
}

const catalog = await loadCatalog();
const missing = catalog.filter((entry) => !/^https?:\/\//i.test(entry.poster || ""));
const withQids = missing.filter((entry) => entry.wikidataId);
const cache = await readCache();

console.log(`Artwork needed for ${missing.length} titles; ${withQids.length} have Wikidata ids.`);
await fetchTitleEntities(withQids, cache);
await fetchWikipediaPages(withQids, cache);
await fetchRelatedPeople(withQids, cache);
await fetchTvmazeArtwork(missing, cache);
await writeCache(cache);

const artwork = {};
for (const entry of missing) {
  const selected = chooseArtwork(entry, cache);
  if (selected) artwork[entry.id] = selected;
}

const source = `// Generated by scripts/build-charactercheck-artwork-enrichment.mjs.\n` +
`(() => {\n  "use strict";\n` +
`  const ARTWORK = ${JSON.stringify(artwork, null, 2)};\n` +
`  for (const [id, artwork] of Object.entries(ARTWORK)) {\n` +
`    const media = window.MEDIA?.[id];\n    if (!media) continue;\n` +
`    media.poster = artwork.url;\n    media.hero = artwork.url;\n    media.artworkFallback = artwork.url;\n` +
`    media.sourceName = artwork.sourceName;\n    media.sourceUrl = artwork.sourceUrl;\n` +
`    media.questionImages = window.FALLBACK_QUESTIONS.map((_, index) => ({ url: artwork.url, alt: artwork.alt + " for question " + (index + 1), sourceName: artwork.sourceName, sourceUrl: artwork.sourceUrl }));\n` +
`  }\n` +
`  for (const media of Object.values(window.MEDIA || {})) {\n` +
`    if (!/^https?:\\/\\//i.test(media.poster || "")) continue;\n` +
`    media.hero = /^https?:\\/\\//i.test(media.hero || "") ? media.hero : media.poster;\n` +
`    media.artworkFallback = media.poster;\n` +
`    media.questionImages = window.FALLBACK_QUESTIONS.map((_, index) => {\n` +
`      const current = media.questionImages?.[index];\n` +
`      if (/^https?:\\/\\//i.test(current?.url || "") && /^https?:\\/\\//i.test(current?.sourceUrl || media.sourceUrl || "")) return current;\n` +
`      return { url: media.poster, alt: (media.officialTitle || "Title") + " artwork for question " + (index + 1), sourceName: media.sourceName || (media.tvmazeUrl ? "TVmaze" : "Source"), sourceUrl: media.sourceUrl || media.tvmazeUrl };\n` +
`    });\n` +
`  }\n` +
`  window.CHARACTER_CHECK_ARTWORK = Object.freeze({ sourced: Object.keys(ARTWORK).length });\n` +
`})();\n`;

await fs.writeFile(OUTPUT, source);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${Object.keys(artwork).length} sourced images.`);
console.log(`Still missing: ${missing.length - Object.keys(artwork).length}.`);
