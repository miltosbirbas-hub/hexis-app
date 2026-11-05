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
/* ---------- Ε.Μ.Σ.Υ. (Εθνικό Μητρώο Σημείων Υδροληψίας, ΥΠΕΝ — lmt.ypeka.gr): σημεία υδροληψίας γύρω/εντός γεωτεμαχίου ----------
   Είσοδος { action:"emsy", ring:[[x,y],...] (ΕΓΣΑ87), buffer?: m (προεπιλογή 300, έως 2000) }
   Έξοδος { points:[{ code, kwd, x, y, z, kind, status, topo, dimos, inside, dist }], n, src }
   Η υπηρεσία είναι μόνο http (μικτό περιεχόμενο για το site) — γι' αυτό περνά από εδώ. */
const EMSY_URL = "http://lmt.ypeka.gr/arcgis/rest/services/EMSIes/Idrolipsies_for_map_symbol_Service/FeatureServer/0/query";
function d2seg(p: number[], a: number[], b: number[]) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0; return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); }
async function emsyPoints(b: HxAttr) {
  const ring: Ring = (Array.isArray(b.ring) ? b.ring : []).map((p: unknown) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN]).filter((p: number[]) => isFinite(p[0]) && isFinite(p[1]));
  if (ring.length < 3 || ring.length > 3000) return { error: "bad_ring" };
  const buf = Math.min(2000, Math.max(0, Number(b.buffer) || 300));
  const bb = [Infinity, Infinity, -Infinity, -Infinity]; ring.forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); });
  if (!(bb[0] > 50000 && bb[2] < 1050000 && bb[1] > 3800000 && bb[3] < 4700000)) return { error: "bad_coords" };
  const geom = JSON.stringify({ xmin: bb[0] - buf, ymin: bb[1] - buf, xmax: bb[2] + buf, ymax: bb[3] + buf, spatialReference: { wkid: 2100 } });
  const qs = new URLSearchParams({ f: "json", where: "1=1", geometry: geom, geometryType: "esriGeometryEnvelope", inSR: "2100", outSR: "2100", spatialRel: "esriSpatialRelIntersects", returnGeometry: "true", resultRecordCount: "500",
    outFields: "OBJECTID,KWDIKOS_SY,KWDIKOS_EMSY,X_EGSA87,Y_EGSA87,Z,EIDOS_SY,STATUS,TOPWNYMIO,DHMOS_KALLIKRATH,IDIOKTHSIAKO_KATHESTWS,KATHESTWS_XRHSHS" });
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
  let j: HxAttr;
  try { const r = await fetch(EMSY_URL + "?" + qs.toString(), { signal: ctl.signal, headers: { "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" } }); if (!r.ok) return { error: "emsy_http_" + r.status }; j = await r.json(); }
  catch (e) { return { error: "emsy_unreachable", msg: String(e) }; }
  finally { clearTimeout(tm); }
  if (j.error) return { error: "emsy_error", msg: JSON.stringify(j.error) };
  const pts = ((j.features || []) as HxAttr[]).map((f) => {
    const a = (f.attributes || {}) as HxAttr, g = (f.geometry || {}) as HxAttr;
    const x = Number(g.x ?? a.X_EGSA87), y = Number(g.y ?? a.Y_EGSA87);
    let dist = Infinity; for (let i = 0; i < ring.length; i++) dist = Math.min(dist, d2seg([x, y], ring[i], ring[(i + 1) % ring.length]));
    const inside = pip([x, y], ring);
    return { code: String(a.KWDIKOS_EMSY || a.KWDIKOS_SY || a.OBJECTID || ""), kwd: a.KWDIKOS_SY ?? null, x, y, z: a.Z ?? null, kind: String(a.EIDOS_SY || ""), status: String(a.STATUS || ""), topo: String(a.TOPWNYMIO || "").trim(), dimos: String(a.DHMOS_KALLIKRATH || ""), owner: String(a.IDIOKTHSIAKO_KATHESTWS || ""), use: String(a.KATHESTWS_XRHSHS || ""), inside, dist: inside ? 0 : Math.round(dist * 100) / 100 };
  }).filter((p) => isFinite(p.x) && isFinite(p.y)).sort((p, q) => p.dist - q.dist);
  return { points: pts, n: pts.length, buffer: buf, src: "Ε.Μ.Σ.Υ. — ΥΠΕΝ (lmt.ypeka.gr)" };
}

