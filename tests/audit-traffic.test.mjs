// Test d'intégration du mode « traffic » : DataForSEO est simulé, aucun appel
// réseau réel. Vérifie que la réponse garde le total brut, ajoute l'estimation
// ajustée et le détail par langue.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const realFetch = globalThis.fetch;
const calls = [];

const labs = (keyword, volume, etv, rank) => ({
  keyword_data: { keyword, keyword_info: { search_volume: volume, cpc: 0.2 } },
  ranked_serp_element: { serp_item: { etv, rank_group: rank, url: "https://www.exemple.ca/" } },
});
// Deux langues : « lilas beauport » existe dans les deux avec le même volume.
const RANKED = {
  fr: [labs("lilas", 74000, 3471, 5), labs("lilas cafe", 4400, 1338, 1), labs("lilas café", 4400, 713, 2), labs("lilas beauport", 3600, 1094, 1)],
  en: [labs("lilas beauport", 3600, 1094, 1), labs("the lilas cafe", 2400, 36, 9)],
};
const TRAFFIC = { fr: { etv: 9000.4, count: 200 }, en: { etv: 8389.6, count: 147 } };

const ok = result => new Response(JSON.stringify({ status_code: 20000, cost: 0.01, tasks: [{ status_code: 20000, cost: 0.01, result: [result] }] }), { status: 200 });

before(() => {
  process.env.DATAFORSEO_LOGIN = "test";
  process.env.DATAFORSEO_PASSWORD = "test";
  process.env.PAPARMANE_ACCESS_KEY = "cle-de-test";
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init.body)[0];
    calls.push({ path, body });
    const lang = body.language_code;
    if (path.endsWith("/bulk_traffic_estimation/live")) return ok({ items: [{ metrics: { organic: TRAFFIC[lang], paid: { etv: 0, count: 0 } } }] });
    if (path.endsWith("/ranked_keywords/live")) return ok({ total_count: RANKED[lang].length, items: RANKED[lang] });
    if (path.endsWith("/backlinks/summary/live")) return ok({ rank: 27, backlinks: 374, referring_domains: 201 });
    return ok({ total_count: 0, items: [] });
  };
});
after(() => { globalThis.fetch = realFetch; });

test("mode=traffic : total brut conservé, estimation ajustée et détail par langue", async () => {
  const { default: handler } = await import("../netlify/functions/audit.mjs");
  const res = await handler(new Request("https://outil.test/api/audit?mode=traffic&site=exemple.ca&location=Canada&language=fr,en", {
    headers: { "x-paparmane-key": "cle-de-test" },
  }));
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.available, true);
  assert.equal(data.organic, 17390, "le total brut reste la somme des langues");
  assert.deepEqual(data.organicByLanguage, [
    { language: "fr", organic: 9000, organicKeywords: 200 },
    { language: "en", organic: 8390, organicKeywords: 147 },
  ]);

  const e = data.organicEstimate;
  assert.equal(e.raw, 17390);
  assert.deepEqual(e.exclusions.map(x => [x.keyword, x.reason, x.estimatedVisits]), [
    ["lilas", "generic_head_term", 3471],
    ["lilas beauport", "language_duplicate", 1094],
    ["lilas café", "spelling_variant", 713],
  ]);
  assert.equal(e.removed, 3471 + 1094 + 713);
  assert.equal(e.adjusted, 17390 - 5278);

  // La liste affichée reste dédoublonnée et plafonnée à 20.
  assert.deepEqual(data.strategicKeywords.items.map(k => k.keyword), ["lilas", "lilas cafe", "lilas café", "lilas beauport", "the lilas cafe"]);

  const ranked = calls.filter(c => c.path.endsWith("/ranked_keywords/live"));
  assert.deepEqual(ranked.map(c => c.body.language_code).sort(), ["en", "fr"]);
  assert.ok(ranked.every(c => c.body.limit === 100));
});

test("mode=traffic : une seule langue, rien à dédoublonner entre langues", async () => {
  const { default: handler } = await import("../netlify/functions/audit.mjs");
  const res = await handler(new Request("https://outil.test/api/audit?mode=traffic&site=exemple.ca&location=Canada&language=fr", {
    headers: { "x-paparmane-key": "cle-de-test" },
  }));
  const data = await res.json();
  assert.equal(data.organic, 9000);
  assert.deepEqual(data.organicByLanguage, [{ language: "fr", organic: 9000, organicKeywords: 200 }]);
  assert.deepEqual(data.organicEstimate.exclusions.map(x => x.reason), ["generic_head_term", "spelling_variant"]);
});

test("mode=traffic : sans la clé d'accès, refus", async () => {
  const { default: handler } = await import("../netlify/functions/audit.mjs");
  const res = await handler(new Request("https://outil.test/api/audit?mode=traffic&site=exemple.ca"));
  assert.equal(res.status, 401);
});
