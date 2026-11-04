// Lancer : npm test   (node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeKeyword, mergeRanked, qualifyOrganicEstimate } from "../netlify/lib/market-estimates.mjs";

// Cas type d'un commerce local dont le nom est aussi un mot courant (marque
// fictive, ordres de grandeur d'un cas réel). Total brut estimé : 17 390.
const LOCAL = [
  ["lilas", 5, 74000, 3471],
  ["restaurants in beauport quebec", 37, 27100, 57],
  ["lilas and co", 68, 9900, 21],
  ["cafe lilou", 35, 4400, 9],
  ["lilas cafe", 1, 4400, 1338],
  ["fleuriste autour de moi", 58, 4400, 9],
  ["lilas café", 2, 4400, 713],
  ["lilas-café", 2, 4400, 713],
  ["lilas beauport", 1, 3600, 1094],
  ["café lilas de mai", 14, 3600, 20],
  ["the lilas cafe", 9, 2400, 36],
  ["ecole du lilas sauvage", 21, 2400, 6],
].map(([keyword, rank, searchVolume, estimatedVisits]) => ({ keyword, rank, searchVolume, estimatedVisits }));

const labsItem = (keyword, volume, etv, rank = 1) => ({
  keyword_data: { keyword, keyword_info: { search_volume: volume } },
  ranked_serp_element: { serp_item: { etv, rank_group: rank } },
});

test("normalizeKeyword ignore accents, casse et ponctuation", () => {
  assert.equal(normalizeKeyword("Lilas  Café"), "lilas cafe");
  assert.equal(normalizeKeyword("lilas-café"), "lilas cafe");
  assert.equal(normalizeKeyword(null), "");
});

test("commerce local : retire le mot courant et les variantes d'écriture, rien d'autre", () => {
  const out = qualifyOrganicEstimate({ organic: 17390, keywords: LOCAL });
  assert.equal(out.raw, 17390);
  assert.deepEqual(
    out.exclusions.map(e => [e.keyword, e.reason, e.estimatedVisits]),
    [["lilas", "generic_head_term", 3471], ["lilas café", "spelling_variant", 713], ["lilas-café", "spelling_variant", 713]],
  );
  assert.equal(out.removed, 3471 + 713 + 713);
  assert.equal(out.adjusted, 12493);
  assert.equal(out.exclusions[1].variantOf, "lilas cafe");
});

test("un vrai mot-clé d'affaires en position 4 n'est pas retiré", () => {
  // Boutique nationale : top 3 sur 20 000, position 4 sur 50 000 (2,5 × seulement).
  const out = qualifyOrganicEstimate({
    organic: 15000,
    keywords: [
      { keyword: "chaussures de course", rank: 4, searchVolume: 50000, estimatedVisits: 2350 },
      { keyword: "souliers de course femme", rank: 2, searchVolume: 20000, estimatedVisits: 3200 },
    ],
  });
  assert.equal(out.removed, 0);
  assert.equal(out.adjusted, 15000);
});

test("sans position top 3 de référence, aucune requête n'est jugée générique", () => {
  const out = qualifyOrganicEstimate({
    organic: 1000,
    keywords: [{ keyword: "lilas", rank: 5, searchVolume: 74000, estimatedVisits: 900 }],
  });
  assert.equal(out.removed, 0);
});

test("une requête générique en position 1 à 3 reste comptée", () => {
  const out = qualifyOrganicEstimate({
    organic: 30000,
    keywords: [
      { keyword: "lilas", rank: 2, searchVolume: 74000, estimatedVisits: 12000 },
      { keyword: "lilas beauport", rank: 1, searchVolume: 3600, estimatedVisits: 1094 },
    ],
  });
  assert.equal(out.removed, 0);
});

test("variantes : même forme mais volumes différents = recherches distinctes", () => {
  const out = qualifyOrganicEstimate({
    organic: 500,
    keywords: [
      { keyword: "café beauport", rank: 3, searchVolume: 880, estimatedVisits: 90 },
      { keyword: "cafe beauport", rank: 3, searchVolume: 720, estimatedVisits: 70 },
    ],
  });
  assert.equal(out.removed, 0);
});

test("mergeRanked : dédoublonne entre langues et garde la trace du doublon", () => {
  const merged = mergeRanked([
    { total_count: 2, items: [labsItem("lilas beauport", 3600, 1094), labsItem("fleuriste beauport", 880, 40, 6)] },
    { total_count: 2, items: [labsItem("lilas beauport", 3600, 900), labsItem("florist beauport", 210, 12, 4)] },
  ], ["fr", "en"]);
  assert.equal(merged.total_count, 4);
  assert.deepEqual(merged.items.map(i => i.keyword_data.keyword), ["lilas beauport", "fleuriste beauport", "florist beauport"]);
  assert.equal(merged.items[0].ranked_serp_element.serp_item.etv, 1094);
  assert.deepEqual(merged.languageDuplicates, [
    { keyword: "lilas beauport", languages: ["fr", "en"], searchVolume: 3600, otherSearchVolume: 3600, estimatedVisits: 900 },
  ]);
});

test("doublon de langue : retiré si les volumes sont identiques, gardé sinon", () => {
  const keywords = [{ keyword: "lilas beauport", rank: 1, searchVolume: 3600, estimatedVisits: 1094 }];
  const same = qualifyOrganicEstimate({ organic: 2000, keywords, languageDuplicates: [
    { keyword: "lilas beauport", languages: ["fr", "en"], searchVolume: 3600, otherSearchVolume: 3600, estimatedVisits: 900 },
  ] });
  assert.equal(same.adjusted, 1100);
  assert.equal(same.exclusions[0].reason, "language_duplicate");
  const different = qualifyOrganicEstimate({ organic: 2000, keywords, languageDuplicates: [
    { keyword: "lilas beauport", languages: ["fr", "en"], searchVolume: 3600, otherSearchVolume: 1300, estimatedVisits: 300 },
  ] });
  assert.equal(different.adjusted, 2000);
});

test("entrées vides ou invalides : jamais d'exception, jamais de négatif", () => {
  assert.deepEqual(qualifyOrganicEstimate(), { raw: 0, adjusted: 0, removed: 0, share: 0, exclusions: [] });
  const out = qualifyOrganicEstimate({ organic: 100, keywords: [
    { keyword: "a b", rank: 1, searchVolume: 50, estimatedVisits: 400 },
    { keyword: "a-b", rank: 2, searchVolume: 50, estimatedVisits: 300 },
  ] });
  assert.equal(out.adjusted, 0);
  assert.equal(out.removed, 100);
});