/* ---------- Ακτογραμμή (OpenStreetMap natural=coastline, μέσω Overpass) — ελάχιστη απόσταση του ορίου από τη θάλασσα ----------
   Είσοδος { action:"coast", ring:[[x,y],...] (ΕΓΣΑ87), radius?: m (προεπιλογή 3000, έως 10000) }
   Έξοδος { dist, pt:[x,y], segs, src } ή { dist:null } όταν δεν υπάρχει ακτογραμμή στην ακτίνα. */
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://lz4.overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// ΕΓΣΑ'87 (ΤΜ87, GRS80) ↔ WGS84 — αρκεί η ακρίβεια λίγων μέτρων για το ερώτημα και την απόσταση από την ακτή
const TM = { a: 6378137, f: 1 / 298.257222101, k0: 0.9996, lon0: 24 * Math.PI / 180, x0: 500000 };
function tmInverse(x: number, y: number) {
  const a = TM.a, f = TM.f, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = TM.k0;
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2), T1 = Math.tan(phi1) ** 2, C1 = ep2 * Math.cos(phi1) ** 2, R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5), D = (x - TM.x0) / (N1 * k0);
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = TM.lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(phi1);
  return [lon * 180 / Math.PI, lat * 180 / Math.PI];
}
function tmForward(lon: number, lat: number) {
  const a = TM.a, f = TM.f, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = TM.k0, phi = lat * Math.PI / 180, lam = lon * Math.PI / 180 - TM.lon0;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = lam * Math.cos(phi);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = TM.x0 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120);
  const y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  return [x, y];
}
// WGS84 → ΕΓΣΑ87 με μετάθεση datum: η υπάρχουσα wgsToEgsa(lat, lon) παρακάτω (ίδια παράμετροι με το proj4 του HEXIS).
const coastCache = new Map<string, { t: number; v: HxAttr }>();
async function coastDistance(b: HxAttr) {
  const ring: Ring = (Array.isArray(b.ring) ? b.ring : []).map((p: unknown) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN]).filter((p: number[]) => isFinite(p[0]) && isFinite(p[1]));
  if (ring.length < 3 || ring.length > 3000) return { error: "bad_ring" };
  const rad = Math.min(10000, Math.max(500, Number(b.radius) || 3000));
  const bb = [Infinity, Infinity, -Infinity, -Infinity]; ring.forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); });
  if (!(bb[0] > 50000 && bb[2] < 1050000 && bb[1] > 3800000 && bb[3] < 4700000)) return { error: "bad_coords" };
  const key = [Math.round(bb[0] / 500), Math.round(bb[1] / 500), Math.round(bb[2] / 500), Math.round(bb[3] / 500), rad].join(",");
  const now = Date.now(), hit = coastCache.get(key);
  let segs: number[][][] | null = hit && hit.t > now ? (hit.v.segs as number[][][]) : null, src = "";
  if (!segs) {
    const sw = tmInverse(bb[0] - rad, bb[1] - rad), ne = tmInverse(bb[2] + rad, bb[3] + rad);
    const bboxS = sw[1].toFixed(5) + "," + sw[0].toFixed(5) + "," + ne[1].toFixed(5) + "," + ne[0].toFixed(5);
    const q = '[out:json][timeout:12];way["natural"="coastline"](' + bboxS + ");out geom;";
    const errs: string[] = [];
    // 1) Overpass: όλοι οι servers παράλληλα, κερδίζει ο πρώτος που απαντά σωστά (12 s)
    const one = (u: string) => (async () => {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
      try { const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" }, signal: ctl.signal }); const txt = await r.text(); if (!r.ok) throw new Error("HTTP " + r.status); const j = JSON.parse(txt); if (!Array.isArray(j.elements)) throw new Error("bad json"); return { j, u }; }
      finally { clearTimeout(tm); }
    })();
    let got: { j: HxAttr; u: string } | null = null;
    try { got = await Promise.any(OVERPASS.map(one)); } catch (e) { errs.push("overpass: " + String((e as AggregateError).errors?.map((x: unknown) => String(x).slice(0, 60)).join(" | ") || e)); }
    segs = [];
    if (got) {
      for (const w of (got.j.elements || []) as HxAttr[]) { const g = ((w.geometry || []) as HxAttr[]).map((n) => wgsToEgsa(Number(n.lat), Number(n.lon))); for (let i = 0; i + 1 < g.length; i++) segs.push([g[i], g[i + 1]]); }
      src = got.u;
    } else {
      // 2) Εφεδρικά: επίσημο OSM API (map call) — όλα τα δεδομένα του bbox, κρατάμε μόνο τις ακτογραμμές· μικρότερο bbox αν είναι μεγάλο
      for (const r2 of [Math.min(rad, 2000), 1000, 500]) {
        const s2 = tmInverse(bb[0] - r2, bb[1] - r2), n2 = tmInverse(bb[2] + r2, bb[3] + r2);
        const u = "https://api.openstreetmap.org/api/0.6/map?bbox=" + s2[0].toFixed(5) + "," + s2[1].toFixed(5) + "," + n2[0].toFixed(5) + "," + n2[1].toFixed(5);
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 25000);
        try {
          const r = await fetch(u, { headers: { "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" }, signal: ctl.signal });
          const xml = await r.text();
          if (!r.ok) { errs.push("osm-api r" + r2 + ": HTTP " + r.status); continue; }
          const nodes = new Map<string, number[]>();
          for (const m of xml.matchAll(/<node id="(\d+)"[^>]*? lat="(-?[\d.]+)" lon="(-?[\d.]+)"/g)) nodes.set(m[1], wgsToEgsa(Number(m[2]), Number(m[3])));
          for (const wm of xml.matchAll(/<way id="\d+"[^>]*>([\s\S]*?)<\/way>/g)) {
            const body = wm[1]; if (!/<tag k="natural" v="coastline"\/>/.test(body)) continue;
            const refs = [...body.matchAll(/<nd ref="(\d+)"\/>/g)].map((x) => nodes.get(x[1])).filter((p): p is number[] => !!p);
            for (let i = 0; i + 1 < refs.length; i++) segs.push([refs[i], refs[i + 1]]);
          }
          src = "https://api.openstreetmap.org"; break;
        } catch (e) { errs.push("osm-api r" + r2 + ": " + String(e).slice(0, 60)); }
        finally { clearTimeout(tm); }
      }
      if (!src) return { error: "coast_unreachable", msg: errs.join(" · ") };
    }
    if (coastCache.size > 300) coastCache.clear();
    coastCache.set(key, { t: now + 6 * 3600e3, v: { segs } });
  }
  if (!segs.length) return { dist: null, segs: 0, radius: rad, src: src || "cache" };
  let best = Infinity, bp: number[] | null = null;
  function foot(p: number[], a: number[], c: number[]) { const dx = c[0] - a[0], dy = c[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0; return [a[0] + t * dx, a[1] + t * dy]; }
  for (const [a, c] of segs) {
    for (const v of ring) { const f = foot(v, a, c), d = Math.hypot(v[0] - f[0], v[1] - f[1]); if (d < best) { best = d; bp = f; } }
    for (const cp of [a, c]) for (let k = 0; k < ring.length; k++) { const f = foot(cp, ring[k], ring[(k + 1) % ring.length]), d = Math.hypot(cp[0] - f[0], cp[1] - f[1]); if (d < best) { best = d; bp = cp; } }
  }
  return { dist: Math.round(best * 100) / 100, pt: bp ? [Math.round(bp[0] * 100) / 100, Math.round(bp[1] * 100) / 100] : null, segs: segs.length, radius: rad, src: src ? "OpenStreetMap (" + new URL(src).host + ")" : "OpenStreetMap (cache)" };
}

