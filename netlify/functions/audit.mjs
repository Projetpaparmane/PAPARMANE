// ============================================================
// PAPARMANE SEO — moteur d'audit (fonction Netlify)
// Trois modes :
//   ?mode=discover&site=URL   → robots.txt, sitemap, llms.txt, robots IA
//   ?mode=page&url=URL        → analyse complète d'une page
//   ?mode=verify (POST urls[])→ vérifie des liens (statut + redirections)
// ============================================================

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { gunzipSync } from "node:zlib";

const UA = "Mozilla/5.0 (compatible; PaparmaneSEO/1.0; +https://paparmane.netlify.app)";
const FETCH_TIMEOUT = 8000;
// Garde-fou anti-abus seulement : le moteur n'échantillonne plus les 30
// premières pages. Les sitemaps sont parcourus côté client, un fichier à la fois.
const MAX_SITEMAP_URLS = 1000;
const MAX_VERIFY = 15;

// --- Robots d'IA connus : [agent, rôle, conséquence d'un blocage] ---
const AI_BOTS = [
  ["GPTBot",             "OpenAI — entraînement",                  "contenu exclu d'un éventuel entraînement OpenAI"],
  ["OAI-SearchBot",      "ChatGPT Search — citations en direct",   "jamais cité par ChatGPT Search"],
  ["ChatGPT-User",       "ChatGPT — navigation à la demande",      "ChatGPT ne peut pas visiter le site"],
  ["OAI-AdsBot",         "OpenAI — validation publicitaire",       "pages non admissibles aux validations publicitaires OpenAI"],
  ["ClaudeBot",          "Anthropic — entraînement",               "contenu exclu d'un éventuel entraînement Anthropic"],
  ["Claude-SearchBot",   "Claude — recherche et citations",        "Claude Search ne peut pas explorer le site"],
  ["Claude-Web",         "Anthropic — ancien robot (déprécié)",    "aucun : remplacé par ClaudeBot et Claude-User"],
  ["anthropic-ai",       "Anthropic — ancien robot (déprécié)",    "aucun (robot inactif)"],
  ["PerplexityBot",      "Perplexity AI — indexation",             "absent de Perplexity"],
  ["Perplexity-User",    "Perplexity — navigation",                "Perplexity ne peut pas visiter le site"],
  ["Google-Extended",    "Gemini — entraînement et grounding",     "contenu non utilisé pour Gemini; aucun effet sur Google Search"],
  ["Applebot",           "Apple — Siri, Spotlight et Safari",      "absent de Siri, de Spotlight et de la recherche Safari"],
  ["Applebot-Extended",  "Apple — entraînement des modèles",       "contenu non utilisé pour entraîner Apple Intelligence; aucun effet sur Siri, Spotlight ni Safari, qui dépendent d'Applebot"],
  ["CCBot",              "Common Crawl — nourrit beaucoup d'IA",   "absent de nombreux modèles d'IA"],
  ["Bytespider",         "TikTok / Doubao",                        "absent des IA de ByteDance"],
  ["meta-externalagent", "Meta AI — entraînement",                 "absent de Meta AI"],
  ["Meta-ExternalFetcher","Meta AI — récupération à la demande",   "Meta AI ne peut pas visiter le site"],
  ["Amazonbot",          "Amazon Alexa / Rufus",                   "absent des réponses d'Alexa"],
  // Ajoutés après relevé des robots.txt de 14 grands sites (sept. 2026) :
  // ces agents sont déclarés en pratique et manquaient à l'inventaire.
  ["Claude-User",        "Claude — visite à la demande",           "Claude ne peut pas ouvrir le site pour un utilisateur"],
  ["DuckAssistBot",      "DuckDuckGo AI (Duck.ai)",                "absent des réponses de DuckDuckGo"],
  ["MistralAI-User",     "Mistral (France) — navigation",          "Le Chat ne peut pas visiter le site"],
  // xAI ne publie AUCUNE documentation de robot : les noms qui circulent
  // (xAI-Bot, GrokBot, xAI-Grok) sont des suppositions, et Grok récupère
  // souvent les pages sous un agent Safari usurpé. Informatif seulement :
  // ce robot n'entre pas dans le calcul du score.
  ["GrokBot",            "Grok (xAI) — nom d'agent non documenté", "indéterminé : xAI ne documente pas ses robots"],
  ["YouBot",             "You.com",                                "absent des réponses de You.com"],
  ["cohere-ai",          "Cohere — entraînement",                  "contenu exclu d'un éventuel entraînement Cohere"],
];

// --- Moteurs de recherche classiques : [agent, rôle, conséquence d'un blocage] ---
// Les Aperçus IA de Google reposent sur l'exploration de Googlebot (et non sur
// Google-Extended); Copilot s'appuie sur l'index de Bing, que DuckDuckGo
// utilise aussi en grande partie.
const SEARCH_ENGINES = [
  ["Googlebot", "Google Search et Aperçus IA",  "absent de Google et de ses Aperçus IA"],
  ["Bingbot",   "Bing, Copilot et DuckDuckGo",  "absent de Bing, de Copilot et en grande partie de DuckDuckGo"],
];

function isSafeUrl(u) {
  try {
    const p = new URL(u);
    if (!/^https?:$/.test(p.protocol)) return false;
    const h = p.hostname.toLowerCase().replace(/\.$/, "");
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
    const bare = h.replace(/^\[|\]$/g, "");
    if (isIP(bare) && isPrivateIp(bare)) return false;
    return true;
  } catch { return false; }
}

// Adresses qui ne doivent jamais être visitées par le moteur : réseau interne,
// boucle locale, métadonnées du nuage (169.254.169.254), plage CGNAT…
function isPrivateIp(ip) {
  let v4 = null;
  if (isIP(ip) === 4) v4 = ip;
  else {
    const low = ip.toLowerCase();
    // IPv4 encapsulée dans IPv6 (::ffff:127.0.0.1 ou ::ffff:7f00:1).
    const mapped = low.match(/^(?:0*:)*:?ffff:(.+)$/);
    if (mapped) {
      if (isIP(mapped[1]) === 4) v4 = mapped[1];
      else {
        const parts = mapped[1].split(":");
        if (parts.length === 2) {
          const n = parts.map(x => parseInt(x, 16));
          if (n.every(Number.isFinite)) v4 = [n[0] >> 8, n[0] & 255, n[1] >> 8, n[1] & 255].join(".");
        }
      }
    }
    if (!v4) {
      if (low === "::" || low === "::1") return true;
      return /^(?:f[cd]|fe[89ab]|fec|fed|fee|fef|ff)/.test(low.replace(/^0+/, ""));
    }
  }
  const [a, b] = v4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

// Vérifie l'adresse RÉELLE derrière le nom de domaine : un nom public peut
// pointer vers 127.0.0.1 (localtest.me) ou vers le réseau interne.
async function resolvesPublic(url) {
  if (!isSafeUrl(url)) return false;
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(item => !isPrivateIp(item.address));
  } catch { return false; }
}

// Décode selon le jeu de caractères annoncé (en-tête, puis <meta charset>) :
// un site en windows-1252 affichait « C�teaux » dans le rapport.
function decodeBody(buffer, contentType) {
  let bytes = new Uint8Array(buffer);
  // Sitemap .xml.gz servi tel quel (sans Content-Encoding).
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try { bytes = new Uint8Array(gunzipSync(bytes, { maxOutputLength: 50 * 1024 * 1024 })); } catch { /* laisser tel quel */ }
  }
  const sniff = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const charset = (String(contentType || "").match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]
    || sniff.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1]
    || sniff.match(/<\?xml[^>]+encoding\s*=\s*["']([\w-]+)/i)?.[1]
    || "utf-8").toLowerCase();
  try { return new TextDecoder(charset).decode(bytes); }
  catch { return new TextDecoder("utf-8").decode(bytes); }
}

const MAX_REDIRECTS = 6;

