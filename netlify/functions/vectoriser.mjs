// ============================================================
// PAPARMANE Vectoriseur — relais vers l'API Vectorizer.ai
// Les clés restent côté serveur (variables d'environnement Netlify) :
//   VECTORIZER_API_ID, VECTORIZER_API_SECRET   identifiants API Vectorizer.ai
//   VECTORIZER_MODE                            production (défaut), preview, test, test_preview
//   PAPARMANE_ACCESS_KEY                       mot de passe exigé pour dépenser des crédits
// Actions (POST JSON, en-tête X-Paparmane-Key) :
//   status     → configuration, mode, crédits restants
//   vectorize  → { image (base64), maxColors } → SVG + jeton pour retélécharger
//   download   → { token, receipt, options } → fichier dans le format demandé
// ============================================================

const API = "https://api.vectorizer.ai/api/v1";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // limite des requêtes Netlify (6 Mo en base64)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Paparmane-Key",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors },
});

function authHeader() {
  const id = process.env.VECTORIZER_API_ID, secret = process.env.VECTORIZER_API_SECRET;
  if (!id || !secret) return null;
  return "Basic " + Buffer.from(id + ":" + secret).toString("base64");
}

// Erreur renvoyée par Vectorizer.ai → message lisible
async function apiError(res) {
  let msg = "";
  try { const j = await res.json(); msg = j?.error?.message || ""; } catch { /* corps non JSON */ }
  const known = {
    400: "Image ou paramètre refusé par Vectorizer.ai.",
    401: "Identifiants Vectorizer.ai invalides (VECTORIZER_API_ID / VECTORIZER_API_SECRET).",
    402: "Crédits Vectorizer.ai épuisés.",
    429: "Trop de demandes à la fois : réessaie dans un instant.",
  };
  return (known[res.status] || "Vectorizer.ai a répondu une erreur " + res.status + ".") + (msg ? " (" + msg + ")" : "");
}

