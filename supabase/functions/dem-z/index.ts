// ============================================================================
// HEXIS — Edge Function «dem-z»: υψόμετρο εδάφους από το Copernicus DEM GLO-30
// Διαβάζει τα επίσημα COG του Copernicus GLO-30 (AWS Open Data, s3://copernicus-dem-30m)
// με range requests και δίνει διγραμμική παρεμβολή στο σημείο. Ο browser δεν μπορεί να
// τα διαβάσει απευθείας (το bucket δεν στέλνει CORS) — γι' αυτό περνούν από εδώ.
// Είσοδος (GET): ?p=lon,lat;lon,lat;…   (έως 12 σημεία, WGS84 δεκαδικές μοίρες)
// Έξοδος: { z:[m|null,…], f:["s"=θάλασσα|"c"=ακτή|"",…], src:"Copernicus GLO-30" }   (υψόμετρα EGM2008, DSM)
// Χρήση: ktimatologio.html (εκτίμηση Z). Verify JWT: OFF (δημόσια ανοιχτά δεδομένα).
// Πηγή: Copernicus DEM — © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018,
// provided under COPERNICUS by the European Union and ESA; all rights reserved.
// ============================================================================
import { fromUrl } from "npm:geotiff@2.1.3";

const ORIGINS = ["https://hexis-app.gr", "https://www.hexis-app.gr", "https://miltosbirbas-hub.github.io"];
function cors(origin: string | null) {
  const o = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
}

// ανοιχτά αρχεία ανά πλακίδιο 1°×1° (μένουν όσο ζει η instance)
const files = new Map<string, Promise<any>>();
function tileUrl(lat: number, lon: number) {
  const la = Math.floor(lat), lo = Math.floor(lon);
  const n = `Copernicus_DSM_COG_10_${la >= 0 ? "N" : "S"}${String(Math.abs(la)).padStart(2, "0")}_00_${lo >= 0 ? "E" : "W"}${String(Math.abs(lo)).padStart(3, "0")}_00_DEM`;
  return `https://copernicus-dem-30m.s3.amazonaws.com/${n}/${n}.tif`;
}
function openTile(url: string) {
  let p = files.get(url);
  if (!p) {
    p = fromUrl(url, { cacheSize: 64 }).then((t: any) => t.getImage()).catch((e: any) => { files.delete(url); throw e; });
    files.set(url, p);
    if (files.size > 40) files.delete(files.keys().next().value!);
  }
  return p;
}

// → { z, f } · f: "s" = θάλασσα (το πλησιέστερο εικονοστοιχείο είναι θάλασσα, τιμή 0 στο GLO-30),
//            "c" = ακτή (θάλασσα μέσα στο 3×3 γύρω από το σημείο), "" = ξηρά
async function zAt(lon: number, lat: number): Promise<{ z: number | null; f: string }> {
  let img: any;
  try { img = await openTile(tileUrl(lat, lon)); } catch { return { z: 0, f: "s" }; } // χωρίς πλακίδιο = ανοιχτή θάλασσα
  const [x0, y0] = img.getOrigin(), [rx, ry] = img.getResolution();      // ry < 0
  const W = img.getWidth(), Hh = img.getHeight();
  // PixelIsPoint (GTRasterTypeGeoKey = 2, όπως στο GLO-30): η αρχή είναι ήδη το κέντρο του 1ου εικονοστοιχείου
  const isPoint = (img.getGeoKeys() || {}).GTRasterTypeGeoKey === 2, sh = isPoint ? 0 : 0.5;
  const c = (lon - x0) / rx - sh, r = (lat - y0) / ry - sh;              // δείκτες με αναφορά στα κέντρα
  let c0 = Math.floor(c), r0 = Math.floor(r);
  c0 = Math.min(Math.max(c0, 1), W - 3); r0 = Math.min(Math.max(r0, 1), Hh - 3);
  const fc = Math.min(Math.max(c - c0, 0), 1), fr = Math.min(Math.max(r - r0, 0), 1);
  // παράθυρο 4×4 (c0-1 … c0+2) για τον έλεγχο ακτής
  const ras: any = await img.readRasters({ window: [c0 - 1, r0 - 1, c0 + 3, r0 + 3], samples: [0], interleave: true });
  const at = (dc: number, dr: number) => Number(ras[(dr + 1) * 4 + (dc + 1)]);
  const v = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)];
  if (v.some((q) => !isFinite(q) || q < -1000)) return { z: null, f: "" };
  const near = v[(fr >= 0.5 ? 2 : 0) + (fc >= 0.5 ? 1 : 0)];
  if (near === 0) return { z: 0, f: "s" };
  let coast = false;
  for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 2; dc++) if (at(dc, dr) === 0) coast = true;
  const z = v[0] * (1 - fc) * (1 - fr) + v[1] * fc * (1 - fr) + v[2] * (1 - fc) * fr + v[3] * fc * fr;
  return { z: Math.round(z * 100) / 100, f: coast ? "c" : "" };
}

// απλό όριο ανά IP: 600 αιτήματα / 10 λεπτά
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 600000);
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 600;
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  if (limited(ip)) return new Response(JSON.stringify({ error: "rate" }), { status: 429, headers: h });
  const q = new URL(req.url).searchParams.get("p") || "";
  const pts = q.split(";").filter(Boolean).slice(0, 12).map((s) => s.split(",").map(Number));
  if (!pts.length || pts.some((p) => p.length !== 2 || !p.every(isFinite) || Math.abs(p[1]) > 89 || Math.abs(p[0]) > 180))
    return new Response(JSON.stringify({ error: "p=lon,lat;lon,lat" }), { status: 400, headers: h });
  const res = await Promise.all(pts.map(([lo, la]) => zAt(lo, la).catch(() => ({ z: null, f: "" }))));
  return new Response(JSON.stringify({ z: res.map((q) => q.z), f: res.map((q) => q.f), src: "Copernicus GLO-30" }), { headers: { ...h, "Cache-Control": "public, max-age=86400" } });
});
