// ============================================================================
// HEXIS-APP BoQ — Supabase Edge Function «boq-ai»
// AI για το BoQ (μετάφραση προμέτρησης με τεχνική ορολογία, διάρκειες/εξαρτήσεις φάσεων, προτάσεις bottleneck).
// Η σελίδα στέλνει { key, device, prompt }· η function ελέγχει ότι το κλειδί BoQ είναι ενεργό στη συσκευή
// (boq_ai_check, boq-licenses.sql) ή ότι ο χρήστης είναι διαχειριστής (boq_owner), καλεί το Anthropic API
// με server-side key και επιστρέφει { json } (το JSON που ζητά το prompt).
// Deploy: αυτόματα από το GitHub Actions (edge-functions.yml) · ANTHROPIC_API_KEY υπάρχει ήδη ως secret.
// Όριο: 80 αιτήματα/ώρα ανά κλειδί ή λογαριασμό (στη μνήμη της function).
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const ORIGINS = ["https://hexis-app.gr", "https://www.hexis-app.gr", "https://miltosbirbas-hub.github.io"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const hits = new Map<string, number[]>();

function pickJson(t: string): unknown {
  const s = String(t || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(s); } catch { /* συνέχεια */ }
  const a = s.search(/[\[{]/);
  if (a < 0) return null;
  const close = s[a] === "{" ? "}" : "]";
  const b = s.lastIndexOf(close);
  if (b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

Deno.serve(async (req) => {
  const C = cors(req.headers.get("origin"));
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...C, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    if (!apiKey || !srk) throw new Error("Missing secrets");
    const body = await req.json().catch(() => ({}));
    const key = String(body.key || "").toUpperCase().replace(/\s/g, "");
    const device = String(body.device || "");
    const prompt = String(body.prompt || "");
    if (!prompt) return json({ error: "empty" }, 400);
    if (prompt.length > 60000) return json({ error: "too_long" }, 413);

    // 1. ποιος ρωτά: διαχειριστής (λογαριασμός HEXIS-APP) ή κλειδί BoQ ενεργό σε αυτή τη συσκευή
    let who = "";
    const auth = req.headers.get("authorization") || "";
    const tok = auth.replace(/^Bearer\s+/i, "");
    if (tok && tok !== anon && tok !== ANON) {
      const r = await fetch(SB + "/rest/v1/rpc/boq_owner", { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
      const j = await r.json().catch(() => null);
      if (j && j.ok) who = "owner";
    }
    if (!who && key && device) {
      const r = await fetch(SB + "/rest/v1/rpc/boq_ai_check", { method: "POST", headers: { apikey: srk, Authorization: "Bearer " + srk, "Content-Type": "application/json" }, body: JSON.stringify({ p_key: key, p_device: device }) });
      const ok = await r.json().catch(() => false);
      if (ok === true) who = "key:" + key;
    }
    if (!who) return json({ error: "licence" }, 403);
    const now = Date.now(), list = (hits.get(who) || []).filter((t) => now - t < 3600e3);
    if (list.length >= 80) return json({ error: "rate_limited" }, 429);
    list.push(now); hits.set(who, list);

    // 2. κλήση μοντέλου (ο client δεν επιλέγει model/max_tokens)
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: Deno.env.get("BOQ_MODEL") || "claude-sonnet-5-5", max_tokens: 8000,
        system: "You are a construction project management assistant (BOQ, scheduling, Greek and English technical terminology). Reply with ONLY the JSON the user asks for, no prose.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) { console.log("anthropic", r.status, JSON.stringify(data).slice(0, 200)); return json({ error: "ai" }, 502); }
    const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    const out = pickJson(text);
    if (out == null) return json({ error: "parse" }, 502);
    return json({ json: out });
  } catch (e) {
    console.log("boq-ai", String(e).slice(0, 200));
    return json({ error: "server" }, 500);
  }
});
