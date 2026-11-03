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
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hx-selftest", "Access-Control-Allow-Methods": "POST, OPTIONS" };
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

Deno.serve(async (req) => {
  const C = cors(req.headers.get("origin"));
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...C, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    // πρόσβαση: συνδεδεμένος χρήστης HEXIS (ή κλειδί αυτοελέγχου του CI)
    const st = Deno.env.get("SELFTEST_KEY");
    const selftest = !!st && req.headers.get("x-hx-selftest") === st;
    if (!selftest) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
      const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || ANON, Authorization: auth } });
      if (!u.ok) return json({ error: "login" }, 401);
    }
    const b = await req.json().catch(() => ({}));
    const x = Number(b.x), y = Number(b.y);
    // Ελλάδα σε ΕΓΣΑ'87: περίπου x 50.000–1.050.000, y 3.850.000–4.650.000
    if (!(x > 50000 && x < 1050000 && y > 3800000 && y < 4700000)) return json({ error: "bad_coords" }, 400);
    let ring: number[][] | null = null;
    if (Array.isArray(b.ring) && b.ring.length >= 3 && b.ring.length <= 2000) {
      ring = b.ring.map((p: unknown) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN])
        .filter((p: number[]) => isFinite(p[0]) && isFinite(p[1]));
      if (ring!.length < 3) ring = null;
    }
    const pt = JSON.stringify({ x, y, spatialReference: { wkid: 2100 } });
    const keys = Object.keys(LAYERS);
    const res = await Promise.all(keys.map((k) => q(LAYERS[k], pt, "esriGeometryPoint")));
    const layers: Record<string, unknown> = {}; const errors: Record<string, string> = {};
    keys.forEach((k, i) => { const r = res[i]; if (Array.isArray(r)) { if (r.length) layers[k] = r; } else errors[k] = r.error; });

    const touches: Record<string, unknown> = {};
    if (ring) {
      // μικρή εσωτερική «συρρίκνωση» δεν γίνεται εδώ — ο client στέλνει ήδη το περίγραμμα· ζώνες που μόνο ακουμπούν όριο θα φανούν ως πιθανή τομή
      const pg = JSON.stringify({ rings: [ring.concat([ring[0]])], spatialReference: { wkid: 2100 } });
      const tr = await Promise.all(TOUCH.map((k) => q(LAYERS[k], pg, "esriGeometryPolygon")));
      TOUCH.forEach((k, i) => {
        const r = tr[i]; if (!Array.isArray(r)) return;
        const base = JSON.stringify(((layers[k] as Record<string, unknown>[]) || []).map((a) => a.OBJECTID).sort());
        const ids = JSON.stringify(r.map((a) => a.OBJECTID).sort());
        if (ids !== base && r.length) touches[k] = r;
      });
    }
    return json({ layers, touches, errors, src: "Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ)", t: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
