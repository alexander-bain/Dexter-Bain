import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(root, "charactercheck", "data");
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
  "distinct-questions.js",
]) {
  vm.runInContext(await fs.readFile(path.join(dataDirectory, filename), "utf8"), context, {
    filename,
  });
}

const titles = Object.entries(context.MEDIA);
const expanded = titles.filter(([, media]) => media.catalogGenerated === true);
const collectionCounts = Object.fromEntries(
  context.CHARACTER_CHECK_COLLECTIONS.map(({ id }) => [
    id,
    expanded.filter(([, media]) => media.collection === id).length,
  ]),
);

assert.equal(titles.length, 10000, "Character Check should have exactly 10,000 total quizzes");
assert.equal(expanded.length, 9844, "The expansions should add exactly 9,844 quizzes");
assert.equal(titles.filter(([, media]) => media.type === "show").length, 2500);
assert.equal(titles.filter(([, media]) => media.type === "movie").length, 2500);
assert.equal(titles.filter(([, media]) => media.type === "kids").length, 1000);
assert.equal(titles.filter(([, media]) => media.type === "documentary").length, 1000);
assert.equal(titles.filter(([, media]) => media.type === "game-show").length, 1000);
assert.equal(titles.filter(([, media]) => media.type === "reality").length, 1000);
assert.equal(titles.filter(([, media]) => media.type === "other").length, 1000);
assert.ok(titles.every(([, media]) => ["show", "movie", "kids", "documentary", "game-show", "reality", "other"].includes(media.type)));
assert.deepEqual(collectionCounts, {
  kids: 250,
  sitcoms: 50,
  movies: 100,
  editors: 100,
  encore: 500,
  "encore-2": 500,
  "encore-3": 3344,
  "kids-shows": 1000,
  documentaries: 1000,
  "game-shows": 1000,
  "reality-shows": 1000,
  "other-formats": 1000,
});
assert.ok(context.MEDIA["henry-danger"], "Henry Danger should be available");
assert.ok(context.MEDIA["bunk-d"], "Bunk'd should be available");
assert.equal(context.MEDIA["henry-danger"].questionImages.length, 10);
assert.equal(context.OUTCOMES["henry-danger"].mind.character, "Henry Hart");
assert.equal(context.OUTCOMES["bunk-d"].heart.character, "Lou Hockhauser");

for (const [id, media] of expanded) {
  assert.ok(["show", "movie", "kids", "documentary", "game-show", "reality", "other"].includes(media.type), `${id} needs a valid quiz type`);
  assert.ok(media.officialTitle.trim(), `${id} needs a title`);
  assert.ok(media.poster, `${id} needs artwork`);
  assert.ok(media.artworkFallback, `${id} needs dependable fallback artwork`);
  assert.equal(media.questionImages.length, 10, `${id} needs ten question images`);
  assert.deepEqual(Object.keys(context.OUTCOMES[id]).sort(), ["heart", "mind", "spark", "wildcard"]);
}

assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 2).length, 500);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 2 && media.type === "show").length, 250);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 2 && media.type === "movie").length, 250);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 3).length, 500);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 3 && media.type === "show").length, 250);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 3 && media.type === "movie").length, 250);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 4).length, 3344);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 4 && media.type === "show").length, 1554);
assert.equal(expanded.filter(([, media]) => media.catalogGeneration === 4 && media.type === "movie").length, 1790);
const formatCatalog = expanded.filter(([, media]) => media.catalogGeneration === 5);
assert.equal(formatCatalog.length, 5000);
assert.equal(formatCatalog.filter(([, media]) => media.collection === "kids-shows").length, 1000);
assert.equal(formatCatalog.filter(([, media]) => media.collection === "documentaries").length, 1000);
assert.equal(formatCatalog.filter(([, media]) => media.collection === "game-shows").length, 1000);
assert.equal(formatCatalog.filter(([, media]) => media.collection === "reality-shows").length, 1000);
assert.equal(formatCatalog.filter(([, media]) => media.collection === "other-formats").length, 1000);
assert.equal(context.MEDIA["you-can-see-everything"].type, "documentary");
assert.equal(context.MEDIA["you-can-see-everything"].wikidataId, "Q141336617");
assert.equal(context.OUTCOMES["you-can-see-everything"].mind.character, "Nathan Fielder");
assert.match(context.MEDIA["you-can-see-everything"].poster, /^https:\/\//);
assert.equal(context.MEDIA["nathan-for-you"].type, "reality");
assert.equal(context.MEDIA["the-rehearsal"].type, "reality");

const publishedIds = context.CHARACTER_CHECK_PUBLISHED_IDS;
assert.equal(publishedIds.length, 10000, "All 10,000 quizzes should stay public");
assert.equal(new Set(publishedIds).size, publishedIds.length, "Published title ids must be unique");
assert.equal(context.CHARACTER_CHECK_QUALITY.candidates, 10000);
assert.equal(context.CHARACTER_CHECK_QUALITY.published, publishedIds.length);
assert.equal(context.CHARACTER_CHECK_QUALITY.hidden, 0);
assert.ok(context.CHARACTER_CHECK_QUALITY.sourcedImages >= 4200);
assert.ok(context.CHARACTER_CHECK_QUALITY.namedOutcomes >= 3600);
for (const requiredId of ["you-can-see-everything", "nathan-for-you", "the-rehearsal"]) {
  assert.ok(publishedIds.includes(requiredId), `${requiredId} should pass the public quality gate`);
}

const generatedPromptSignatures = new Set();
const generatedPrompts = new Set();
for (const [id, media] of expanded) {
  const questions = context.CHARACTER_CHECK_DISTINCT_QUESTIONS(media, id);
  assert.equal(questions.length, 10, `${id} needs ten title-specific questions`);
  assert.equal(new Set(questions.map((question) => question.prompt)).size, 10, `${id} repeats a prompt`);
  assert.ok(questions.every((question) => question.prompt.startsWith(`${media.officialTitle}:`)), `${id} questions should name their title`);
  for (const question of questions) {
    generatedPrompts.add(question.prompt);
    assert.equal(question.options.map((option) => option.role).sort().join("|"), "heart|mind|spark|wildcard");
    assert.equal(new Set(question.options.map((option) => option.text)).size, 4, `${id} repeats answer text`);
  }
  generatedPromptSignatures.add(questions.map((question) => question.prompt).join("|"));
}
assert.equal(generatedPromptSignatures.size, expanded.length, "Every generated quiz needs its own question signature");
assert.equal(generatedPrompts.size, expanded.length * 10, "Every generated prompt should be title-distinct");
const allQuestionSignatures = new Set(generatedPromptSignatures);
for (const [id, media] of titles.filter(([, item]) => item.catalogGenerated !== true)) {
  const questions = context.TITLE_QUESTIONS[id];
  assert.equal(questions.length, 10, `${id} needs ten hand-authored questions`);
  assert.equal(new Set(questions.map((question) => question.prompt)).size, 10, `${id} repeats a hand-authored prompt`);
  allQuestionSignatures.add(questions.map((question) => question.prompt).join("|"));
}
assert.equal(allQuestionSignatures.size, titles.length, "All 10,000 quizzes need distinct question sets");
const normalizedTitles = titles.map(([, media]) => media.officialTitle.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase());
assert.equal(new Set(normalizedTitles).size, titles.length, "Every title should be unique");
assert.ok(context.CHARACTER_CHECK_ENRICHMENT.titles >= 4100, "At least 4,100 titles should use sourced metadata");
assert.ok(context.CHARACTER_CHECK_ENRICHMENT.fullCasts >= 3500, "At least 3,500 titles should have named four-character casts");
assert.ok(context.CHARACTER_CHECK_ENRICHMENT.images >= 4100, "At least 4,100 titles should use sourced artwork");

const html = await fs.readFile(path.join(root, "charactercheck", "index.html"), "utf8");
const catalogPosition = html.indexOf("data/expanded-catalog.js");
const secondCatalogPosition = html.indexOf("data/expanded-catalog-2.js");
const thirdCatalogPosition = html.indexOf("data/expanded-catalog-3.js");
const fourthCatalogPosition = html.indexOf("data/expanded-catalog-4.js");
const fifthCatalogPosition = html.indexOf("data/expanded-catalog-5.js");
const enrichmentPosition = html.indexOf("data/expanded-enrichment.js");
const verifiedCatalogPosition = html.indexOf("data/verified-catalog.js");
const distinctQuestionPosition = html.indexOf("data/distinct-questions.js");
const appPosition = html.indexOf("app.js?v=restored-20261020-1");
assert.ok(
  catalogPosition > 0 &&
    secondCatalogPosition > catalogPosition &&
    thirdCatalogPosition > secondCatalogPosition &&
    fourthCatalogPosition > thirdCatalogPosition &&
    fifthCatalogPosition > fourthCatalogPosition &&
    enrichmentPosition > fifthCatalogPosition &&
    verifiedCatalogPosition > enrichmentPosition &&
    distinctQuestionPosition > verifiedCatalogPosition &&
    appPosition > distinctQuestionPosition,
);

const about = await fs.readFile(path.join(root, "charactercheck", "about.html"), "utf8");
for (const requiredSource of [
  "https://www.tvmaze.com/api",
  "https://www.wikidata.org/",
  "https://query.wikidata.org/",
  "https://www.wikipedia.org/",
  "https://commons.wikimedia.org/",
  "https://www.imdb.com/",
  "https://a24films.com/films/you-can-see-everything",
  "Q10935299",
  "Q112915576",
]) {
  assert.ok(about.includes(requiredSource), `About page needs source link ${requiredSource}`);
}

console.log(
  `Character Check catalog verified: ${titles.length} candidates, ${publishedIds.length} public, ` +
    `${context.CHARACTER_CHECK_ENRICHMENT.fullCasts} named casts.`,
);
