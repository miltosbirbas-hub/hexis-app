// ============================================================================
// HEXIS — Edge Function «oroi-domisis»: πολεοδομικά στοιχεία για ένα γεωτεμάχιο
// από τις δημόσιες υπηρεσίες χαρτών του Ενιαίου Ψηφιακού Χάρτη (ΤΕΕ / ΥΠΕΝ).
// Είσοδος (POST, JWT χρήστη): { x, y, ring?: [[x,y],...] }  — συντεταγμένες ΕΓΣΑ'87 (EPSG:2100)
//   x,y  = εσωτερικό σημείο του γεωτεμαχίου (κύρια αντιστοίχιση)
//   ring = εξωτερικό περίγραμμα (για να φανεί αν το γεωτεμάχιο τέμνει και άλλη ζώνη)
// Έξοδος: { layers: { <key>: [attrs...] }, touches: { <key>: [attrs...] }, src, t }
// Verify JWT: OFF (ο χρήστης ελέγχεται εδώ). Μόνο σταθερά, δημόσια επίπεδα — όχι ανοιχτό proxy.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const ORIGINS = ["https://hexis-app.gr", "https://www.hexis-app.gr", "https://miltosbirbas-hub.github.io"];
const BASE = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/";
const P = "UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/";

// key → διαδρομή επιπέδου
const LAYERS: Record<string, string> = {
  sxedio:    "UDM_SERVICE_POLEOD_RYM_SXD/MapServer/0",     // Όριο πολεοδ. μελέτης – εγκεκριμένο σχέδιο
  oikismos:  P + "3",                                       // Καθορισμένο όριο οικισμού
  ot:        P + "6",                                       // Οικοδομικά τετράγωνα
  ektos:     P + "9",                                       // Περιοχή εκτός σχεδίου
  enotita:   P + "14",                                      // Πολεοδομική ενότητα / τομέας
  ypsos:     P + "16",                                      // Αριθμός ορόφων – ύψος
  artiotita: P + "17",                                      // Αρτιότητα
  kalypsi:   P + "18",                                      // Κάλυψη
  systima:   P + "19",                                      // Οικοδομικό σύστημα
  sd:        P + "20",                                      // Συντελεστής δόμησης
  xriseis_ers: P + "21",                                    // Χρήσεις γης ΕΡΣ
  koinox:    P + "22",                                      // Κοινόχρηστοι – κοινωφελείς χώροι
  archaiol:  P + "23",                                      // Ζώνη αρχαιολογική
  apallotr:  P + "24",                                      // Ζώνη απαλλοτρίωσης
  xriseis_gps: P + "26",                                    // Χρήσεις γης ΓΠΣ
  zoe:       "UDM_SERVICE_RYTHMISEIS_EXOASTIKOU_CHOROU/MapServer/0",  // ΖΟΕ
  pd_prost:  "UDM_SERVICE_RYTHMISEIS_EXOASTIKOU_CHOROU/MapServer/2",  // Ζώνες ΠΔ προστασίας
  rema:      "UDM_SERVICE_RYTHMISEIS_EXOASTIKOU_CHOROU/MapServer/5",  // Ρέματα ιδιαίτερου περιβ. ενδιαφέροντος
  fek_nodiag:"UDM_SERVICE_FEK_NO_SXEDIA_DOCS/MapServer/0",  // ΦΕΚ χωρίς διάγραμμα
};
// επίπεδα όπου μας ενδιαφέρει αν το γεωτεμάχιο «πατάει» και σε άλλη ζώνη
const TOUCH = ["oikismos", "ot", "ektos", "sd", "kalypsi", "ypsos", "artiotita", "zoe", "xriseis_gps", "apallotr", "koinox"];
const DROP = /^(SHAPE|Shape)|STArea|STLength|^GlobalID$|^KEY_FLAG$/;

function cors(origin: string | null) {
  const o = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hx-selftest, range",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges" };
}
// Σαρωμένα γεωαναφερμένα διαγράμματα (GeoTIFF ΕΓΣΑ'87) — μόνο αυτή η διαδρομή του ΕΨΧ
const TIF_PREFIX = "https://sdigmap.tee.gov.gr/_Digitize_LOW/2_GEOREF_EGSA_LOW/";
// έγκυρα tokens σε μνήμη (για να μην ελέγχεται ο χρήστης σε κάθε κομμάτι του TIFF)
const okTokens = new Map<string, number>();
async function userOk(req: Request): Promise<boolean> {
  const st = Deno.env.get("SELFTEST_KEY");
  if (st && req.headers.get("x-hx-selftest") === st) return true;
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const now = Date.now(), t = okTokens.get(auth);
  if (t && t > now) return true;
  const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || ANON, Authorization: auth } });
  if (!u.ok) return false;
  if (okTokens.size > 500) okTokens.clear();
  okTokens.set(auth, now + 10 * 60 * 1000);
  return true;
}