async function grab(url, { asText = true, cacheBust = false, timeout = FETCH_TIMEOUT } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(500, timeout));
  const startedAt = Date.now();
  try {
    const requested = new URL(url);
    if (cacheBust) requested.searchParams.set("_paparmane_audit", Date.now().toString());
    // Redirections suivies une à une pour contrôler chaque destination.
    let current = requested.href;
    let res = null;
    let hops = 0;
    for (;;) {
      if (!(await resolvesPublic(current))) throw new Error("Adresse non publique ou introuvable");
      res = await fetch(current, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,text/plain,*/*",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        redirect: "manual",
        signal: ctrl.signal,
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location && hops < MAX_REDIRECTS) {
        res.body?.cancel().catch(() => {});
        current = new URL(location, current).href;
        hops++;
        continue;
      }
      break;
    }
    const contentType = res.headers.get("content-type") || "";
    const body = asText ? decodeBody(await res.arrayBuffer(), contentType) : "";
    if (!asText) res.body?.cancel().catch(() => {});
    return {
      ok: true,
      status: res.status,
      finalUrl: current,
      body,
      redirected: hops > 0,
      elapsedMs: Date.now() - startedAt,
      headers: {
        xRobotsTag: res.headers.get("x-robots-tag") || "",
        contentEncoding: res.headers.get("content-encoding") || "",
        contentType,
        cacheControl: res.headers.get("cache-control") || "",
        server: res.headers.get("server") || "",
        // Cloudflare l'ajoute quand il sert une page de vérification à la place du contenu.
        cfMitigated: res.headers.get("cf-mitigated") || "",
        retryAfter: res.headers.get("retry-after") || "",
      },
    };
  } catch (e) {
    // timedOut distingue le délai dépassé d'une vraie erreur réseau (DNS, TLS…).
    return { ok: false, status: 0, finalUrl: url, body: "", redirected: false, elapsedMs: Date.now() - startedAt, error: String(e.message || e), timedOut: ctrl.signal.aborted };
  } finally { clearTimeout(t); }
}

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Entités nommées les plus fréquentes sur les sites francophones. Les entités
// numériques (&#8217; &#233; &#x2019;) sont traitées par le même passage.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â",
  ccedil: "ç", ugrave: "ù", ucirc: "û", uuml: "ü", icirc: "î", iuml: "ï",
  ocirc: "ô", ouml: "ö", oelig: "œ", aelig: "æ",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Ccedil: "Ç", Ocirc: "Ô",
  euro: "€", deg: "°", copy: "©", reg: "®", trade: "™", middot: "·",
  times: "×", frac12: "½", frac14: "¼", sup2: "²", sup3: "³", bull: "•",
};

// Un seul passage : évite le double décodage (« &amp;#39; » ne doit pas devenir « ' »).
const decode = (s) => String(s || "").replace(
  /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]{1,31});/g,
  (match, body) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const cp = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return match;
      try { return String.fromCodePoint(cp); } catch { return match; }
    }
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)) return NAMED_ENTITIES[body];
    const lower = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower) ? NAMED_ENTITIES[lower] : match;
  }
);

const plain = (s) => String(s || "")
  .toLocaleLowerCase("fr-CA")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

function hashText(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function removePageChrome(html, { keepHeader = false } = {}) {
  let out = String(html || "");
  // Dans <main> ou <article>, un <header> contient souvent le H1 de la page :
  // on ne le retire que sur la page entière (en-tête du site).
  const structural = ["script", "style", "nav", "footer", ...(keepHeader ? [] : ["header"]), "aside", "noscript"];
  for (const tag of structural) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  // Les bannières de consentement injectent beaucoup de vocabulaire répétitif
  // (stockage, accès, préférences) qui ne décrit jamais le sujet de la page.
  const consentMarker = "(?:cmplz|cookie|consent|onetrust|cky-|gdpr|borlabs|moove[_-]gdpr|cookie-law|cc-window|tarteaucitron)";
  // Jamais body, html, main ni article : l'extension WordPress « Cookie Notice »
  // ajoute « cookies-not-set » au <body>, ce qui effaçait toute la page.
  const consentBlock = new RegExp(`<((?!(?:body|html|main|article)\\b)[a-z][a-z0-9-]*)\\b[^>]*(?:id|class)=["'][^"']*${consentMarker}[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, "gi");
  for (let i = 0; i < 3; i++) out = out.replace(consentBlock, " ");
  return out;
}

function usefulContentHtml(html) {
  const mains = [...String(html || "").matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map(m => m[1]);
  const articles = mains.length ? [] : [...String(html || "").matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(m => m[1]);
  return removePageChrome((mains.length ? mains : articles.length ? articles : [html]).join(" "), { keepHeader: !!(mains.length || articles.length) });
}

function detectPageState(title, h1, html, bodyText) {
  const heading = plain(`${title || ""} ${(h1 || []).join(" ")}`);
  const body = plain(String(bodyText || "").slice(0, 5000));
  const hay = `${heading} ${body} ${plain(String(html || "").slice(0, 12000))}`;
  const shortInterstitial = body.split(/\s+/).filter(Boolean).length < 350;
  const maintenance = [
    "site is undergoing maintenance", "website is undergoing maintenance", "maintenance mode",
    "site en maintenance", "site temporairement indisponible", "site momentanement indisponible",
    "under construction", "coming soon", "bientot disponible", "de retour bientot",
  ].find(marker => heading.includes(marker) || (shortInterstitial && hay.includes(marker)));
  if (maintenance) return { kind: "maintenance", reason: maintenance };
  const challenge = [
    "checking your browser", "just a moment", "verifying you are human", "verify you are human",
    "enable javascript and cookies to continue", "attention required cloudflare", "security check",
  ].find(marker => heading.includes(marker) || (shortInterstitial && hay.includes(marker)));
  if (challenge) return { kind: "challenge", reason: challenge };
  return { kind: "normal", reason: null };
}

function cleanAuditUrl(value) {
  try {
    const url = new URL(value);
    url.searchParams.delete("_paparmane_audit");
    return url.href;
  } catch { return value; }
}

// Fichiers qui ne sont pas des pages web : certains sitemaps WordPress
// (pièces jointes, images) listent des .avif ou .svg. Les analyser comme des
// pages produisait « 171 pages sans H1 / non adaptées au mobile ».
const NON_PAGE_EXT = /\.(?:jpe?g|png|webp|avif|gif|svg|ico|bmp|tiff?|heic|pdf|zip|rar|7z|gz|css|js|mjs|json|xml|txt|csv|mp4|m4v|mov|webm|avi|mp3|wav|ogg|m4a|woff2?|ttf|otf|eot|docx?|xlsx?|pptx?|odt|ods|eps|psd|ai)$/i;
const isPagePath = value => { try { return !NON_PAGE_EXT.test(new URL(value).pathname); } catch { return false; } };

// Même origine exacte : « https://ex.com.evil.net » commence par « https://ex.com »
// mais n'est pas le même site.
function sameSite(value, origin) {
  try { return new URL(value).origin === origin; } catch { return false; }
}

// Même site avec ou sans « www », même protocole : le sitemap d'un site en www
// liste parfois ses pages sans www (ou l'inverse). Ces pages sont auditées
// plutôt qu'écartées en silence.
function sameSiteLoose(value, origin) {
  try {
    const a = new URL(value), b = new URL(origin);
    const bare = host => host.toLowerCase().replace(/^www\./, "");
    return a.protocol === b.protocol && a.port === b.port && bare(a.hostname) === bare(b.hostname);
  } catch { return false; }
}

function one(re, s) { const m = s.match(re); return m ? decode(m[1].trim()) : null; }
function all(re, s) { return [...s.matchAll(re)].map(m => m[1]); }

function tagAttr(tag, name) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(tag || "").match(new RegExp(`(?:^|\\s)${safe}\\s*=\\s*(?:(["'])([\\s\\S]*?)\\1|([^\\s>]+))`, "i"));
  return match ? decode((match[2] ?? match[3] ?? "").trim()) : null;
}

function cleanComparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("_paparmane_audit");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch { return ""; }
}

// Filiation schema.org des sous-types d'entreprise locale. Sans cette table, un
// vignoble correctement balisé « Winery » n'était contrôlé sur AUCUN champ et
// passait « valide » même vide — or c'est exactement la clientèle de Paparmane.
const SCHEMA_PARENT = {
  Winery: "FoodEstablishment", Restaurant: "FoodEstablishment", Bakery: "FoodEstablishment",
  BarOrPub: "FoodEstablishment", Brewery: "FoodEstablishment", Distillery: "FoodEstablishment",
  CafeOrCoffeeShop: "FoodEstablishment", IceCreamShop: "FoodEstablishment", FastFoodRestaurant: "FoodEstablishment",
  FoodEstablishment: "LocalBusiness",
  BedAndBreakfast: "LodgingBusiness", Campground: "LodgingBusiness", Hotel: "LodgingBusiness",
  Motel: "LodgingBusiness", Resort: "LodgingBusiness", Hostel: "LodgingBusiness",
  VacationRental: "LodgingBusiness", LodgingBusiness: "LocalBusiness",
  ClothingStore: "Store", GardenStore: "Store", FurnitureStore: "Store", JewelryStore: "Store",
  BookStore: "Store", GroceryStore: "Store", HardwareStore: "Store", PetStore: "Store",
  SportingGoodsStore: "Store", Florist: "Store", Store: "LocalBusiness",
  BeautySalon: "HealthAndBeautyBusiness", DaySpa: "HealthAndBeautyBusiness",
  HairSalon: "HealthAndBeautyBusiness", NailSalon: "HealthAndBeautyBusiness",
  HealthAndBeautyBusiness: "LocalBusiness",
  HVACBusiness: "HomeAndConstructionBusiness", GeneralContractor: "HomeAndConstructionBusiness",
  Plumber: "HomeAndConstructionBusiness", Electrician: "HomeAndConstructionBusiness",
  RoofingContractor: "HomeAndConstructionBusiness", HousePainter: "HomeAndConstructionBusiness",
  Locksmith: "HomeAndConstructionBusiness", MovingCompany: "HomeAndConstructionBusiness",
  HomeAndConstructionBusiness: "LocalBusiness",
  AccountingService: "ProfessionalService", LegalService: "ProfessionalService",
  Notary: "ProfessionalService", Attorney: "ProfessionalService",
  RealEstateAgent: "ProfessionalService", InsuranceAgency: "ProfessionalService",
  ProfessionalService: "LocalBusiness",
  Physiotherapy: "MedicalBusiness", Dentist: "MedicalBusiness", Optician: "MedicalBusiness",
  Pharmacy: "MedicalBusiness", VeterinaryCare: "MedicalBusiness", MedicalBusiness: "LocalBusiness",
  ExerciseGym: "SportsActivityLocation", SportsClub: "SportsActivityLocation",
  SkiResort: "SportsActivityLocation", GolfCourse: "SportsActivityLocation",
  SportsActivityLocation: "LocalBusiness",
  TouristAttraction: "LocalBusiness", TouristInformationCenter: "LocalBusiness",
  ArtGallery: "LocalBusiness", Museum: "LocalBusiness", EventVenue: "LocalBusiness",
  ChildCare: "LocalBusiness", Corporation: "Organization", NGO: "Organization",
  EducationalOrganization: "Organization", SportsOrganization: "Organization",
  LocalBusiness: "Organization",
  BlogPosting: "Article", NewsArticle: "Article", TechArticle: "Article", Report: "Article",
};

// Chaîne d'héritage d'un type : [type, parent, grand-parent, …]
function schemaLineage(type) {
  const chain = [];
  let cur = type;
  let guard = 0;
  while (cur && guard++ < 10) {
    chain.push(cur);
    cur = SCHEMA_PARENT[cur];
    if (chain.includes(cur)) break;
  }
  return chain;
}

// Un type compte comme « identité d'entreprise précise » s'il descend de
// LocalBusiness ou d'Organization.
function isBusinessType(type) {
  return schemaLineage(type).some(t => t === "LocalBusiness" || t === "Organization");
}

function inspectStructuredData(blocks) {
  const types = new Set(), nestedTypes = new Set(), problems = [], entities = [];
  let validBlocks = 0, invalidBlocks = 0;
  const required = {
    Organization: ["name", "url"], LocalBusiness: ["name", "address"],
    LodgingBusiness: ["name", "address"], Product: ["name", "offers"],
    Article: ["headline", "author", "datePublished"], BlogPosting: ["headline", "author", "datePublished"],
    FAQPage: ["mainEntity"], Event: ["name", "startDate", "location"],
    Service: ["name", "provider"], BreadcrumbList: ["itemListElement"],
    FoodEstablishment: ["name", "address"], Store: ["name", "address"],
    HealthAndBeautyBusiness: ["name", "address"], HomeAndConstructionBusiness: ["name", "address"],
    ProfessionalService: ["name", "address"], MedicalBusiness: ["name", "address"],
    SportsActivityLocation: ["name", "address"], TouristAttraction: ["name", "address"],
  };
  // Un sous-type hérite des champs obligatoires de son ancêtre le plus proche.
  const requiredFor = (type) => {
    for (const t of schemaLineage(type)) if (required[t]) return required[t];
    return [];
  };
  // primary = nœud principal (racine, @graph, mainEntity, about). Les nœuds
  // imbriqués secondaires (auteur, éditeur, offre…) comptent pour les types
  // détectés, mais on ne leur réclame pas les champs d'une fiche complète :
  // un « publisher » Organization sans url n'est pas une erreur.
  const visit = (node, primary = true, depth = 0) => {
    if (depth > 12) return;
    if (Array.isArray(node)) return node.forEach(child => visit(child, primary, depth + 1));
    if (!node || typeof node !== "object") return;
    if (node["@graph"]) visit(node["@graph"], true, depth + 1);
    const rawTypes = (Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [])
      .filter(type => typeof type === "string")
      .map(type => type.replace(/^(?:https?:\/\/)?schema\.org\//i, ""));
    if (rawTypes.length && primary) entities.push({ types: rawTypes, id: node["@id"] || null, name: node.name || node.headline || null, url: node.url || null });
    rawTypes.forEach(type => {
      // Les nœuds secondaires (adresse, coordonnées, action de recherche…)
      // ne sont pas listés comme « types présents » : ils noyaient le rapport.
      if (!primary) { nestedTypes.add(type); return; }
      types.add(type);
      const empty = k => node[k] == null || node[k] === "" || (Array.isArray(node[k]) && !node[k].length);
      // Google accepte un Product avec une offre, un avis OU une note moyenne.
      const missing = requiredFor(type).filter(k => empty(k)
        && !(k === "offers" && (!empty("review") || !empty("aggregateRating"))));
      if (missing.length) problems.push(`${type} : champ(s) manquant(s) — ${missing.join(", ")}`);
    });
    for (const [key, value] of Object.entries(node)) {
      if (key === "@graph" || !value || typeof value !== "object") continue;
      visit(value, /^(mainEntity|about)$/.test(key), depth + 1);
    }
    for (const [key, value] of Object.entries(node)) {
      // Une propriété facultative vide (par exemple WebSite.description dans
      // certains graphes Yoast) n'invalide pas le JSON-LD. Les champs requis
      // sont déjà contrôlés précisément ci-dessus.
      if (primary && /^(url|image|logo|sameAs)$/i.test(key)) {
        const values = Array.isArray(value) ? value : [value];
        values.filter(v => typeof v === "string").forEach(v => {
          try { if (!/^https?:$/.test(new URL(v).protocol)) throw new Error(); }
          catch { problems.push(`${rawTypes[0] || "Objet"} : URL non absolue ou invalide — ${key}`); }
        });
      }
    }
  };
  blocks.forEach((block, i) => {
    try {
      const parsed = JSON.parse(block.trim());
      if (!parsed || typeof parsed !== "object") throw new Error("bloc vide");
      validBlocks++;
      // Un tableau de nœuds est valide : chaque nœud porte alors son @context.
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      if (roots.some(root => root && typeof root === "object" && !root["@context"] && !root["@graph"])) problems.push(`Bloc JSON-LD ${i + 1} : @context manquant`);
      visit(parsed);
    }
    catch { invalidBlocks++; problems.push(`Bloc JSON-LD ${i + 1} invalide (erreur de syntaxe)`); }
  });
  const allTypes = [...types].sort();
  // Types d'entreprise reconnus, et parmi eux ceux qui sont réellement précis
  // (un sous-type de LocalBusiness, pas le générique « Organization »).
  const businessTypes = allTypes.filter(isBusinessType);
  const preciseBusinessTypes = businessTypes.filter(t => schemaLineage(t).includes("LocalBusiness"));
  return {
    types: allTypes, nestedTypes: [...nestedTypes].filter(type => !types.has(type)).sort(), validBlocks, invalidBlocks, problems: [...new Set(problems)], entities,
    businessTypes, preciseBusinessTypes,
  };
}

function inferExpectedSchema(url, title, h1, bodyText) {
  const hay = `${url} ${title || ""} ${(h1 || []).join(" ")} ${bodyText.slice(0, 2500)}`.toLocaleLowerCase("fr-CA");
  const headingHay = `${new URL(url).pathname} ${title || ""} ${(h1 || []).join(" ")}`.toLocaleLowerCase("fr-CA");
  const expected = [];
  const add = (type, reason) => { if (!expected.some(x => x.type === type)) expected.push({ type, reason }); };
  const path = new URL(url).pathname.replace(/\/$/, "") || "/";
  if (path === "/") add("Organization", "page d'accueil : identité officielle de l'entreprise");
  if (/hebergement|hébergement|gite|gîte|yourte|hotel|hôtel|auberge|chalet|camping/.test(headingHay)) add("LodgingBusiness", "contenu d'hébergement détecté");
  if (/\/blog|\/actualit|\/article|blogue|datepublished/.test(hay)) add("Article", "article ou actualité détecté");
  if (/\/produit|\/product|\/boutique|ajouter au panier|add to cart/.test(hay)) add("Product", "page produit ou boutique détectée");
  if (/\/services?\/[^/]+$/.test(path)) add("Service", "page de service détectée");
  // FAQ et Événement : seulement d'après l'adresse, le titre ou le H1. Le mot
  // « événements » dans un paragraphe (« salle pour vos événements ») ne fait
  // pas de la page un événement daté.
  if (/faq|foire aux questions|questions fréquentes/.test(headingHay)) add("FAQPage", "section de questions-réponses détectée");
  if (/\/evenement|\/event|billetterie/.test(headingHay)) add("Event", "événement détecté");
  return expected;
}

const STOPWORDS = new Set((`a afin ai ainsi alors au aucun aussi autre aux avec avoir bon car ce ces cette comme dans de des du elle en encore est et eu fait font il ils je la le les leur lui ma mais me mes moi mon ne nos notre nous on ont ou où par pas pour pourquoi quand que quel quelle quelles quels qui sa sans se ses si son sont sous sur ta te tes toi ton tous tout toute toutes très tu un une vos votre vous y the and for from that this with are was were have has into not your you our their its but can`).split(/\s+/));

function extractKeywords(text) {
  const tokens = (text.toLocaleLowerCase("fr-CA").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z][a-z'-]{2,}/g) || [])
    .map(w => w.replace(/^['-]+|['-]+$/g, ""))
    .filter(w => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const uni = new Map(), bi = new Map();
  tokens.forEach(w => uni.set(w, (uni.get(w) || 0) + 1));
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = tokens[i] + " " + tokens[i + 1];
    bi.set(phrase, (bi.get(phrase) || 0) + 1);
  }
  const ranked = [
    ...[...bi].filter(([, count]) => count >= 2).map(([term, count]) => ({ term, count, score: count * 2.2, kind: "expression" })),
    ...[...uni].filter(([, count]) => count >= 2).map(([term, count]) => ({ term, count, score: count, kind: "mot" })),
  ].sort((a, b) => b.score - a.score || b.count - a.count).slice(0, 12);
  return { top: ranked, tokenCount: tokens.length };
}

const TOPIC_NOISE = new Set([
  "wstg", "centre", "quebec", "entreprise", "service", "installation",
  "travail", "travaux", "projet", "page", "accueil", "propos", "expertise",
  "offre", "complet", "complete", "fiable", "residentiel", "commercial",
]);

function stemTopicToken(value) {
  let token = plain(value).replace(/[^a-z'-]/g, "").replace(/^['-]+|['-]+$/g, "");
  if (token.endsWith("eaux")) token = token.slice(0, -1);
  else if (token.length > 4 && token.endsWith("s")) token = token.slice(0, -1);
  return token;
}

function topicTokens(value) {
  return (plain(value).replace(/[-'’]+/g, " ").match(/[a-z][a-z]{2,}/g) || [])
    .map(stemTopicToken)
    .filter(token => token.length > 2 && !STOPWORDS.has(token) && !TOPIC_NOISE.has(token));
}

function inferFocusKeyword(title, h1, url, observedKeywords) {
  const titleTokens = topicTokens(title);
  const h1Tokens = topicTokens((h1 || []).join(" "));
  const h1Set = new Set(h1Tokens);
  const shared = [...new Set(titleTokens.filter(token => h1Set.has(token)))];
  if (shared.length) return shared.slice(0, 3).join(" ");

  let pathTokens = [];
  try { pathTokens = topicTokens(new URL(url).pathname.replace(/[-_/]+/g, " ")); }
  catch { /* URL déjà validée en amont */ }
  const headingSet = new Set([...titleTokens, ...h1Tokens]);
  const pathMatch = [...new Set(pathTokens.filter(token => headingSet.has(token)))];
  if (pathMatch.length) return pathMatch.slice(0, 3).join(" ");
  return observedKeywords.top[0]?.term || null;
}

// --- Classement d'une image : technique / décorative / contenu ---
function classifyImg(srcRaw) {
  const src = (srcRaw || "").toLowerCase();
  const file = src.split("/").pop().split("?")[0];
  if (src.startsWith("data:") || src.includes("base64")) return "tech";
  if (/(^tr\?|facebook\.com\/tr|\/pixel|\bbeacon\b|analytics|doubleclick)/.test(src)) return "tech";
  if (/\.(svg)$/.test(file)) return "deco";
  // Séparateur végétal réutilisé entre les sections du site Côteaux Missisquoi.
  // Il est volontairement muet pour les lecteurs d'écran (alt="").
  if (/^arbres-coteaux-missisquoi(?:-\d+x\d+)?\.png$/.test(file)) return "deco";
  if (/(^|[-_])(logo|icon|icone|ico|badge|spacer|separateur|separator|deco|pattern|bg|arrow|fleche|puce|bullet|star|etoile)([-_.]|$)/.test(file)) return "deco";
  // Icônes de réseaux sociaux (facebook.png, icons8-linkedin.png…) : ce sont
  // des boutons, pas des photos à décrire pour Google Images.
  const stem = file.replace(/\.[a-z0-9]+$/, "").replace(/-\d+x\d+$/, "");
  if (/^(?:icons?\d*[-_])?(?:facebook|fb|instagram|insta|linkedin|tiktok|youtube|twitter|x-twitter|pinterest|whatsapp|messenger|threads|snapchat)(?:[-_]?(?:icon|icone|logo|white|black|blanc|noir|round|circle|square|color|couleur|\d+))*$/.test(stem)) return "deco";
  return "content";
}

// ---------- MODE: page ----------
function analyzePage(url, html, finalUrl, response = {}) {
  const head = html.slice(0, 200000);
  const contentHtml = usefulContentHtml(html);
  // Retours à la ligne et indentation ne comptent pas dans la longueur affichée par Google.
  const squash = value => value == null ? null : value.replace(/\s+/g, " ").trim();
  const title = squash(one(/<title[^>]*>([\s\S]*?)<\/title>/i, head));
  // Balises <meta> lues attribut par attribut : les minificateurs retirent les
  // guillemets (name=description) et une apostrophe (« L'entreprise ») ne doit
  // pas couper la description.
  const metaTags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const metaNamed = key => metaTags.find(tag => (tagAttr(tag, "name") || tagAttr(tag, "property") || "").toLowerCase() === key);
  const descTag = metaNamed("description");
  const desc = descTag ? squash(tagAttr(descTag, "content") ?? "") : null;

  const h1 = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html).map(x => decode(strip(x))).filter(Boolean);
  const h2 = all(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html).map(x => decode(strip(x))).filter(Boolean);
  const headings = [...contentHtml.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)]
    .filter(match => !/\b(?:hidden|aria-hidden\s*=\s*["']?true)|display\s*:\s*none/i.test(match[2] || ""))
    .map(match => ({ level: Number(match[1]), text: decode(strip(match[3])) }));
  const headingCounts = [1, 2, 3, 4, 5, 6].reduce((out, level) => {
    out[level] = headings.filter(item => item.level === level).length;
    return out;
  }, {});
  const emptyHeadings = headings.filter(item => !item.text).map(item => item.level);
  const headingSkips = [];
  let previousHeading = null;
  for (const heading of headings.filter(item => item.text)) {
    if (previousHeading && heading.level > previousHeading.level + 1) {
      headingSkips.push({ from: previousHeading.level, to: heading.level, text: heading.text.slice(0, 100) });
    }
    previousHeading = heading;
  }

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const images = imgs.map(tag => {
    const lazySrc = tagAttr(tag, "data-src") || tagAttr(tag, "data-lazy-src") || tagAttr(tag, "data-original") || tagAttr(tag, "data-litespeed-src");
    const rawSrc = tagAttr(tag, "src");
    const srcset = tagAttr(tag, "data-srcset") || tagAttr(tag, "srcset");
    const srcsetFirst = srcset ? srcset.split(",")[0].trim().split(/\s+/)[0] : "";
    const src = lazySrc || (rawSrc && !rawSrc.startsWith("data:") ? rawSrc : "") || srcsetFirst || rawSrc || "";
    // « <img alt> » sans valeur équivaut à alt="" (image décorative).
    const altValue = tagAttr(tag, "alt") ?? (/\salt(?=[\s/>])/i.test(tag) ? "" : null);
    const file = (src.split("/").pop() || "?").split("?")[0].slice(0, 90);
    const extension = (file.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
    return {
      src,
      file,
      cls: classifyImg(src),
      alt: altValue,   // null = pas d'attribut, "" = vide
      width: tagAttr(tag, "width"),
      height: tagAttr(tag, "height"),
      loading: (tagAttr(tag, "loading") || "").toLowerCase(),
      format: extension || "inconnu",
      modern: /^(?:webp|avif)$/.test(extension),
    };
  });

  const linkTags = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
  const hasRel = (tag, value) => (tagAttr(tag, "rel") || "").toLowerCase().split(/\s+/).includes(value);
  const canonicalRaw = linkTags.find(tag => hasRel(tag, "canonical"));
  const canonicalHref = canonicalRaw ? tagAttr(canonicalRaw, "href") : null;
  let canonical = canonicalHref;
  try { if (canonicalHref) canonical = new URL(canonicalHref, finalUrl).href; } catch { /* signalé par canonicalMatches */ }
  const canonicalMatches = canonical ? cleanComparableUrl(canonical) === cleanComparableUrl(finalUrl) : null;

  // Le verdict d'indexation porte sur Google : une directive réservée à un autre
  // robot (<meta name="bingbot">, « X-Robots-Tag: otherbot: noindex ») ne rend
  // pas la page invisible dans Google.
  const robotsDirectives = metaTags
    .filter(tag => /^(?:robots|googlebot)$/i.test(tagAttr(tag, "name") || ""))
    .map(tag => tagAttr(tag, "content") || "")
    .join(", ")
    .toLowerCase();
  const xRobotsTag = String(response.headers?.xRobotsTag || "").toLowerCase();
  const xRobotsForGoogle = (() => {
    const kept = [];
    let agent = null;
    for (const part of xRobotsTag.split(",")) {
      const prefixed = part.match(/^\s*([a-z0-9_-]+)\s*:\s*(.*)$/i);
      let directive = part.trim();
      if (prefixed && !/^(?:max-snippet|max-image-preview|max-video-preview|unavailable_after)$/i.test(prefixed[1])) {
        agent = prefixed[1].toLowerCase();
        directive = prefixed[2].trim();
      }
      if (!agent || agent === "googlebot") kept.push(directive);
    }
    return kept.join(", ");
  })();
  const allRobotDirectives = `${robotsDirectives}, ${xRobotsForGoogle}`;
  const noindex = /(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(allRobotDirectives);
  const nofollow = /(?:^|[\s,])(?:nofollow|none)(?:[\s,]|$)/i.test(allRobotDirectives);
  // Directives qui interdisent à Google de reprendre un extrait de la page :
  // c'est exactement ce qui exclut des Aperçus IA et du mode IA. « noarchive »
  // n'est PAS inclus (il ne concerne que le cache) et « max-snippet:-1 »
  // signifie « aucune limite », donc n'est pas une restriction.
  const nosnippet = /(?:^|[\s,])nosnippet(?:[\s,]|$)/i.test(allRobotDirectives);
  const maxSnippetZero = /(?:^|[\s,])max-snippet\s*:\s*0(?:[\s,]|$)/i.test(allRobotDirectives);
  const snippetBlocked = nosnippet || maxSnippetZero;

  const hreflang = linkTags
    .filter(tag => hasRel(tag, "alternate") && tagAttr(tag, "hreflang"))
    .map(tag => {
      const href = tagAttr(tag, "href") || "";
      let resolved = href;
      try { resolved = new URL(href, finalUrl).href; } catch { /* conserver la preuve brute */ }
      return { language: tagAttr(tag, "hreflang"), href: resolved };
    });
  const faviconDeclared = linkTags.some(tag => hasRel(tag, "icon") || hasRel(tag, "shortcut") || hasRel(tag, "apple-touch-icon"));

  const iframes = [...html.matchAll(/<iframe\b[^>]*>/gi)].map(match => match[0]);
  const iframeMissingTitle = iframes.filter(tag => !tagAttr(tag, "title")).length;
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => tagAttr(match[0], "src")).filter(Boolean);
  const stylesheets = linkTags.filter(tag => hasRel(tag, "stylesheet")).map(tag => tagAttr(tag, "href")).filter(Boolean);
  const uniqueResource = values => new Set(values.map(value => {
    try { return new URL(value, finalUrl).href; } catch { return value; }
  })).size;
  const resources = {
    scripts: uniqueResource(scripts),
    stylesheets: uniqueResource(stylesheets),
    images: uniqueResource(images.map(image => image.src).filter(Boolean)),
    iframes: iframes.length,
  };
  resources.total = resources.scripts + resources.stylesheets + resources.images + resources.iframes + 1;
  const analytics = [
    /googletagmanager\.com\/gtm\.js|\bGTM-[A-Z0-9]+\b/i.test(html) ? "Google Tag Manager" : null,
    /googletagmanager\.com\/gtag\/js|google-analytics\.com|\bG-[A-Z0-9]{5,}\b/i.test(html) ? "Google Analytics" : null,
    /matomo\.js|piwik\.js/i.test(html) ? "Matomo" : null,
  ].filter(Boolean);

  const ld = all(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, html);
  const schema = inspectStructuredData(ld);
  const schemaTypes = schema.types;
  // Un Winery couvre Organization et LocalBusiness, un BlogPosting couvre Article.
  const schemaCovers = new Set([...schemaTypes, ...(schema.nestedTypes || [])].flatMap(schemaLineage));

  const og = {
    title: !!metaNamed("og:title"),
    desc: !!metaNamed("og:description"),
    image: !!metaNamed("og:image"),
    twitter: !!metaNamed("twitter:card"),
  };

  const origin = new URL(finalUrl).origin;
  const rawHrefs = [...html.matchAll(/<a\b[^>]*>/gi)]
    .map(match => [match[0], tagAttr(match[0], "href")])
    .filter(([, href]) => href)
    .filter(([tag, href]) => {
      // Les hébergeurs injectent parfois un lien-piège invisible qui doit
      // volontairement répondre 403. Ce n'est ni une navigation pour les
      // visiteurs ni un lien que les moteurs doivent suivre.
      const hiddenTrap = tagAttr(tag, "aria-hidden") === "true"
        || (tagAttr(tag, "tabindex") === "-1" && /display\s*:\s*none/i.test(tag));
      return !hiddenTrap && !/\/imunify-bot-check(?:[/?#]|$)/i.test(href);
    })
    .map(([, href]) => href);
  const emails = [...new Set(rawHrefs
    .filter(h => /^mailto:/i.test(h))
    .map(h => h.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase())
    .filter(h => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h)))].slice(0, 8);
  const phones = [...new Set(rawHrefs
    .filter(h => /^tel:/i.test(h))
    .map(h => h.replace(/^tel:/i, "").split("?")[0].trim())
    .filter(Boolean))].slice(0, 8);
  const socials = [...new Set(rawHrefs
    .filter(h => /^https?:\/\//i.test(h) && /(?:facebook|instagram|linkedin|tiktok|youtube)\.com/i.test(h))
    .map(h => h.split("#")[0]))].slice(0, 12);
  const ctas = all(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi, html)
    .map(x => decode(strip(x)).replace(/\s+/g, " ").trim())
    .filter(x => x && /contact|joindre|réserv|reserve|devis|soumission|appel|call|acheter|commander|prendre rendez-vous/i.test(x));
  const links = [...new Set(
    rawHrefs
      .map(h => { try { return new URL(h, finalUrl).href.split("#")[0]; } catch { return null; } })
      .filter(h => h && sameSite(h, origin) && isPagePath(h)
        // Lien de protection d'adresse courriel Cloudflare : décodé par le
        // navigateur, ce n'est pas un lien brisé.
        && !/\/cdn-cgi\//i.test(h))
  )].slice(0, 400);

  const bodyText = decode(strip(usefulContentHtml(html)));
  const keywords = extractKeywords(bodyText);
  const focusKeyword = inferFocusKeyword(title, h1, finalUrl, keywords);
  const focusTokens = topicTokens(focusKeyword);
  const inField = field => {
    if (!focusTokens.length) return false;
    const fieldTokens = new Set(topicTokens(field));
    return focusTokens.every(token => fieldTokens.has(token));
  };
  const pageState = detectPageState(title, h1, html, bodyText);
  const words = bodyText ? bodyText.split(" ").length : 0;
  // Page « coquille » : le HTML reçu ne contient qu'un point de montage vide
  // que le JavaScript remplit dans le navigateur. Googlebot exécute ce
  // JavaScript, mais pas GPTBot, ClaudeBot ni PerplexityBot (étude
  // Vercel/MERJ, déc. 2024) : pour eux la page est vide. Ce n'est donc pas un
  // contenu « trop court », et conseiller d'écrire davantage serait faux.
  const emptyMountPoint = /<div\b[^>]*\bid=["'](?:root|app|__next|__nuxt|___gatsby|svelte)["'][^>]*>\s*<\/div>/i.test(html);
  const noscriptAsksForJs = /<noscript\b[^>]*>(?:(?!<\/noscript>)[\s\S]){0,400}?javascript/i.test(html);
  const jsOnly = pageState.kind === "normal" && words < 50 && headings.length === 0
    && (emptyMountPoint || noscriptAsksForJs);
  const signatureBasis = plain(`${title || ""} ${(h1 || []).join(" ")} ${bodyText}`).slice(0, 24000);

  return {
    url, finalUrl, redirected: finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, ""),
    https: finalUrl.startsWith("https:"),
    title, titleLen: title ? title.length : 0,
    desc, descLen: desc ? desc.length : 0,
    canonical, canonicalMatches,
    viewport: !!metaNamed("viewport"),
    lang: tagAttr(head.match(/<html\b[^>]*>/i)?.[0] || "", "lang") || null,
    h1, h1Count: h1.length, h2Count: h2.length, headings, headingCounts, emptyHeadings, headingSkips,
    images, og, schemaTypes, schema, expectedSchema: inferExpectedSchema(finalUrl, title, h1, bodyText)
      .filter(item => !schemaCovers.has(item.type)),
    isWordPress: /wp-content|wp-json/i.test(html),
    words,
    jsOnly,
    contentSignature: hashText(signatureBasis),
    pageState,
    keywords: keywords.top, focusKeyword,
    keywordAlignment: { title: inField(title), h1: inField(h1.join(" ")), desc: inField(desc) },
    contact: { emails, phones, socials, hasForm: /<form\b/i.test(html), ctas: [...new Set(ctas)].slice(0, 10) },
    sizeKB: Math.round(html.length / 1024),
    indexability: { noindex, nofollow, nosnippet, maxSnippetZero, snippetBlocked, robotsDirectives, xRobotsTag },
    hreflang,
    faviconDeclared,
    iframes: { total: iframes.length, missingTitle: iframeMissingTitle },
    resources,
    analytics: [...new Set(analytics)],
    inlineStyles: (html.match(/\sstyle\s*=\s*["']/gi) || []).length,
    obsoleteElements: (html.match(/<(?:font|center|marquee|frameset|frame)\b/gi) || []).length,
    response: {
      elapsedMs: response.elapsedMs || null,
      contentEncoding: response.headers?.contentEncoding || "",
      contentType: response.headers?.contentType || "",
      cacheControl: response.headers?.cacheControl || "",
    },
    links,
  };
}

// ---------- MODE: discover ----------
function parseRobots(txt) {
  // Découpe en blocs user-agent (les agents groupés partagent les règles).
  // Règle de Google (RFC 9309) : la règle la plus longue qui correspond
  // l'emporte, et à longueur égale « Allow » gagne. « Allow: / » placé avant
  // « Disallow: / » laisse donc le site ouvert.
  const lines = String(txt || "").replace(/^﻿/, "").split(/\r?\n|\r/);
  const groups = {}; // agent(min) -> [{allow, path}]
  let agents = [];
  let sawRule = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const field = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!field) continue;
    const key = field[1].toLowerCase();
    const value = field[2].trim();
    if (key === "user-agent") {
      if (sawRule) { agents = []; sawRule = false; }
      const agent = value.toLowerCase();
      agents.push(agent);
      groups[agent] ??= [];
      continue;
    }
    if (key === "allow" || key === "disallow") {
      sawRule = true;
      if (!value) continue; // « Disallow: » vide = tout est permis
      for (const agent of agents) groups[agent].push({ allow: key === "allow", path: value });
    }
  }
  const patternMatches = (pattern, path) => {
    const anchored = pattern.endsWith("$");
    const body = (anchored ? pattern.slice(0, -1) : pattern)
      .split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp("^" + body + (anchored ? "$" : "")).test(path);
  };
  const specificity = pattern => pattern.replace(/\*/g, "").length;
  const blocks = (list, path) => {
    let best = null;
    for (const rule of list) {
      if (!patternMatches(rule.path, path)) continue;
      const len = specificity(rule.path);
      if (!best || len > best.len || (len === best.len && rule.allow)) best = { len, allow: rule.allow };
    }
    return !!best && !best.allow;
  };
  const rules = {};
  for (const [agent, list] of Object.entries(groups)) {
    const rootBlocked = blocks(list, "/");
    const allowExceptions = list.filter(rule => rule.allow && !patternMatches(rule.path, "/")).map(rule => rule.path);
    const allowPaths = new Set(list.filter(rule => rule.allow).map(rule => rule.path));
    const disallowed = list.filter(rule => !rule.allow && !patternMatches(rule.path, "/") && !allowPaths.has(rule.path))
      .map(rule => rule.path);
    if (rootBlocked && allowExceptions.length) {
      // « Disallow: / » + « Allow: /fr/ » : fermé sauf quelques sections.
      rules[agent] = { disallowAll: false, mentioned: true, partial: ["tout le site sauf " + allowExceptions.slice(0, 5).join(", ")] };
    } else if (!rootBlocked && blocks(list, "/paparmane-exemple/page")) {
      // « Allow: /$ » + « Disallow: / » : seule la page d'accueil reste ouverte.
      rules[agent] = { disallowAll: false, mentioned: true, partial: ["tout le site sauf la page d'accueil"] };
    } else {
      rules[agent] = { disallowAll: rootBlocked, mentioned: true, partial: rootBlocked ? [] : [...new Set(disallowed)] };
    }
  }
  return rules;
}

// Balise XML avec ou sans préfixe d'espace de noms (<loc>, <sm:loc>).
const xmlLocs = body => [...String(body).matchAll(/<(?:[\w-]+:)?loc\b[^>]*>\s*(?:<!\[CDATA\[)?\s*([\s\S]*?)\s*(?:\]\]>)?\s*<\/(?:[\w-]+:)?loc>/gi)]
  .map(match => decode(match[1].trim()))
  .filter(Boolean);

// Signatures propres aux pages de vérification anti-robot servies À LA PLACE du
// contenu (Cloudflare, SiteGround, Sucuri, Wordfence, Imperva…). Les simples noms
// de fournisseurs sont exclus : Cloudflare, Imperva ou Wordfence injectent leurs
// scripts dans toutes les pages ordinaires, y compris une vraie page 404.
const CHALLENGE_MARKERS = /<title>\s*just a moment|cf_chl_|__cf_chl|orchestrate\/chl_page|checking your browser before accessing|verifying you are human|verify (?:that )?you are (?:a )?human|please wait while your request is being verified|sgcaptcha|sucuri website firewall|generated by wordfence|your access to this site has been limited|incapsula incident id|bot verification|v[ée]rification humaine|prouvez que vous (?:êtes|n'êtes pas) (?:un )?(?:humain|robot)/i;

function looksLikeChallenge(r) {
  if (r.headers?.cfMitigated) return true;
  const head = String(r.body || "").slice(0, 8000);
  if (!/<html|<!doctype|<body|<head|<title/i.test(head)) return false;
  return CHALLENGE_MARKERS.test(head);
}

// Sitemap au format texte (sitemaps.org) : une adresse par ligne, rien d'autre.
function textSitemapUrls(body) {
  const lines = String(body).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length || lines.length > 50000) return null;
  return lines.every(l => /^https?:\/\/\S+$/i.test(l)) ? lines : null;
}

// Lit un sitemap et qualifie la réponse. « outcome » :
//   found          sitemap lu (index, liste XML ou liste texte)
//   missing        404 ou 410 : preuve d'absence à cette adresse
//   not-xml        page ordinaire servie à la place, à cette adresse ou à la racine
//   invalid        adresse inutilisable (réseau interne, protocole inconnu)
//   unreachable    hôte inexistant ou interdit : l'adresse ne mène nulle part
//   redirect-loop  redirections épuisées ou sans destination
//   blocked        401/403/406/429/451 : pare-feu, rien n'est prouvé
//   challenge      page de vérification anti-robot, rien n'est prouvé
//   interstitial   redirigé vers une page intermédiaire, rien n'est prouvé
//   empty          réponse 2xx vide, rien n'est prouvé
//   timeout        pas de réponse dans le délai, rien n'est prouvé
//   server-error   5xx, rien n'est prouvé
//   error          autre erreur réseau (TLS, connexion coupée), rien n'est prouvé
// Seuls les cinq premiers cas hors « found » autorisent à conclure « pas de sitemap ici ».
const SITEMAP_ABSENT_OUTCOMES = new Set(["missing", "not-xml", "invalid", "unreachable", "redirect-loop"]);
async function readSitemap(url, origin, { timeout = FETCH_TIMEOUT } = {}) {
  const base = { url, finalUrl: url, pages: [], sitemaps: [], locs: [], found: false, status: 0 };
  if (!isSafeUrl(url)) return { ...base, outcome: "invalid" };
  const r = await grab(url, { timeout });
  const status = r.status || 0;
  const finalUrl = cleanAuditUrl(r.finalUrl || url);
  const retryAfter = r.headers?.retryAfter || "";
  if (!r.ok || !status) {
    const outcome = r.timedOut ? "timeout" : /non publique ou introuvable/i.test(r.error || "") ? "unreachable" : "error";
    return { ...base, finalUrl, outcome, error: r.error || "" };
  }
  const body = r.body || "";
  const keep = list => [...new Set(list.filter(l => sameSiteLoose(l, origin) && isPagePath(l)))].slice(0, MAX_SITEMAP_URLS);
  if (status >= 200 && status < 300) {
    if (/<(?:[\w-]+:)?(urlset|sitemapindex)\b/i.test(body)) {
      const locs = xmlLocs(body);
      if (/<(?:[\w-]+:)?sitemapindex\b/i.test(body)) {
        return { ...base, finalUrl, status, found: true, outcome: "found", kind: "index",
          sitemaps: [...new Set(locs.filter(isSafeUrl))].slice(0, MAX_SITEMAP_URLS) };
      }
      return { ...base, finalUrl, status, found: true, outcome: "found", kind: "urlset", listed: locs.length, locs: locs.slice(0, MAX_SITEMAP_URLS * 2), pages: keep(locs) };
    }
    const textUrls = /<html|<!doctype/i.test(body.slice(0, 300)) ? null : textSitemapUrls(body);
    if (textUrls) return { ...base, finalUrl, status, found: true, outcome: "found", kind: "text", listed: textUrls.length, locs: textUrls.slice(0, MAX_SITEMAP_URLS * 2), pages: keep(textUrls) };
    if (!body.trim()) return { ...base, finalUrl, status, outcome: "empty" };
    if (looksLikeChallenge(r)) return { ...base, finalUrl, status, outcome: "challenge", retryAfter };
    // Redirigé vers une autre page que la racine (ex. /.well-known/sgcaptcha/) :
    // page intermédiaire d'un pare-feu, rien n'est prouvé. Vers la racine : le
    // site renvoie son accueil pour toute adresse inconnue, il n'y a rien ici.
    try {
      const from = new URL(url), to = new URL(finalUrl);
      if (to.pathname !== from.pathname && to.pathname !== "/" && !/sitemap/i.test(to.pathname)) return { ...base, finalUrl, status, outcome: "interstitial" };
    } catch { /* garder not-xml */ }
    return { ...base, finalUrl, status, outcome: "not-xml" };
  }
  // Une page de vérification n'est jamais servie en 404 : ce statut prouve l'absence.
  if (status === 404 || status === 410) return { ...base, finalUrl, status, outcome: "missing" };
  if (looksLikeChallenge(r)) return { ...base, finalUrl, status, outcome: "challenge", retryAfter };
  if ([401, 403, 406, 429, 451].includes(status)) return { ...base, finalUrl, status, outcome: "blocked", retryAfter };
  if (status >= 500) return { ...base, finalUrl, status, outcome: "server-error", retryAfter };
  if (status >= 300 && status < 400) return { ...base, finalUrl, status, outcome: "redirect-loop" };
  return { ...base, finalUrl, status, outcome: "error" };
}

// Budget total d'un appel : la fonction Netlify est coupée au bout d'environ
// 10 secondes, avec une erreur brute au lieu d'un message clair.
const CALL_BUDGET = 8500;
const remaining = deadline => Math.max(0, deadline - Date.now());

async function discover(site) {
  const deadline = Date.now() + CALL_BUDGET;
  const typedOrigin = new URL(site).origin;
  let origin = typedOrigin;
  const out = { origin, pages: [], robots: null, aiBots: [], llms: null, sitemapFound: false, sitemapProbes: [] };

  // 1. Tout part en parallèle dès la première milliseconde : accueil, robots.txt,
  // favicon, page 404, llms.txt et /sitemap.xml. Attendre l'accueil avant le
  // reste laissait parfois moins d'une seconde au sitemap d'un serveur lent,
  // qui passait alors pour absent. Les redirections (www, https) sont suivies
  // requête par requête : l'adresse saisie suffit pour lancer les lectures.
  let probe404 = typedOrigin + "/paparmane-audit-" + hashText(typedOrigin) + "-page-inexistante/";
  const SITEMAP_RESERVE = 3000; // budget gardé pour la seconde vague de sitemaps
  const step = () => Math.max(1500, Math.min(FETCH_TIMEOUT, remaining(deadline) - SITEMAP_RESERVE));
  let [home, rb, favicon, missing, lm, firstSitemap] = await Promise.all([
    grab(typedOrigin + "/", { asText: false, timeout: step() }),
    grab(typedOrigin + "/robots.txt", { timeout: step() }),
    grab(typedOrigin + "/favicon.ico", { asText: false, timeout: step() }),
    grab(probe404, { asText: false, timeout: step() }),
    grab(typedOrigin + "/llms.txt", { timeout: step() }),
    readSitemap(typedOrigin + "/sitemap.xml", typedOrigin, { timeout: step() }),
  ]);
  // Adresse officielle du site : si « ex.com » redirige vers « www.ex.com »,
  // c'est cette dernière que le sitemap et les liens utilisent. Sans cela, tout
  // le sitemap était filtré et l'audit se réduisait à la page d'accueil.
  if (home.ok && home.status < 400) {
    try {
      const landed = new URL(home.finalUrl);
      const bareHost = host => host.replace(/^www\./i, "").toLowerCase();
      if (landed.origin !== origin && bareHost(landed.hostname) === bareHost(new URL(origin).hostname) && isSafeUrl(landed.origin)) origin = landed.origin;
    } catch { /* garder l'adresse saisie */ }
  }
  out.origin = origin;
  // Redirection d'apex qui perd le chemin (redirecteur de registraire vers
  // https://www.site/) : les réponses ont atterri ailleurs que sur le fichier
  // demandé. On relit alors ces fichiers sur l'adresse officielle, sinon
  // robots.txt passait pour absent et la page 404 pour une redirection.
  const pathOf = value => { try { return new URL(value).pathname; } catch { return ""; } };
  const lostPath = (r, path) => origin !== typedOrigin && !!r.finalUrl && pathOf(r.finalUrl) !== path;
  if (lostPath(rb, "/robots.txt") || lostPath(favicon, "/favicon.ico") || lostPath(missing, pathOf(probe404)) || lostPath(lm, "/llms.txt")) {
    const again = () => Math.max(1000, Math.min(FETCH_TIMEOUT, remaining(deadline) - 2000));
    probe404 = origin + "/paparmane-audit-" + hashText(origin) + "-page-inexistante/";
    [rb, favicon, missing, lm] = await Promise.all([
      grab(origin + "/robots.txt", { timeout: again() }),
      grab(origin + "/favicon.ico", { asText: false, timeout: again() }),
      grab(probe404, { asText: false, timeout: again() }),
      grab(origin + "/llms.txt", { timeout: again() }),
    ]);
  }
  const robotsTxt = rb.ok && rb.status === 200 && !/<html/i.test(rb.body.slice(0, 300)) ? rb.body : "";
  const rules = robotsTxt ? parseRobots(robotsTxt) : {};
  const wildcard = rules["*"];
  // Une règle nommée l'emporte sur « * », dans un sens comme dans l'autre :
  // « User-agent: Googlebot / Disallow: / » ferme Google même si « * » est
  // ouvert, et un site fermé à tous sauf Googlebot reste visible dans Google.
  const engines = SEARCH_ENGINES.map(([agent, role, cost]) => {
    const r = rules[agent.toLowerCase()];
    return { agent, role, cost, blocked: r ? r.disallowAll : !!wildcard?.disallowAll, via: r ? "nomme" : "general" };
  });
  // robots.txt illisible (délai, pare-feu, page anti-robot, erreur serveur) :
  // ce n'est pas un fichier absent. Le rapport le dit au lieu de supposer
  // « aucune règle » et de présenter tous les robots comme autorisés.
  const robotsUnverifiable = robotsTxt ? null
    : (!rb.ok || !rb.status) ? (rb.timedOut ? "timeout" : "error")
    : (rb.status === 404 || rb.status === 410) ? null
    : looksLikeChallenge(rb) ? "challenge"
    : [401, 403, 406, 429, 451].includes(rb.status) ? "blocked"
    : rb.status >= 500 ? "server-error" : null;
  out.robots = {
    exists: !!robotsTxt,
    status: rb.status || 0,
    ...(robotsUnverifiable ? { unverifiable: robotsUnverifiable } : {}),
    // Google est le moteur visé par l'audit : son blocage fait tomber l'indexation.
    searchBlocked: engines[0].blocked,
    wildcardBlocked: !!wildcard?.disallowAll,
    engines,
  };
  out.aiBots = AI_BOTS.map(([agent, role, cost]) => {
    const r = rules[agent.toLowerCase()];
    // Une règle nommée l'emporte toujours sur la règle générale « * ».
    if (r) return { agent, role, cost, state: r.disallowAll ? "blocked" : "allowed", via: "nomme", partial: r.disallowAll ? [] : r.partial.slice(0, 10) };
    // Sans règle nommée, le robot hérite de « User-agent: * ». Sans ce repli,
    // un site entièrement bloqué était présenté comme ouvert à toutes les IA.
    if (wildcard?.disallowAll) return { agent, role, cost, state: "blocked", via: "general" };
    return { agent, role, cost, state: "default", via: null };
  });

  // Un favicon peut être déclaré dans le HTML ou servi implicitement à la
  // racine. Ce second cas évite un faux positif dans le rapport client.
  // Certains serveurs l'envoient en « application/octet-stream ».
  out.favicon = {
    fallbackExists: !!(favicon.ok && favicon.status === 200 && /^(?:image\/|application\/octet-stream)/i.test(favicon.headers?.contentType || "")),
  };
  // Une adresse inventée DOIT répondre 404 (ou 410). Un site qui répond 200 dit
  // à Google que toutes les adresses existent : pages fantômes à l'infini.
  const finalMissing = cleanAuditUrl(missing.finalUrl || probe404);
  out.notFound = {
    probe: probe404,
    status: missing.status,
    finalUrl: finalMissing,
    correct: missing.status === 404 || missing.status === 410,
    redirectsHome: missing.status > 0 && missing.status < 400
      && finalMissing.replace(/\/$/, "") === origin.replace(/\/$/, ""),
    softOk: missing.status >= 200 && missing.status < 300,
    unreachable: missing.status === 0,
  };

  // 2. Sitemaps. Première vague : /sitemap.xml, déjà lu ci-dessus (Yoast et
  // Rank Math y redirigent vers sitemap_index.xml). Seconde vague, en parallèle,
  // seulement s'il n'a rien donné : les adresses déclarées dans robots.txt
  // (lignes commentées exclues, adresses relatives résolues), puis les
  // emplacements habituels : sitemap_index.xml (Yoast, Rank Math),
  // wp-sitemap.xml (WordPress natif), sitemaps.xml (SEOPress).
  const declared = robotsTxt.split(/\r?\n|\r/)
    .map(line => line.replace(/#.*$/, "").match(/^\s*sitemap\s*:\s*(\S+)/i)?.[1])
    .filter(Boolean)
    .map(value => { try { return new URL(value, origin).href; } catch { return null; } })
    .filter(Boolean);
  const defaults = [origin + "/sitemap_index.xml", origin + "/wp-sitemap.xml", origin + "/sitemaps.xml"];
  // L'accueil a redirigé vers www (ou l'inverse) : /sitemap.xml n'a été lu que sur
  // l'adresse saisie, il faut aussi l'essayer sur l'adresse officielle.
  if (origin !== typedOrigin) defaults.unshift(origin + "/sitemap.xml");
  const pages = new Set();
  const sitemapQueue = [];
  const probes = [firstSitemap];
  const probedUrls = new Set([firstSitemap.url]);
  const absorb = parsed => {
    if (!parsed.found) return;
    out.sitemapFound = true;
    out.sitemapUrl ??= parsed.finalUrl;
    // Filtre avec l'adresse officielle (connue seulement après la première vague),
    // pas avec l'adresse saisie : « http://site » redirigé vers https gardait
    // un sitemap « trouvé » dont toutes les pages étaient écartées.
    for (const l of (parsed.locs?.length ? parsed.locs : parsed.pages)) if (sameSiteLoose(l, origin) && isPagePath(l)) pages.add(l);
    sitemapQueue.push(...parsed.sitemaps);
  };
  absorb(firstSitemap);
  // /sitemap.xml a redirigé vers une adresse candidate (Yoast → sitemap_index.xml) :
  // le résultat vaut pour elle, on l'inscrit sous son propre nom pour le rapport
  // et pour la seconde tentative.
  if (firstSitemap.finalUrl !== firstSitemap.url && [...declared, ...defaults].includes(firstSitemap.finalUrl)) {
    probes.push({ ...firstSitemap, url: firstSitemap.finalUrl, via: firstSitemap.url });
    probedUrls.add(firstSitemap.finalUrl);
  }
  const candidates = [...new Set([...declared, ...defaults])].filter(u => !probedUrls.has(u));
  let skipped = [];
  if (!out.sitemapFound && candidates.length) {
    const wave = candidates.slice(0, 5);
    skipped = candidates.slice(5);
    if (remaining(deadline) > 800) {
      const results = await Promise.all(wave.map(sm => readSitemap(sm, origin, { timeout: Math.max(500, remaining(deadline) - 200) })));
      for (const parsed of results) { probes.push(parsed); probedUrls.add(parsed.url); absorb(parsed); }
    } else skipped = candidates; // budget épuisé : le client réessaiera avec un appel dédié
  } else if (out.sitemapFound) {
    // Sitemap trouvé, mais robots.txt en déclare d'autres (blogue, langue,
    // actualités) : le client les lit un à un avec un budget neuf.
    sitemapQueue.push(...declared.filter(u => !probedUrls.has(u) && u !== out.sitemapUrl));
  }
  out.sitemapProbes = probes.map(p => ({ url: p.url, finalUrl: p.finalUrl, status: p.status, outcome: p.outcome, ...(p.via ? { via: p.via } : {}) }));
  out.sitemapDeclared = declared;
  // Adresses annoncées par robots.txt qui ne mènent à rien : signalé même quand
  // un autre sitemap existe, Google les demande pour rien.
  out.sitemapDeclaredMissing = declared.filter(d => probes.some(p => p.url === d && SITEMAP_ABSENT_OUTCOMES.has(p.outcome)));
  if (!out.sitemapFound) {
    // Rien de lu. « Absent » ne se conclut que si CHAQUE adresse essayée a
    // répondu introuvable (ou par une page ordinaire). Un délai, une erreur
    // serveur ou un pare-feu ne prouvent rien : le client réessaie ces
    // adresses avec un budget neuf, puis le rapport dit « non vérifiable ».
    const inconclusive = probes.filter(p => !SITEMAP_ABSENT_OUTCOMES.has(p.outcome));
    // Les adresses déclarées dans robots.txt d'abord : c'est la parole du site,
    // et sitemap_index.xml répond sans la redirection qui double le délai de /sitemap.xml.
    const retryOrder = url => declared.includes(url) ? 0 : /\/sitemap\.xml$/.test(url) ? 2 : 1;
    out.sitemapRetry = [...new Set([...inconclusive.map(p => p.url), ...skipped])].sort((x, y) => retryOrder(x) - retryOrder(y)).slice(0, 6);
    const blocked = inconclusive.find(p => p.outcome === "blocked" || p.outcome === "challenge");
    if (blocked) { out.sitemapBlocked = blocked.status; out.sitemapBlockedKind = blocked.outcome; }
    else if (inconclusive.length) out.sitemapUnverifiable = inconclusive[0].outcome;
    else if (skipped.length) out.sitemapUnverifiable = "budget";
  }
  if (!pages.size) pages.add(origin + "/"); // repli : on partira de l'accueil (BFS côté client)
  out.pages = [...pages];
  out.sitemapQueue = [...new Set(sitemapQueue)];

  // 3. llms.txt
  const isReal = lm.ok && lm.status === 200 && !/<html|<!doctype/i.test(lm.body.slice(0, 300)) && lm.body.trim().length > 40;
  out.llms = { exists: isReal };
  if (isReal) {
    const links = [...new Set(all(/\((https?:\/\/[^\)\s]+)\)/g, lm.body).filter(u => sameSite(u, origin)))].slice(0, 25);
    const prices = (lm.body.match(/\$\s?\d[\d\s,.]*|\d[\d\s,.]*\s?\$/g) || []).length;
    out.llms.lines = lm.body.split("\n").length;
    out.llms.links = links;
    out.llms.prices = prices;
  }
  return out;
}

// ---------- MODE: verify ----------
async function verify(urls) {
  // Cinq vérifications à la fois, dans le budget d'un appel : quinze liens
  // lus l'un après l'autre pouvaient dépasser la limite de la fonction.
  const deadline = Date.now() + CALL_BUDGET;
  const list = urls.slice(0, MAX_VERIFY);
  const results = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const index = next++;
      const u = list[index];
      if (!isSafeUrl(u) || remaining(deadline) < 600) { results[index] = { url: u, status: 0, finalUrl: u, redirected: false }; continue; }
      const r = await grab(u, { asText: false, timeout: Math.min(6000, remaining(deadline)) });
      results[index] = { url: u, status: r.status, finalUrl: r.finalUrl, redirected: r.redirected || r.finalUrl.replace(/\/$/, "") !== u.replace(/\/$/, "") };
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return results;
}

// ---------- INTELLIGENCE EXTERNE (DataForSEO, identifiants serveur seulement) ----------
async function dataForSeoPost(path, taskBody, authorization, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.dataforseo.com" + path, {
      method: "POST",
      headers: { "Authorization": authorization, "Content-Type": "application/json" },
      body: JSON.stringify([taskBody]),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    const task = payload.tasks?.[0] || null;
    if (!res.ok || payload.status_code !== 20000 || (task && task.status_code !== 20000)) {
      const error = new Error(task?.status_message || payload.status_message || `Erreur ${res.status}`);
      error.reason = res.status === 401 || res.status === 403 ? "provider_unauthorized" : "provider_error";
      error.providerCostUsd = payload.cost ?? task?.cost ?? 0;
      throw error;
    }
    return {
      result: task?.result?.[0] || null,
      providerCostUsd: Number(payload.cost ?? task?.cost ?? 0) || 0,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("La source a dépassé le délai de réponse.");
      timeoutError.reason = "provider_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function unavailableProviderResult(error) {
  const paymentRequired = /payment required|insufficient balance|not enough funds/i.test(error?.message || "");
  return {
    available: false,
    reason: paymentRequired ? "provider_payment_required" : error?.reason || "provider_error",
    error: paymentRequired ? "Solde DataForSEO insuffisant — ajouter des crédits API." : error?.message || "La source DataForSEO a retourné une erreur.",
    providerCostUsd: Number(error?.providerCostUsd || 0),
  };
}

// Codes de marché DataForSEO = 2000 + code pays ISO 3166 numérique.
// « 2854 · ar » devient « Burkina Faso · arabe ».
const MARKET_NAMES = {
  124: "Canada", 840: "États-Unis", 250: "France", 56: "Belgique", 756: "Suisse", 442: "Luxembourg",
  492: "Monaco", 504: "Maroc", 12: "Algérie", 788: "Tunisie", 384: "Côte d'Ivoire", 686: "Sénégal",
  854: "Burkina Faso", 466: "Mali", 120: "Cameroun", 180: "RD Congo", 178: "Congo", 204: "Bénin",
  768: "Togo", 562: "Niger", 324: "Guinée", 450: "Madagascar", 332: "Haïti", 826: "Royaume-Uni",
  36: "Australie", 484: "Mexique", 276: "Allemagne", 724: "Espagne", 380: "Italie", 76: "Brésil",
  818: "Égypte", 682: "Arabie saoudite", 784: "Émirats arabes unis", 422: "Liban", 356: "Inde",
};
const LANGUAGE_NAMES = { fr: "français", en: "anglais", ar: "arabe", es: "espagnol", de: "allemand", it: "italien", pt: "portugais", nl: "néerlandais" };
function marketName(code) {
  const n = Number(code);
  if (Number.isFinite(n) && n > 2000) return MARKET_NAMES[n - 2000] || "autre marché";
  return code ? String(code) : "Portée DataForSEO";
}

// Un même marché peut couvrir plusieurs langues (Canada : français ET anglais).
// Semrush et Ahrefs comptent toutes les langues d'un pays ensemble ; DataForSEO
// sépare chaque langue. Interroger le français seul faisait disparaître les
// recherches en anglais, souvent la majorité (nom de marque en anglais, pages
// /en) : 2 visites estimées là où Semrush en voyait plus de 100.
const parseLanguages = value => [...new Set(String(value || "fr").split(/[,\s]+/).map(l => l.trim().toLowerCase()).filter(l => /^[a-z]{2}$/.test(l)))].slice(0, 3);

// Appelle le même point d'accès pour chaque langue et fusionne les résultats
// bruts. Une langue en erreur n'efface pas les autres ; si toutes échouent,
// la première erreur remonte comme avant.
async function perLanguage(languages, path, bodyFor, authorization, merge, timeoutMs) {
  const settled = await Promise.allSettled(languages.map(language => dataForSeoPost(path, bodyFor(language), authorization, timeoutMs)));
  const ok = settled.filter(s => s.status === "fulfilled").map(s => s.value);
  const covered = languages.filter((_, i) => settled[i].status === "fulfilled");
  const cost = settled.reduce((sum, s) => sum + Number((s.status === "fulfilled" ? s.value.providerCostUsd : s.reason?.providerCostUsd) || 0), 0);
  if (!ok.length) { const error = settled[0].reason; if (error) error.providerCostUsd = cost; throw error; }
  const results = ok.map(v => v.result).filter(Boolean);
  return { result: results.length ? (results.length === 1 ? results[0] : merge(results)) : null, providerCostUsd: cost, languages: covered };
}

const num = v => Number(v) || 0;
function sumMetrics(list) {
  const out = {};
  for (const m of list) for (const [k, v] of Object.entries(m || {})) if (typeof v === "number") out[k] = (out[k] || 0) + v;
  return out;
}
const mergeTraffic = results => {
  const items = results.map(r => r.items?.[0] || r);
  return { items: [{ metrics: {
    organic: sumMetrics(items.map(i => i.metrics?.organic || i.organic)),
    paid: sumMetrics(items.map(i => i.metrics?.paid || i.paid)),
  } }] };
};
const mergeRanked = results => {
  const byKeyword = new Map();
  for (const r of results) for (const item of r.items || []) {
    const key = (item.keyword_data?.keyword || item.keyword || "").toLowerCase();
    const prev = byKeyword.get(key);
    if (!prev || num(item.ranked_serp_element?.serp_item?.etv) > num(prev.ranked_serp_element?.serp_item?.etv)) byKeyword.set(key, item);
  }
  const items = [...byKeyword.values()].sort((a, b) => num(b.keyword_data?.keyword_info?.search_volume) - num(a.keyword_data?.keyword_info?.search_volume));
  return { total_count: results.reduce((s, r) => s + num(r.total_count), 0), items };
};
const mergeCompetitors = results => {
  const byDomain = new Map();
  for (const r of results) for (const item of r.items || []) {
    const prev = byDomain.get(item.domain);
    if (!prev) { byDomain.set(item.domain, JSON.parse(JSON.stringify(item))); continue; }
    // Les chevauchements et le trafic partagé s'additionnent d'une langue à
    // l'autre ; la taille totale du concurrent aussi, chaque langue étant un
    // sous-ensemble distinct de ses mots-clés au Canada.
    const total = num(prev.intersections) + num(item.intersections);
    if (prev.avg_position != null && item.avg_position != null && total) prev.avg_position = (num(prev.avg_position) * num(prev.intersections) + num(item.avg_position) * num(item.intersections)) / total;
    prev.intersections = total;
    for (const block of ["metrics", "competitor_metrics", "full_domain_metrics"]) {
      prev[block] ??= {};
      for (const kind of ["organic", "paid"]) prev[block][kind] = sumMetrics([prev[block]?.[kind], item[block]?.[kind]]);
    }
  }
  const items = [...byDomain.values()].sort((a, b) => num(b.intersections) - num(a.intersections));
  return { total_count: Math.max(...results.map(r => num(r.total_count))), items };
};
const mergePages = results => {
  const byPage = new Map();
  for (const r of results) for (const item of r.items || []) {
    const prev = byPage.get(item.page_address);
    if (!prev) { byPage.set(item.page_address, JSON.parse(JSON.stringify(item))); continue; }
    prev.metrics ??= {};
    prev.metrics.organic = sumMetrics([prev.metrics.organic, item.metrics?.organic]);
  }
  const items = [...byPage.values()].sort((a, b) => num(b.metrics?.organic?.etv) - num(a.metrics?.organic?.etv));
  return { total_count: results.reduce((s, r) => s + num(r.total_count), 0), items };
};

async function externalIntelligence(site, location = "Canada", language = "fr") {
  const languages = parseLanguages(language);
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return {
    configured: false,
    available: false,
    reason: "provider_credentials_missing",
    source: "DataForSEO",
    error: "Les identifiants DataForSEO ne sont pas configurés sur le serveur.",
  };
  const target = new URL(site).hostname.replace(/^www\./, "");
  const authorization = "Basic " + btoa(`${login}:${password}`);

  const requests = await Promise.allSettled([
    perLanguage(languages, "/v3/dataforseo_labs/google/bulk_traffic_estimation/live", lang => ({
      targets: [target], location_name: location, language_code: lang,
      item_types: ["organic", "paid", "featured_snippet", "local_pack"],
    }), authorization, mergeTraffic),
    perLanguage(languages, "/v3/dataforseo_labs/google/ranked_keywords/live", lang => ({
      target, location_name: location, language_code: lang,
      item_types: ["organic", "featured_snippet", "local_pack"],
      ignore_synonyms: true,
      limit: 20,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }), authorization, mergeRanked),
    dataForSeoPost("/v3/backlinks/summary/live", {
      target,
      include_subdomains: true,
      include_indirect_links: true,
      exclude_internal_backlinks: true,
      backlinks_status_type: "live",
      rank_scale: "one_hundred",
      internal_list_limit: 10,
    }, authorization),
    // Une requête sans plateforme renvoie les plateformes prises en charge.
    // DataForSEO limite actuellement ChatGPT aux États-Unis et à l'anglais :
    // cette portée est exposée clairement dans le rapport, jamais confondue
    // avec l'indice technique de préparation IA calculé par Paparmane.
    dataForSeoPost("/v3/ai_optimization/llm_mentions/target_metrics_lite/live", {
      target: [{
        domain: target,
        search_filter: "include",
        search_scope: ["any"],
        include_subdomains: true,
      }],
      limit: 20,
    }, authorization),
    perLanguage(languages, "/v3/dataforseo_labs/google/competitors_domain/live", lang => ({
      target,
      location_name: location,
      language_code: lang,
      item_types: ["organic", "paid"],
      exclude_top_domains: true,
      ignore_synonyms: true,
      limit: 10,
    }), authorization, mergeCompetitors),
    perLanguage(languages, "/v3/dataforseo_labs/google/relevant_pages/live", lang => ({
      target,
      location_name: location,
      language_code: lang,
      item_types: ["organic", "featured_snippet", "local_pack"],
      historical_serp_mode: "live",
      ignore_synonyms: true,
      limit: 10,
      order_by: ["metrics.organic.etv,desc"],
    }), authorization, mergePages),
  ]);

  // Listes détaillées : les 100 domaines référents et les 100 backlinks les plus
  // forts (un lien par domaine, sinon un seul annuaire remplit tout le tableau).
  const [refDomainsRequest, backlinkListRequest] = await Promise.allSettled([
    dataForSeoPost("/v3/backlinks/referring_domains/live", {
      target,
      include_subdomains: true,
      include_indirect_links: true,
      exclude_internal_backlinks: true,
      backlinks_status_type: "live",
      rank_scale: "one_hundred",
      order_by: ["rank,desc"],
      limit: 100,
    }, authorization),
    dataForSeoPost("/v3/backlinks/backlinks/live", {
      target,
      mode: "one_per_domain",
      include_subdomains: true,
      include_indirect_links: true,
      exclude_internal_backlinks: true,
      backlinks_status_type: "live",
      rank_scale: "one_hundred",
      order_by: ["domain_from_rank,desc"],
      limit: 100,
    }, authorization),
  ]);
  const [trafficRequest, keywordRequest, backlinkRequest, aiRequest, competitorRequest, topPagesRequest] = requests;
  let traffic = trafficRequest.status === "fulfilled" ? trafficRequest.value : unavailableProviderResult(trafficRequest.reason);
  let strategicKeywords = keywordRequest.status === "fulfilled" ? keywordRequest.value : unavailableProviderResult(keywordRequest.reason);
  let backlinks = backlinkRequest.status === "fulfilled" ? backlinkRequest.value : unavailableProviderResult(backlinkRequest.reason);
  let aiMentions = aiRequest.status === "fulfilled" ? aiRequest.value : unavailableProviderResult(aiRequest.reason);
  let competitors = competitorRequest.status === "fulfilled" ? competitorRequest.value : unavailableProviderResult(competitorRequest.reason);
  let topPages = topPagesRequest.status === "fulfilled" ? topPagesRequest.value : unavailableProviderResult(topPagesRequest.reason);

  // Langues réellement mesurées : si l'anglais échoue, le rapport ne doit pas
  // prétendre l'avoir compté.
  const coveredLanguages = trafficRequest.status === "fulfilled" ? trafficRequest.value.languages || languages : languages;
  if (traffic.result) {
    const item = traffic.result.items?.[0] || traffic.result;
    const organic = item.metrics?.organic || item.organic || {};
    const paid = item.metrics?.paid || item.paid || {};
    traffic = {
      available: true,
      organic: Math.round(organic.etv ?? organic.estimated_traffic_volume ?? item.organic_etv ?? 0),
      paid: Math.round(paid.etv ?? paid.estimated_traffic_volume ?? item.paid_etv ?? 0),
      organicKeywords: organic.count ?? item.organic_count ?? null,
      paidKeywords: paid.count ?? item.paid_count ?? null,
      estimated: true,
      providerCostUsd: traffic.providerCostUsd,
    };
  } else if (traffic.available !== false) {
    traffic = { available: false, reason: "no_data", error: "Aucune estimation disponible pour ce domaine.", providerCostUsd: traffic.providerCostUsd };
  }

  if (strategicKeywords.result) {
    const items = Array.isArray(strategicKeywords.result.items) ? strategicKeywords.result.items : [];
    strategicKeywords = {
      available: true,
      totalCount: strategicKeywords.result.total_count ?? items.length,
      items: items.map(entry => {
        const keyword = entry.keyword_data || {};
        const info = keyword.keyword_info || {};
        const serp = entry.ranked_serp_element?.serp_item || {};
        return {
          keyword: keyword.keyword || entry.keyword || "",
          searchVolume: Math.round(info.search_volume ?? 0),
          cpc: info.cpc ?? null,
          competition: info.competition ?? null,
          rank: serp.rank_group ?? serp.rank_absolute ?? null,
          url: serp.url || serp.relative_url || "",
          estimatedVisits: Math.round(serp.etv ?? 0),
        };
      }).filter(item => item.keyword).slice(0, 20),
      providerCostUsd: strategicKeywords.providerCostUsd,
    };
  } else if (strategicKeywords.available !== false) {
    strategicKeywords = { available: true, totalCount: 0, items: [], providerCostUsd: strategicKeywords.providerCostUsd };
  }

  // Domaines référents et backlinks détaillés. Une liste en erreur n'empêche
  // pas le résumé ; elle est simplement absente du rapport.
  const listCost = [refDomainsRequest, backlinkListRequest].reduce((sum, r) => sum + Number((r.status === "fulfilled" ? r.value.providerCostUsd : r.reason?.providerCostUsd) || 0), 0);
  const cleanUrl = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };
  const referringDomainList = refDomainsRequest.status === "fulfilled" && Array.isArray(refDomainsRequest.value.result?.items)
    ? refDomainsRequest.value.result.items.map(d => ({
      domain: String(d.domain || ""),
      rank: d.rank ?? null,
      backlinks: Number(d.backlinks || 0),
      // Champ absent selon la version de l'API : on n'invente pas de chiffre.
      nofollow: d.backlinks_nofollow ?? d.referring_links_attributes?.nofollow ?? null,
      spamScore: d.backlinks_spam_score ?? null,
      firstSeen: String(d.first_seen || "").slice(0, 10),
    })).filter(d => d.domain)
    : null;
  const backlinkList = backlinkListRequest.status === "fulfilled" && Array.isArray(backlinkListRequest.value.result?.items)
    ? backlinkListRequest.value.result.items.map(b => ({
      from: cleanUrl(b.url_from),
      domainFrom: String(b.domain_from || ""),
      to: cleanUrl(b.url_to),
      anchor: String(b.anchor || "").slice(0, 160),
      dofollow: b.dofollow !== false,
      domainRank: b.domain_from_rank ?? null,
      type: String(b.item_type || ""),
      firstSeen: String(b.first_seen || "").slice(0, 10),
    })).filter(b => b.from)
    : null;
  if (backlinks.result) {
    const item = backlinks.result.items?.[0] || backlinks.result;
    backlinks = {
      referringDomainList,
      backlinkList,
      listsCostUsd: listCost,
      available: true,
      rank: item.rank ?? null,
      backlinks: item.backlinks ?? 0,
      referringDomains: item.referring_domains ?? 0,
      referringMainDomains: item.referring_main_domains ?? 0,
      referringPages: item.referring_pages ?? 0,
      nofollow: item.backlinks_nofollow ?? 0,
      brokenBacklinks: item.broken_backlinks ?? 0,
      spamScore: item.backlinks_spam_score ?? null,
      providerCostUsd: backlinks.providerCostUsd,
    };
  } else if (backlinks.available !== false) {
    backlinks = { available: true, rank: 0, backlinks: 0, referringDomains: 0, referringMainDomains: 0, referringPages: 0, nofollow: 0, brokenBacklinks: 0, spamScore: null, providerCostUsd: backlinks.providerCostUsd };
  }

  // Règle d'honnêteté : ne JAMAIS afficher « 0 mention » quand rien n'a pu être
  // mesuré. Un zéro fabriqué se lit « vous êtes invisible dans les IA », ce qui
  // est une affirmation que l'outil n'a pas les moyens de faire. DataForSEO
  // limite aujourd'hui ChatGPT aux États-Unis et à l'anglais : pour une PME
  // québécoise, l'absence de couverture est le cas NORMAL, pas un résultat.
  if (aiMentions.result) {
    const items = Array.isArray(aiMentions.result.items) ? aiMentions.result.items : [];
    const platforms = items.map(item => ({
      platform: item.platform || "inconnue",
      location: item.location_name || marketName(item.location),
      language: LANGUAGE_NAMES[String(item.language || "").toLowerCase()] || item.language || "langue disponible",
      mentions: Number(item.metrics?.mentions ?? item.mentions ?? 0),
      aiSearchVolume: Number(item.metrics?.ai_search_volume ?? item.ai_search_volume ?? 0),
    }));
    platforms.sort((a, b) => b.mentions - a.mentions);
    const scope = [...new Set(platforms.map(item => item.location))].join(", ");
    if (!platforms.length) {
      // La requête a abouti, mais la base ne couvre pas ce domaine pour ce
      // marché. Ce n'est pas un zéro : c'est une absence de mesure.
      aiMentions = {
        available: false,
        measured: false,
        reason: "provider_no_coverage",
        error: "Aucune couverture DataForSEO pour ce domaine — la mesure de mentions IA est limitée aux États-Unis et à l'anglais.",
        providerCostUsd: aiMentions.providerCostUsd,
      };
    } else {
      aiMentions = {
        available: true,
        measured: true,
        mentions: platforms.reduce((sum, item) => sum + item.mentions, 0),
        aiSearchVolume: platforms.reduce((sum, item) => sum + item.aiSearchVolume, 0),
        platforms,
        scope: scope || "Portée DataForSEO disponible",
        databaseMeasurement: true,
        providerCostUsd: aiMentions.providerCostUsd,
      };
    }
  } else if (aiMentions.available !== false) {
    // Réponse vide du fournisseur : on ne prétend rien avoir mesuré.
    aiMentions = {
      available: false,
      measured: false,
      reason: "provider_empty_response",
      error: "La source n'a retourné aucune donnée de mentions IA pour ce domaine.",
      providerCostUsd: aiMentions.providerCostUsd,
    };
  }

  if (competitors.result) {
    const items = Array.isArray(competitors.result.items) ? competitors.result.items : [];
    competitors = {
      available: true,
      totalCount: competitors.result.total_count ?? items.length,
      items: items.filter(item => item.domain && item.domain.replace(/^www\./, "") !== target).map(item => {
        const organic = item.full_domain_metrics?.organic || {};
        const paid = item.full_domain_metrics?.paid || {};
        const sharedTarget = item.metrics?.organic || {};
        const sharedCompetitor = item.competitor_metrics?.organic || {};
        return {
          domain: item.domain,
          intersections: Number(item.intersections || 0),
          averagePosition: item.avg_position == null ? null : Number(item.avg_position),
          organicKeywords: Number(organic.count || 0),
          organicTraffic: Math.round(organic.etv || 0),
          paidKeywords: Number(paid.count || 0),
          paidTraffic: Math.round(paid.etv || 0),
          targetSharedTraffic: Math.round(sharedTarget.etv || 0),
          competitorSharedTraffic: Math.round(sharedCompetitor.etv || 0),
        };
      }).slice(0, 10),
      weeklyData: true,
      providerCostUsd: competitors.providerCostUsd,
    };
  } else if (competitors.available !== false) {
    competitors = { available: true, totalCount: 0, items: [], weeklyData: true, providerCostUsd: competitors.providerCostUsd };
  }

  if (topPages.result) {
    const items = Array.isArray(topPages.result.items) ? topPages.result.items : [];
    topPages = {
      available: true,
      totalCount: topPages.result.total_count ?? items.length,
      items: items.map(item => {
        const organic = item.metrics?.organic || {};
        return {
          url: item.page_address || "",
          organicKeywords: Number(organic.count || 0),
          organicTraffic: Math.round(organic.etv || 0),
          estimatedTrafficValueUsd: Number(organic.estimated_paid_traffic_cost || 0),
          top3Keywords: Number(organic.pos_1 || 0) + Number(organic.pos_2_3 || 0),
          top10Keywords: Number(organic.pos_1 || 0) + Number(organic.pos_2_3 || 0) + Number(organic.pos_4_10 || 0),
          positionsUp: Number(organic.is_up || 0),
          positionsDown: Number(organic.is_down || 0),
          newPositions: Number(organic.is_new || 0),
        };
      }).filter(item => item.url).slice(0, 10),
      weeklyData: true,
      providerCostUsd: topPages.providerCostUsd,
    };
  } else if (topPages.available !== false) {
    topPages = { available: true, totalCount: 0, items: [], weeklyData: true, providerCostUsd: topPages.providerCostUsd };
  }

  const sections = [traffic, strategicKeywords, backlinks, aiMentions, competitors, topPages];
  const providerCostUsd = sections.reduce((sum, section) => sum + Number(section.providerCostUsd || 0), 0) + listCost;
  return {
    configured: true,
    available: traffic.available,
    source: "DataForSEO",
    target,
    location,
    language: coveredLanguages.join(","),
    languages: coveredLanguages,
    organic: traffic.organic ?? 0,
    paid: traffic.paid ?? 0,
    organicKeywords: traffic.organicKeywords ?? null,
    paidKeywords: traffic.paidKeywords ?? null,
    estimated: true,
    reason: traffic.reason,
    error: traffic.error,
    strategicKeywords,
    backlinks,
    aiMentions,
    competitors,
    topPages,
    providerCostUsd: Number(providerCostUsd.toFixed(6)),
    providerCosts: {
      traffic: traffic.providerCostUsd || 0,
      strategicKeywords: strategicKeywords.providerCostUsd || 0,
      backlinks: (backlinks.providerCostUsd || 0) + listCost,
      aiMentions: aiMentions.providerCostUsd || 0,
      competitors: competitors.providerCostUsd || 0,
      topPages: topPages.providerCostUsd || 0,
    },
  };
}

async function keywordGapIntelligence(site, competitor, location = "Canada", language = "fr") {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return {
    configured: false,
    available: false,
    reason: "provider_credentials_missing",
    error: "Les identifiants DataForSEO ne sont pas configurés sur le serveur.",
  };
  const target = new URL(site).hostname.replace(/^www\./, "");
  const competitorUrl = /^https?:\/\//i.test(competitor) ? competitor : "https://" + competitor;
  if (!isSafeUrl(competitorUrl)) return {
    configured: true,
    available: false,
    reason: "invalid_competitor",
    error: "Le domaine concurrent est invalide.",
  };
  const competitorDomain = new URL(competitorUrl).hostname.replace(/^www\./, "");
  if (competitorDomain === target) return {
    configured: true,
    available: false,
    reason: "same_domain",
    error: "Le concurrent doit être différent du site analysé.",
  };
  const authorization = "Basic " + btoa(`${login}:${password}`);
  const languages = parseLanguages(language);
  let response;
  try {
    // target1 = concurrent, target2 = client, intersections=false : mots-clés
    // où le concurrent est présent et le client absent. Une requête par langue.
    response = await perLanguage(languages, "/v3/dataforseo_labs/google/domain_intersection/live", lang => ({
      target1: competitorDomain,
      target2: target,
      location_name: location,
      language_code: lang,
      intersections: false,
      item_types: ["organic", "featured_snippet", "local_pack"],
      limit: 25,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }), authorization, results => ({
      total_count: results.reduce((sum, r) => sum + num(r.total_count), 0),
      items: results.flatMap(r => r.items || []).sort((a, b) => num(b.keyword_data?.keyword_info?.search_volume) - num(a.keyword_data?.keyword_info?.search_volume)).slice(0, 25),
    }), 12000);
  } catch (error) {
    return { configured: true, target, competitor: competitorDomain, ...unavailableProviderResult(error) };
  }
  const result = response.result;
  const items = Array.isArray(result?.items) ? result.items : [];
  return {
    configured: true,
    available: true,
    source: "DataForSEO",
    target,
    competitor: competitorDomain,
    location,
    language: languages.join(","),
    totalCount: result?.total_count ?? items.length,
    items: items.map(entry => {
      const keyword = entry.keyword_data || {};
      const info = keyword.keyword_info || {};
      const serp = entry.first_domain_serp_element?.serp_item || entry.first_domain_serp_element || {};
      return {
        keyword: keyword.keyword || entry.keyword || "",
        searchVolume: Math.round(info.search_volume || 0),
        cpc: info.cpc ?? null,
        competition: info.competition ?? null,
        competitorRank: serp.rank_group ?? serp.rank_absolute ?? null,
        competitorUrl: serp.url || serp.relative_url || "",
        competitorVisits: Math.round(serp.etv || 0),
      };
    }).filter(item => item.keyword),
    estimated: true,
    weeklyData: true,
    providerCostUsd: response.providerCostUsd || 0,
  };
}

// ---------- Point d'entrée ----------
export default async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Paparmane-Key",
  };
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors },
  });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const q = new URL(req.url).searchParams;
    const mode = q.get("mode");
    const accessKey = process.env.PAPARMANE_ACCESS_KEY;

    if (mode === "auth") {
      const supplied = req.headers.get("x-paparmane-key") || "";
      // Compatibilité temporaire tant que le secret serveur n'est pas configuré.
      return json({ ok: accessKey ? supplied === accessKey : supplied === "paparmane", configured: !!accessKey });
    }

    if (mode === "discover") {
      let site = (q.get("site") || "").trim();
      if (!/^https?:\/\//i.test(site)) site = "https://" + site;
      if (!isSafeUrl(site)) return json({ error: "Adresse invalide." }, 400);
      return json(await discover(site));
    }

    if (mode === "sitemap") {
      const url = q.get("url") || "";
      const origin = q.get("origin") || "";
      if (!isSafeUrl(url) || !isSafeUrl(origin)) return json({ error: "Adresse de sitemap invalide." }, 400);
      const normalizedOrigin = new URL(origin).origin;
      const { locs, ...parsed } = await readSitemap(url, normalizedOrigin);
      return json(parsed);
    }

    if (mode === "traffic") {
      if (!accessKey) {
        return json({
          configured: false,
          available: false,
          reason: "server_protection_missing",
          error: "La protection privée du module trafic n'est pas configurée sur le serveur.",
        }, 503);
      }
      if (req.headers.get("x-paparmane-key") !== accessKey) {
        return json({
          configured: false,
          available: false,
          reason: "access_key_invalid",
          error: "Le code d'accès courant ne permet pas d'utiliser le module trafic.",
        }, 401);
      }
      let site = (q.get("site") || "").trim();
      if (!/^https?:\/\//i.test(site)) site = "https://" + site;
      if (!isSafeUrl(site)) return json({ error: "Adresse invalide." }, 400);
      return json(await externalIntelligence(site, q.get("location") || "Canada", q.get("language") || "fr"));
    }

    if (mode === "gap") {
      if (!accessKey) return json({
        configured: false,
        available: false,
        reason: "server_protection_missing",
        error: "La protection privée du module concurrentiel n'est pas configurée sur le serveur.",
      }, 503);
      if (req.headers.get("x-paparmane-key") !== accessKey) return json({
        configured: false,
        available: false,
        reason: "access_key_invalid",
        error: "Le code d'accès courant ne permet pas d'utiliser le module concurrentiel.",
      }, 401);
      let site = (q.get("site") || "").trim();
      if (!/^https?:\/\//i.test(site)) site = "https://" + site;
      if (!isSafeUrl(site)) return json({ error: "Adresse invalide." }, 400);
      return json(await keywordGapIntelligence(site, q.get("competitor") || "", q.get("location") || "Canada", q.get("language") || "fr"));
    }

    if (mode === "page") {
      const url = q.get("url") || "";
      if (!isSafeUrl(url)) return json({ error: "Adresse invalide." }, 400);
      // Évite les anciennes balises servies par les caches WordPress/CDN.
      const r = await grab(url, { cacheBust: true });
      if (!r.ok) return json({ url, dead: true, status: 0, error: r.error });
      if (r.status >= 400) return json({ url, dead: true, status: r.status });
      // Image, PDF ou autre fichier : ce n'est pas une page à auditer.
      const type = String(r.headers?.contentType || "").toLowerCase();
      const looksHtml = /html|xml/.test(type) || (!type && /<html|<!doctype html/i.test(r.body.slice(0, 1000)));
      if (!looksHtml || !isPagePath(r.finalUrl || url)) return json({ url, skipped: true, reason: "not_html", contentType: type });
      return json(analyzePage(url, r.body, cleanAuditUrl(r.finalUrl), r));
    }

    if (mode === "verify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const urls = Array.isArray(body.urls) ? body.urls : [];
      return json({ results: await verify(urls) });
    }

    return json({ error: "Mode inconnu. Utiliser mode=auth|discover|sitemap|page|verify|traffic|gap." }, 400);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};

export const config = { path: "/api/audit" };
