// ============================================================================
// HEXIS — Edge Function «hx-stripe-webhook»: το Stripe ειδοποιεί για πληρωμές.
// Events: checkout.session.completed (αγορά) · invoice.paid (ανανέωση συνδρομής)
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…)
// Verify JWT: OFF (η αυθεντικότητα ελέγχεται με την υπογραφή Stripe-Signature).
// Κάθε πληρωμή → hx_orders (ΑΠΥ ή ΤΠΥ αν δόθηκε ΑΦΜ) → hx_fulfill (ενεργοποίηση) → ουρά παραστατικών.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function verify(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")).map(([k, ...v]) => [k.trim(), v.join("=")]));
  const sigs = header.split(",").filter((x) => x.trim().startsWith("v1=")).map((x) => x.trim().slice(3));
  const t = parts["t"];
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].every((c, i) => c === hex[i]));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const sk = Deno.env.get("STRIPE_SECRET_KEY"), whs = Deno.env.get("STRIPE_WEBHOOK_SECRET"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sk || !whs || !service) return json({ error: "not_configured" }, 500);
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature") || "", whs))) return json({ error: "signature" }, 400);
  const ev = JSON.parse(raw);
  const db = (path: string, init: RequestInit = {}) => fetch(SB + path, { ...init, headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const stripe = (path: string) => fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + sk } }).then((r) => r.json());

  try {
    let row: Record<string, unknown> | null = null;
    if (ev.type === "checkout.session.completed") {
      const s = ev.data.object;
      if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return json({ ok: true, skip: "unpaid" });
      const md = s.metadata || {};
      const taxIds = s.customer_details?.tax_ids || [];
      const tax = taxIds.length ? String(taxIds[0].value || "") : "";
      row = { sku: md.sku, user_id: md.user_id || s.client_reference_id || null, stripe_session: s.id, stripe_customer: s.customer || null, stripe_sub: s.subscription || null,
        amount_cents: s.amount_total, customer_email: s.customer_details?.email || s.customer_email || null,
        customer_name: s.customer_details?.business_name || s.customer_details?.name || null, tax_id: tax || null, doc_type: tax ? "ΤΠΥ" : "ΑΠΥ" };
    } else if (ev.type === "invoice.paid") {
      const inv = ev.data.object;
      if (inv.billing_reason !== "subscription_cycle") return json({ ok: true, skip: inv.billing_reason }); // η 1η χρέωση καλύπτεται από το checkout
      const subId = inv.subscription || inv.parent?.subscription_details?.subscription;
      const sub = subId ? await stripe("subscriptions/" + subId) : null;
      const md = sub?.metadata || inv.parent?.subscription_details?.metadata || {};
      const tax = (inv.customer_tax_ids || [])[0]?.value || "";
      row = { sku: md.sku, user_id: md.user_id || null, stripe_invoice: inv.id, stripe_customer: inv.customer || null, stripe_sub: subId || null,
        amount_cents: inv.amount_paid, customer_email: inv.customer_email || null, customer_name: inv.customer_name || null, tax_id: tax || null, doc_type: tax ? "ΤΠΥ" : "ΑΠΥ" };
    } else return json({ ok: true, ignored: ev.type });

    if (!row.sku) return json({ ok: true, skip: "no sku" });
    const amount = Number(row.amount_cents) || 0;
    const net = Math.round(amount / 1.24), vat = amount - net;
    const ins = await db("/rest/v1/hx_orders?on_conflict=" + (row.stripe_session ? "stripe_session" : "stripe_invoice"), {
      method: "POST", headers: { Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify({ ...row, net_cents: net, vat_cents: vat }),
    });
    const got = ins.ok ? await ins.json() : [];
    if (!ins.ok) return json({ error: "db", detail: await ins.text() }, 500);
    if (!got.length) return json({ ok: true, dup: true }); // ήδη καταχωρημένο (επανάληψη από Stripe)
    const f = await db("/rest/v1/rpc/hx_fulfill", { method: "POST", body: JSON.stringify({ p_order: got[0].id }) });
    // ΠΑΡΑΣΤΑΤΙΚΟ: όταν υπάρξει API του Emblem, η έκδοση μπαίνει εδώ· μέχρι τότε μένει «pending» στο admin.
    return json({ ok: true, order: got[0].id, fulfill: f.ok ? await f.json() : null });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
