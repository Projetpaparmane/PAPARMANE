// ============================================================
// PAPARMANE SEO — qualification des estimations de marché
//
// DataForSEO estime le trafic en multipliant un volume de recherche NATIONAL
// par un taux de clic théorique. Pour un commerce local, ce calcul gonfle le
// résultat : sur un cas réel, l'estimation dépassait de plus de dix fois les
// clics mesurés par Google Search Console.
//
// Ce module ne « corrige » pas l'estimation au point d'en faire un chiffre
// réel — seule Search Console donne les vrais clics. Il retire uniquement ce
// qui est démontrablement compté en trop, et dit pourquoi :
//   1. variantes d'écriture d'une même recherche (« lilas cafe », « lilas café »)
//      qui portent exactement le même volume ;
//   2. mot-clé présent dans deux langues avec exactement le même volume ;
//   3. requête générique géante créditée d'une grosse part du total alors que
//      le site n'est dans le top 3 pour rien d'aussi gros.
// Fonctions pures, sans réseau : voir tests/market-estimates.test.mjs.
// ============================================================

const num = v => Number(v) || 0;

// « Lilas Café » et « lilas cafe » sont la même recherche pour Google Ads.
export const normalizeKeyword = value => String(value || "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const rawEtv = item => num(item?.ranked_serp_element?.serp_item?.etv);
const rawVolume = item => num(item?.keyword_data?.keyword_info?.search_volume);
const rawKeyword = item => String(item?.keyword_data?.keyword || item?.keyword || "");

// Fusionne les mots-clés classés de plusieurs langues. Un mot-clé présent dans
// deux langues n'apparaît qu'une fois (position la plus payante conservée) ;
// le doublon écarté est gardé en mémoire pour ajuster le total.
export function mergeRanked(results, languages = []) {
  const byKeyword = new Map();
  const languageDuplicates = [];
  results.forEach((result, index) => {
    for (const item of result?.items || []) {
      const key = rawKeyword(item).toLowerCase();
      const previous = byKeyword.get(key);
      if (!previous) { byKeyword.set(key, { item, language: languages[index] || null }); continue; }
      const incoming = { item, language: languages[index] || null };
      const [kept, dropped] = rawEtv(item) > rawEtv(previous.item) ? [incoming, previous] : [previous, incoming];
      byKeyword.set(key, kept);
      if (!key) continue;
      languageDuplicates.push({
        keyword: rawKeyword(kept.item),
        languages: [kept.language, dropped.language].filter(Boolean),
        searchVolume: Math.round(rawVolume(kept.item)),
        otherSearchVolume: Math.round(rawVolume(dropped.item)),
        estimatedVisits: Math.round(rawEtv(dropped.item)),
      });
    }
  });
  const items = [...byKeyword.values()].map(entry => entry.item)
    .sort((a, b) => rawVolume(b) - rawVolume(a));
  return {
    total_count: results.reduce((sum, result) => sum + num(result?.total_count), 0),
    items,
    languageDuplicates,
  };
}

// Seuils de la règle « requête générique ». Les trois conditions doivent être
// réunies : la règle reste prudente pour ne jamais retirer un vrai mot-clé
// d'affaires.
export const GENERIC_RULE = {
  minRank: 4,            // hors du top 3
  minShare: 0.10,        // au moins 10 % du total estimé à elle seule
  minVisits: 100,        // et au moins 100 visites créditées
  volumeFactor: 10,      // volume ≥ 10 × le plus gros mot-clé où le site est top 3
};

/**
 * @param {object} input
 * @param {number} input.organic  total estimé brut (somme des langues)
 * @param {Array<{keyword:string,searchVolume:number,rank:number|null,estimatedVisits:number}>} input.keywords
 * @param {Array<{keyword:string,searchVolume:number,otherSearchVolume:number,estimatedVisits:number,languages?:string[]}>} [input.languageDuplicates]
 * @returns {{raw:number,adjusted:number,removed:number,share:number,exclusions:Array<object>}}
 */
export function qualifyOrganicEstimate({ organic, keywords = [], languageDuplicates = [] } = {}) {
  const raw = Math.max(0, Math.round(num(organic)));
  const exclusions = [];
  const list = (Array.isArray(keywords) ? keywords : [])
    .filter(k => k && k.keyword)
    .map(k => ({
      keyword: String(k.keyword),
      searchVolume: Math.round(num(k.searchVolume)),
      rank: Number.isFinite(Number(k.rank)) && Number(k.rank) > 0 ? Number(k.rank) : null,
      estimatedVisits: Math.round(num(k.estimatedVisits)),
    }));

  // 1. Variantes d'écriture : même forme normalisée ET même volume.
  const groups = new Map();
  for (const k of list) {
    if (!k.searchVolume) continue;
    const key = normalizeKeyword(k.keyword) + "|" + k.searchVolume;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(k);
  }
  const variantKeys = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [kept, ...others] = [...group].sort((a, b) => b.estimatedVisits - a.estimatedVisits);
    for (const k of others) {
      variantKeys.add(k.keyword);
      if (k.estimatedVisits > 0) exclusions.push({ ...k, reason: "spelling_variant", variantOf: kept.keyword });
    }
  }

  // 2. Même mot-clé dans deux langues avec le même volume : ce volume n'est
  // pas propre à une langue, le total l'a donc compté deux fois. Des volumes
  // différents = recherches réellement distinctes, on ne retire rien.
  for (const d of Array.isArray(languageDuplicates) ? languageDuplicates : []) {
    const volume = Math.round(num(d?.searchVolume));
    const visits = Math.round(num(d?.estimatedVisits));
    if (!d?.keyword || !volume || volume !== Math.round(num(d.otherSearchVolume)) || visits <= 0) continue;
    exclusions.push({
      keyword: String(d.keyword), searchVolume: volume, rank: null, estimatedVisits: visits,
      reason: "language_duplicate", languages: Array.isArray(d.languages) ? d.languages : [],
    });
  }

  // 3. Requête générique géante. Référence : le plus gros volume sur lequel
  // le site tient une position 1 à 3. Sans cette référence, pas de verdict.
  const remaining = list.filter(k => !variantKeys.has(k.keyword));
  const top3Volume = Math.max(0, ...remaining.filter(k => k.rank && k.rank <= 3).map(k => k.searchVolume));
  if (top3Volume > 0 && raw > 0) {
    const minVisits = Math.max(GENERIC_RULE.minVisits, raw * GENERIC_RULE.minShare);
    for (const k of remaining) {
      if (!k.rank || k.rank < GENERIC_RULE.minRank) continue;
      if (k.estimatedVisits < minVisits) continue;
      if (k.searchVolume < top3Volume * GENERIC_RULE.volumeFactor) continue;
      exclusions.push({ ...k, reason: "generic_head_term", referenceVolume: top3Volume });
    }
  }

  const removed = Math.min(raw, exclusions.reduce((sum, e) => sum + e.estimatedVisits, 0));
  exclusions.sort((a, b) => b.estimatedVisits - a.estimatedVisits);
  return {
    raw,
    adjusted: raw - removed,
    removed,
    share: raw ? Number((removed / raw).toFixed(4)) : 0,
    exclusions,
  };
}
