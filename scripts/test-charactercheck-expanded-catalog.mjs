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

assert.equal(titles.length, 5000, "Character Check should have exactly 5,000 total titles");
assert.equal(expanded.length, 4844, "The expansions should add exactly 4,844 titles");
assert.equal(titles.filter(([, media]) => media.type === "show").length, 2500);
assert.equal(titles.filter(([, media]) => media.type === "movie").length, 2500);
assert.deepEqual(collectionCounts, {
  kids: 250,
  sitcoms: 50,
  movies: 100,
  editors: 100,
  encore: 500,
  "encore-2": 500,
  "encore-3": 3344,
});
assert.ok(context.MEDIA["henry-danger"], "Henry Danger should be available");
assert.ok(context.MEDIA["bunk-d"], "Bunk'd should be available");
assert.equal(context.MEDIA["henry-danger"].questionImages.length, 10);
assert.equal(context.OUTCOMES["henry-danger"].mind.character, "Henry Hart");
assert.equal(context.OUTCOMES["bunk-d"].heart.character, "Lou Hockhauser");

for (const [id, media] of expanded) {
  assert.ok(["show", "movie"].includes(media.type), `${id} needs a valid media type`);
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
const enrichmentPosition = html.indexOf("data/expanded-enrichment.js");
const appPosition = html.indexOf("app.js?v=catalog-5000");
assert.ok(
  catalogPosition > 0 &&
    secondCatalogPosition > catalogPosition &&
    thirdCatalogPosition > secondCatalogPosition &&
    fourthCatalogPosition > thirdCatalogPosition &&
    enrichmentPosition > fourthCatalogPosition &&
    appPosition > enrichmentPosition,
);

console.log(
  `Character Check catalog verified: ${titles.length} total, ${expanded.length} new, ` +
    `${context.CHARACTER_CHECK_ENRICHMENT.fullCasts} named casts.`,
);
