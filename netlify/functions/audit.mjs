// ============================================================
// PAPARMANE SEO — moteur d'audit (fonction Netlify)
// Trois modes :
//   ?mode=discover&site=URL   → robots.txt, sitemap, llms.txt, robots IA
//   ?mode=page&url=URL        → analyse complète d'une page
//   ?mode=verify (POST urls[])→ vérifie des liens (statut + redirections)
// ============================================================

const UA = "Mozilla/5.0 (compatible; PaparmaneSEO/1.0; +https://paparmane.netlify.app)";
const FETCH_TIMEOUT = 9000;
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
  ["Claude-Web",         "Claude — navigation",                    "Claude ne peut pas visiter le site"],
  ["anthropic-ai",       "Anthropic — ancien robot (déprécié)",    "aucun (robot inactif)"],
  ["PerplexityBot",      "Perplexity AI — indexation",             "absent de Perplexity"],
  ["Perplexity-User",    "Perplexity — navigation",                "Perplexity ne peut pas visiter le site"],
  ["Google-Extended",    "Gemini — entraînement et grounding",     "contenu non utilisé pour Gemini; aucun effet sur Google Search"],
  ["Applebot-Extended",  "Apple Intelligence",                     "absent d'Apple Intelligence / Siri"],
  ["CCBot",              "Common Crawl — nourrit beaucoup d'IA",   "absent de nombreux modèles d'IA"],
  ["Bytespider",         "TikTok / Doubao",                        "absent des IA de ByteDance"],
  ["meta-externalagent", "Meta AI",                                "absent de Meta AI"],
  ["Amazonbot",          "Amazon Alexa / Rufus",                   "absent des réponses d'Alexa"],
];

function isSafeUrl(u) {
  try {
    const p = new URL(u);
    if (!/^https?:$/.test(p.protocol)) return false;
    const h = p.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h)) return false;
    if (h === "[::1]" || h.startsWith("[fc") || h.startsWith("[fd") || h.startsWith("[fe80")) return false;
    return true;
  } catch { return false; }
}

