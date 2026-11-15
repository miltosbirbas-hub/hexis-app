// ============================================================================
// HEXIS — Edge Function «signup-notify»: email σε κάθε νέα εγγραφή χρήστη
// POST { uid }            ← από το trigger της βάσης (signup-notify.sql, pg_net)
//   Η βάση ελέγχει ότι ο χρήστης είναι καινούργιος και δεν έχει ειδοποιηθεί ήδη,
//   άρα μια τυχαία κλήση δεν μπορεί να στείλει τίποτα.
// POST { test: true }     ← δοκιμή από το admin (Authorization: Bearer <JWT διαχειριστή>)
//   ή από το CI με x-hx-selftest: SELFTEST_KEY
// Αποστολή: Resend (RESEND_API_KEY, MAIL_FROM προαιρετικό).
// Verify JWT: OFF.
// ============================================================================
const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const TO = (Deno.env.get("SIGNUP_NOTIFY_TO") || "brb.develop@gmail.com,miltos.birbas@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

type Info = { email: string; full_name: string; created_at: string; provider: string; n_today: number; n_7d: number; n_30d: number; n_total: number };

export function mailHtml(i: Info, test = false): string {
  const when = new Date(i.created_at).toLocaleString("el-GR", { timeZone: "Europe/Athens", dateStyle: "full", timeStyle: "short" });
  const row = (k: string, v: string) => `<tr><td style="padding:6px 14px 6px 0;color:#5B6675;font-size:13px">${k}</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#1F2836">${v}</td></tr>`;
  const stat = (k: string, v: number, g = false) => `<td style="padding:10px 14px;text-align:center;border:1px solid #EAEDF1;border-radius:10px"><div style="font-size:11px;color:#5B6675">${k}</div><div style="font-size:22px;font-weight:800;color:${g ? "#13804A" : "#1F2836"}">${v}</div></td>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1F2836">
  <div style="font-size:12px;color:#5B6675;letter-spacing:.06em">HEXIS-APP · ADMIN</div>
  <h2 style="margin:6px 0 14px;font-size:20px">${test ? "ΔΟΚΙΜΗ · " : ""}Νέα εγγραφή χρήστη</h2>
  <table style="border-collapse:collapse">${row("Email", `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>`)}${i.full_name ? row("Όνομα", esc(i.full_name)) : ""}${row("Εγγραφή", esc(when))}${row("Τρόπος", i.provider === "email" ? "Email & κωδικός" : esc(i.provider))}</table>
  <table style="border-collapse:separate;border-spacing:6px;margin:16px -6px"><tr>${stat("Σήμερα", i.n_today, true)}${stat("7 ημέρες", i.n_7d)}${stat("30 ημέρες", i.n_30d)}${stat("Σύνολο", i.n_total)}</tr></table>
  <a href="https://hexis-app.gr/admin.html" style="display:inline-block;background:#1F2836;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:14px">Άνοιγμα HEXIS Admin →</a>
  <p style="font-size:11px;color:#98A1AE;margin-top:18px">Αυτόματη ειδοποίηση HEXIS-APP σε κάθε νέα εγγραφή.</p></div>`;
}

// Στέλνει σε όλους μαζί· αν το Resend αρνηθεί (π.χ. λογαριασμός χωρίς επαληθευμένο domain),
// δοκιμάζει έναν-έναν ώστε να φτάσει τουλάχιστον σε όσους επιτρέπεται.
async function send(subject: string, html: string): Promise<Record<string, string>> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return Object.fromEntries(TO.map((t) => [t, "no RESEND_API_KEY"]));
  const from = Deno.env.get("MAIL_FROM") || "HEXIS-APP <onboarding@resend.dev>";
  const post = async (to: string[]) => {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, html }) }).catch((e) => e as Error);
    if (r instanceof Error) return r.message;
    return r.ok ? "ok" : `${r.status} ${(await r.text()).slice(0, 160)}`;
  };
  const all = await post(TO);
  if (all === "ok") return Object.fromEntries(TO.map((t) => [t, "ok"]));
  const out: Record<string, string> = {};
  for (const t of TO) out[t] = await post([t]);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (body.test) {
    const st = Deno.env.get("SELFTEST_KEY"), hdr = req.headers.get("x-hx-selftest");
    let ok = !!st && hdr === st;
    if (!ok) {
      const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (tok && tok !== ANON) {
        const r = await fetch(SB + "/rest/v1/rpc/is_admin", { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
        ok = !!r && r.ok && (await r.json()) === true;
      }
    }
    if (!ok) return json({ error: "not admin" }, 403);
    const res = await send("ΔΟΚΙΜΗ · Νέα εγγραφή HEXIS-APP · demo@example.com",
      mailHtml({ email: "demo@example.com", full_name: "Δοκιμαστικός Χρήστης", created_at: new Date().toISOString(), provider: "email", n_today: 1, n_7d: 3, n_30d: 10, n_total: 30 }, true));
    return json({ ok: Object.values(res).some((v) => v === "ok"), to: res });
  }

  const uid = String(body.uid || "");
  if (!/^[0-9a-f-]{36}$/i.test(uid) || !service) return json({ error: "bad request" }, 400);
  const db = (fn: string, args: unknown) => fetch(SB + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const c = await db("signup_notify_claim", { p_uid: uid });
  if (!c.ok) return json({ error: "claim " + c.status }, 500);
  const rows = (await c.json()) as Info[];
  if (!rows.length) return json({ ok: true, skip: true });
  const i = rows[0];
  const res = await send(`Νέα εγγραφή HEXIS-APP · ${i.email}`, mailHtml(i));
  const ok = Object.values(res).some((v) => v === "ok");
  await db("signup_notify_done", { p_uid: uid, p_ok: ok, p_detail: JSON.stringify(res) }).catch(() => null);
  return json({ ok, to: res });
});
