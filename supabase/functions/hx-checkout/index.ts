// ============================================================================
// HEXIS — Edge Function «hx-checkout»: δημιουργεί σελίδα πληρωμής Stripe για ένα προϊόν του hub.
// Είσοδος (POST, JWT χρήστη): { sku, consent: true, lang?: 'el'|'en', return?: 'interior.html' }
// Secrets: STRIPE_SECRET_KEY (restricted: Checkout Sessions write, Customers write)
// Verify JWT: OFF (ο χρήστης ελέγχεται εδώ). Το ποσό έρχεται ΜΟΝΟ από τον πίνακα hx_products.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const SITE = "https://hexis-app.gr/";
const CORS = { "Access-Control-Allow-Origin": "https://hexis-app.gr", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Stripe API: form-encoded με εμφωλευμένα κλειδιά (a[b][0][c]=…)
function form(obj: Record<string, unknown>, pre = "", out: string[] = []): string {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const sk = Deno.env.get("STRIPE_SECRET_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    if (!sk || !service) return json({ error: "not_configured" }, 500);

    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "login" }, 401);
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ error: "login" }, 401);
    const user = await u.json();

    const body = await req.json().catch(() => ({}));
    const sku = String(body.sku || "");
    if (!/^[A-Z0-9-]{3,24}$/.test(sku)) return json({ error: "sku" }, 400);
    if (body.consent !== true) return json({ error: "consent" }, 400);
    const lang = body.lang === "en" ? "en" : "el";
    const ret = /^[a-z0-9_\-]+\.html$/i.test(String(body.return || "")) ? String(body.return) : "hub.html";

    const pr = await fetch(`${SB}/rest/v1/hx_products?sku=eq.${encodeURIComponent(sku)}&active=eq.true&select=*`, { headers: { apikey: service, Authorization: "Bearer " + service } });
    const rows = pr.ok ? await pr.json() : [];
    const p = rows[0];
    if (!p) return json({ error: "sku" }, 404);

    const name = lang === "en" ? p.name_en : p.name_el;
    const recurring = p.recurring ? { interval: p.recurring } : undefined;
    const meta = { sku, user_id: user.id, app: p.app, consent: "immediate_delivery_waiver" };
    const params: Record<string, unknown> = {
      mode: recurring ? "subscription" : "payment",
      locale: lang,
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: { 0: { quantity: 1, price_data: { currency: "eur", unit_amount: p.gross_cents, tax_behavior: "inclusive", recurring, product_data: { name, metadata: { sku } } } } },
      metadata: meta,
      tax_id_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: "false",
      success_url: `${SITE}${ret}?paid=${encodeURIComponent(sku)}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}${ret}?paid=cancel`,
    };
    if (recurring) params.subscription_data = { metadata: meta };
    else {
      params.customer_creation = "always";
      params.payment_intent_data = { metadata: meta, ...(p.descriptor ? { statement_descriptor_suffix: String(p.descriptor).slice(0, 12) } : {}) };
      params.invoice_creation = { enabled: "false" };
    }
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + sk, "Content-Type": "application/x-www-form-urlencoded" },
      body: form(params),
    });
    const s = await r.json();
    if (!r.ok) return json({ error: s?.error?.message || "stripe" }, 502);
    return json({ url: s.url });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
