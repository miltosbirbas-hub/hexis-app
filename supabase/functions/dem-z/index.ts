// ============================================================================
// HEXIS — Edge Function «dem-z»: υψόμετρο εδάφους από το Copernicus DEM GLO-30
// Διαβάζει τα επίσημα COG του Copernicus GLO-30 (AWS Open Data, s3://copernicus-dem-30m)
// με range requests και δίνει διγραμμική παρεμβολή στο σημείο. Ο browser δεν μπορεί να
// τα διαβάσει απευθείας (το bucket δεν στέλνει CORS) — γι' αυτό περνούν από εδώ.
// Είσοδος (GET): ?p=lon,lat;lon,lat;…   (έως 12 σημεία, WGS84 δεκαδικές μοίρες)
// Έξοδος: { z:[m|null,…], f:["s"=θάλασσα|"c"=ακτή|"",…], src:"Copernicus GLO-30" }   (υψόμετρα EGM2008, DSM)
// Επίσης: ?g=minLon,minLat,maxLon,maxLat → κάναβος υψομέτρων για ισοϋψείς (έως 0,25°, ≤450×450)
//         ?n=lon,lat → υψόμετρο γεωειδούς EGM2008 (PROJ-data us_nga_egm08_25) για διόρθωση υψομέτρου GPS
// Χρήση: ktimatologio.html (εκτίμηση Z, ισοϋψείς, υψόμετρο GPS). Verify JWT: OFF (δημόσια ανοιχτά δεδομένα).
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

// ---------- κάναβος για ισοϋψείς: ?g=minLon,minLat,maxLon,maxLat ----------
// Ο κάναβος GLO-30 (Ελλάδα, πλάτος < 50°) έχει κέντρα εικονοστοιχείων πάνω σε ακέραια δευτερόλεπτα: lon = i/3600, lat = j/3600.
// Έξοδος: { w, h, lon0, lat0, d, b64 } — Int16 σε δεκατόμετρα, γραμμές βορράς→νότος, -32768 = χωρίς τιμή.
const MAXSPAN = 0.25, MAXCELLS = 450;
async function grid(minLon: number, minLat: number, maxLon: number, maxLat: number) {
  const cx = (minLon + maxLon) / 2, cy = (minLat + maxLat) / 2;
  if (maxLon - minLon > MAXSPAN) { minLon = cx - MAXSPAN / 2; maxLon = cx + MAXSPAN / 2; }
  if (maxLat - minLat > MAXSPAN) { minLat = cy - MAXSPAN / 2; maxLat = cy + MAXSPAN / 2; }
  const i0 = Math.ceil(minLon * 3600), i1 = Math.floor(maxLon * 3600);
  const j0 = Math.ceil(minLat * 3600), j1 = Math.floor(maxLat * 3600);
  const step = Math.max(1, Math.ceil(Math.max(i1 - i0 + 1, j1 - j0 + 1) / MAXCELLS));
  const w = Math.floor((i1 - i0) / step) + 1, h = Math.floor((j1 - j0) / step) + 1;
  const out = new Int16Array(w * h).fill(-32768);
  // πλακίδιο φ: γραμμές J ∈ [la·3600+1, (la+1)·3600] (η 1η γραμμή είναι το βόρειο άκρο) · λ: στήλες I ∈ [lo·3600, lo·3600+3599]
  const tLa = (J: number) => Math.ceil(J / 3600) - 1;
  for (let la = tLa(j0); la <= tLa(j1); la++) {
    for (let lo = Math.floor(i0 / 3600); lo <= Math.floor(i1 / 3600); lo++) {
      let img: any;
      try { img = await openTile(tileUrl(la + 0.5, lo + 0.5)); } catch { // θάλασσα
        for (let r = 0; r < h; r++) { const J = j1 - r * step; if (tLa(J) !== la) continue;
          for (let c = 0; c < w; c++) { const I = i0 + c * step; if (Math.floor(I / 3600) === lo) out[r * w + c] = 0; } }
        continue;
      }
      const [x0, y0] = img.getOrigin(), [rx, ry] = img.getResolution();
      const W = img.getWidth(), Hh = img.getHeight();
      const isPoint = (img.getGeoKeys() || {}).GTRasterTypeGeoKey === 2, sh = isPoint ? 0 : 0.5;
      const col = (I: number) => Math.round((I / 3600 - x0) / rx - sh), row = (J: number) => Math.round((J / 3600 - y0) / ry - sh);
      const cs: number[] = [], rs: number[] = [];
      for (let c = 0; c < w; c++) { const I = i0 + c * step; if (Math.floor(I / 3600) === lo) cs.push(c); }
      for (let r = 0; r < h; r++) { const J = j1 - r * step; if (tLa(J) === la) rs.push(r); }
      if (!cs.length || !rs.length) continue;
      const cA = Math.max(0, Math.min(...cs.map((c) => col(i0 + c * step)))), cB = Math.min(W - 1, Math.max(...cs.map((c) => col(i0 + c * step))));
      const rA = Math.max(0, Math.min(...rs.map((r) => row(j1 - r * step)))), rB = Math.min(Hh - 1, Math.max(...rs.map((r) => row(j1 - r * step))));
      if (cB < cA || rB < rA) continue;
      const ras: any = await img.readRasters({ window: [cA, rA, cB + 1, rB + 1], samples: [0], interleave: true });
      const ww = cB - cA + 1;
      for (const r of rs) { const R = row(j1 - r * step) - rA; if (R < 0 || R > rB - rA) continue;
        for (const c of cs) { const C = col(i0 + c * step) - cA; if (C < 0 || C >= ww) continue;
          const v = Number(ras[R * ww + C]); if (isFinite(v) && v > -1000) out[r * w + c] = Math.round(v * 10); } }
    }
  }
  const u8 = new Uint8Array(out.buffer); let bin = "";
  for (let k = 0; k < u8.length; k += 32768) bin += String.fromCharCode(...u8.subarray(k, k + 32768));
  return { w, h, lon0: i0 / 3600, lat0: j1 / 3600, d: step / 3600, b64: btoa(bin) };
}