/* ---------- Δασικοί χάρτες (ΕΨΧ: αναρτημένοι 2022 + μερικώς κυρωμένοι 2021, ανά Περιφέρεια) + Natura 2000 — πολύγωνα που τέμνουν το γεωτεμάχιο ----------
   Είσοδος { action:"forest", ring:[[x,y],...] }  Έξοδος { features:[{ layerId, layerName, set:'2022'|'2021', cat, cat1, cat2, ota, nomos, rings:[[[x,y],...]] }], natura:[{...}], src } */
const FOREST_MS = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/UDM_SERVICE_NATURA_DASIKA/MapServer";
const FOREST_2022 = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28], FOREST_2021 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
function ringOf(b: HxAttr): Ring | null { const ring: Ring = (Array.isArray(b.ring) ? b.ring : []).map((p: unknown) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN]).filter((p: number[]) => isFinite(p[0]) && isFinite(p[1])); if (ring.length < 3 || ring.length > 3000) return null; const bb = bboxOf(ring); if (!(bb[0] > 50000 && bb[2] < 1050000 && bb[1] > 3800000 && bb[3] < 4700000)) return null; return ring; }
function bboxOf(ring: Ring) { const bb = [Infinity, Infinity, -Infinity, -Infinity]; ring.forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }); return bb; }
async function identifyMS(ms: string, ring: Ring, layers: number[], buffer: number) {
  const bb = bboxOf(ring), ext = [bb[0] - buffer, bb[1] - buffer, bb[2] + buffer, bb[3] + buffer];
  const geom = JSON.stringify({ rings: [ring.concat([ring[0]])], spatialReference: { wkid: 2100 } });
  const qs = new URLSearchParams({ f: "json", geometry: geom, geometryType: "esriGeometryPolygon", sr: "2100", layers: "all:" + layers.join(","), tolerance: String(Math.round(buffer)), mapExtent: ext.map((v) => v.toFixed(2)).join(","), imageDisplay: "800,800,96", returnGeometry: "true" });
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
  try { const r = await fetch(ms + "/identify?" + qs.toString(), { signal: ctl.signal, headers: { "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" } }); if (!r.ok) throw new Error("HTTP " + r.status); const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return (j.results || []) as HxAttr[]; }
  finally { clearTimeout(tm); }
}
async function forestPolys(b: HxAttr) {
  const ring = ringOf(b); if (!ring) return { error: "bad_ring" };
  let res: HxAttr[];
  try { res = await identifyMS(FOREST_MS, ring, [0].concat(FOREST_2022, FOREST_2021), 0); } catch (e) { return { error: "forest_unreachable", msg: String(e).slice(0, 120) }; }
  const feats: HxAttr[] = [], natura: HxAttr[] = [];
  for (const r of res) {
    const a = (r.attributes || {}) as HxAttr, g = (r.geometry || {}) as HxAttr, lid = Number(r.layerId);
    if (lid === 0) { natura.push({ name: String(a["Ονομασία"] ?? a["SITE_NAME"] ?? a["NAME"] ?? "").trim(), code: String(a["Κωδικός"] ?? a["SITE_CODE"] ?? a["CODE"] ?? "").trim(), type: String(a["Τύπος "] ?? a["Τύπος"] ?? a["SITE_TYPE"] ?? "").trim() }); continue; }
    const rings = ((g.rings || []) as number[][][]).map((rg) => rg.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]));
    if (!rings.length) continue;
    feats.push({ layerId: lid, layerName: String(r.layerName || ""), set: FOREST_2022.includes(lid) ? "2022" : "2021", cat: String(a["Χαρακτηρισμός Έκτασης"] ?? a["KATHGORDX"] ?? "").trim(), cat1: String(a["Χαρακτηρισμός Έκτασης 1"] ?? a["KATHGORAL1"] ?? "").trim(), cat2: String(a["Χαρακτηρισμός Έκτασης 2"] ?? a["KATHGORAL2"] ?? "").trim(), ota: String(a["ΟΤΑ"] ?? a["OTA"] ?? ""), nomos: String(a["Νομός"] ?? a["NOMOS"] ?? ""), code: String(a["Κωδικός"] ?? a["CODE"] ?? ""), rings });
  }
  return { features: feats, natura, n: feats.length, src: "Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ) — δασικοί χάρτες" };
}

