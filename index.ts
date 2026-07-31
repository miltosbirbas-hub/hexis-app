// HEXIS kaek-geo — ΚΑΕΚ → θέση & πολύγωνο (WGS84 + ΕΓΣΑ'87)
// Deploy:  supabase functions deploy kaek-geo --no-verify-jwt --project-ref oucqqudfdimccgowvpqp
// Κλήση:   GET /functions/v1/kaek-geo?kaek=340561203015   ή   POST {"kaek":"..."}
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

// WGS84 → ΕΓΣΑ'87 (ίδιο μαθηματικό μοντέλο με το επαληθευμένο wgs84ToEgsa87 του HEXIS)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    let kaek = "";
    if (req.method === "GET") kaek = new URL(req.url).searchParams.get("kaek") ?? "";
    else kaek = (await req.json().catch(() => ({})))?.kaek ?? "";
    kaek = String(kaek).replace(/[\s.]+/g, "").split("/")[0];
    if (!/^\d{12}/.test(kaek)) {
      return new Response(JSON.stringify({ error: "Μη έγκυρος ΚΑΕΚ (απαιτούνται 12 ψηφία)." }), { status: 400, headers: CORS });
    }
    kaek = kaek.slice(0, 12);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.from("kaek_parcels")
      .select("kaek, region, lat, lon, area_m2, geojson").eq("kaek", kaek).maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
    if (!data) return new Response(JSON.stringify({ error: "not_found", kaek }), { status: 404, headers: CORS });

    const out: any = {
      kaek: data.kaek, region: data.region, lat: data.lat, lon: data.lon, area_m2: data.area_m2,
      geometry_wgs: data.geojson ?? null,
      geometry_egsa: data.geojson ? geoToEgsa(data.geojson) : null,
    };
    return new Response(JSON.stringify(out), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