// ---------- γεωειδές EGM2008 (για το υψόμετρο GPS): ?n=lon,lat ----------
let egm: Promise<any> | null = null;
async function geoidN(lon: number, lat: number): Promise<number | null> {
  try {
    if (!egm) egm = fromUrl("https://cdn.proj.org/us_nga_egm08_25.tif", { cacheSize: 16 }).then((t: any) => t.getImage()).catch((e: any) => { egm = null; throw e; });
    const img = await egm;
    const [x0, y0] = img.getOrigin(), [rx, ry] = img.getResolution();
    const isPoint = (img.getGeoKeys() || {}).GTRasterTypeGeoKey === 2, sh = isPoint ? 0 : 0.5;
    let L = lon; if (L < x0) L += 360;
    const c = (L - x0) / rx - sh, r = (lat - y0) / ry - sh, c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0;
    const ras: any = await img.readRasters({ window: [c0, r0, c0 + 2, r0 + 2], samples: [0], interleave: true });
    const v = [ras[0], ras[1], ras[2], ras[3]].map(Number);
    return Math.round((v[0] * (1 - fc) * (1 - fr) + v[1] * fc * (1 - fr) + v[2] * (1 - fc) * fr + v[3] * fc * fr) * 100) / 100;
  } catch { return null; }
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
  const sp = new URL(req.url).searchParams;
  const gq = sp.get("g");
  if (gq) {
    const b = gq.split(",").map(Number);
    if (b.length !== 4 || !b.every(isFinite) || b[2] <= b[0] || b[3] <= b[1]) return new Response(JSON.stringify({ error: "g=minLon,minLat,maxLon,maxLat" }), { status: 400, headers: h });
    try { return new Response(JSON.stringify(await grid(b[0], b[1], b[2], b[3])), { headers: { ...h, "Cache-Control": "public, max-age=86400" } }); }
    catch (e) { return new Response(JSON.stringify({ error: "grid" }), { status: 502, headers: h }); }
  }
  const nq = sp.get("n");
  if (nq) {
    const [lo, la] = nq.split(",").map(Number);
    return new Response(JSON.stringify({ n: await geoidN(lo, la), src: "EGM2008" }), { headers: { ...h, "Cache-Control": "public, max-age=86400" } });
  }
  const q = sp.get("p") || "";
  const pts = q.split(";").filter(Boolean).slice(0, 12).map((s) => s.split(",").map(Number));
  if (!pts.length || pts.some((p) => p.length !== 2 || !p.every(isFinite) || Math.abs(p[1]) > 89 || Math.abs(p[0]) > 180))
    return new Response(JSON.stringify({ error: "p=lon,lat;lon,lat" }), { status: 400, headers: h });
  const res = await Promise.all(pts.map(([lo, la]) => zAt(lo, la).catch(() => ({ z: null, f: "" }))));
  return new Response(JSON.stringify({ z: res.map((q) => q.z), f: res.map((q) => q.f), src: "Copernicus GLO-30" }), { headers: { ...h, "Cache-Control": "public, max-age=86400" } });
});