// Options de la fenêtre de téléchargement → paramètres de l'API
function outputParams(o = {}) {
  const p = {};
  const fmt = ["svg", "pdf", "eps", "dxf", "png"].includes(o.format) ? o.format : "svg";
  p["output.file_format"] = fmt;
  p["output.draw_style"] = { fill: "fill_shapes", stroke: "stroke_shapes", edges: "stroke_edges" }[o.draw] || "fill_shapes";
  p["output.shape_stacking"] = o.stacking === "stacked" ? "stacked" : "cutouts";
  p["output.group_by"] = ["none", "color", "parent", "layer"].includes(o.group) ? o.group : "none";
  p["output.parameterized_shapes.flatten"] = o.shapes === false ? "true" : "false";
  if (o.curves === "lines") {
    for (const c of ["quadratic_bezier", "cubic_bezier", "circular_arc", "elliptical_arc"]) p["output.curves.allowed." + c] = "false";
  }
  if ([0.3, 0.1, 0.03, 0.01].includes(+o.lineFit)) p["output.curves.line_fit_tolerance"] = String(+o.lineFit);
  p["output.gap_filler.enabled"] = o.gap === false ? "false" : "true";
  if (o.gapWidth !== undefined && o.gapWidth !== "") p["output.gap_filler.stroke_width"] = String(Math.min(5, Math.max(0, +o.gapWidth)));
  p["output.gap_filler.non_scaling_stroke"] = o.gapNonScaling === false ? "false" : "true";
  if (o.strokeWidth !== undefined && o.strokeWidth !== "") p["output.strokes.stroke_width"] = String(Math.min(5, Math.max(0, +o.strokeWidth)));
  if (o.strokeOverride) {
    p["output.strokes.use_override_color"] = "true";
    if (/^#[0-9a-f]{6}$/i.test(o.strokeColor || "")) p["output.strokes.override_color"] = o.strokeColor;
  }
  if (fmt === "svg") p["output.svg.fixed_size"] = o.svgFixed === false ? "false" : "true";
  if (fmt === "dxf") p["output.dxf.compatibility_level"] = o.dxf === "arcs" ? "lines_and_arcs" : "lines_only";
  if (o.sizeMode === "scale" && +o.scale > 0) p["output.size.scale"] = String(+o.scale / 100);
  if (o.sizeMode === "custom") {
    const unit = ["px", "in", "cm", "mm", "pt"].includes(o.unit) ? o.unit : "px";
    p["output.size.unit"] = unit;
    if (+o.width > 0) p["output.size.width"] = String(+o.width);
    if (+o.height > 0) p["output.size.height"] = String(+o.height);
    p["output.size.aspect_ratio"] = "preserve_inset";
  }
  return p;
}

const CONTENT_TYPES = { svg: "image/svg+xml", pdf: "application/pdf", eps: "application/postscript", dxf: "application/dxf", png: "image/png" };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non permise." }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }

  const auth = authHeader();
  const accessKey = process.env.PAPARMANE_ACCESS_KEY;
  const mode = ["production", "preview", "test", "test_preview"].includes(process.env.VECTORIZER_MODE) ? process.env.VECTORIZER_MODE : "production";

  if (body.action === "status") {
    const ok = !!accessKey && (req.headers.get("x-paparmane-key") || "") === accessKey;
    const out = { configured: !!auth && !!accessKey, mode, authorized: ok };
    if (ok && auth) {
      try {
        const r = await fetch(API + "/account", { headers: { Authorization: auth } });
        if (r.ok) out.account = await r.json();
      } catch { /* crédits non affichés */ }
    }
    return json(out);
  }

  // Toute action payante exige le mot de passe PAPARMANE
  if (!auth || !accessKey) return json({ error: "Vectorizer.ai n'est pas encore configuré sur ce site." }, 503);
  if ((req.headers.get("x-paparmane-key") || "") !== accessKey) return json({ error: "Mot de passe incorrect." }, 401);

  try {
    if (body.action === "vectorize") {
      const bytes = Buffer.from(String(body.image || ""), "base64");
      if (!bytes.length) return json({ error: "Aucune image reçue." }, 400);
      if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "Image trop lourde (4 Mo maximum)." }, 413);
      const type = /^image\/(png|jpeg|gif|bmp|webp|tiff)$/.test(body.type || "") ? body.type : "image/png";
      const form = new FormData();
      form.append("image", new Blob([bytes], { type }), String(body.filename || "image").replace(/[^\w.-]/g, "_").slice(0, 80));
      form.append("mode", mode);
      form.append("output.file_format", "svg");
      form.append("policy.retention_days", "1"); // garde l'image 1 jour pour retélécharger dans d'autres formats
      const maxColors = Math.round(+body.maxColors || 0);
      if (maxColors > 0) form.append("processing.max_colors", String(Math.min(256, maxColors)));
      const r = await fetch(API + "/vectorize", { method: "POST", headers: { Authorization: auth }, body: form });
      if (!r.ok) return json({ error: await apiError(r) }, r.status === 402 ? 402 : 502);
      return json({
        svg: await r.text(),
        token: r.headers.get("x-image-token") || "",
        receipt: r.headers.get("x-receipt") || "",
        credits: r.headers.get("x-credits-charged") || r.headers.get("x-credits-calculated") || "",
        mode,
      });
    }

    if (body.action === "download") {
      if (!body.token) return json({ error: "Résultat expiré : vectorise l'image à nouveau." }, 400);
      const form = new FormData();
      form.append("image.token", String(body.token));
      if (body.receipt) form.append("receipt", String(body.receipt));
      for (const [k, v] of Object.entries(outputParams(body.options))) form.append(k, v);
      const r = await fetch(API + "/download", { method: "POST", headers: { Authorization: auth }, body: form });
      if (!r.ok) return json({ error: await apiError(r) }, r.status === 402 ? 402 : 502);
      const fmt = outputParams(body.options)["output.file_format"];
      return json({
        file: Buffer.from(await r.arrayBuffer()).toString("base64"),
        contentType: CONTENT_TYPES[fmt],
        format: fmt,
        credits: r.headers.get("x-credits-charged") || "",
      });
    }

    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    return json({ error: "Connexion à Vectorizer.ai impossible : " + (e?.message || e) }, 502);
  }
};

export const config = { path: "/api/vectoriser" };
