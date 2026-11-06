// ============================================================================
// HEXIS — Edge Function «geo-pro»: ο κώδικας του HEXIS GEOmetry Pro (Τοπογραφικό + ΔΓΜ)
// Ο κώδικας ΔΕΝ υπάρχει στη σελίδα ούτε σε απλή μορφή στο δημόσιο repo: το bundle.ts
// είναι κρυπτογραφημένο (NaCl box) με το δημόσιο κλειδί του geometry/pro-key.pub.
// Το ιδιωτικό κλειδί υπάρχει μόνο στο secret GEO_PRO_SK (φτιάχνεται στο CI, δεν το βλέπει κανείς).
//
// Είσοδος (POST, Authorization: Bearer <JWT χρήστη hexis-app.gr>)
// Σώμα  : { device, name, action?: 'load'|'beat'|'release', take?: true }
// Έξοδος : { ok:true, until, code }  — μόνο αν ο λογαριασμός έχει ενεργό «syntetagmenes_pro» (ή είναι admin)
//          και η συσκευή κρατά τη θέση της άδειας (μία συσκευή τη φορά· πίνακας geo_seats)
//          { ok:false, code:'login'|'pro'|'seat'|'device'|'not_ready'|'server' }
// Αυτοέλεγχος CI: header x-hx-selftest = SELFTEST_KEY → { ok, bytes, names } χωρίς τον κώδικα.
// Verify JWT: OFF (ο χρήστης ελέγχεται εδώ).
// ============================================================================
import nacl from "npm:tweetnacl@1.0.3";
import { PRO } from "./bundle.ts";

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
const ORIGINS = ["https://hexis-app.gr", "https://www.hexis-app.gr", "https://miltosbirbas-hub.github.io"];
const MODULE = "syntetagmenes_pro";

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let CODE: string | null = null;
function proCode(): string | null {
  if (CODE) return CODE;
  if (!PRO) return null;
  const sk = Deno.env.get("GEO_PRO_SK");
  if (!sk) return null;
  const all = unb64(PRO);
  const epk = all.slice(0, 32), nonce = all.slice(32, 56), box = all.slice(56);
  const msg = nacl.box.open(box, nonce, epk, unb64(sk));
  if (!msg) throw new Error("bundle");
  CODE = new TextDecoder().decode(msg);
  return CODE;
}

Deno.serve(async (req) => {
  const H = cors(req);
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...H, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
  try {
    // αυτοέλεγχος του CI (προσωρινό κλειδί μιας εκτέλεσης): επιβεβαιώνει την αποκρυπτογράφηση χωρίς να δίνει κώδικα
    const st = req.headers.get("x-hx-selftest"), stk = Deno.env.get("SELFTEST_KEY");
    if (st && stk && st === stk) {
      const c = proCode();
      const names = ["DGM", "DgmPraxis", "PraxisDescr", "DgmSheet", "TopoSheet", "CmdCheck"].filter((n) => c && c.includes("." + n + "="));
      return json({ ok: !!c && names.length === 6, selftest: true, bytes: c ? c.length : 0, names });
    }
    const auth = req.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+/.test(auth)) return json({ ok: false, code: "login" }, 401);
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || ANON;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!service) return json({ ok: false, code: "server" }, 500);

    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!u.ok) return json({ ok: false, code: "login" }, 401);
    const user = await u.json();

    const r = await fetch(`${SB}/rest/v1/entitlements?select=active,expires_at&user_id=eq.${user.id}&module=eq.${MODULE}`, {
      headers: { apikey: service, Authorization: "Bearer " + service },
    });
    const rows = r.ok ? await r.json() : [];
    const now = Date.now();
    const e = (rows || []).find((x: { active: boolean; expires_at: string | null }) => x.active && (!x.expires_at || Date.parse(x.expires_at) > now));
    let until: string | null = e ? e.expires_at : null;
    const a = await fetch(`${SB}/rest/v1/rpc/is_admin`, { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
    const admin = a.ok && (await a.json()) === true;
    if (!e) {
      if (!admin) return json({ ok: false, code: "pro" }, 403);
      until = null;
    }

    // ---- μία συσκευή τη φορά ----
    let body: { action?: string; device?: string; name?: string; take?: boolean } = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const dev = String(body.device || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    const dname = String(body.name || "").replace(/[<>]/g, "").slice(0, 80) || null;
    if (dev.length < 12) return json({ ok: false, code: "device" }, 400);
    if (admin) { // ο διαχειριστής δεν δεσμεύει θέση
      if (body.action === "release" || body.action === "beat") return json({ ok: true, admin: true });
      const c0 = proCode();
      if (!c0) return json({ ok: false, code: "not_ready" }, 503);
      return json({ ok: true, until, admin: true, code: `/* HEXIS-APP GEOmetry Pro · ${String(user.email || user.id).replace(/\*\//g, "")} */\n` + c0 });
    }
    const SH = { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" };
    const sr = await fetch(`${SB}/rest/v1/geo_seats?select=device_id,device_name,last_seen&user_id=eq.${user.id}`, { headers: SH });
    if (!sr.ok) return json({ ok: false, code: "server" }, 500);
    const seat = ((await sr.json()) || [])[0] as { device_id: string; device_name: string | null; last_seen: string } | undefined;
    const mine = !!seat && seat.device_id === dev;
    const IDLE = 48 * 3600 * 1000; // παλιά συσκευή χωρίς σημείο ζωής 48 ώρες → επιτρέπεται μεταφορά
    const idle = !!seat && now - Date.parse(seat.last_seen) > IDLE;
    const action = String(body.action || "load");

    if (action === "release") {
      if (mine) await fetch(`${SB}/rest/v1/geo_seats?user_id=eq.${user.id}&device_id=eq.${dev}`, { method: "DELETE", headers: SH });
      return json({ ok: true, released: mine });
    }
    if (action === "beat") {
      if (!mine) return json({ ok: false, code: "seat", device_name: seat ? seat.device_name : null }, 409);
      await fetch(`${SB}/rest/v1/geo_seats?user_id=eq.${user.id}`, { method: "PATCH", headers: SH, body: JSON.stringify({ last_seen: new Date().toISOString() }) });
      return json({ ok: true });
    }
    if (seat && !mine && !(idle && body.take)) {
      return json({ ok: false, code: "seat", device_name: seat.device_name, last_seen: seat.last_seen, can_take: idle }, 409);
    }
    const up = await fetch(`${SB}/rest/v1/geo_seats?on_conflict=user_id`, {
      method: "POST", headers: { ...SH, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: user.id, device_id: dev, device_name: dname, ...(mine ? {} : { bound_at: new Date().toISOString() }), last_seen: new Date().toISOString() }),
    });
    if (!up.ok) return json({ ok: false, code: "server" }, 500);

    const code = proCode();
    if (!code) return json({ ok: false, code: "not_ready" }, 503);
    // υδατογράφημα λογαριασμού: κάθε αντίγραφο φέρει τον κάτοχό του
    const mark = `/* HEXIS GEOmetry Pro · άδεια χρήσης για ${String(user.email || user.id).replace(/\*\//g, "")} · ${new Date().toISOString().slice(0, 10)} · © BRB Development ΜΟΝ. Ι.Κ.Ε. — απαγορεύεται η αναπαραγωγή */\n`;
    return json({ ok: true, until, code: mark + code });
  } catch (err) {
    console.error(err);
    return json({ ok: false, code: "server" }, 500);
  }
});
