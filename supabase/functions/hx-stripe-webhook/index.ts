// ============================================================================
// HEXIS — Edge Function «hx-stripe-webhook»: το Stripe ειδοποιεί για πληρωμές.
// Events: checkout.session.completed (αγορά) · invoice.paid (ανανέωση συνδρομής)
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…), RESEND_API_KEY (email στον διαχειριστή)
// Verify JWT: OFF (η αυθεντικότητα ελέγχεται με την υπογραφή Stripe-Signature).
// Κάθε πληρωμή → hx_orders (ΑΠΥ ή ΤΠΥ αν δόθηκε ΑΦΜ) → hx_fulfill (ενεργοποίηση) → ουρά παραστατικών
// → email στον διαχειριστή με τα πλήρη στοιχεία τιμολόγησης (εγγραφή + Stripe), για χειροκίνητη έκδοση παραστατικού.
// Ισχύει για ΟΛΕΣ τις πληρωμές του λογαριασμού: HEXIS MAPPING, HEXIS INTERIOR, εφαρμογές του hub.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "brb.develop@gmail.com";
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

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const eur = (c: number) => (c / 100).toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

type Billing = Record<string, string | null>;
// Στοιχεία τιμολόγησης: από την εγγραφή στο hexis-app.gr (user_metadata.billing) και ό,τι έδωσε ο πελάτης στο Stripe.
export function mergeBilling(reg: Record<string, unknown> | null, sd: Record<string, any> | null, email: string | null, taxId: string | null): Billing {
  const r = reg || {}, a = sd?.address || {};
  const pick = (...v: unknown[]) => { for (const x of v) { const t = String(x ?? "").trim(); if (t) return t; } return null; };
  return {
    name: pick(r.name, sd?.name), company: pick(r.company, sd?.business_name), profession: pick(r.profession),
    afm: pick(r.afm, taxId), doy: pick(r.doy), address: pick(r.address, [a.line1, a.line2].filter(Boolean).join(", ")),
    zip: pick(r.zip, a.postal_code), city: pick(r.city, a.city), country: pick(a.country), phone: pick(r.phone, sd?.phone),
    email: pick(email, sd?.email),
  };
}

export function mailHtml(o: { item: string; sku: string; amount: number; net: number; vat: number; doc: string; when: string; stripeId: string; ref: string | null; renewal: boolean }, b: Billing): string {
  const row = (k: string, v: unknown) => `<tr><td style="padding:5px 12px 5px 0;color:#5f6b78;white-space:nowrap">${k}</td><td style="padding:5px 0;font-weight:600">${esc(v) || "<span style='color:#c92a2a'>—</span>"}</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2933;max-width:620px">
  <p style="font-size:17px;margin:0 0 6px"><b>Η πληρωμή ολοκληρώθηκε και έγινε αποδεκτή από το Stripe.</b></p>
  <p style="margin:0 0 14px;color:#5f6b78">Κόψε το παραστατικό (${esc(o.doc)}) και σημείωσέ το ως «Εκδόθηκε» στο admin.</p>
  <table style="border-collapse:collapse;margin-bottom:14px">${row("Προϊόν", o.item + (o.renewal ? " (ανανέωση συνδρομής)" : ""))}${row("Κωδικός", o.sku)}
    ${row("Καθαρό", eur(o.net))}${row("ΦΠΑ 24%", eur(o.vat))}${row("Σύνολο", eur(o.amount))}${row("Παραστατικό", o.doc)}${row("Ημερομηνία", o.when)}
    ${o.ref ? row("Αναφορά εφαρμογής", o.ref) : ""}${row("Αρ. πληρωμής Stripe", o.stripeId)}</table>
  <p style="margin:0 0 6px"><b>Στοιχεία τιμολόγησης πελάτη</b></p>
  <table style="border-collapse:collapse">${row("Ονοματεπώνυμο", b.name)}${row("Επωνυμία", b.company)}${row("Επάγγελμα", b.profession)}${row("ΑΦΜ", b.afm)}${row("ΔΟΥ", b.doy)}
    ${row("Διεύθυνση", b.address)}${row("Τ.Κ.", b.zip)}${row("Πόλη", b.city)}${b.country && b.country !== "GR" ? row("Χώρα", b.country) : ""}${row("Τηλέφωνο", b.phone)}${row("Email", b.email)}</table>
  <p style="margin:18px 0 0"><a href="https://hexis-app.gr/admin.html#payments" style="background:#1f7a4a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Άνοιγμα HEXIS-APP Admin · Πληρωμές</a></p>
</div>`;
}

async function sendMail(subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("MAIL_FROM") || "HEXIS-APP <onboarding@resend.dev>", to: [ADMIN_EMAIL], subject, html }),
  }).catch(() => null);
  return !!r && r.ok;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

