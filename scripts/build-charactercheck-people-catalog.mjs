import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "charactercheck", "data", "expanded-catalog-5.js");
const USER_AGENT = "DexterBainCharacterCheck/1.0 (https://dexterbain.com/charactercheck/)";
const CATEGORIES = [
  { id: "baseball", label: "Baseball", type: "sports", occupation: "Q10871364", count: 200, credit: "Baseball star", introPattern: /\b(baseball player|professional baseball|major league baseball|mlb player|baseball pitcher|baseball outfielder|baseball infielder|baseball catcher)\b/i },
  { id: "basketball", label: "Basketball", type: "sports", occupation: "Q3665646", count: 200, credit: "Basketball star", introPattern: /\b(basketball player|professional basketball|national basketball association|nba player)\b/i },
  { id: "soccer", label: "Soccer", type: "sports", occupation: "Q937857", count: 100, credit: "Soccer star", introPattern: /\b(footballer|association football player|professional football player|soccer player)\b/i },
  { id: "football", label: "Football", type: "sports", occupation: "Q19204627", count: 75, credit: "Football star", introPattern: /\b(american football player|professional football player|national football league|nfl player)\b/i },
  { id: "hockey", label: "Hockey", type: "sports", occupation: "Q11774891", count: 75, credit: "Hockey star", introPattern: /\b(ice hockey player|professional hockey player|national hockey league|nhl player)\b/i },
  { id: "tennis", label: "Tennis", type: "sports", occupation: "Q10833314", count: 50, credit: "Tennis star", introPattern: /\b(tennis player|professional tennis)\b/i },
  { id: "golf-stars", label: "Golf", type: "sports", occupation: "Q11303721", count: 50, credit: "Golf star", introPattern: /\b(golfer|professional golf)\b/i },
  { id: "actors", label: "Actors", type: "actor", occupation: "Q33999", gender: "Q6581097", count: 100, credit: "Actor", introPattern: /\bactor\b/i },
  { id: "actresses", label: "Actresses", type: "actor", occupation: "Q33999", gender: "Q6581072", count: 100, credit: "Actress", introPattern: /\bactress\b/i },
];
const COMMERCIAL_CATEGORY = {
  id: "ad-icons",
  label: "Commercial Characters",
  type: "commercial",
  count: 50,
  credit: "Advertising icon",
};
const COMMERCIAL_CANDIDATES = [
  ["GEICO Gecko", "GEICO advertising campaigns"],
  ["Flo", "Flo (Progressive Insurance)"],
  ["Mayhem", "Mayhem (advertising character)"],
  ["Aflac Duck", "Aflac"],
  ["Mr. Clean", "Mr. Clean"],
  ["Pillsbury Doughboy", "Pillsbury Doughboy"],
  ["Michelin Man", "Michelin Man"],
  ["Tony the Tiger", "Tony the Tiger"],
  ["Chester Cheetah", "Chester Cheetah"],
  ["Kool-Aid Man", "Kool-Aid Man"],
  ["Mr. Peanut", "Mr. Peanut"],
  ["M&M's Characters", "M&M's"],
  ["Energizer Bunny", "Energizer Bunny"],
  ["Ronald McDonald", "Ronald McDonald"],
  ["Hamburglar", "Hamburglar"],
  ["Grimace", "Grimace"],
  ["Toucan Sam", "Toucan Sam"],
  ["Cap'n Crunch", "Cap'n Crunch"],
  ["Lucky the Leprechaun", "Lucky Charms"],
  ["Trix Rabbit", "Trix (cereal)"],
  ["Sonny the Cuckoo Bird", "Cocoa Puffs"],
  ["Snap, Crackle and Pop", "Snap, Crackle and Pop"],
  ["Green Giant", "Green Giant"],
  ["Keebler Elves", "Keebler Company"],
  ["Charmin Bears", "Charmin"],
  ["Coca-Cola Polar Bears", "Coca-Cola polar bears"],
  ["California Raisins", "The California Raisins"],
  ["Vlasic Stork", "Vlasic Pickles"],
  ["Scrubbing Bubbles", "Scrubbing Bubbles"],
  ["Duracell Bunny", "Duracell Bunny"],
  ["Nesquik Bunny", "Nesquik"],
  ["BuzzBee", "Honey Nut Cheerios"],
  ["Jack Box", "Jack Box"],
  ["Little Caesar", "Little Caesars"],
  ["The Noid", "The Noid"],
  ["Taco Bell Chihuahua", "Taco Bell chihuahua"],
  ["Spongmonkeys", "Spongmonkeys"],
  ["Erin Esurance", "Erin Esurance"],
  ["Mac Tonight", "Mac Tonight"],
  ["Max Headroom", "Max Headroom"],
  ["Most Interesting Man", "The Most Interesting Man in the World"],
  ["Old Spice Guy", "The Man Your Man Could Smell Like"],
  ["GEICO Cavemen", "GEICO Cavemen"],
  ["LiMu Emu", "Liberty Mutual"],
  ["Colonel Sanders", "Colonel Sanders"],
  ["Burger King", "The Burger King"],
  ["Speedy Alka-Seltzer", "Speedy (Alka-Seltzer)"],
  ["Smokey Bear", "Smokey Bear"],
  ["Woodsy Owl", "Woodsy Owl"],
  ["McGruff the Crime Dog", "McGruff the Crime Dog"],
  ["Reddy Kilowatt", "Reddy Kilowatt"],
  ["Elsie the Cow", "Elsie the Cow"],
  ["Cornelius Rooster", "Cornelius Rooster"],
  ["Sugar Bear", "Sugar Bear"],
  ["Count Chocula", "Count Chocula"],
  ["Franken Berry", "Monster cereals"],
  ["Boo Berry", "Monster cereals"],
  ["Chuck E. Cheese", "Chuck E. Cheese (character)"],
  ["Julius Pringles", "Julius Pringles"],
  ["Big Boy", "Big Boy Restaurants"],
  ["Sun-Maid Girl", "Sun-Maid"],
  ["Morton Salt Girl", "Morton Salt"],
  ["Coppertone Girl", "Coppertone (sunscreen)"],
  ["Charlie the Tuna", "Charlie the Tuna"],
  ["Hamburger Helper Glove", "Hamburger Helper"],
  ["Cinnamon Toast Crunch Chefs", "Cinnamon Toast Crunch"],
  ["Cavity Creeps", "Crest (toothpaste)"],
  ["Sailor Jack and Bingo", "Cracker Jack"],
  ["Betty Crocker", "Betty Crocker"],
  ["Aunt Jemima", "Aunt Jemima"],
  ["The Quaker Man", "Quaker Oats Company"],
  ["Mr. Owl", "Tootsie Pop"],
  ["The Man from Glad", "Glad (company)"],
  ["Baby Nut", "Mr. Peanut"],
  ["Gidget", "Taco Bell chihuahua"],
  ["The King", "The Burger King"],
  ["The Most Interesting Man", "The Most Interesting Man in the World"],
  ["The Verizon Test Man", "Paul Marcarelli"],
  ["Progressive Jamie", "Progressive Corporation"],
  ["Jake from State Farm", "Jake from State Farm"],
  ["Juan Valdez", "Juan Valdez"],
  ["Nipper", "Nipper"],
  ["Spuds MacKenzie", "Spuds MacKenzie"],
  ["Budweiser Clydesdales", "Budweiser Clydesdales"],
  ["Bullseye", "Bullseye (mascot)"],
  ["Geoffrey the Giraffe", "Geoffrey the Giraffe"],
  ["Rich Uncle Pennybags", "Rich Uncle Pennybags"],
  ["Clippy", "Office Assistant"],
  ["Tux", "Tux (mascot)"],
  ["Duo the Owl", "Duo (mascot)"],
  ["Snoo", "Reddit"],
  ["Bugdroid", "Android (operating system)"],
  ["Brawny Man", "Brawny (brand)"],
  ["Mrs. Butterworth", "Mrs. Butterworth's"],
  ["Chef Boyardee", "Chef Boyardee"],
  ["Uncle Ben", "Ben's Original"],
  ["Mr. Whipple", "Mr. Whipple"],
  ["Madge the Manicurist", "Madge the Manicurist"],
  ["Frito Bandito", "Frito Bandito"],
  ["Mr. Bubble", "Mr. Bubble"],
  ["Buster Brown", "Buster Brown"],
  ["Quisp", "Quisp"],
  ["Car Fox", "Carfax (company)"],
  ["Serta Sheep", "Serta (company)"],
  ["Morris the Cat", "Morris the Cat"],
  ["Fred the Baker", "Time to make the donuts"],
  ["Joe Isuzu", "Joe Isuzu"],
  ["Ernest P. Worrell", "Ernest P. Worrell"],
  ["The Dell Dude", "Dude, You're Getting a Dell"],
];
const COMMERCIAL_IMAGE_OVERRIDES = {
  "GEICO Gecko": {
    image: "https://www.geico.com/_next/image/?url=%2Fimages%2Fgecko-walking.png&w=1200&q=75",
    sourceName: "GEICO",
    sourceUrl: "https://www.geico.com/living/the-geckos-latest-adventures/",
  },
};

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-");
}

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      });
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