async function grab(url, { asText = true, cacheBust = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const requested = new URL(url);
    if (cacheBust) requested.searchParams.set("_paparmane_audit", Date.now().toString());
    const res = await fetch(requested, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,text/plain,*/*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const body = asText ? await res.text() : "";
    return { ok: true, status: res.status, finalUrl: res.url, body, redirected: res.redirected };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: url, body: "", redirected: false, error: String(e.message || e) };
  } finally { clearTimeout(t); }
}

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ");

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

function removePageChrome(html) {
  let out = String(html || "");
  const structural = ["script", "style", "nav", "footer", "header", "aside", "noscript"];
  for (const tag of structural) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  // Les bannières de consentement injectent beaucoup de vocabulaire répétitif
  // (stockage, accès, préférences) qui ne décrit jamais le sujet de la page.
  const consentMarker = "(?:cmplz|cookie|consent|onetrust|cky-|gdpr|borlabs|moove[_-]gdpr|cookie-law|cc-window|tarteaucitron)";
  const consentBlock = new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*(?:id|class)=["'][^"']*${consentMarker}[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, "gi");
  for (let i = 0; i < 3; i++) out = out.replace(consentBlock, " ");
  return out;
}

function usefulContentHtml(html) {
  const mains = [...String(html || "").matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map(m => m[1]);
  const articles = mains.length ? [] : [...String(html || "").matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(m => m[1]);
  return removePageChrome((mains.length ? mains : articles.length ? articles : [html]).join(" "));
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

function one(re, s) { const m = s.match(re); return m ? decode(m[1].trim()) : null; }
function all(re, s) { return [...s.matchAll(re)].map(m => m[1]); }

function inspectStructuredData(blocks) {
  const types = new Set(), problems = [], entities = [];
  let validBlocks = 0, invalidBlocks = 0;
  const required = {
    Organization: ["name", "url"], LocalBusiness: ["name", "address"],
    LodgingBusiness: ["name", "address"], Product: ["name", "offers"],
    Article: ["headline", "author", "datePublished"], BlogPosting: ["headline", "author", "datePublished"],
    FAQPage: ["mainEntity"], Event: ["name", "startDate", "location"],
    Service: ["name", "provider"], BreadcrumbList: ["itemListElement"],
  };
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (node["@graph"]) visit(node["@graph"]);
    const rawTypes = Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [];
    if (rawTypes.length) entities.push({ types: rawTypes, id: node["@id"] || null, name: node.name || node.headline || null, url: node.url || null });
    rawTypes.forEach(type => {
      types.add(type);
      const missing = (required[type] || []).filter(k => node[k] == null || node[k] === "" || (Array.isArray(node[k]) && !node[k].length));
      if (missing.length) problems.push(`${type} : champ(s) manquant(s) — ${missing.join(", ")}`);
    });
    for (const [key, value] of Object.entries(node)) {
      // Une propriété facultative vide (par exemple WebSite.description dans
      // certains graphes Yoast) n'invalide pas le JSON-LD. Les champs requis
      // sont déjà contrôlés précisément ci-dessus.
      if (/^(url|image|logo|sameAs)$/i.test(key)) {
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
      const parsed = JSON.parse(block.trim()); validBlocks++;
      if (!parsed["@context"] && !parsed["@graph"]) problems.push(`Bloc JSON-LD ${i + 1} : @context manquant`);
      visit(parsed);
    }
    catch { invalidBlocks++; problems.push(`Bloc JSON-LD ${i + 1} invalide (erreur de syntaxe)`); }
  });
  return { types: [...types].sort(), validBlocks, invalidBlocks, problems: [...new Set(problems)], entities };
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
  if (/faq|foire aux questions|questions fréquentes/.test(hay)) add("FAQPage", "section de questions-réponses détectée");
  if (/\/evenement|\/event|événement|billetterie/.test(hay)) add("Event", "événement détecté");
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
  return "content";
}

// ---------- MODE: page ----------
function analyzePage(url, html, finalUrl) {
  const head = html.slice(0, 200000);
  const title = one(/<title[^>]*>([\s\S]*?)<\/title>/i, head);
  const desc = one(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i, head)
            ?? one(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i, head);

  const h1 = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html).map(x => decode(strip(x))).filter(Boolean);
  const h2 = all(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html).map(x => decode(strip(x))).filter(Boolean);

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const images = imgs.map(tag => {
    const lazySrc = one(/\b(?:data-src|data-lazy-src|data-original|data-litespeed-src)=["']([^"']+)/i, tag);
    const rawSrc = one(/\bsrc=["']([^"']+)/i, tag);
    const srcset = one(/\b(?:data-srcset|srcset)=["']([^"']+)/i, tag);
    const srcsetFirst = srcset ? srcset.split(",")[0].trim().split(/\s+/)[0] : "";
    const src = lazySrc || (rawSrc && !rawSrc.startsWith("data:") ? rawSrc : "") || srcsetFirst || rawSrc || "";
    const altM = tag.match(/\balt=(["'])([\s\S]*?)\1/i);
    return {
      file: (src.split("/").pop() || "?").split("?")[0].slice(0, 90),
      cls: classifyImg(src),
      alt: altM ? altM[2].trim() : null,   // null = pas d'attribut, "" = vide
    };
  });

  const ld = all(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, html);
  const schema = inspectStructuredData(ld);
  const schemaTypes = schema.types;

  const og = {
    title: /property=["']og:title["']/i.test(head),
    desc: /property=["']og:description["']/i.test(head),
    image: /property=["']og:image["']/i.test(head),
    twitter: /name=["']twitter:card["']/i.test(head),
  };

  const origin = new URL(finalUrl).origin;
  const rawHrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
    .filter(match => {
      const tag = match[0];
      const href = decode(match[1]);
      // Les hébergeurs injectent parfois un lien-piège invisible qui doit
      // volontairement répondre 403. Ce n'est ni une navigation pour les
      // visiteurs ni un lien que les moteurs doivent suivre.
      const hiddenTrap = /\baria-hidden=["']true["']/i.test(tag)
        || (/\btabindex=["']-1["']/i.test(tag) && /display\s*:\s*none/i.test(tag));
      return !hiddenTrap && !/\/imunify-bot-check(?:[/?#]|$)/i.test(href);
    })
    .map(match => decode(match[1]));
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
      .map(h => { try { return new URL(decode(h), finalUrl).href.split("#")[0]; } catch { return null; } })
      .filter(h => h && h.startsWith(origin) && !/\.(jpg|jpeg|png|webp|gif|pdf|zip|css|js|xml|ico|svg|mp4|woff2?)(\?|$)/i.test(h))
  )].slice(0, 80);

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
  const signatureBasis = plain(`${title || ""} ${(h1 || []).join(" ")} ${bodyText}`).slice(0, 24000);

  return {
    url, finalUrl, redirected: finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, ""),
    https: finalUrl.startsWith("https:"),
    title, titleLen: title ? title.length : 0,
    desc, descLen: desc ? desc.length : 0,
    canonical: one(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i, head),
    viewport: /name=["']viewport["']/i.test(head),
    lang: one(/<html[^>]*\blang=["']([^"']+)/i, head),
    h1, h1Count: h1.length, h2Count: h2.length,
    images, og, schemaTypes, schema, expectedSchema: inferExpectedSchema(finalUrl, title, h1, bodyText),
    isWordPress: /wp-content|wp-json/i.test(html),
    words: bodyText ? bodyText.split(" ").length : 0,
    contentSignature: hashText(signatureBasis),
    pageState,
    keywords: keywords.top, focusKeyword,
    keywordAlignment: { title: inField(title), h1: inField(h1.join(" ")), desc: inField(desc) },
    contact: { emails, phones, socials, hasForm: /<form\b/i.test(html), ctas: [...new Set(ctas)].slice(0, 10) },
    sizeKB: Math.round(html.length / 1024),
    links,
  };
}

// ---------- MODE: discover ----------
function parseRobots(txt) {
  // Découpe en blocs user-agent (les agents groupés partagent les règles)
  const lines = txt.split(/\r?\n/);
  const rules = {}; // agent(min) -> {disallowAll, mentioned}
  let agents = [];
  let sawRule = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      if (sawRule) { agents = []; sawRule = false; }
      agents.push(ua[1].trim().toLowerCase());
      for (const a of agents) rules[a] ??= { disallowAll: false, mentioned: true };
      continue;
    }
    const dis = line.match(/^disallow:\s*(.*)$/i);
    const alw = line.match(/^allow:\s*(.*)$/i);
    if (dis || alw) {
      sawRule = true;
      if (dis && dis[1].trim() === "/") for (const a of agents) rules[a].disallowAll = true;
      if (alw && alw[1].trim() === "/") for (const a of agents) rules[a].disallowAll = false;
    }
  }
  return rules;
}

async function readSitemap(url, origin) {
  if (!isSafeUrl(url)) return { pages: [], sitemaps: [], found: false };
  const r = await grab(url);
  if (!r.ok || r.status !== 200 || !/<(urlset|sitemapindex)/i.test(r.body)) {
    return { pages: [], sitemaps: [], found: false };
  }
  const locs = all(/<loc>\s*([^<]+?)\s*<\/loc>/gi, r.body).map(decode);
  if (/<sitemapindex/i.test(r.body)) {
    return {
      pages: [],
      sitemaps: [...new Set(locs.filter(isSafeUrl))].slice(0, MAX_SITEMAP_URLS),
      found: true,
    };
  }
  return {
    pages: [...new Set(locs.filter(l => {
      try {
        return new URL(l).origin === origin && !/\.(jpg|jpeg|png|webp|gif|pdf|xml)$/i.test(new URL(l).pathname);
      } catch { return false; }
    }))].slice(0, MAX_SITEMAP_URLS),
    sitemaps: [],
    found: true,
  };
}

async function discover(site) {
  const origin = new URL(site).origin;
  const out = { origin, pages: [], robots: null, aiBots: [], llms: null, sitemapFound: false };

  // 1. robots.txt
  const rb = await grab(origin + "/robots.txt");
  const robotsTxt = rb.ok && rb.status === 200 && !/<html/i.test(rb.body.slice(0, 300)) ? rb.body : "";
  out.robots = { exists: !!robotsTxt };
  const rules = robotsTxt ? parseRobots(robotsTxt) : {};
  out.aiBots = AI_BOTS.map(([agent, role, cost]) => {
    const r = rules[agent.toLowerCase()];
    return { agent, role, cost, state: r ? (r.disallowAll ? "blocked" : "allowed") : "default" };
  });

  // 2. sitemaps (déclarés dans robots.txt, sinon /sitemap.xml et /sitemap_index.xml)
  const declared = all(/sitemap:\s*(\S+)/gi, robotsTxt);
  const candidates = declared.length ? [...new Set(declared)] : [origin + "/sitemap_index.xml", origin + "/sitemap.xml"];
  const pages = new Set();
  const sitemapQueue = [];
  for (const sm of candidates.slice(0, 10)) {
    const parsed = await readSitemap(sm, origin);
    if (!parsed.found) continue;
    out.sitemapFound = true;
    parsed.pages.forEach(l => pages.add(l));
    sitemapQueue.push(...parsed.sitemaps);
    break;
  }
  if (!pages.size) pages.add(origin + "/"); // repli : on partira de l'accueil (BFS côté client)
  out.pages = [...pages];
  out.sitemapQueue = [...new Set(sitemapQueue)];

  // 3. llms.txt
  const lm = await grab(origin + "/llms.txt");
  const isReal = lm.ok && lm.status === 200 && !/<html|<!doctype/i.test(lm.body.slice(0, 300)) && lm.body.trim().length > 40;
  out.llms = { exists: isReal };
  if (isReal) {
    const links = [...new Set(all(/\((https?:\/\/[^\)\s]+)\)/g, lm.body).filter(u => u.startsWith(origin)))].slice(0, 25);
    const prices = (lm.body.match(/\$\s?\d[\d\s,.]*|\d[\d\s,.]*\s?\$/g) || []).length;
    out.llms.lines = lm.body.split("\n").length;
    out.llms.links = links;
    out.llms.prices = prices;
  }
  return out;
}

// ---------- MODE: verify ----------
async function verify(urls) {
  const results = [];
  for (const u of urls.slice(0, MAX_VERIFY)) {
    if (!isSafeUrl(u)) { results.push({ url: u, status: 0, finalUrl: u, redirected: false }); continue; }
    const r = await grab(u, { asText: false });
    results.push({ url: u, status: r.status, finalUrl: r.finalUrl, redirected: r.redirected || r.finalUrl.replace(/\/$/, "") !== u.replace(/\/$/, "") });
  }
  return results;
}

// ---------- INTELLIGENCE TRAFIC (DataForSEO, identifiants serveur seulement) ----------
async function trafficEstimate(site, location = "Canada", language = "fr") {
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
  const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/bulk_traffic_estimation/live", {
    method: "POST",
    headers: { "Authorization": authorization, "Content-Type": "application/json" },
    body: JSON.stringify([{
      targets: [target], location_name: location, language_code: language,
      item_types: ["organic", "paid", "featured_snippet", "local_pack"],
    }]),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.status_code !== 20000) {
    return {
      configured: true,
      available: false,
      reason: "provider_error",
      source: "DataForSEO",
      error: payload.status_message || `Erreur ${res.status}`,
    };
  }
  const item = payload.tasks?.[0]?.result?.[0]?.items?.[0] || payload.tasks?.[0]?.result?.[0] || null;
  if (!item) return {
    configured: true,
    available: false,
    reason: "no_data",
    source: "DataForSEO",
    error: "Aucune estimation disponible pour ce domaine.",
  };
  const organic = item.metrics?.organic || item.organic || {};
  const paid = item.metrics?.paid || item.paid || {};
  return {
    configured: true, available: true, source: "DataForSEO", target, location, language,
    organic: Math.round(organic.etv ?? organic.estimated_traffic_volume ?? item.organic_etv ?? 0),
    paid: Math.round(paid.etv ?? paid.estimated_traffic_volume ?? item.paid_etv ?? 0),
    organicKeywords: organic.count ?? item.organic_count ?? null,
    paidKeywords: paid.count ?? item.paid_count ?? null,
    estimated: true, providerCostUsd: payload.cost ?? payload.tasks?.[0]?.cost ?? null,
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
      return json(await readSitemap(url, normalizedOrigin));
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
      return json(await trafficEstimate(site, q.get("location") || "Canada", q.get("language") || "fr"));
    }

    if (mode === "page") {
      const url = q.get("url") || "";
      if (!isSafeUrl(url)) return json({ error: "Adresse invalide." }, 400);
      // Évite les anciennes balises servies par les caches WordPress/CDN.
      const r = await grab(url, { cacheBust: true });
      if (!r.ok) return json({ url, dead: true, status: 0, error: r.error });
      if (r.status >= 400) return json({ url, dead: true, status: r.status });
      return json(analyzePage(url, r.body, cleanAuditUrl(r.finalUrl)));
    }

    if (mode === "verify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const urls = Array.isArray(body.urls) ? body.urls : [];
      return json({ results: await verify(urls) });
    }

    return json({ error: "Mode inconnu. Utiliser mode=auth|discover|sitemap|page|verify|traffic." }, 400);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};

export const config = { path: "/api/audit" };
