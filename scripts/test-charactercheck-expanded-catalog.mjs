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

assert.equal(titles.length, 5010, "Character Check should have exactly 5,010 total quizzes");
assert.equal(expanded.length, 4854, "The expansions should add exactly 4,854 quizzes");
assert.equal(titles.filter(([, media]) => media.type === "show").length, 2500);
assert.equal(titles.filter(([, media]) => media.type === "movie").length, 2500);
assert.equal(titles.filter(([, media]) => media.type === "sports").length, 7);
assert.equal(titles.filter(([, media]) => media.type === "actor").length, 2);
assert.equal(titles.filter(([, media]) => media.type === "commercial").length, 1);
assert.deepEqual(collectionCounts, {
  kids: 250,
  sitcoms: 50,
  movies: 100,
  editors: 100,
  encore: 500,
  "encore-2": 500,
  "encore-3": 3344,
  baseball: 1,
  basketball: 1,
  soccer: 1,
  football: 1,
  hockey: 1,
  tennis: 1,
  "golf-stars": 1,
  actors: 1,
  actresses: 1,
  "ad-icons": 1,
});
assert.ok(context.MEDIA["henry-danger"], "Henry Danger should be available");
assert.ok(context.MEDIA["bunk-d"], "Bunk'd should be available");
assert.equal(context.MEDIA["henry-danger"].questionImages.length, 10);
assert.equal(context.OUTCOMES["henry-danger"].mind.character, "Henry Hart");
assert.equal(context.OUTCOMES["bunk-d"].heart.character, "Lou Hockhauser");

for (const [id, media] of expanded) {
  assert.ok(["show", "movie", "sports", "actor", "commercial"].includes(media.type), `${id} needs a valid quiz type`);
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
const peopleQuizzes = expanded.filter(([, media]) => media.catalogGeneration === 5);
assert.equal(peopleQuizzes.length, 10);
assert.equal(Object.keys(context.CHARACTER_CHECK_PROFILES).length, 1000);
assert.deepEqual(
  peopleQuizzes.map(([id]) => id).sort(),
  [
    "match-actors",
    "match-actresses",
    "match-ad-icons",
    "match-baseball",
    "match-basketball",
    "match-football",
    "match-golf-stars",
    "match-hockey",
    "match-soccer",
    "match-tennis",
  ],
  "Generation 5 should contain one quiz per category",
);
assert.equal(context.MEDIA["match-baseball"].outcomePool.length, 200);
assert.equal(context.MEDIA["match-basketball"].outcomePool.length, 200);
assert.equal(context.MEDIA["match-actors"].outcomePool.length, 100);
assert.equal(context.MEDIA["match-actresses"].outcomePool.length, 100);
assert.equal(context.MEDIA["match-ad-icons"].outcomePool.length, 50);
assert.ok(
  context.MEDIA["match-ad-icons"].outcomePool.includes("profile-ad-icons-geico-gecko"),
  "The GEICO Gecko should be a Commercial Characters result",
);
for (const [id, media] of peopleQuizzes) {
  assert.ok(media.outcomePool.length > 4, `${id} should have more than four results`);
  assert.equal(new Set(media.outcomePool).size, media.outcomePool.length, `${id} should not repeat results`);
  assert.equal(media.questionImages.length, 10, `${id} should keep ten photo questions`);
  for (const resultKey of media.outcomePool) {
    const profile = context.CHARACTER_CHECK_PROFILES[resultKey];
    assert.ok(profile, `${id} is missing result ${resultKey}`);
    assert.equal(profile.traits.length, 10, `${resultKey} needs ten matching traits`);
    assert.match(profile.image, /^https:\/\//, `${resultKey} needs a sourced photo`);
    assert.match(profile.sourceUrl, /^https?:\/\//, `${resultKey} needs a source link`);
  }
}

function hashText(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function winnerFor(media, answers) {
  const signature = answers.join("|");
  return media.outcomePool
    .map((key) => {
      const profile = context.CHARACTER_CHECK_PROFILES[key];
      const matches = profile.traits.reduce(
        (total, trait, index) => total + (trait === answers[index] ? 1 : 0),
        0,
      );
      return { key, matches, tieBreak: hashText(`${signature}:${key}`) };
    })
    .sort((left, right) => right.matches - left.matches || right.tieBreak - left.tieBreak)[0].key;
}

for (const [id, media] of peopleQuizzes) {
  const reachable = new Set(
    media.outcomePool.map((key) => winnerFor(media, context.CHARACTER_CHECK_PROFILES[key].traits)),
  );
  assert.equal(
    reachable.size,
    media.outcomePool.length,
    `${id} should make every photo-backed result reachable`,
  );
}
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
const appPosition = html.indexOf("app.js?v=catalog-5010");
assert.ok(
  catalogPosition > 0 &&
    secondCatalogPosition > catalogPosition &&
    thirdCatalogPosition > secondCatalogPosition &&
    fourthCatalogPosition > thirdCatalogPosition &&
    fifthCatalogPosition > fourthCatalogPosition &&
    enrichmentPosition > fifthCatalogPosition &&
    appPosition > enrichmentPosition,
);

console.log(
  `Character Check catalog verified: ${titles.length} total, ${expanded.length} new, ` +
    `${context.CHARACTER_CHECK_ENRICHMENT.fullCasts} named casts.`,
);