async function fetchWikidataCandidates(category) {
  const query = `
    SELECT ?item ?itemLabel ?image ?sitelinks ?article WHERE {
      {
        SELECT ?item (SAMPLE(?photo) AS ?image) (MAX(?links) AS ?sitelinks) (SAMPLE(?page) AS ?article) WHERE {
          ?item wdt:P31 wd:Q5;
                wdt:P106 wd:${category.occupation};
                ${category.gender ? `wdt:P21 wd:${category.gender};` : ""}
                wdt:P18 ?photo;
                wikibase:sitelinks ?links.
          ?page schema:about ?item;
                schema:isPartOf <https://en.wikipedia.org/>.
          FILTER(?links > 5)
        }
        GROUP BY ?item
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT ${Math.max(800, category.count * 6)}
  `;
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const payload = await fetchWithRetry(url);
  const candidates = payload.results.bindings.map((binding) => ({
    qid: binding.item.value.split("/").pop(),
    name: binding.itemLabel.value.trim(),
    category: category.id,
    type: category.type,
    image: binding.image.value.replace(/^http:/, "https:"),
    sourceName: "Wikimedia Commons via Wikidata",
    sourceUrl: binding.item.value,
    articleTitle: decodeURIComponent(binding.article.value.split("/wiki/").pop()).replace(/_/g, " "),
    sitelinks: Number(binding.sitelinks.value),
  }));
  return addWikipediaIntros(candidates);
}

