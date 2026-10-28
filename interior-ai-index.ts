// ============================================================================
// HEXIS INTERIOR — Supabase Edge Function «interior-ai»
// AI διαρρύθμιση χώρων: η σελίδα στέλνει γεωμετρία χώρων + ύφος + κατάλογο,
// η function καλεί το Anthropic API με server-side key και επιστρέφει { text } (JSON διάταξης).
//
// Deploy:
//   supabase functions deploy interior-ai --no-verify-jwt --project-ref oucqqudfdimccgowvpqp
//   (το ANTHROPIC_API_KEY υπάρχει ήδη ως secret από τη nomothesia-ai)
//
// Τοποθέτηση αρχείου: supabase/functions/interior-ai/index.ts
// Πρόσβαση: ιδιοκτήτες ή ενεργό entitlement «interior». Όριο: 30 αιτήματα/ώρα ανά χρήστη (στη μνήμη της function).
// ============================================================================

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const OWNERS = ["miltos.birbas@gmail.com", "brb.develop@gmail.com"];
const CORS = {
  "Access-Control-Allow-Origin": "https://hexis-app.gr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const hits = new Map<string, number[]>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!apiKey || !anon) throw new Error("Missing secrets");

    // 1. ποιος είναι ο χρήστης
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ error: "login" }, 401);
    const user = await u.json();
    const email = String(user.email || "").toLowerCase();

    // 2. δικαίωμα: ιδιοκτήτης ή entitlement «interior»
    if (!OWNERS.includes(email)) {
      const e = await fetch(SB + "/rest/v1/entitlements?select=active,expires_at&module=eq.interior", {
        headers: { apikey: anon, Authorization: auth },
      });
      const rows = e.ok ? await e.json() : [];
      const ok = (rows || []).some((r: any) => r.active && (!r.expires_at || new Date(r.expires_at) > new Date()));
      if (!ok) return json({ error: "forbidden" }, 403);
    }

    // 3. όριο αιτημάτων
    const now = Date.now(), list = (hits.get(user.id) || []).filter((t) => now - t < 3600e3);
    if (list.length >= 30) return json({ error: "rate_limited" }, 429);
    list.push(now); hits.set(user.id, list);

    // 4. κλήση μοντέλου (ο client δεν επιλέγει model/max_tokens)
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 120000) : "";
    if (!prompt) return json({ error: "No prompt" }, 400);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 12000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message || "upstream" }, res.status);
    const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    return json({ text, usage: data.usage });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
