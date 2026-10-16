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

assert.equal(titles.length, 656, "Character Check should have 656 total titles");
assert.equal(expanded.length, 500, "The expansion should add exactly 500 titles");
assert.deepEqual(collectionCounts, {
  kids: 250,
  sitcoms: 50,
  movies: 100,
  editors: 100,
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

assert.ok(context.CHARACTER_CHECK_ENRICHMENT.titles >= 450, "Most titles should use sourced metadata");
assert.ok(context.CHARACTER_CHECK_ENRICHMENT.fullCasts >= 400, "At least 400 titles should have named four-character casts");
assert.ok(context.CHARACTER_CHECK_ENRICHMENT.images >= 450, "Most titles should use sourced artwork");

const html = await fs.readFile(path.join(root, "charactercheck", "index.html"), "utf8");
const catalogPosition = html.indexOf("data/expanded-catalog.js");
const enrichmentPosition = html.indexOf("data/expanded-enrichment.js");
const appPosition = html.indexOf("app.js?v=catalog-500");
assert.ok(catalogPosition > 0 && enrichmentPosition > catalogPosition && appPosition > enrichmentPosition);

console.log(
  `Character Check catalog verified: ${titles.length} total, ${expanded.length} new, ` +
    `${context.CHARACTER_CHECK_ENRICHMENT.fullCasts} named casts.`,
);
