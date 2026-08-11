// ============================================================
// PAPARMANE SEO — moteur d'audit (fonction Netlify)
// Trois modes :
//   ?mode=discover&site=URL   → robots.txt, sitemap, llms.txt, robots IA
//   ?mode=page&url=URL        → analyse complète d'une page
//   ?mode=verify (POST urls[])→ vérifie des liens (statut + redirections)
// ============================================================

const UA = "Mozilla/5.0 (compatible; PaparmaneSEO/1.0; +https://paparmane.netlify.app)";
const FETCH_TIMEOUT = 9000;
const MAX_PAGES = 30;
const MAX_VERIFY = 15;

// --- Robots d'IA connus : [agent, rôle, ce que bloque coûte] ---
const AI_BOTS = [
  ["GPTBot",             "ChatGPT (OpenAI) — entraînement",        "absent des connaissances de ChatGPT"],
  ["OAI-SearchBot",      "ChatGPT Search — citations en direct",   "jamais cité par ChatGPT Search"],
  ["ChatGPT-User",       "ChatGPT — navigation à la demande",      "ChatGPT ne peut pas visiter le site"],
  ["ClaudeBot",          "Claude (Anthropic) — robot actuel",      "absent des connaissances de Claude"],
  ["Claude-Web",         "Claude — navigation",                    "Claude ne peut pas visiter le site"],
  ["anthropic-ai",       "Anthropic — ancien robot (déprécié)",    "aucun (robot inactif)"],
  ["PerplexityBot",      "Perplexity AI — indexation",             "absent de Perplexity"],
  ["Perplexity-User",    "Perplexity — navigation",                "Perplexity ne peut pas visiter le site"],
  ["Google-Extended",    "Google Gemini / AI Overviews",           "exclu des réponses IA de Google"],
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

async function grab(url, { asText = true } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,text/plain,*/*" },
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

function one(re, s) { const m = s.match(re); return m ? decode(m[1].trim()) : null; }
function all(re, s) { return [...s.matchAll(re)].map(m => m[1]); }

// --- Classement d'une image : technique / décorative / contenu ---
function classifyImg(srcRaw) {
  const src = (srcRaw || "").toLowerCase();
  const file = src.split("/").pop().split("?")[0];
  if (src.startsWith("data:") || src.includes("base64")) return "tech";
  if (/(^tr\?|facebook\.com\/tr|\/pixel|\bbeacon\b|analytics|doubleclick)/.test(src)) return "tech";
  if (/\.(svg)$/.test(file)) return "deco";
  if (/(^|[-_])(logo|icon|ico|badge|spacer|separateur|separator|deco|pattern|bg|arrow|fleche|puce|bullet|star|etoile)([-_.]|$)/.test(file)) return "deco";
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
    const src = one(/\bsrc=["']([^"']+)/i, tag) || one(/\bdata-src=["']([^"']+)/i, tag) || "";
    const altM = tag.match(/\balt=(["'])([\s\S]*?)\1/i);
    return {
      file: (src.split("/").pop() || "?").split("?")[0].slice(0, 90),
      cls: classifyImg(src),
      alt: altM ? altM[2].trim() : null,   // null = pas d'attribut, "" = vide
    };
  });

  const ld = all(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, html);
  const schemaTypes = [...new Set(ld.flatMap(b => all(/"@type"\s*:\s*"([^"]+)"/g, b)))].sort();

  const og = {
    title: /property=["']og:title["']/i.test(head),
    desc: /property=["']og:description["']/i.test(head),
    image: /property=["']og:image["']/i.test(head),
    twitter: /name=["']twitter:card["']/i.test(head),
  };

  const origin = new URL(finalUrl).origin;
  const links = [...new Set(
    all(/<a\b[^>]*href=["']([^"'#]+?)["']/gi, html)
      .map(h => { try { return new URL(decode(h), finalUrl).href.split("#")[0]; } catch { return null; } })
      .filter(h => h && h.startsWith(origin) && !/\.(jpg|jpeg|png|webp|gif|pdf|zip|css|js|xml|ico|svg|mp4|woff2?)(\?|$)/i.test(h))
  )].slice(0, 80);

  const bodyText = strip(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " "));

  return {
    url, finalUrl, redirected: finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, ""),
    https: finalUrl.startsWith("https:"),
    title, titleLen: title ? title.length : 0,
    desc, descLen: desc ? desc.length : 0,
    canonical: one(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i, head),
    viewport: /name=["']viewport["']/i.test(head),
    lang: one(/<html[^>]*\blang=["']([^"']+)/i, head),
    h1, h1Count: h1.length, h2Count: h2.length,
    images, og, schemaTypes,
    isWordPress: /wp-content|wp-json/i.test(html),
    words: bodyText ? bodyText.split(" ").length : 0,
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
  for (const sm of candidates.slice(0, 2)) {
    const r = await grab(sm);
    if (!r.ok || r.status !== 200 || !/<(urlset|sitemapindex)/i.test(r.body)) continue;
    out.sitemapFound = true;
    let locs = all(/<loc>\s*([^<]+?)\s*<\/loc>/gi, r.body);
    if (/<sitemapindex/i.test(r.body)) {
      const kids = locs.slice(0, 3);
      locs = [];
      for (const kid of kids) {
        const k = await grab(kid);
        if (k.ok && k.status === 200) locs.push(...all(/<loc>\s*([^<]+?)\s*<\/loc>/gi, k.body));
      }
    }
    for (const l of locs) {
      if (l.startsWith(origin) && !/\.(jpg|jpeg|png|webp|gif|pdf|xml)$/i.test(l)) pages.add(l);
      if (pages.size >= MAX_PAGES) break;
    }
    if (pages.size) break;
  }
  if (!pages.size) pages.add(origin + "/"); // repli : on partira de l'accueil (BFS côté client)
  out.pages = [...pages];

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

// ---------- Point d'entrée ----------
export default async (req) => {
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

  try {
    const q = new URL(req.url).searchParams;
    const mode = q.get("mode");

    if (mode === "discover") {
      let site = (q.get("site") || "").trim();
      if (!/^https?:\/\//i.test(site)) site = "https://" + site;
      if (!isSafeUrl(site)) return json({ error: "Adresse invalide." }, 400);
      return json(await discover(site));
    }

    if (mode === "page") {
      const url = q.get("url") || "";
      if (!isSafeUrl(url)) return json({ error: "Adresse invalide." }, 400);
      const r = await grab(url);
      if (!r.ok) return json({ url, dead: true, status: 0, error: r.error });
      if (r.status >= 400) return json({ url, dead: true, status: r.status });
      return json(analyzePage(url, r.body, r.finalUrl));
    }

    if (mode === "verify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const urls = Array.isArray(body.urls) ? body.urls : [];
      return json({ results: await verify(urls) });
    }

    return json({ error: "Mode inconnu. Utiliser mode=discover|page|verify." }, 400);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};

export const config = { path: "/api/audit" };