async function q(path: string, geom: string, gtype: string, timeoutMs = 20000): Promise<Record<string, unknown>[] | { error: string }> {
  const params = new URLSearchParams({
    geometry: geom, geometryType: gtype, inSR: "2100", spatialRel: "esriSpatialRelIntersects",
    outFields: "*", returnGeometry: "false", f: "json",
  });
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + path + "/query", {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)", "Referer": "https://sdigmap.tee.gov.gr/sdmquery/public/" },
      body: params.toString(),
    });
    if (!r.ok) return { error: "HTTP " + r.status };
    const j = await r.json();
    if (j.error) return { error: String(j.error.message || j.error.code) };
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    for (const f of (j.features || []).slice(0, 12)) {
      const a: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(f.attributes || {})) {
        if (v === null || v === "" || v === " " || DROP.test(k)) continue;
        a[k] = typeof v === "string" ? v.trim().slice(0, 4000) : v;
      }
      const sig = JSON.stringify({ ...a, OBJECTID: undefined });
      if (seen.has(sig)) continue; seen.add(sig); out.push(a);
    }
    return out;
  } catch (e) {
    return { error: (e as Error).name === "AbortError" ? "timeout" : String(e) };
  } finally { clearTimeout(to); }
}

type HxAttr = Record<string, unknown>;
async function planning(x: number, y: number, ring: number[][] | null) {
  const pt = JSON.stringify({ x, y, spatialReference: { wkid: 2100 } });
  const keys = Object.keys(LAYERS);
  const res = await Promise.all(keys.map((k) => q(LAYERS[k], pt, "esriGeometryPoint")));
  const layers: Record<string, HxAttr[]> = {}; const errors: Record<string, string> = {};
  keys.forEach((k, i) => { const r = res[i]; if (Array.isArray(r)) { if (r.length) layers[k] = r; } else errors[k] = r.error; });
  const touches: Record<string, HxAttr[]> = {};
  if (ring) {
    const pg = JSON.stringify({ rings: [ring.concat([ring[0]])], spatialReference: { wkid: 2100 } });
    const tr = await Promise.all(TOUCH.map((k) => q(LAYERS[k], pg, "esriGeometryPolygon")));
    TOUCH.forEach((k, i) => {
      const r = tr[i]; if (!Array.isArray(r)) return;
      const base = JSON.stringify((layers[k] || []).map((a) => a.OBJECTID).sort());
      const ids = JSON.stringify(r.map((a) => a.OBJECTID).sort());
      if (ids !== base && r.length) touches[k] = r;
    });
  }
  return { layers, touches, errors, src: "Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ)", t: new Date().toISOString() };
}

