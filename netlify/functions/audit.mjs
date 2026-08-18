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
  const startedAt = Date.now();
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
    return {
      ok: true,
      status: res.status,
      finalUrl: res.url,
      body,
      redirected: res.redirected,
      elapsedMs: Date.now() - startedAt,
      headers: {
        xRobotsTag: res.headers.get("x-robots-tag") || "",
        contentEncoding: res.headers.get("content-encoding") || "",
        contentType: res.headers.get("content-type") || "",
        cacheControl: res.headers.get("cache-control") || "",
        server: res.headers.get("server") || "",
      },
    };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: url, body: "", redirected: false, elapsedMs: Date.now() - startedAt, error: String(e.message || e) };
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
function analyzePage(url, html, finalUrl, response = {}) {
  const head = html.slice(0, 200000);
  const contentHtml = usefulContentHtml(html);
  const title = one(/<title[^>]*>([\s\S]*?)<\/title>/i, head);
  const desc = one(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i, head)
            ?? one(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i, head);

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
    const lazySrc = one(/\b(?:data-src|data-lazy-src|data-original|data-litespeed-src)=["']([^"']+)/i, tag);
    const rawSrc = one(/\bsrc=["']([^"']+)/i, tag);
    const srcset = one(/\b(?:data-srcset|srcset)=["']([^"']+)/i, tag);
    const srcsetFirst = srcset ? srcset.split(",")[0].trim().split(/\s+/)[0] : "";
    const src = lazySrc || (rawSrc && !rawSrc.startsWith("data:") ? rawSrc : "") || srcsetFirst || rawSrc || "";
    const altValue = tagAttr(tag, "alt");
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

  const metaTags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const robotsDirectives = metaTags
    .filter(tag => /^(?:robots|googlebot|bingbot)$/i.test(tagAttr(tag, "name") || ""))
    .map(tag => tagAttr(tag, "content") || "")
    .join(", ")
    .toLowerCase();
  const xRobotsTag = String(response.headers?.xRobotsTag || "").toLowerCase();
  const allRobotDirectives = `${robotsDirectives}, ${xRobotsTag}`;
  const noindex = /(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(allRobotDirectives);
  const nofollow = /(?:^|[\s,])(?:nofollow|none)(?:[\s,]|$)/i.test(allRobotDirectives);

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
    canonical, canonicalMatches,
    viewport: /name=["']viewport["']/i.test(head),
    lang: one(/<html[^>]*\blang=["']([^"']+)/i, head),
    h1, h1Count: h1.length, h2Count: h2.length, headings, headingCounts, emptyHeadings, headingSkips,
    images, og, schemaTypes, schema, expectedSchema: inferExpectedSchema(finalUrl, title, h1, bodyText),
    isWordPress: /wp-content|wp-json/i.test(html),
    words: bodyText ? bodyText.split(" ").length : 0,
    contentSignature: hashText(signatureBasis),
    pageState,
    keywords: keywords.top, focusKeyword,
    keywordAlignment: { title: inField(title), h1: inField(h1.join(" ")), desc: inField(desc) },
    contact: { emails, phones, socials, hasForm: /<form\b/i.test(html), ctas: [...new Set(ctas)].slice(0, 10) },
    sizeKB: Math.round(html.length / 1024),
    indexability: { noindex, nofollow, robotsDirectives, xRobotsTag },
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
  const rules = robotsTxt ? parseRobots(robotsTxt) : {};
  out.robots = { exists: !!robotsTxt, searchBlocked: !!rules["*"]?.disallowAll };
  out.aiBots = AI_BOTS.map(([agent, role, cost]) => {
    const r = rules[agent.toLowerCase()];
    return { agent, role, cost, state: r ? (r.disallowAll ? "blocked" : "allowed") : "default" };
  });

  // Un favicon peut être déclaré dans le HTML ou servi implicitement à la
  // racine. Ce second cas évite un faux positif dans le rapport client.
  const favicon = await grab(origin + "/favicon.ico", { asText: false });
  out.favicon = {
    fallbackExists: !!(favicon.ok && favicon.status === 200 && /^image\//i.test(favicon.headers?.contentType || "")),
  };

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
  return {
    available: false,
    reason: error?.reason || "provider_error",
    error: error?.message || "La source DataForSEO a retourné une erreur.",
    providerCostUsd: Number(error?.providerCostUsd || 0),
  };
}

async function externalIntelligence(site, location = "Canada", language = "fr") {
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
    dataForSeoPost("/v3/dataforseo_labs/google/bulk_traffic_estimation/live", {
      targets: [target], location_name: location, language_code: language,
      item_types: ["organic", "paid", "featured_snippet", "local_pack"],
    }, authorization),
    dataForSeoPost("/v3/dataforseo_labs/google/ranked_keywords/live", {
      target, location_name: location, language_code: language,
      item_types: ["organic", "featured_snippet", "local_pack"],
      ignore_synonyms: true,
      limit: 20,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }, authorization),
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
  ]);

  const [trafficRequest, keywordRequest, backlinkRequest, aiRequest] = requests;
  let traffic = trafficRequest.status === "fulfilled" ? trafficRequest.value : unavailableProviderResult(trafficRequest.reason);
  let strategicKeywords = keywordRequest.status === "fulfilled" ? keywordRequest.value : unavailableProviderResult(keywordRequest.reason);
  let backlinks = backlinkRequest.status === "fulfilled" ? backlinkRequest.value : unavailableProviderResult(backlinkRequest.reason);
  let aiMentions = aiRequest.status === "fulfilled" ? aiRequest.value : unavailableProviderResult(aiRequest.reason);

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
      }).filter(item => item.keyword),
      providerCostUsd: strategicKeywords.providerCostUsd,
    };
  } else if (strategicKeywords.available !== false) {
    strategicKeywords = { available: true, totalCount: 0, items: [], providerCostUsd: strategicKeywords.providerCostUsd };
  }

  if (backlinks.result) {
    const item = backlinks.result.items?.[0] || backlinks.result;
    backlinks = {
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

  if (aiMentions.result) {
    const items = Array.isArray(aiMentions.result.items) ? aiMentions.result.items : [];
    const platforms = items.map(item => ({
      platform: item.platform || "inconnue",
      location: item.location_name || (Number(item.location) === 2124 ? "Canada" : Number(item.location) === 2840 ? "États-Unis" : item.location || "Portée DataForSEO"),
      language: item.language === "fr" ? "français" : item.language === "en" ? "anglais" : item.language || "langue disponible",
      mentions: Number(item.metrics?.mentions ?? item.mentions ?? 0),
      aiSearchVolume: Number(item.metrics?.ai_search_volume ?? item.ai_search_volume ?? 0),
    }));
    const scope = [...new Set(platforms.map(item => `${item.location} · ${item.language}`))].join(" + ") || "Portée DataForSEO disponible";
    aiMentions = {
      available: true,
      mentions: platforms.reduce((sum, item) => sum + item.mentions, 0),
      aiSearchVolume: platforms.reduce((sum, item) => sum + item.aiSearchVolume, 0),
      platforms,
      scope,
      databaseMeasurement: true,
      providerCostUsd: aiMentions.providerCostUsd,
    };
  } else if (aiMentions.available !== false) {
    aiMentions = { available: true, mentions: 0, aiSearchVolume: 0, platforms: [], scope: "Portée DataForSEO disponible", databaseMeasurement: true, providerCostUsd: aiMentions.providerCostUsd };
  }

  const sections = [traffic, strategicKeywords, backlinks, aiMentions];
  const providerCostUsd = sections.reduce((sum, section) => sum + Number(section.providerCostUsd || 0), 0);
  return {
    configured: true,
    available: traffic.available,
    source: "DataForSEO",
    target,
    location,
    language,
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
    providerCostUsd: Number(providerCostUsd.toFixed(6)),
    providerCosts: {
      traffic: traffic.providerCostUsd || 0,
      strategicKeywords: strategicKeywords.providerCostUsd || 0,
      backlinks: backlinks.providerCostUsd || 0,
      aiMentions: aiMentions.providerCostUsd || 0,
    },
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
      return json(await externalIntelligence(site, q.get("location") || "Canada", q.get("language") || "fr"));
    }

    if (mode === "page") {
      const url = q.get("url") || "";
      if (!isSafeUrl(url)) return json({ error: "Adresse invalide." }, 400);
      // Évite les anciennes balises servies par les caches WordPress/CDN.
      const r = await grab(url, { cacheBust: true });
      if (!r.ok) return json({ url, dead: true, status: 0, error: r.error });
      if (r.status >= 400) return json({ url, dead: true, status: r.status });
      return json(analyzePage(url, r.body, cleanAuditUrl(r.finalUrl), r));
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