/* ---------- Αιγιαλός (Δημόσια Περιουσία, GSIS): καθορισμοί οριογραμμής αιγιαλού–παραλίας κοντά στο γεωτεμάχιο (ΥΥΝ, ΦΕΚ, τοπωνύμιο) ----------
   Είσοδος { action:"aigialos", ring, buffer?: m (προεπιλογή 500, έως 5000) }  Έξοδος { items:[{ id, sysId, yyn, fek, fekDate, place, dist, inside }], src } */
const AIGIALOS_Q = "https://maps.gsis.gr/gspp/maps/rest/services/Dhpe/AIGIALOS_BBOX/MapServer/0/query";
async function aigialosFek(b: HxAttr) {
  const ring = ringOf(b); if (!ring) return { error: "bad_ring" };
  const buf = Math.min(5000, Math.max(0, Number(b.buffer) || 500)), bb = bboxOf(ring);
  const geom = JSON.stringify({ xmin: bb[0] - buf, ymin: bb[1] - buf, xmax: bb[2] + buf, ymax: bb[3] + buf, spatialReference: { wkid: 2100 } });
  const qs = new URLSearchParams({ f: "json", where: "1=1", geometry: geom, geometryType: "esriGeometryEnvelope", inSR: "2100", outSR: "2100", spatialRel: "esriSpatialRelIntersects", outFields: "GI_FORESHORE_ID,SYS_ID,YYN_NUM,FEK_NUM,FEK_DT,PLACE_NAME,BBOX_AREA", returnGeometry: "true", resultRecordCount: "50", orderByFields: "BBOX_AREA ASC" });
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
  let j: HxAttr;
  try { const r = await fetch(AIGIALOS_Q + "?" + qs.toString(), { signal: ctl.signal, headers: { "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" } }); if (!r.ok) return { error: "aigialos_http_" + r.status }; j = await r.json(); }
  catch (e) { return { error: "aigialos_unreachable", msg: String(e).slice(0, 120) }; }
  finally { clearTimeout(tm); }
  if (j.error) return { error: "aigialos_error", msg: JSON.stringify(j.error).slice(0, 200) };
  const items = ((j.features || []) as HxAttr[]).map((f) => {
    const a = (f.attributes || {}) as HxAttr, g = (f.geometry || {}) as HxAttr, rings = (g.rings || []) as number[][][];
    // απόσταση του ορίου από το πλαίσιο (bbox) του καθορισμού· 0 αν τέμνονται
    let dist = Infinity, inside = false;
    for (const rg of rings) { if (ring.some((v) => pip(v, rg)) || rg.some((v) => pip(v, ring))) { dist = 0; inside = true; break; } for (let i = 0; i + 1 < rg.length; i++) for (const v of ring) dist = Math.min(dist, d2seg(v, rg[i], rg[i + 1])); }
    const dt = a.FEK_DT != null ? new Date(Number(a.FEK_DT)) : null;
        const yyn = String(a.YYN_NUM || "").trim(), poa = /ΠΟΑ|ΠΑΛΑΙ/i.test(yyn); // ΠΟΑ = παλαιός αιγιαλός (επικυρωτικές/διαπιστωτικές, συνήθως με τεράστιο πλαίσιο)
    return { id: a.GI_FORESHORE_ID, sysId: a.SYS_ID, yyn, fek: String(a.FEK_NUM || ""), fekDate: dt && isFinite(dt.getTime()) ? dt.toISOString().slice(0, 10) : "", place: String(a.PLACE_NAME || "").trim(), bboxArea: Number(a.BBOX_AREA) || null, poa, dist: isFinite(dist) ? Math.round(dist * 10) / 10 : null, inside };
  }).sort((p, q) => (p.poa ? 1 : 0) - (q.poa ? 1 : 0) || (p.dist ?? 1e9) - (q.dist ?? 1e9) || (p.bboxArea ?? 1e18) - (q.bboxArea ?? 1e18));
  return { items, n: items.length, buffer: buf, src: "Δημόσια Περιουσία — Αιγιαλός (ΓΓΠΣ/gsis.gr)" };
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


/* =====================================================================
   Απόσπασμα ρυμοτομικού για AutoCAD / progeCAD (Lisp): { action:"lisp_extract", kaek }
   Επιστρέφει γραμμές κειμένου με τις ψηφιοποιημένες γραμμές του ΕΨΧ, το γεωτεμάχιο,
   τα γεωτεμάχια της περιοχής και τους αριθμούς Ο.Τ., ψαλιδισμένα στην περιοχή του αποσπάσματος
   (ολόκληρο το Ο.Τ. του γεωτεμαχίου + περιθώριο). Συντεταγμένες σχετικές με τη γωνία (xmin,ymin).
===================================================================== */
type Pt = number[];
function clipSeg(a: Pt, b: Pt, bb: number[]): [Pt, Pt] | null {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  const pq: [number, number][] = [[-dx, a[0] - bb[0]], [dx, bb[2] - a[0]], [-dy, a[1] - bb[1]], [dy, bb[3] - a[1]]];
  for (const [p, q] of pq) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}
function clipPath(pts: Pt[], bb: number[]): Pt[][] {
  const out: Pt[][] = []; let cur: Pt[] | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const c = clipSeg(pts[i], pts[i + 1], bb);
    if (!c) { if (cur) { out.push(cur); cur = null; } continue; }
    if (cur && Math.hypot(cur[cur.length - 1][0] - c[0][0], cur[cur.length - 1][1] - c[0][1]) < 1e-6) cur.push(c[1]);
    else { if (cur) out.push(cur); cur = [c[0], c[1]]; }
    if (c[1][0] !== pts[i + 1][0] || c[1][1] !== pts[i + 1][1]) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((p) => p.length >= 2);
}
async function geoQ(layer: number, geom: string, gtype: string, fields: string): Promise<{ a: HxAttr; g: { rings?: number[][][]; paths?: number[][][] } }[]> {
  const body = new URLSearchParams({ geometry: geom, geometryType: gtype, inSR: "2100", outSR: "2100", spatialRel: "esriSpatialRelIntersects", outFields: fields, returnGeometry: "true", maxAllowableOffset: "0.03", resultRecordCount: "1500", f: "json" });
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(BASE + P + layer + "/query", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)", "Referer": "https://sdigmap.tee.gov.gr/sdmquery/public/" }, body: body.toString() });
    if (!r.ok) return [];
    const j = await r.json(); if (j.error) return [];
    return (j.features || []).map((f: { attributes?: HxAttr; geometry?: { rings?: number[][][]; paths?: number[][][] } }) => ({ a: f.attributes || {}, g: f.geometry || {} }));
  } catch (_e) { return []; } finally { clearTimeout(to); }
}

