// ============================================================================
// HEXIS INTERIOR — Supabase Edge Function «interior-render»
// Φωτορεαλιστική απόδοση: καρέ 3D (JPEG base64) + οδηγίες → μοντέλο εικόνας → εικόνα (base64).
// Secret: GEMINI_API_KEY (Google AI Studio). Προαιρετικά GEMINI_IMAGE_MODEL.
// Deploy: Dashboard → Edge Functions (Verify JWT: OFF — ο έλεγχος χρήστη γίνεται εδώ).
// Πρόσβαση: ιδιοκτήτες ή ενεργό entitlement «interior». Όριο: 20 αποδόσεις/ώρα ανά χρήστη.
// ============================================================================

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8"; // δημόσιο anon key (ίδιο με τις σελίδες)
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
    const gkey = Deno.env.get("GEMINI_API_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    if (!gkey) return json({ error: "Missing GEMINI_API_KEY" }, 500);

    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ error: "login" }, 401);
    const user = await u.json();
    const email = String(user.email || "").toLowerCase();
    if (!OWNERS.includes(email)) {
      const e = await fetch(SB + "/rest/v1/entitlements?select=active,expires_at&module=eq.interior", { headers: { apikey: anon, Authorization: auth } });
      const rows = e.ok ? await e.json() : [];
      const ok = (rows || []).some((r: any) => r.active && (!r.expires_at || new Date(r.expires_at) > new Date()));
      if (!ok) return json({ error: "forbidden" }, 403);
    }
    const now = Date.now(), list = (hits.get(user.id) || []).filter((t) => now - t < 3600e3);
    if (list.length >= 20) return json({ error: "rate_limited" }, 429);
    list.push(now); hits.set(user.id, list);

    const body = await req.json();
    const image = typeof body.image === "string" ? body.image : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 6000) : "";
    if (!image || image.length > 8_000_000 || !prompt) return json({ error: "bad input" }, 400);
    const model = Deno.env.get("GEMINI_IMAGE_MODEL") || (body.quality === "fast" ? "gemini-2.5-flash-image" : "gemini-3-pro-image-preview");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": gkey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: image } }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message || "upstream" }, res.status);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.map((p: any) => p.inlineData || p.inline_data).find((x: any) => x && x.data);
    if (!img) return json({ error: "no image: " + (parts.map((p: any) => p.text).join(" ").slice(0, 200) || data?.candidates?.[0]?.finishReason || "") }, 502);
    return json({ image: img.data, mime: img.mimeType || img.mime_type || "image/png", model });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