/* =====================================================================
   Λειτουργία για AutoCAD / progeCAD (Lisp): { action:"lisp", kaek }
   Απάντηση: απλό κείμενο UTF-8, μία γραμμή ΚΛΕΙΔΙ=τιμή (ROW=ετικέτα|τιμή για πίνακα).
   Ίδιοι κανόνες με την ταμπέλα «Όροι Δόμησης» της Νομοθεσίας.
===================================================================== */
const KT = "https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query";
type Ring = number[][];
const sarea = (r: Ring) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], o = r[(i + 1) % r.length]; a += p[0] * o[1] - o[0] * p[1]; } return a / 2; };
const openRing = (r: Ring) => { const o = r.map((p) => [p[0], p[1]]); if (o.length > 1 && o[0][0] === o[o.length - 1][0] && o[0][1] === o[o.length - 1][1]) o.pop(); return o; };
function pip(pt: number[], ring: Ring) { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
function segDist(p: number[], a: number[], b: number[]) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; if (!L2) return Math.hypot(p[0] - a[0], p[1] - a[1]); let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); }
const isEK = (k: string) => /[ΕΚEK]/.test(String(k).slice(4, 8)) && /[^0-9]/.test(String(k));
interface Parcel { kaek: string; outers: Ring[]; holes: Ring[]; area: number }
function parseKT(j: { features?: { attributes?: HxAttr; geometry?: { rings?: number[][][] } }[]; error?: { message?: string } }): Parcel[] {
  if (j.error) throw new Error(j.error.message || "arcgis");
  const out: Parcel[] = [];
  for (const f of j.features || []) {
    const kaek = String((f.attributes || {}).KAEK || ""); const rings = (f.geometry && f.geometry.rings) || [];
    if (!kaek || !rings.length || out.some((p) => p.kaek === kaek)) continue;
    const outers: Ring[] = [], holes: Ring[] = [];
    rings.forEach((r) => { const rr = openRing(r); if (rr.length < 3) return; (sarea(rr) < 0 ? outers : holes).push(rr); });
    if (!outers.length && holes.length) { outers.push(...holes.splice(0)); }
    if (!outers.length) continue;
    const area = outers.reduce((a, r) => a + Math.abs(sarea(r)), 0) - holes.reduce((a, r) => a + Math.abs(sarea(r)), 0);
    out.push({ kaek, outers, holes, area });
  }
  return out;
}
async function ktQuery(params: Record<string, string>): Promise<Parcel[]> {
  const body = new URLSearchParams({ f: "json", inSR: "2100", outSR: "2100", outFields: "KAEK", returnGeometry: "true", spatialRel: "esriSpatialRelIntersects", ...params });
  const r = await fetch(KT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  if (!r.ok) throw new Error("ΚΤ HTTP " + r.status);
  return parseKT(await r.json());
}
function mainOuter(p: Parcel) { return p.outers.slice().sort((a, b) => Math.abs(sarea(b)) - Math.abs(sarea(a)))[0]; }
function interiorPoint(outer: Ring, holes: Ring[]) {
  const inside = (pt: number[]) => pip(pt, outer) && !holes.some((h) => pip(pt, h));
  let cx = 0, cy = 0, A = 0;
  for (let i = 0; i < outer.length; i++) { const p = outer[i], o = outer[(i + 1) % outer.length], f = p[0] * o[1] - o[0] * p[1]; A += f; cx += (p[0] + o[0]) * f; cy += (p[1] + o[1]) * f; }
  if (A) { cx /= 3 * A; cy /= 3 * A; if (inside([cx, cy])) return [cx, cy]; }
  const b = [Infinity, Infinity, -Infinity, -Infinity]; outer.forEach(([x, y]) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); });
  let best: number[] | null = null, bd = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const p = [b[0] + (b[2] - b[0]) * i / 24, b[1] + (b[3] - b[1]) * j / 24]; if (!inside(p)) continue;
    let d = Infinity; for (let k = 0; k < outer.length; k++) d = Math.min(d, segDist(p, outer[k], outer[(k + 1) % outer.length]));
    if (d > bd) { bd = d; best = p; }
  }
  return best || outer[0];
}
function frontage(outer: Ring, nb: Parcel[]) {
  const edges: number[][][] = [];
  nb.filter((n) => isEK(n.kaek)).forEach((n) => n.outers.concat(n.holes).forEach((r) => { for (let i = 0; i < r.length; i++) edges.push([r[i], r[(i + 1) % r.length]]); }));
  if (!edges.length) return null;
  let len = 0;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], b = outer[(i + 1) % outer.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
    const n = Math.max(1, Math.ceil(L / 0.5));
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (edges.some((e) => segDist(p, e[0], e[1]) <= 0.6)) len += L / n; }
  }
  return len;
}
const first = (L: Record<string, HxAttr[]>, k: string) => (L[k] && L[k][0]) || null;
const num = (v: unknown) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : null; };
function smallSettlementRegime(L: Record<string, HxAttr[]>) {
  const recs = ([] as HxAttr[]).concat(L.sd || [], L.kalypsi || [], L.ypsos || [], L.artiotita || []);
  return recs.some((a) => /μέχρι\s*2[.\s]?000\s*κατ/i.test(String(a.TITLE || "")) || (/240\s*τ\.?μ/i.test(String(a.SD_COMMENT || "")) && /400\s*τ\.?μ/i.test(String(a.SD_COMMENT || ""))));
}
function statusOf(L: Record<string, HxAttr[]>) {
  if (L.ot) return "sxedio";
  if (L.oikismos || smallSettlementRegime(L)) return "oikismos";
  const rym = (L.sxedio || []).some((a) => !/ΟΡΙΩΝ ΟΙΚΙΣΜ|ΟΡΙΟΘΕΤΗΣ|ΓΠΣ|ΣΧΟΟΑΠ|ΖΟΕ|ΖΩΝΗΣ ΟΙΚΙΣΤΙΚΟΥ/i.test(String(a.APOF_THEME || "")) && /ΡΥΜΟΤΟΜ|ΠΟΛΕΟΔΟΜΙΚ|ΣΧΕΔΙΟΥ ΠΟΛΕ|ΕΠΕΚΤΑΣ/i.test(String(a.APOF_THEME || "") + " " + String(a.TITLE || "")));
  if (rym) return "sxedio";
  return L.ektos ? "ektos" : "ektos?";
}
const STATUS_TXT: Record<string, string> = { sxedio: "Εντός εγκεκριμένου σχεδίου", oikismos: "Εντός ορίων οικισμού (<2.000 κατ.)", ektos: "Εκτός σχεδίου", "ektos?": "Δεν βρέθηκε σχέδιο ή όριο οικισμού — πιθανώς εκτός σχεδίου" };
function oikismosMax(E: number) {
  if (E <= 200) return { max: E, rule: "γήπεδο έως 200 τ.μ. → ΣΔ 1 (δόμηση = εμβαδόν)" };
  if (E < 700) return { max: 240, rule: "γήπεδο έως 699,99 τ.μ. → μέγιστη δόμηση 240 τ.μ. (+ πατάρι ξηράς δόμησης έως 40 τ.μ.)" };
  return { max: 400, rule: "γήπεδο από 700 τ.μ. → μέγιστη δόμηση 400 τ.μ." };
}
/* εκτός σχεδίου, κατοικία (άρ.256 ν.5306/2026 — ίδιος κανόνας με το OROIDOM) */
function ektosKatoikia(E: number) {
  if (E < 4000) return null;
  if (E <= 8000) return { max: 186 + (E - 4000) * 0.018, rule: "κατοικία, Ε 4.000–8.000 τ.μ.: 186 + (Ε−4.000)×0,018 τ.μ." };
  return { max: Math.min(360, 258 + (E - 8000) * 0.009), rule: "κατοικία, Ε > 8.000 τ.μ.: 258 + (Ε−8.000)×0,009 τ.μ., μέγιστο 360 τ.μ." };
}
const f2 = (n: number | null, d = 2) => n == null || !isFinite(n) ? "" : n.toFixed(d);
const clean = (v: unknown) => String(v ?? "").replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
const gr = (n: number | null, d = 2) => n == null ? "—" : n.toLocaleString("el-GR", { minimumFractionDigits: d, maximumFractionDigits: d });

