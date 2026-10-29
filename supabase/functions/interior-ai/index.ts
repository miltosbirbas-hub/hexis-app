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
// πραγματικό κόστος κλήσης → interior_usage (με service role· ο χρήστης δεν μπορεί να το αλλάξει)
async function saveCost(id: number, cost: number, model: string, tin: number, tout: number) {
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!srk || !id) return;
  await fetch(SB + "/rest/v1/interior_usage?id=eq." + id, { method: "PATCH", headers: { apikey: srk, Authorization: "Bearer " + srk, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ cost_usd: Math.round(cost * 10000) / 10000, model, in_tokens: tin, out_tokens: tout, real_cost: true }) }).catch(() => null);
}


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
    const rpc0 = (name: string, args: unknown) => fetch(SB + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json()).catch(() => null);
    // μονάδες: άδεια PRO / συνδρομή / δωρεάν / πακέτο (βλ. interior-billing.sql)
    // βελτίωση περιγραφής: σύντομη κλήση, δεν χρεώνει μονάδες (μόνο το όριο αιτημάτων/ώρα)
    if (body.mode === "enhance") {
      const pr = typeof body.prompt === "string" ? body.prompt.slice(0, 6000) : "";
      if (!pr) return json({ error: "No prompt" }, 400);
      const r1 = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: Deno.env.get("ENHANCE_MODEL") || "claude-sonnet-5-5", max_tokens: 900, messages: [{ role: "user", content: pr }] }) });
      const d1 = await r1.json();
      if (!r1.ok) return json({ error: d1?.error?.message || "upstream" }, r1.status);
      return json({ text: (d1.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("") });
    }
    // αναζήτηση στο εμπόριο: η AI ψάχνει στο web πραγματικά προϊόντα από ελληνικά e-shop (χρεώνει 1 μονάδα AI)
    if (body.mode === "shop") {
      const it = body.item || {};
      const q0 = await rpc0("interior_consume", { p_kind: "layout" });
      if (!q0 || q0.ok !== true) return json({ error: "quota", reason: q0?.msg || "quota" }, 402);
      const dims = [it.w, it.d, it.h].map((v: unknown) => Math.round(+(v as number) * 100) || "?").join("×");
      const pr = `Find 4 real products for sale in Greece that match this interior item, each from a DIFFERENT Greek online shop (e.g. skroutz.gr, ikea.com/gr, leroymerlin.gr, praktiker.gr, kotsovolos.gr, public.gr, e-shop.gr, or specialist Greek retailers for professional equipment).
ITEM: "${String(it.name || "").slice(0, 120)}" · type ${String(it.kind || "")} · approx. size W×D×H ${dims} cm · main colour ${String(it.color || "")} · style ${String(it.style || "")}.
Prefer products close in size (±15%) and look. Use web search. Only list product pages you actually found in the search results (exact URL).
Answer with JSON only: {"products":[{"store":"…","name":"…","price_eur":123.0,"w":0,"d":0,"h":0,"url":"https://…","note":"short Greek note: why it fits / differences"}]} (w,d,h in cm, 0 if unknown; price with VAT, null if not shown).`;
      const r2 = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 2500, messages: [{ role: "user", content: pr }],
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "GR", timezone: "Europe/Athens" } }] }) });
      const d2 = await r2.json();
      if (!r2.ok) { await rpc0("interior_refund", { p_id: q0.id }); return json({ error: d2?.error?.message || "upstream" }, r2.status); }
      const found = new Set<string>(); let searches = 0;
      for (const c of d2.content || []) { if (c.type === "server_tool_use") searches++; if (c.type === "web_search_tool_result" && Array.isArray(c.content)) for (const x of c.content) if (x.url) found.add(String(x.url).split("#")[0]); }
      const txt = (d2.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      let prods: any[] = [];
      try { const a0 = txt.indexOf("{"), b0 = txt.lastIndexOf("}"); prods = JSON.parse(txt.slice(a0, b0 + 1)).products || []; } catch (_e) { prods = []; }
      const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_e) { return ""; } };
      const hosts = new Set([...found].map(host));
      prods = prods.filter((x: any) => x && typeof x.url === "string" && /^https:\/\//.test(x.url) && (found.has(x.url.split("#")[0]) || hosts.has(host(x.url)))).slice(0, 4)
        .map((x: any) => ({ ...x, verified: found.has(String(x.url).split("#")[0]) }));
      const u2 = d2.usage || {}; const cost = ((u2.input_tokens || 0) * 2 + (u2.output_tokens || 0) * 10) / 1e6 + searches * 0.01;
      await saveCost(q0.id, cost, "claude-sonnet-5-5+web", u2.input_tokens || 0, u2.output_tokens || 0);
      if (!prods.length) { await rpc0("interior_refund", { p_id: q0.id }); return json({ products: [], error: "none" }); }
      return json({ products: prods, cost_usd: Math.round(cost * 10000) / 10000 });
    }
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
    // τιμοκατάλογος USD ανά 1M tokens (αλλάζει με secrets CLAUDE_IN_USD / CLAUDE_OUT_USD)
    const pin = +(Deno.env.get("CLAUDE_IN_USD") || 2), pout = +(Deno.env.get("CLAUDE_OUT_USD") || 10);
    const u0 = data.usage || {}, tin = (u0.input_tokens || 0) + (u0.cache_creation_input_tokens || 0) + (u0.cache_read_input_tokens || 0), tout = u0.output_tokens || 0;
    const cost = (tin * pin + tout * pout) / 1e6;
    await saveCost(q.id, cost, data.model || "claude-sonnet-5-5", tin, tout);
    return json({ text, usage: data.usage, source: q.source, cost_usd: Math.round(cost * 10000) / 10000 });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
