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
// Πρόσβαση: κάθε συνδεδεμένος χρήστης· οι μονάδες ελέγχονται από interior_consume (interior-billing.sql). Όριο: 30 αιτήματα/ώρα ανά χρήστη (στη μνήμη της function).
// ============================================================================

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8"; // δημόσιο anon key (ίδιο με τις σελίδες)
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
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    if (!apiKey || !anon) throw new Error("Missing secrets");

    // 1. ποιος είναι ο χρήστης
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ error: "login" }, 401);
    const user = await u.json();
    const email = String(user.email || "").toLowerCase();

    const now = Date.now(), list = (hits.get(user.id) || []).filter((t) => now - t < 3600e3);
    if (list.length >= 30) return json({ error: "rate_limited" }, 429);
    list.push(now); hits.set(user.id, list);

    // 4. κλήση μοντέλου (ο client δεν επιλέγει model/max_tokens)
    const body = await req.json();
    // μονάδες: άδεια PRO / συνδρομή / δωρεάν / πακέτο (βλ. interior-billing.sql)
    const kind = "layout";
    const rpc = (name: string, args: unknown) => fetch(SB + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json()).catch(() => null);
    const q = await rpc("interior_consume", { p_kind: kind });
    if (!q || q.ok !== true) return json({ error: "quota", reason: q?.msg || "quota", used: q?.used, limit: q?.limit }, 402);
    const refund = () => rpc("interior_refund", { p_id: q.id });
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 120000) : "";
    if (!prompt) { await refund(); return json({ error: "No prompt" }, 400); }
    // καρέ βίντεο χώρου (αναγνώριση αντικειμένων): έως 8 JPEG/PNG σε base64
    const imgs = (Array.isArray(body.images) ? body.images : []).slice(0, 8)
      .map((d: unknown) => String(d || "")).map((d: string) => { const m = d.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/); return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null; })
      .filter((x: unknown) => x && (x as any).source.data.length < 2_500_000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 12000,
        messages: [{ role: "user", content: imgs.length ? [...imgs, { type: "text", text: prompt }] : prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) { await refund(); return json({ error: data?.error?.message || "upstream" }, res.status); }
    const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    return json({ text, usage: data.usage, source: q.source });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
