// HEXIS kaek-geo v3 — ΚΑΕΚ→γεωμετρία, σημείο→ΚΑΕΚ (point-in-polygon), όμορα
// Deploy:  supabase functions deploy kaek-geo --no-verify-jwt --project-ref oucqqudfdimccgowvpqp
// Κλήσεις:
//   ?kaek=140120508024                     → τεμάχιο από ΚΑΕΚ
//   ?lat=38.83&lon=20.71                   → τεμάχιο από σημείο (PIP)
//   ...&neighbors=1[&r=150]                → + όμορα σε ακτίνα r μέτρων (30–500, default 120)
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function wgsToEgsa(lat: number, lon: number): [number, number] {
  const d2r = Math.PI / 180;
  let a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f);
  const fi = lat * d2r, la = lon * d2r;
  let N = a / Math.sqrt(1 - e2 * Math.sin(fi) ** 2);
  let X = N * Math.cos(fi) * Math.cos(la), Y = N * Math.cos(fi) * Math.sin(la), Z = N * (1 - e2) * Math.sin(fi);
  X += 199.87; Y -= 74.79; Z -= 246.62;
  a = 6378137; f = 1 / 298.257222101; e2 = f * (2 - f);
  const p = Math.hypot(X, Y);
  let fi2 = Math.atan2(Z, p * (1 - e2));
  for (let i = 0; i < 6; i++) { N = a / Math.sqrt(1 - e2 * Math.sin(fi2) ** 2); fi2 = Math.atan2(Z + e2 * N * Math.sin(fi2), p); }
  const la2 = Math.atan2(Y, X);
  const k0 = 0.9996, l0 = 24 * d2r, FE = 500000;
  const ep2 = e2 / (1 - e2), t = Math.tan(fi2), n2 = ep2 * Math.cos(fi2) ** 2;
  N = a / Math.sqrt(1 - e2 * Math.sin(fi2) ** 2);
  const A = (la2 - l0) * Math.cos(fi2);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * fi2
    - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * fi2)
    + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * fi2)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * fi2));
  const E = FE + k0 * N * (A + (1 - t * t + n2) * A ** 3 / 6 + (5 - 18 * t * t + t ** 4 + 72 * n2 - 58 * ep2) * A ** 5 / 120);
  const No = k0 * (M + N * t * (A * A / 2 + (5 - t * t + 9 * n2 + 4 * n2 * n2) * A ** 4 / 24 + (61 - 58 * t * t + t ** 4 + 600 * n2 - 330 * ep2) * A ** 6 / 720));
  return [Math.round(E * 100) / 100, Math.round(No * 100) / 100];
}
function geoToEgsa(g: any): any {
  const conv = (c: any): any => typeof c[0] === "number" ? wgsToEgsa(c[1], c[0]) : c.map(conv);
  return { type: g.type, coordinates: conv(g.coordinates) };
}
// point-in-polygon (ray casting) σε GeoJSON Polygon/MultiPolygon (WGS84, [lon,lat])
function pip(lon: number, lat: number, g: any): boolean {
  const inRing = (ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  for (const poly of polys) {
    if (!poly.length) continue;
    if (!inRing(poly[0])) continue;           // εκτός εξωτερικού δαχτυλιδιού
    let inHole = false;
    for (let h = 1; h < poly.length; h++) if (inRing(poly[h])) { inHole = true; break; }
    if (!inHole) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = new URL(req.url);
    const gp = (k: string) => url.searchParams.get(k);
    let body: any = {};
    if (req.method !== "GET") body = await req.json().catch(() => ({}));
    const pick = (k: string) => (req.method === "GET" ? gp(k) : body?.[k]) ?? null;

    const wantN = String(pick("neighbors")) === "1" || pick("neighbors") === true;
    const r = Math.min(500, Math.max(30, parseFloat(String(pick("r") ?? "120")) || 120));
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let main: any = null, approx = false;

    const kaekRaw = pick("kaek");
    const latP = parseFloat(String(pick("lat"))), lonP = parseFloat(String(pick("lon")));

    if (kaekRaw) {
      let kaek = String(kaekRaw).replace(/[\s.]+/g, "").split("/")[0];
      if (!/^\d{12}/.test(kaek)) {
        return new Response(JSON.stringify({ error: "Μη έγκυρος ΚΑΕΚ (απαιτούνται 12 ψηφία)." }), { status: 400, headers: CORS });
      }
      kaek = kaek.slice(0, 12);
      const { data, error } = await sb.from("kaek_parcels")
        .select("kaek, region, lat, lon, area_m2, geojson").eq("kaek", kaek).maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
      if (!data) return new Response(JSON.stringify({ error: "not_found", kaek }), { status: 404, headers: CORS });
      main = data;
    } else if (isFinite(latP) && isFinite(lonP)) {
      // Σημείο → ΚΑΕΚ: υποψήφιοι σε κουτί ±250 m, μετά point-in-polygon
      const box = 250;
      const dLat = box / 111320, dLon = box / (111320 * Math.cos(latP * Math.PI / 180));
      const { data: cand, error } = await sb.from("kaek_parcels")
        .select("kaek, region, lat, lon, area_m2, geojson")
        .gte("lat", latP - dLat).lte("lat", latP + dLat)
        .gte("lon", lonP - dLon).lte("lon", lonP + dLon)
        .limit(80);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
      const list = (cand ?? []).sort((a: any, b: any) =>
        ((a.lat - latP) ** 2 + (a.lon - lonP) ** 2) - ((b.lat - latP) ** 2 + (b.lon - lonP) ** 2));
      main = list.find((p: any) => p.geojson && pip(lonP, latP, p.geojson)) ?? null;
      if (!main && list.length) { // fallback: πλησιέστερο κεντροειδές εντός ~80 m
        const d0 = Math.hypot((list[0].lat - latP) * 111320, (list[0].lon - lonP) * 111320 * Math.cos(latP * Math.PI / 180));
        if (d0 <= 80) { main = list[0]; approx = true; }
      }
      if (!main) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });
    } else {
      return new Response(JSON.stringify({ error: "Δώσε kaek ή lat+lon." }), { status: 400, headers: CORS });
    }

    const out: any = {
      kaek: main.kaek, region: main.region, lat: main.lat, lon: main.lon, area_m2: main.area_m2, approx,
      geometry_wgs: main.geojson ?? null,
      geometry_egsa: main.geojson ? geoToEgsa(main.geojson) : null,
      neighbors: [] as any[],
    };

    if (wantN) {
      const dLat = r / 111320, dLon = r / (111320 * Math.cos(main.lat * Math.PI / 180));
      const { data: nb } = await sb.from("kaek_parcels")
        .select("kaek, area_m2, lat, lon, geojson")
        .gte("lat", main.lat - dLat).lte("lat", main.lat + dLat)
        .gte("lon", main.lon - dLon).lte("lon", main.lon + dLon)
        .neq("kaek", main.kaek)
        .limit(40);
      if (nb) {
        nb.sort((a: any, b: any) =>
          ((a.lat - main.lat) ** 2 + (a.lon - main.lon) ** 2) - ((b.lat - main.lat) ** 2 + (b.lon - main.lon) ** 2));
        out.neighbors = nb.slice(0, 30).map((p: any) => ({
          kaek: p.kaek, area_m2: p.area_m2, lat: p.lat, lon: p.lon,
          geometry_wgs: p.geojson ?? null,
          geometry_egsa: p.geojson ? geoToEgsa(p.geojson) : null,
        }));
      }
    }
    return new Response(JSON.stringify(out), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
