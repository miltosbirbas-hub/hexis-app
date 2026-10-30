// ============================================================================
// HEXIS INTERIOR — Supabase Edge Function «interior-render»
// Φωτορεαλιστική απόδοση: καρέ 3D (JPEG base64) + οδηγίες → μοντέλο εικόνας → εικόνα (base64).
// Secret: GEMINI_API_KEY (Google AI Studio). Προαιρετικά GEMINI_IMAGE_MODEL.
// Deploy: Dashboard → Edge Functions (Verify JWT: OFF — ο έλεγχος χρήστη γίνεται εδώ).
// Πρόσβαση: κάθε συνδεδεμένος χρήστης· οι μονάδες ελέγχονται από interior_consume (interior-billing.sql). Όριο: 20 αποδόσεις/ώρα ανά χρήστη.
// ============================================================================

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8"; // δημόσιο anon key (ίδιο με τις σελίδες)
const CORS = {
  "Access-Control-Allow-Origin": "https://hexis-app.gr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hx-ticket",
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

// ---- εισιτήριο πύλης (interior-gw): υπογεγραμμένο, 12 λεπτά, δεμένο στον χρήστη
async function ticketOk(t: string, uid: string) {
  try {
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const [b, s] = String(t || "").split(".");
    if (!b || !s || !srk) return false;
    const dec = (x: string) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((x.length + 3) % 4)), (c) => c.charCodeAt(0));
    const body = new TextDecoder().decode(dec(b)), [u, , exp] = body.split(".");
    if (u !== uid || !(+exp > Date.now())) return false;
    const raw = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hx-interior-ticket:" + srk)));
    const k = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", k, dec(s), new TextEncoder().encode(body));
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const gkey = Deno.env.get("GEMINI_API_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    if (!gkey) return json({ error: "Missing GEMINI_API_KEY" }, 500);

    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ error: "login" }, 401);
    const user = await u.json();
    const email = String(user.email || "").toLowerCase();
    if (!(await ticketOk(req.headers.get("x-hx-ticket") || "", user.id))) return json({ error: "Η εφαρμογή ανοίγει μόνο από το hexis-app.gr με ενεργό κλειδί. Ανανέωσε τη σελίδα." }, 403);
    const now = Date.now(), list = (hits.get(user.id) || []).filter((t) => now - t < 3600e3);
    if (list.length >= 20) return json({ error: "rate_limited" }, 429);
    list.push(now); hits.set(user.id, list);

    const body = await req.json();
    // μονάδες: άδεια PRO / συνδρομή / δωρεάν / πακέτο (βλ. interior-billing.sql)
    const kind = (body.quality === "fast" ? "draft" : "final");
    const rpc = (name: string, args: unknown) => fetch(SB + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json()).catch(() => null);
    const q = await rpc("interior_consume", { p_kind: kind });
    if (!q || q.ok !== true) return json({ error: "quota", reason: q?.msg || "quota", used: q?.used, limit: q?.limit }, 402);
    const refund = () => rpc("interior_refund", { p_id: q.id });
    const image = typeof body.image === "string" ? body.image : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 6000) : "";
    if (!image || image.length > 8_000_000 || !prompt) { await refund(); return json({ error: "bad input" }, 400); }
    // μοντέλα με σειρά δοκιμής: αν κάποιο δεν υπάρχει/δεν επιτρέπεται στο κλειδί, πάμε στο επόμενο
    const first = Deno.env.get("GEMINI_IMAGE_MODEL") || (body.quality === "fast" ? "gemini-3.1-flash-image" : "gemini-3-pro-image");
    const chain = [...new Set([first, body.quality === "fast" ? "gemini-3.1-flash-image-preview" : "gemini-3-pro-image-preview", "gemini-3.1-flash-image", "gemini-2.5-flash-image"])];
    let res: Response | null = null, data: any = null, model = first; const tried: string[] = [];
    // φωτογραφίες προϊόντων του εμπορίου (έως 6) ως αναφορές για να αποδοθούν τα πραγματικά έπιπλα
    const refParts: any[] = [];
    for (const r of (Array.isArray(body.refs) ? body.refs : []).slice(0, 6)) {
      const m0 = String(r?.img || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if (!m0 || m0[2].length > 1_400_000) continue;
      refParts.push({ text: `Reference image ${refParts.length / 2 + 2}: the real product "${String(r.label || "").slice(0, 80)}" (${String(r.dims || "")}). It stands ${String(r.where || "in the frame").slice(0, 80)}. Render that piece to look exactly like this product (shape, legs, upholstery, material, colour, details), at its size and position in the 3D view.` });
      refParts.push({ inline_data: { mime_type: m0[1], data: m0[2] } });
    }
    const aspect = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"].includes(body.aspect) ? body.aspect : "";
    let hiRes = body.quality !== "fast";
    for (let ci = 0; ci < chain.length; ci++) {
      const m = chain[ci];
      model = m;
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": gkey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: image } }, ...refParts] }],
          generationConfig: hiRes ? { responseModalities: ["TEXT", "IMAGE"], imageConfig: { imageSize: "2K", ...(aspect ? { aspectRatio: aspect } : {}) } } : { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      data = await res.json().catch(() => ({}));
      if (res.ok) break;
      // αν το μοντέλο δεν δέχεται μέγεθος εικόνας, ξανά το ίδιο χωρίς αυτό
      if (hiRes && res.status === 400 && /image_?config|image_?size|aspect/i.test(String(data?.error?.message || ""))) { hiRes = false; ci--; continue; }
      tried.push(m + ": " + res.status + " " + String(data?.error?.message || "").slice(0, 120));
      if (![400, 403, 404].includes(res.status)) break; // όριο/υπερφόρτωση: όχι άλλη δοκιμή
    }
    if (!res || !res.ok) { await refund(); return json({ error: "google · " + tried.join(" | ") }, res ? res.status : 502); }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.map((p: any) => p.inlineData || p.inline_data).find((x: any) => x && x.data);
    if (!img) { await refund(); return json({ error: "no image: " + (parts.map((p: any) => p.text).join(" ").slice(0, 200) || data?.candidates?.[0]?.finishReason || "") }, 502); }
    // πραγματικό κόστος από usageMetadata (USD ανά 1M tokens, τιμοκατάλογος Google)
    const pro = !/flash/.test(model), um = data.usageMetadata || {};
    const pIn = pro ? 2 : 0.5, pTxt = pro ? 12 : 3, pImg = pro ? 120 : 60;
    const det = um.candidatesTokensDetails || [];
    const imgT = det.filter((d: any) => d.modality === "IMAGE").reduce((a: number, d: any) => a + (d.tokenCount || 0), 0) || (um.candidatesTokenCount || 0);
    const txtT = det.filter((d: any) => d.modality === "TEXT").reduce((a: number, d: any) => a + (d.tokenCount || 0), 0) + (um.thoughtsTokenCount || 0);
    const tin = um.promptTokenCount || 0, cost = (tin * pIn + imgT * pImg + txtT * pTxt) / 1e6;
    await saveCost(q.id, cost, model, tin, imgT + txtT);
    return json({ image: img.data, mime: img.mimeType || img.mime_type || "image/png", model, source: q.source, cost_usd: Math.round(cost * 10000) / 10000 });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
