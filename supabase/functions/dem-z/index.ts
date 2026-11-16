// ============================================================================
// HEXIS — Edge Function «dem-z»: υψόμετρο εδάφους από το Copernicus DEM GLO-30
// Διαβάζει τα επίσημα COG του Copernicus GLO-30 (AWS Open Data, s3://copernicus-dem-30m)
// με range requests και δίνει διγραμμική παρεμβολή στο σημείο. Ο browser δεν μπορεί να
// τα διαβάσει απευθείας (το bucket δεν στέλνει CORS) — γι' αυτό περνούν από εδώ.
// Είσοδος (GET): ?p=lon,lat;lon,lat;…   (έως 12 σημεία, WGS84 δεκαδικές μοίρες)
// Έξοδος: { z:[m|null,…], src:"Copernicus GLO-30" }   (υψόμετρα EGM2008, DSM)
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

async function zAt(lon: number, lat: number): Promise<number | null> {
  let img: any;
  try { img = await openTile(tileUrl(lat, lon)); } catch { return null; } // χωρίς πλακίδιο = θάλασσα
  const [x0, y0] = img.getOrigin(), [rx, ry] = img.getResolution();      // ry < 0
  const W = img.getWidth(), Hh = img.getHeight();
  // κέντρα εικονοστοιχείων: (c+0.5)
  const c = (lon - x0) / rx - 0.5, r = (lat - y0) / ry - 0.5;
  let c0 = Math.floor(c), r0 = Math.floor(r);
  c0 = Math.min(Math.max(c0, 0), W - 2); r0 = Math.min(Math.max(r0, 0), Hh - 2);
  const fc = Math.min(Math.max(c - c0, 0), 1), fr = Math.min(Math.max(r - r0, 0), 1);
  const ras: any = await img.readRasters({ window: [c0, r0, c0 + 2, r0 + 2], samples: [0], interleave: true });
  const v = [ras[0], ras[1], ras[2], ras[3]].map(Number);
  if (v.some((q) => !isFinite(q) || q < -1000)) return null;
  const z = v[0] * (1 - fc) * (1 - fr) + v[1] * fc * (1 - fr) + v[2] * (1 - fc) * fr + v[3] * fc * fr;
  return Math.round(z * 100) / 100;
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
  const z = await Promise.all(pts.map(([lo, la]) => zAt(lo, la).catch(() => null)));
  return new Response(JSON.stringify({ z, src: "Copernicus GLO-30" }), { headers: { ...h, "Cache-Control": "public, max-age=86400" } });
});
