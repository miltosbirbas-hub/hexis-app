// ============================================================================
// HEXIS — Edge Function «sheet-read»: ανάγνωση γωνιών πινακίδας χάρτη (ΓΥΣ κ.λπ.)
// Η σελίδα (ktimatologio.html → Γεωαναφορά πινακίδας) στέλνει 4 αποκόμματα των γωνιών
// της σαρωμένης πινακίδας + μια μικρή συνολική εικόνα. Το μοντέλο εντοπίζει τη γωνία
// του πλαισίου (neatline) σε κάθε απόκομμα και διαβάζει τις τυπωμένες γεωγραφικές
// συντεταγμένες φ, λ της γωνίας. Η μετατροπή σε ΕΓΣΑ'87 γίνεται στον browser.
// Είσοδος (POST, JWT χρήστη): { crops:[{pos:"tl|tr|bl|br", data:"<base64 jpeg>"}], overview:"<base64 jpeg>" }
// Έξοδος: { corners:[{pos,x,y,lat,lon,lat_text,lon_text}], meridian, datum, sheet, scale, notes }
// Verify JWT: OFF (ο χρήστης ελέγχεται εδώ). Όριο: 20 αιτήματα/ώρα ανά χρήστη.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const ORIGINS = ["https://hexis-app.gr", "https://www.hexis-app.gr", "https://miltosbirbas-hub.github.io"];
function cors(origin: string | null) {
  const o = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hx-selftest", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
const hits = new Map<string, number[]>();
async function userId(req: Request): Promise<string | null> {
  const st = Deno.env.get("SELFTEST_KEY");
  if (st && req.headers.get("x-hx-selftest") === st) return "selftest";
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || ANON, Authorization: auth } });
  if (!u.ok) return null;
  const j = await u.json().catch(() => ({}));
  return j && j.id ? String(j.id) : null;
}

const PROMPT = `You are reading a scanned topographic map sheet (e.g. a Greek HMGS/ΓΥΣ 1:5000 or 1:50000 sheet, an old town plan, a cadastral sheet).
You get one small OVERVIEW of the whole sheet, then FOUR high-resolution CORNER crops labelled tl (top-left), tr (top-right), bl (bottom-left), br (bottom-right) of the sheet image.

For EACH corner crop:
1. Find the corner of the MAP FRAME (the neatline: the inner rectangle that bounds the map content and that carries the geographic graticule ticks). Not the paper edge, not the outer decorative border. Give its position as x,y fractions (0..1) of THAT crop's width/height (x from left, y from top), as precisely as you can.
2. Read the geographic coordinates printed next to that frame corner: latitude φ and longitude λ, exactly as printed (degrees ° minutes ' seconds ", with sign if any). Give them both as the printed text and as decimal degrees (negative if printed negative or West of the reference meridian).
If a value is not printed at a corner, infer it ONLY if the other corners make it certain (same latitude along the top/bottom edge, same longitude along the left/right edge) and say so in notes; otherwise use null.

Also from all images: is longitude counted from the Athens meridian (Greek old sheets: values like -2°45' or 1°15', or text «από του μεσημβρινού Αθηνών») or from Greenwich (values 19°–30°)? What datum/ellipsoid is stated (Bessel / old Greek datum, ΕΓΣΑ87/GGRS87/GRS80, ED50, WGS84 — or unknown)? Sheet number/name and scale if printed.

Answer with ONLY this JSON, no other text:
{"corners":[{"pos":"tl","x":0.0,"y":0.0,"lat":null,"lon":null,"lat_text":"","lon_text":""},{"pos":"tr",...},{"pos":"bl",...},{"pos":"br",...}],"meridian":"athens|greenwich|unknown","datum":"bessel|ggrs87|ed50|wgs84|unknown","sheet":"","scale":"","notes":""}`;

Deno.serve(async (req) => {
  const C = cors(req.headers.get("origin"));
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...C, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const uid = await userId(req);
    if (!uid) return json({ error: "login" }, 401);
    const now = Date.now(), h = (hits.get(uid) || []).filter((t) => now - t < 3600e3);
    if (h.length >= 20 && uid !== "selftest") return json({ error: "rate", msg: "Πολλές αναγνώσεις την τελευταία ώρα — ξαναδοκίμασε σε λίγο." }, 429);
    h.push(now); hits.set(uid, h);
    const b = await req.json().catch(() => ({}));
    const crops = Array.isArray(b.crops) ? b.crops.filter((c: { pos?: string; data?: string }) => c && /^(tl|tr|bl|br)$/.test(String(c.pos)) && typeof c.data === "string" && c.data.length < 4_000_000) : [];
    if (crops.length !== 4 || typeof b.overview !== "string" || b.overview.length > 2_000_000) return json({ error: "bad_input" }, 400);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "no_key" }, 500);
    const img = (d: string) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: d } });
    const content: unknown[] = [{ type: "text", text: "OVERVIEW:" }, img(b.overview)];
    for (const c of crops) { content.push({ type: "text", text: "CORNER " + c.pos + ":" }); content.push(img(c.data)); }
    content.push({ type: "text", text: PROMPT });
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 120000);
    let d: { content?: { type: string; text?: string }[]; error?: { message?: string } };
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: Deno.env.get("SHEET_MODEL") || "claude-sonnet-5-5", max_tokens: 1500, messages: [{ role: "user", content }] }) });
      d = await r.json();
      if (!r.ok) return json({ error: "upstream", msg: d?.error?.message || String(r.status) }, 502);
    } finally { clearTimeout(tm); }
    const txt = (d.content || []).filter((x) => x.type === "text").map((x) => x.text || "").join("");
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "parse", raw: txt.slice(0, 400) }, 502);
    let out: Record<string, unknown>;
    try { out = JSON.parse(m[0]); } catch { return json({ error: "parse", raw: txt.slice(0, 400) }, 502); }
    return json(out);
  } catch (e) {
    return json({ error: "server", msg: String(e).slice(0, 200) }, 500);
  }
});