async function addWikipediaIntros(candidates) {
  const intros = new Map();
  for (let offset = 0; offset < candidates.length; offset += 40) {
    const batch = candidates.slice(offset, offset + 40);
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "extracts");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("titles", batch.map(({ articleTitle }) => articleTitle).join("|"));
    const payload = await fetchWithRetry(url);
    for (const page of Object.values(payload.query?.pages || {})) {
      if (page.title && page.extract) intros.set(normalize(page.title), page.extract);
    }
  }
  return candidates.map((candidate) => ({
    ...candidate,
    intro: intros.get(normalize(candidate.articleTitle)) || "",
  }));
}

async function mapLimited(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

function canonicalTitle(input, payload) {
  let value = input.replace(/_/g, " ");
  const mappings = [
    ...(payload.query?.normalized || []),
    ...(payload.query?.redirects || []),
  ];
  for (let pass = 0; pass < 3; pass += 1) {
    const match = mappings.find((mapping) => normalize(mapping.from) === normalize(value));
    if (!match) break;
    value = match.to;
  }
  return value;
}

async function fetchCommercialProfiles() {
  const profiles = [];
  for (let offset = 0; offset < COMMERCIAL_CANDIDATES.length; offset += 35) {
    const batch = COMMERCIAL_CANDIDATES.slice(offset, offset + 35);
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("prop", "pageimages|info");
    url.searchParams.set("piprop", "original|thumbnail");
    url.searchParams.set("pithumbsize", "1000");
    url.searchParams.set("inprop", "url");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("titles", batch.map(([, page]) => page).join("|"));
    const payload = await fetchWithRetry(url);
    const pages = Object.values(payload.query?.pages || {});
    for (const [name, requestedPage] of batch) {
      const canonical = canonicalTitle(requestedPage, payload);
      const page = pages.find((candidate) => normalize(candidate.title) === normalize(canonical));
      const override = COMMERCIAL_IMAGE_OVERRIDES[name];
      const image = override?.image || page?.original?.source || page?.thumbnail?.source || "";
      const sourceUrl = override?.sourceUrl || page?.fullurl || "";
      if (!image || !sourceUrl) {
        console.warn(`No public image for commercial candidate: ${name} (${requestedPage})`);
        continue;
      }
      profiles.push({
        qid: "",
        name,
        category: COMMERCIAL_CATEGORY.id,
        type: COMMERCIAL_CATEGORY.type,
        image: image.replace(/^http:/, "https:"),
        sourceName: override?.sourceName || "Wikipedia",
        sourceUrl,
        sitelinks: 0,
      });
    }
  }
  const unique = [];
  const names = new Set();
  for (const profile of profiles) {
    const key = normalize(profile.name);
    if (names.has(key)) continue;
    names.add(key);
    unique.push(profile);
  }
  return unique.slice(0, COMMERCIAL_CATEGORY.count);
}

const usedQids = new Set();
const usedNames = new Set();
const selected = [];
const fetchedGroups = await mapLimited(CATEGORIES, 3, fetchWikidataCandidates);
for (let index = 0; index < CATEGORIES.length; index += 1) {
  const category = CATEGORIES[index];
  const candidates = fetchedGroups[index];
  let count = 0;
  for (const candidate of candidates) {
    const nameKey = normalize(candidate.name);
    if (
      !nameKey ||
      candidate.name.length > 70 ||
      /^Q\d+$/.test(candidate.name) ||
      !category.introPattern.test(candidate.intro) ||
      usedQids.has(candidate.qid) ||
      usedNames.has(nameKey)
    ) continue;
    selected.push(candidate);
    usedQids.add(candidate.qid);
    usedNames.add(nameKey);
    count += 1;
    if (count === category.count) break;
  }
  if (count !== category.count) {
    throw new Error(`${category.label} produced ${count} usable profiles; expected ${category.count}.`);
  }
}

const commercialProfiles = await fetchCommercialProfiles();
if (commercialProfiles.length !== COMMERCIAL_CATEGORY.count) {
  throw new Error(`Commercial Icons produced ${commercialProfiles.length} photo-backed profiles; expected ${COMMERCIAL_CATEGORY.count}.`);
}
selected.push(...commercialProfiles);

if (selected.length !== 1000) throw new Error(`People catalog has ${selected.length} profiles; expected 1000.`);
const categoryMeta = Object.fromEntries(
  [...CATEGORIES, COMMERCIAL_CATEGORY].map(({ id, label, type, count, credit }) => [
    id,
    { id, label, type, profileCount: count, credit },
  ]),
);
const rows = selected.map((profile) => [
  profile.qid,
  profile.name,
  profile.category,
  profile.type,
  profile.image,
  profile.sourceName,
  profile.sourceUrl,
  profile.sitelinks,
]);

const source = `// Generated by scripts/build-charactercheck-people-catalog.mjs.\n` +
`(() => {\n  "use strict";\n` +
`  const ENTRIES = ${JSON.stringify(rows, null, 2)};\n` +
`  const CATEGORIES = ${JSON.stringify(categoryMeta, null, 2)};\n` +
`  const ROLES = ["heart", "mind", "spark", "wildcard"];\n` +
`  const ROLE_COPY = { heart: "You combine loyalty, patience, and a team-first instinct.", mind: "You read the situation, stay composed, and make the smart play.", spark: "You bring confidence, momentum, and big-stage energy.", wildcard: "You trust bold instincts and keep everyone guessing." };\n` +
`  const ROLE_BLUEPRINTS = { heart: { character: "The Team Heart", actor: "", label: "Loyal and steady", why: ROLE_COPY.heart }, mind: { character: "The Field General", actor: "", label: "Calm and strategic", why: ROLE_COPY.mind }, spark: { character: "The Game Changer", actor: "", label: "Bold and electric", why: ROLE_COPY.spark }, wildcard: { character: "The Wild Card", actor: "", label: "Original and unpredictable", why: ROLE_COPY.wildcard } };\n` +
`  const normalize = (value) => String(value || "").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " " ).trim().toLowerCase();\n` +
`  const slugify = (value) => normalize(value).replace(/\\s+/g, "-");\n` +
`  function hash(value) { let result = 2166136261; for (const character of value) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; }\n` +
`  function traits(key, profileIndex) { let seed = hash(key) || 0x9e3779b9; return Array.from({ length: 10 }, (_, questionIndex) => { if (questionIndex < 4) return ROLES[Math.floor(profileIndex / (ROLES.length ** questionIndex)) % ROLES.length]; seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return ROLES[seed % ROLES.length]; }); }\n` +
`  function dominantRole(profileTraits) { const counts = Object.fromEntries(ROLES.map((role) => [role, 0])); profileTraits.forEach((role) => counts[role] += 1); return ROLES.reduce((best, role) => counts[role] > counts[best] ? role : best, ROLES[0]); }\n` +
`  function profileKey(category, name) { return "profile-" + category + "-" + slugify(name); }\n` +
`  function escapeXml(value) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }\n` +
`  function makeCover(title, category) { const color = category === "actors" ? "#7b41e8" : category === "actresses" ? "#e84d9b" : category === "ad-icons" ? "#ff5f8f" : "#0a7cff"; const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" rx="28" fill="#10111a"/><circle cx="420" cy="160" r="300" fill="\${color}"/><text x="48" y="380" fill="white" font-family="Arial,sans-serif" font-size="48" font-weight="800">\${escapeXml(title.slice(0, 24))}</text><text x="48" y="740" fill="white" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">CHARACTER CHECK</text></svg>\`; return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }\n` +
`  if (!window.MEDIA || !window.OUTCOMES || !Array.isArray(window.FALLBACK_QUESTIONS)) throw new Error("Earlier Character Check data must load before the people catalog.");\n` +
`  const profiles = {}; const grouped = {}; const categoryIndexes = {};\n` +
`  for (const [qid, name, category, type, image, sourceName, sourceUrl, sitelinks] of ENTRIES) { const key = profileKey(category, name); const profileIndex = categoryIndexes[category] || 0; categoryIndexes[category] = profileIndex + 1; const profileTraits = traits(key, profileIndex); const dominant = dominantRole(profileTraits); const meta = CATEGORIES[category]; profiles[key] = Object.freeze({ key, character: name, actor: "", credit: meta.credit, label: meta.label + " match", why: "Your ten answers match " + name + ": " + ROLE_COPY[dominant].charAt(0).toLowerCase() + ROLE_COPY[dominant].slice(1), image, sourceName, sourceUrl, traits: profileTraits, category, type, qid, sitelinks }); (grouped[category] ||= []).push(key); }\n` +
`  window.CHARACTER_CHECK_PROFILES = Object.freeze({ ...(window.CHARACTER_CHECK_PROFILES || {}), ...profiles });\n` +
`  const existingIds = new Set(Object.keys(window.MEDIA)); let added = 0;\n` +
`  for (const [category, keys] of Object.entries(grouped)) { const meta = CATEGORIES[category]; if (keys.length !== meta.profileCount) throw new Error(category + " needs " + meta.profileCount + " profiles"); const anchor = profiles[keys[0]]; const id = "match-" + category; if (existingIds.has(id)) throw new Error("People catalog repeats an id: " + id); const fallback = makeCover(meta.label, category); window.MEDIA[id] = { type: meta.type, officialTitle: meta.label + " Match", genres: meta.type === "sports" ? ["Sports", meta.label] : [meta.label, "Personality"], poster: anchor.image, hero: anchor.image, artworkFallback: fallback, sourceName: anchor.sourceName, sourceUrl: anchor.sourceUrl, collection: category, collectionLabel: meta.label, catalogGenerated: true, catalogGeneration: 5, wikidataId: anchor.qid || undefined, sitelinks: anchor.sitelinks, outcomePool: [...keys], questionImages: Array.from({ length: 10 }, (_, questionIndex) => { const profile = profiles[keys[Math.floor((questionIndex * keys.length) / 10)]]; return { url: profile.image, alt: profile.character + " photo for " + meta.label + " question " + (questionIndex + 1), sourceName: profile.sourceName, sourceUrl: profile.sourceUrl }; }) }; window.OUTCOMES[id] = Object.fromEntries(Object.entries(ROLE_BLUEPRINTS).map(([role, outcome]) => [role, { ...outcome, why: "In this " + meta.label + " matchup, " + outcome.why.charAt(0).toLowerCase() + outcome.why.slice(1) }])); added += 1; }\n` +
`  if (ENTRIES.length !== 1000 || added !== Object.keys(CATEGORIES).length) throw new Error("People catalog must add one quiz per photo-backed category.");\n` +
`  const collections = Object.values(CATEGORIES).map(({ id, label }) => Object.freeze({ id, label, count: 1 })); window.CHARACTER_CHECK_COLLECTIONS = Object.freeze([...(window.CHARACTER_CHECK_COLLECTIONS || []), ...collections]);\n` +
`})();\n`;

await fs.writeFile(OUTPUT, source);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${selected.length} photo-backed outcomes across ${Object.keys(categoryMeta).length} category quizzes.`);