async function entitled(auth: string): Promise<boolean> {
  const r = await fetch(SB + "/rest/v1/entitlements?select=module,active,expires_at&module=in.(nomothesia,dxf)", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || ANON, Authorization: auth } });
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return (rows || []).some((e: HxAttr) => e.active && (!e.expires_at || new Date(String(e.expires_at)) > new Date()));
}
async function lispAnswer(req: Request, b: HxAttr, C: Record<string, string>) {
  // χαρακτήρες που δεν υπάρχουν στο ANSI 1253 (progeCAD / παλιό AutoCAD) → απλά ισοδύναμα
  const ansi = (t: string) => t.replace(/→/g, ":").replace(/≈/g, "~").replace(/×/g, "x").replace(/÷/g, "/").replace(/−/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=");
  const text = (lines: string[]) => new Response(ansi(lines.join("\r\n")) + "\r\n", { status: 200, headers: { ...C, "Content-Type": "text/plain; charset=utf-8" } });
  const st = Deno.env.get("SELFTEST_KEY");
  const selftest = !!st && req.headers.get("x-hx-selftest") === st;
  if (!selftest && !(await entitled(req.headers.get("authorization") || ""))) return text(["ERR=no_access", "MSG=Ο λογαριασμός δεν έχει ενεργή συνδρομή στη Νομοθεσία ή στη LISP Βιβλιοθήκη του HEXIS-APP."]);
  const kaek = String(b.kaek || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[0-9Α-ΩA-Z]{10,14}$/.test(kaek)) return text(["ERR=bad_kaek", "MSG=Μη έγκυρο ΚΑΕΚ: " + kaek]);
  let hits: Parcel[];
  try { hits = await ktQuery({ where: "KAEK='" + kaek.replace(/'/g, "''") + "'", resultRecordCount: "5" }); }
  catch (e) { return text(["ERR=kt", "MSG=Το Κτηματολόγιο δεν απάντησε (" + clean(String(e)) + ")."]); }
  if (!hits.length) return text(["ERR=not_found", "MSG=Δεν βρέθηκε το ΚΑΕΚ " + kaek + " στο Κτηματολόγιο."]);
  const P = hits[0], outer = mainOuter(P), E = P.area;
  const bb = [Infinity, Infinity, -Infinity, -Infinity]; outer.forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); });
  let nb: Parcel[] = [];
  try { nb = (await ktQuery({ where: "1=1", geometry: [bb[0] - 30, bb[1] - 30, bb[2] + 30, bb[3] + 30].map((v) => v.toFixed(2)).join(","), geometryType: "esriGeometryEnvelope", resultRecordCount: "600" })).filter((n) => n.kaek !== kaek); } catch (_e) { /* χωρίς όμορα */ }
  const fr0 = frontage(outer, nb); const front = fr0 != null && fr0 >= 0.5 ? fr0 : null;
  const ip = interiorPoint(outer, P.holes);
  const plan = await planning(ip[0], ip[1], outer.length <= 1500 ? outer : null);
  const L = plan.layers, stt = statusOf(L);
  const oik = first(L, "oikismos"), ot = first(L, "ot"), kal = first(L, "kalypsi"), yp = first(L, "ypsos"), sy = first(L, "systima");
  const sd = L.sd || [], ar = L.artiotita || [];
  const sd0 = sd.find((a) => num(a.SD_TIMH) != null) || null;
  const art = ar.find((a) => /ΚΑΝΟΝΑ/i.test(String(a.OROS_TYPE || ""))) || ar[0] || null;
  const rymFek = (L.sxedio || []).filter((a) => !/ΟΡΙΩΝ ΟΙΚΙΣΜ|ΓΠΣ|ΣΧΟΟΑΠ/i.test(String(a.APOF_THEME || ""))).map((a) => a.FEK).filter(Boolean);
  const gps = first(L, "xriseis_gps"), zoe = first(L, "zoe");
  // υπολογισμός
  let max: number | null = null, rule = "", kalPct: number | null = num(kal && kal.SYNT_KALYPSIS);
  let artMin = num(art && art.ELAX_EMBADO_M2), artPros = num(art && art.ELAX_PROSOP_M);
  if (stt === "oikismos") { const m = oikismosMax(E); max = m.max; rule = m.rule; kalPct = E < 200 ? Math.max(kalPct || 60, 70) : (kalPct || 60); }
  else if (stt === "sxedio") {
    if (sd0 && /Μέσος/i.test(String(sd0.SD_COMMENT || ""))) {
      // Μέσος ΣΔ τομέα ΓΠΣ: δεν είναι ΣΔ οικοπέδου — δεν βγάζουμε μέγιστη δόμηση
      rule = "Μέσος ΣΔ τομέα ΓΠΣ " + gr(num(sd0.SD_TIMH)) + " — ο ΣΔ του οικοπέδου προκύπτει από το ΦΕΚ του σχεδίου";
    } else if (sd0) { const v = num(sd0.SD_TIMH)!; max = v * E; rule = "ΣΔ " + gr(v) + " × " + gr(E) + " τ.μ.";
      if (smallSettlementRegime(L)) { const m = oikismosMax(E); if (m.max < max) { max = m.max; rule = m.rule + " (όριο οικισμού <2.000 κατ.)"; } } }
  } else { kalPct = 10; artMin = 4000; artPros = 25; const k = ektosKatoikia(E); if (k) { max = k.max; rule = k.rule; } else rule = "γήπεδο < 4.000 τ.μ.: μη άρτιο κατά κανόνα (έλεγχος παρεκκλίσεων άρ.273)"; }
  const artio = artMin == null ? "?" : (E >= artMin && (artPros == null || (front != null && front >= artPros))) ? "1" : (E < artMin ? "0" : "?");
  const out: string[] = ["OK=1", "KAEK=" + kaek, "EMBADON=" + f2(E), "PROSOPO=" + f2(front), "KATASTASI=" + stt, "KATASTASI_TXT=" + STATUS_TXT[stt],
    "OIKISMOS=" + clean(oik && oik.NAME), "DIMOS=" + clean((oik && oik.KALL_DHM_NAME) || (ot && ot.KALL_DHM_NAME) || (sd0 && sd0.KALL_DHM_NAME) || (kal && kal.KALL_DHM_NAME)),
    "OT=" + clean(ot && ot.OT_NUM), "FEK_SXEDIO=" + clean(rymFek[0]), "FEK_OIKISMOU=" + clean(oik && oik.FEK), "FEK_OROI=" + clean((sd0 && sd0.FEK) || (kal && kal.FEK)),
    "GPS=" + (gps ? "1" : "0"), "FEK_GPS=" + clean(gps && gps.FEK), "XRISI=" + clean(gps && (gps.GEN_XRHSH_GPS || gps.GEN_XRHSH)),
    "ZOE=" + (zoe ? "1" : "0"), "FEK_ZOE=" + clean(zoe && zoe.FEK), "ARXAIO=" + (L.archaiol ? "1" : "0"), "REMA=" + (L.rema ? "1" : "0"),
    "APALLOTRIOSI=" + (L.apallotr ? "1" : "0"), "KOINOXRISTO=" + (L.koinox ? "1" : "0"),
    "SD=" + f2(sd0 ? num(sd0.SD_TIMH) : null), "KALYPSI=" + f2(kalPct, 0), "YPSOS=" + f2(num(yp && yp.MAX_HEIGHT_M)), "OROFOI=" + clean(yp && yp.MAX_OROFOI),
    "ART_EMB=" + f2(artMin, 0), "ART_PROS=" + f2(artPros, 1), "ARTIO=" + artio, "SYSTIMA=" + clean(sy && sy.OIK_SYSTHMA),
    "EK=" + (isEK(kaek) ? "1" : "0"), "MAX_DOMISI=" + f2(max), "SAO=" + f2(max != null && E ? max / E : null, 3), "KANONAS=" + clean(rule), "MAX_KALYPSI=" + f2(kalPct != null ? kalPct * E / 100 : null)];
  // πίνακας για OROIDOM
  const row = (l: string, v: string) => { if (v) out.push("ROW=" + l + "|" + clean(v)); };
  row("ΚΑΕΚ", kaek + " · Ε = " + gr(E) + " τ.μ." + (front != null ? " · πρόσωπο ≈ " + gr(front) + " μ." : ""));
  row("ΚΑΤΑΣΤΑΣΗ", STATUS_TXT[stt] + (oik && oik.NAME ? " — " + clean(oik.NAME) : "") + (ot && ot.OT_NUM ? " — Ο.Τ. " + clean(ot.OT_NUM) : ""));
  row("ΜΕΓΙΣΤΗ ΔΟΜΗΣΗ", max != null ? gr(max) + " τ.μ. (" + rule + ")" : rule);
  row("Σ.Α.Ο.", max != null && E ? gr(max / E, 3) + " (μέγιστη δόμηση ÷ εμβαδόν)" : "");
  row("ΣΔ", sd0 ? gr(num(sd0.SD_TIMH)) + (sd0.SD_KLIMAKOTOS === "ΝΑΙ" ? " (κλιμακωτός)" : "") + (sd0.FEK ? " — ΦΕΚ " + clean(sd0.FEK) : "") : (stt.startsWith("ektos") ? "0,18 (άρ.251)" : ""));
  row("ΚΑΛΥΨΗ", kalPct != null ? gr(kalPct, 0) + "% → " + gr(kalPct * E / 100) + " τ.μ." : "");
  row("ΥΨΟΣ / ΟΡΟΦΟΙ", yp ? (num(yp.MAX_HEIGHT_M) != null ? gr(num(yp.MAX_HEIGHT_M)) + " μ." : clean(yp.OROR_MAX_HEIGHT_COMMENT).slice(0, 120)) + (yp.MAX_OROFOI ? " · " + clean(yp.MAX_OROFOI) + " όροφοι" : "") : (stt.startsWith("ektos") ? "7,50 μ. (+1,20 μ. στέγη) · 2 όροφοι" : ""));
  row("ΑΡΤΙΟΤΗΤΑ", artMin != null ? gr(artMin, 0) + " τ.μ." + (artPros != null ? " · πρόσωπο " + gr(artPros, 1) + " μ." : "") + (artio === "1" ? " — ΑΡΤΙΟ κατά κανόνα" : artio === "0" ? " — ΜΗ ΑΡΤΙΟ κατά κανόνα" : "") : "");
  row("ΟΙΚΟΔ. ΣΥΣΤΗΜΑ", clean(sy && sy.OIK_SYSTHMA));
  row("ΧΡΗΣΗ ΓΗΣ", clean(gps && (gps.GEN_XRHSH_GPS || gps.GEN_XRHSH)) + (gps && gps.FEK ? " — ΦΕΚ " + clean(gps.FEK) : ""));
  row("ΖΟΕ", zoe ? "Ναι" + (zoe.FEK ? " — ΦΕΚ " + clean(zoe.FEK) : "") : "");
  if (isEK(kaek)) row("ΠΡΟΣΟΧΗ", "Το ΚΑΕΚ είναι ειδικό/κοινόχρηστο (ΕΚ) — π.χ. δρόμος, ρέμα, πλατεία");
  if (L.archaiol) row("ΠΡΟΣΟΧΗ", "Αρχαιολογική ζώνη");
  if (L.apallotr) row("ΠΡΟΣΟΧΗ", "Ζώνη απαλλοτρίωσης");
  if (L.koinox) row("ΠΡΟΣΟΧΗ", "Κοινόχρηστος / κοινωφελής χώρος");
  if (L.rema) row("ΠΡΟΣΟΧΗ", "Ρέμα ιδιαίτερου ενδιαφέροντος");
  row("ΦΕΚ", [oik && oik.FEK ? "όρια οικισμού " + clean(oik.FEK) : "", rymFek[0] ? "σχέδιο " + clean(rymFek[0]) : "", sd0 && sd0.FEK ? "όροι " + clean(sd0.FEK) : ""].filter(Boolean).join(" · "));
  out.push("NOTE=Πηγές: Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ), Ελληνικό Κτηματολόγιο — ενημερωτικό, δεν υποκαθιστά βεβαίωση ΥΔΟΜ. HEXIS-APP " + new Date().toLocaleDateString("el-GR"));
  return text(out);
}

Deno.serve(async (req) => {
  const C = cors(req.headers.get("origin"));
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...C, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  // GET ?tif=<url>: τμήματα (Range) σαρωμένου διαγράμματος, για ανάγνωση με geotiff.js στον browser
  if (req.method === "GET") {
    const tif = new URL(req.url).searchParams.get("tif") || "";
    if (!tif.startsWith(TIF_PREFIX) || !/^[A-Za-z0-9_\-]+E\.tif$/.test(tif.slice(TIF_PREFIX.length))) return json({ error: "bad_tif" }, 400);
    if (!(await userOk(req))) return json({ error: "login" }, 401);
    const h: Record<string, string> = { "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" };
    const range = req.headers.get("range"); if (range) h["Range"] = range;
    const up = await fetch(tif, { headers: h });
    const oh: Record<string, string> = { ...C, "Content-Type": up.headers.get("content-type") || "image/tiff", "Cache-Control": "private, max-age=3600" };
    for (const k of ["content-range", "content-length", "accept-ranges"]) { const v = up.headers.get(k); if (v) oh[k] = v; }
    return new Response(up.body, { status: up.status, headers: oh });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    // πρόσβαση: συνδεδεμένος χρήστης HEXIS (ή κλειδί αυτοελέγχου του CI)
    if (!(await userOk(req))) return json({ error: "login" }, 401);
    const b = await req.json().catch(() => ({}));
    if (b.action === "lisp") return await lispAnswer(req, b, C);
    const x = Number(b.x), y = Number(b.y);
    // Ελλάδα σε ΕΓΣΑ'87: περίπου x 50.000–1.050.000, y 3.850.000–4.650.000
    if (!(x > 50000 && x < 1050000 && y > 3800000 && y < 4700000)) return json({ error: "bad_coords" }, 400);
    let ring: number[][] | null = null;
    if (Array.isArray(b.ring) && b.ring.length >= 3 && b.ring.length <= 2000) {
      ring = b.ring.map((p: unknown) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN])
        .filter((p: number[]) => isFinite(p[0]) && isFinite(p[1]));
      if (ring!.length < 3) ring = null;
    }
    return json(await planning(x, y, ring));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