// Δοκιμαστικό email από το admin (μόνο διαχειριστής): ίδια μορφή με το πραγματικό, με παράδειγμα πελάτη
async function testMail(req: Request): Promise<Response> {
  const J = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!tok) return J({ error: "Χρειάζεται σύνδεση διαχειριστή." }, 401);
  const adm = await fetch(SB + "/rest/v1/rpc/is_admin", { method: "POST", headers: { apikey: anon, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: "{}" })
    .then((r) => (r.ok ? r.json() : false)).catch(() => false);
  if (adm !== true) return J({ error: "Μόνο για τον διαχειριστή." }, 403);
  if (!Deno.env.get("RESEND_API_KEY")) return J({ error: "Λείπει το RESEND_API_KEY στα Secrets." }, 500);
  const b: Billing = { name: "Δοκιμαστικός Πελάτης", company: null, profession: "Πολιτικός Μηχανικός", afm: "000000000", doy: "Λευκάδας",
    address: "Οδός Παραδείγματος 1", zip: "31100", city: "Λευκάδα", country: "GR", phone: "6900000000", email: ADMIN_EMAIL };
  const ok = await sendMail("ΔΟΚΙΜΗ · Πληρωμή ολοκληρώθηκε · HEXIS MAPPING · 12,40 €",
    mailHtml({ item: "HEXIS MAPPING · επεξεργασία πτήσης (ΔΟΚΙΜΗ)", sku: "MAP-JOB", amount: 1240, net: 1000, vat: 240, doc: "ΑΠΥ",
      when: new Date().toLocaleString("el-GR", { timeZone: "Europe/Athens" }), stripeId: "cs_test_δοκιμή", ref: null, renewal: false }, b));
  return ok ? J({ ok: true, to: ADMIN_EMAIL }) : J({ error: "Το Resend δεν δέχτηκε το email· έλεγξε το κλειδί και ότι ο λογαριασμός είναι με το " + ADMIN_EMAIL + "." }, 502);
}

export async function handle(req: Request): Promise<Response> {
  if (new URL(req.url).searchParams.get("test") === "mail") {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    return await testMail(req);
  }
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
      row = { sku: md.sku, ref: md.ref || null, user_id: md.user_id || s.client_reference_id || null, stripe_session: s.id, stripe_customer: s.customer || null, stripe_sub: s.subscription || null,
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

    const sd = ev.type === "checkout.session.completed" ? ev.data.object.customer_details : null;
    const regBilling = async (uid: unknown) => {
      if (!uid) return null;
      const u = await db("/auth/v1/admin/users/" + uid).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      return u?.user_metadata?.billing || u?.raw_user_meta_data?.billing || null;
    };
    if (!row.sku) {                                     // πληρωμή που δεν αναγνωρίζεται: ποτέ σιωπηλά
      const b = mergeBilling(await regBilling(row.user_id), sd, row.customer_email as string, row.tax_id as string);
      const amt = Number(row.amount_cents) || 0;
      await sendMail(`Πληρωμή Stripe χωρίς κωδικό προϊόντος · ${eur(amt)} — ${b.name || b.email || ""}`,
        mailHtml({ item: "Άγνωστο προϊόν (χωρίς κωδικό)", sku: "—", amount: amt, net: Math.round(amt / 1.24), vat: amt - Math.round(amt / 1.24), doc: String(row.doc_type),
          when: new Date().toLocaleString("el-GR", { timeZone: "Europe/Athens" }), stripeId: String(row.stripe_session || row.stripe_invoice || ""), ref: null, renewal: false }, b));
      return json({ ok: true, skip: "no sku", notified: true });
    }
    const amount = Number(row.amount_cents) || 0;
    const net = Math.round(amount / 1.24), vat = amount - net;
    const ins = await db("/rest/v1/hx_orders?on_conflict=" + (row.stripe_session ? "stripe_session" : "stripe_invoice"), {
      method: "POST", headers: { Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify({ ...row, net_cents: net, vat_cents: vat }),
    });
    const got = ins.ok ? await ins.json() : [];
    if (!ins.ok) return json({ error: "db", detail: await ins.text() }, 500);
    if (!got.length) return json({ ok: true, dup: true }); // ήδη καταχωρημένο (επανάληψη από Stripe)
    const f = await db("/rest/v1/rpc/hx_fulfill", { method: "POST", body: JSON.stringify({ p_order: got[0].id }) });
    // στοιχεία τιμολόγησης τη στιγμή της πληρωμής + email στον διαχειριστή (δεν εμποδίζει ποτέ την ενεργοποίηση)
    let notified = false;
    try {
      const b = mergeBilling(await regBilling(row.user_id), sd, row.customer_email as string, row.tax_id as string);
      const prod = await db("/rest/v1/hx_products?select=name_el&sku=eq." + encodeURIComponent(String(row.sku))).then((r) => (r.ok ? r.json() : [])).catch(() => []);
      const item = prod?.[0]?.name_el || String(row.sku);
      notified = await sendMail(`Πληρωμή ολοκληρώθηκε · ${item} · ${eur(amount)} — ${b.name || b.company || b.email || ""}`,
        mailHtml({ item, sku: String(row.sku), amount, net, vat, doc: String(row.doc_type), when: new Date().toLocaleString("el-GR", { timeZone: "Europe/Athens" }),
          stripeId: String(row.stripe_session || row.stripe_invoice || ""), ref: (row.ref as string) || null, renewal: ev.type === "invoice.paid" }, b));
      await db("/rest/v1/hx_orders?id=eq." + got[0].id, { method: "PATCH", body: JSON.stringify({ billing: b, ...(notified ? { notified_at: new Date().toISOString() } : {}) }) });
    } catch (_) { /* η ειδοποίηση είναι βοηθητική */ }
    // ΠΑΡΑΣΤΑΤΙΚΟ: όταν υπάρξει API του Emblem, η έκδοση μπαίνει εδώ· μέχρι τότε μένει «pending» στο admin.
    return json({ ok: true, order: got[0].id, notified, fulfill: f.ok ? await f.json() : null });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

if (import.meta.main) Deno.serve(handle);