/* ΕΓΣΑ'87 (TM87) <-> WGS84 — για τα ονόματα οδών από το OpenStreetMap */
const GA = 6378137.0, GF = 1 / 298.257222101, GE2 = GF * (2 - GF), K0 = 0.9996, L0 = 24 * Math.PI / 180;
function tmInv(x: number, y: number): [number, number] {
  const e1 = (1 - Math.sqrt(1 - GE2)) / (1 + Math.sqrt(1 - GE2)), M = y / K0, mu = M / (GA * (1 - GE2 / 4 - 3 * GE2 * GE2 / 64 - 5 * GE2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const ep2 = GE2 / (1 - GE2), C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, N1 = GA / Math.sqrt(1 - GE2 * Math.sin(p1) ** 2), R1 = GA * (1 - GE2) / (1 - GE2 * Math.sin(p1) ** 2) ** 1.5, D = (x - 500000) / (N1 * K0);
  const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = L0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(p1);
  return [lat, lon];
}
function tmFwd(lat: number, lon: number): [number, number] {
  const ep2 = GE2 / (1 - GE2), N = GA / Math.sqrt(1 - GE2 * Math.sin(lat) ** 2), T = Math.tan(lat) ** 2, C = ep2 * Math.cos(lat) ** 2, A = Math.cos(lat) * (lon - L0);
  const M = GA * ((1 - GE2 / 4 - 3 * GE2 * GE2 / 64 - 5 * GE2 ** 3 / 256) * lat - (3 * GE2 / 8 + 3 * GE2 * GE2 / 32 + 45 * GE2 ** 3 / 1024) * Math.sin(2 * lat) + (15 * GE2 * GE2 / 256 + 45 * GE2 ** 3 / 1024) * Math.sin(4 * lat) - (35 * GE2 ** 3 / 3072) * Math.sin(6 * lat));
  const x = 500000 + K0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120);
  const y = K0 * (M + N * Math.tan(lat) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  return [x, y];
}
// GGRS87 <-> WGS84 (μετάθεση γεωκέντρου -199.87, 74.79, 246.62 μ.)
const DX = -199.87, DY = 74.79, DZ = 246.62;
function geo2xyz(lat: number, lon: number) { const N = GA / Math.sqrt(1 - GE2 * Math.sin(lat) ** 2); return [N * Math.cos(lat) * Math.cos(lon), N * Math.cos(lat) * Math.sin(lon), N * (1 - GE2) * Math.sin(lat)]; }
function xyz2geo(X: number, Y: number, Z: number): [number, number] { const p = Math.hypot(X, Y); let lat = Math.atan2(Z, p * (1 - GE2)); for (let i = 0; i < 6; i++) { const N = GA / Math.sqrt(1 - GE2 * Math.sin(lat) ** 2); lat = Math.atan2(Z + GE2 * N * Math.sin(lat), p); } return [lat, Math.atan2(Y, X)]; }
function egsaToWgs(x: number, y: number): [number, number] { const [la, lo] = tmInv(x, y); const [X, Y, Z] = geo2xyz(la, lo); const [a, b] = xyz2geo(X + DX, Y + DY, Z + DZ); return [a * 180 / Math.PI, b * 180 / Math.PI]; }
function wgsToEgsa(latD: number, lonD: number): [number, number] { const [X, Y, Z] = geo2xyz(latD * Math.PI / 180, lonD * Math.PI / 180); const [a, b] = xyz2geo(X - DX, Y - DY, Z - DZ); return tmFwd(a, b); }
async function osmStreets(bb: number[]): Promise<{ name: string; pts: Pt[] }[]> {
  const sw = egsaToWgs(bb[0], bb[1]), ne = egsaToWgs(bb[2], bb[3]);
  const qq = `[out:json][timeout:12];way["highway"]["name"](${Math.min(sw[0], ne[0]).toFixed(6)},${Math.min(sw[1], ne[1]).toFixed(6)},${Math.max(sw[0], ne[0]).toFixed(6)},${Math.max(sw[1], ne[1]).toFixed(6)});out geom;`;
  for (const host of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(host, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)" }, body: "data=" + encodeURIComponent(qq) });
      if (!r.ok) continue;
      const j = await r.json();
      return (j.elements || []).filter((e: { geometry?: unknown[]; tags?: Record<string, string> }) => e.geometry && e.tags && (e.tags["name:el"] || e.tags.name))
        .map((e: { geometry: { lat: number; lon: number }[]; tags: Record<string, string> }) => ({ name: e.tags["name:el"] || e.tags.name, pts: e.geometry.map((g) => wgsToEgsa(g.lat, g.lon)) }));
    } catch (_e) { /* επόμενος διακομιστής */ } finally { clearTimeout(to); }
  }
  return [];
}
async function lispExtract(req: Request, b: HxAttr, C: Record<string, string>) {
  const text = (lines: string[]) => new Response(lines.join("\r\n") + "\r\n", { status: 200, headers: { ...C, "Content-Type": "text/plain; charset=utf-8" } });
  const st = Deno.env.get("SELFTEST_KEY");
  const selftest = !!st && req.headers.get("x-hx-selftest") === st;
  if (!selftest && !(await entitled(req.headers.get("authorization") || ""))) return text(["ERR=no_access", "MSG=Ο λογαριασμός δεν έχει ενεργή συνδρομή στη Νομοθεσία ή στη LISP Βιβλιοθήκη του HEXIS-APP."]);
  const kaek = String(b.kaek || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[0-9Α-ΩA-Z]{10,14}$/.test(kaek)) return text(["ERR=bad_kaek", "MSG=Μη έγκυρο ΚΑΕΚ: " + kaek]);
  let hits: Parcel[];
  try { hits = await ktQuery({ where: "KAEK='" + kaek.replace(/'/g, "''") + "'", resultRecordCount: "5" }); }
  catch (e) { return text(["ERR=kt", "MSG=Το Κτηματολόγιο δεν απάντησε (" + clean(String(e)) + ")."]); }
  if (!hits.length) return text(["ERR=not_found", "MSG=Δεν βρέθηκε το ΚΑΕΚ " + kaek + " στο Κτηματολόγιο."]);
  const Pm = hits[0], outer = mainOuter(Pm), ip = interiorPoint(outer, Pm.holes);
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (r: Ring) => r.forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); });
  Pm.outers.forEach(grow);
  // ολόκληρο το Ο.Τ. του γεωτεμαχίου
  const ots = await geoQ(6, JSON.stringify({ x: ip[0], y: ip[1], spatialReference: { wkid: 2100 } }), "esriGeometryPoint", "OT_NUM,FEK");
  let otNum = "";
  const otF = ots.find((f) => f.g.rings && f.g.rings.length);
  if (otF) { otNum = String(otF.a.OT_NUM || ""); const w0 = bb[2] - bb[0], h0 = bb[3] - bb[1]; const ob = [Infinity, Infinity, -Infinity, -Infinity];
    otF.g.rings!.forEach((r) => r.forEach(([x, y]) => { ob[0] = Math.min(ob[0], x); ob[1] = Math.min(ob[1], y); ob[2] = Math.max(ob[2], x); ob[3] = Math.max(ob[3], y); }));
    // όχι τέρας: αν το Ο.Τ. είναι τεράστιο (π.χ. εκτός σχεδίου) κρατάμε έως 6× το γεωτεμάχιο
    if ((ob[2] - ob[0]) < Math.max(400, 6 * w0) && (ob[3] - ob[1]) < Math.max(400, 6 * h0)) { bb[0] = Math.min(bb[0], ob[0]); bb[1] = Math.min(bb[1], ob[1]); bb[2] = Math.max(bb[2], ob[2]); bb[3] = Math.max(bb[3], ob[3]); } }
  let w = bb[2] - bb[0], h = bb[3] - bb[1];
  const m = Math.max(12, 0.15 * Math.max(w, h));
  bb[0] -= m; bb[1] -= m; bb[2] += m; bb[3] += m; w = bb[2] - bb[0]; h = bb[3] - bb[1];
  // αναλογία πλαισίου 4:3 έως 3:4
  if (w / h > 1.4) { const d = (w / 1.4 - h) / 2; bb[1] -= d; bb[3] += d; } else if (h / w > 1.2) { const d = (h / 1.2 - w) / 2; bb[0] -= d; bb[2] += d; }
  const env = [bb[0], bb[1], bb[2], bb[3]].map((v) => v.toFixed(2)).join(",");
  const out: string[] = ["OK=1", "KAEK=" + kaek, "BBOX=" + bb.map((v) => v.toFixed(2)).join("|"), "OT=" + otNum];
  const P2 = (p: Pt) => (p[0] - bb[0]).toFixed(2) + "," + (p[1] - bb[1]).toFixed(2);
  const add = (layer: string, pts: Pt[], closed: boolean) => {
    const paths = closed ? clipPath(pts.concat([pts[0]]), bb) : clipPath(pts, bb);
    for (const pa of paths) out.push("G=" + layer + "|" + pa.map(P2).join(";"));
  };
  // γεωτεμάχια περιοχής (Κτηματολόγιο) — και το ΚΑΕΚ του καθενός
  const kaekLbl: string[] = [];
  const streetsP = osmStreets(bb).catch(() => []);
  try {
    const all = await ktQuery({ where: "1=1", geometry: env, geometryType: "esriGeometryEnvelope", resultRecordCount: "800" });
    for (const pc of all) {
      if (pc.kaek === kaek) continue;
      pc.outers.concat(pc.holes).forEach((r) => add("HX_KT_GEOTEMAXIA", r, true));
      const c = interiorPoint(mainOuter(pc), pc.holes);
      if (c[0] > bb[0] && c[0] < bb[2] && c[1] > bb[1] && c[1] < bb[3]) kaekLbl.push("T=HX_KAEK_OMORA|" + P2(c) + "|" + pc.kaek);
    }
  } catch (_e) { /* χωρίς γειτονικά */ }
  const fekSet = new Set<string>();
  const defs: [number, string][] = [[3, "HX_ORIO_OIKISMOU"], [22, "HX_KOINOXRISTA"], [6, "HX_OT"], [13, "HX_POL_GRAMMES"], [12, "HX_OIKODOMIKI"], [11, "HX_RYMOTOMIKI"]];
  const res = await Promise.all(defs.map(([id]) => geoQ(id, env, "esriGeometryEnvelope", id === 6 ? "OT_NUM,FEK" : "FEK")));
  defs.forEach(([id, layer], i) => res[i].forEach((f) => {
    if (f.a.FEK && id !== 3) fekSet.add(String(f.a.FEK));
    (f.g.rings || []).forEach((r) => add(layer, openRing(r), true));
    (f.g.paths || []).forEach((pa) => add(layer, pa, false));
    if (id === 6 && f.a.OT_NUM && f.g.rings && f.g.rings.length) {
      const r = openRing(f.g.rings[0]), c = interiorPoint(r, []);
      if (c[0] > bb[0] && c[0] < bb[2] && c[1] > bb[1] && c[1] < bb[3]) out.push("T=HX_OT_ARITHMOS|" + P2(c) + "|" + clean(String(f.a.OT_NUM)));
    }
  }));
  out.push(...kaekLbl);
  // ονόματα οδών: OpenStreetMap (άξονας οδού)· αλλιώς από τις διευθύνσεις του ΕΨΧ (κέντρο & διεύθυνση των αριθμών της οδού)
  const seenSt = new Map<string, number>();
  const osm = await streetsP;
  if (!osm.length) {
    try {
      const body = new URLSearchParams({ geometry: env, geometryType: "esriGeometryEnvelope", inSR: "2100", outSR: "2100", spatialRel: "esriSpatialRelIntersects", outFields: "ADDR", returnGeometry: "true", resultRecordCount: "2000", f: "json" });
      const r = await fetch(BASE + "UDM_SERVICE_BUILDINGS/MapServer/1/query", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)", "Referer": "https://sdigmap.tee.gov.gr/sdmquery/public/" }, body: body.toString() });
      const j = r.ok ? await r.json() : {};
      const by = new Map<string, Pt[]>();
      for (const f of j.features || []) { const n = clean(String((f.attributes || {}).ADDR || "")); const g = f.geometry || {}; if (!n || g.x == null) continue; if (!by.has(n)) by.set(n, []); by.get(n)!.push([g.x, g.y]); }
      for (const [name, pts] of by) {
        if (pts.length < 2) continue;
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        let sxx = 0, syy = 0, sxy = 0; pts.forEach((p) => { sxx += (p[0] - cx) ** 2; syy += (p[1] - cy) ** 2; sxy += (p[0] - cx) * (p[1] - cy); });
        let ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI;
        // μέσο σημείο ανάμεσα στις δύο πλευρές της οδού: το κέντρο προβάλλεται στον άξονα των σημείων
        if (cx > bb[0] && cx < bb[2] && cy > bb[1] && cy < bb[3]) out.push("R=HX_ODOI|" + P2([cx, cy]) + "|" + ang.toFixed(4) + "|" + name);
      }
    } catch (_e) { /* χωρίς ονόματα οδών */ }
  }
  for (const st of osm) {
    for (const pa of clipPath(st.pts, bb)) {
      let best = -1, bi = 0;
      for (let i = 0; i < pa.length - 1; i++) { const L = Math.hypot(pa[i + 1][0] - pa[i][0], pa[i + 1][1] - pa[i][1]); if (L > best) { best = L; bi = i; } }
      if (best < 12) continue;
      const a0 = pa[bi], a1 = pa[bi + 1], mid = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
      const key = st.name.toUpperCase(); const prev = seenSt.get(key) || 0;
      if (prev >= 2) continue;   // το πολύ 2 ετικέτες ανά οδό
      let ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI;
      seenSt.set(key, prev + 1);
      out.push("R=HX_ODOI|" + P2(mid) + "|" + ang.toFixed(4) + "|" + clean(st.name));
    }
  }
  // το γεωτεμάχιο τελευταίο (από πάνω)
  Pm.outers.concat(Pm.holes).forEach((r) => add("HX_PST_KAEK", r, true));
  out.push("T=HX_PST_KAEK|" + P2(ip) + "|" + kaek);
  out.push("FEKS=" + [...fekSet].slice(0, 8).join(", "));
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
    if (b.action === "lisp_extract") return await lispExtract(req, b, C);
    if (b.action === "emsy") return json(await emsyPoints(b));
    if (b.action === "coast") return json(await coastDistance(b));
    if (b.action === "forest") return json(await forestPolys(b));
    if (b.action === "aigialos") return json(await aigialosFek(b));
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
