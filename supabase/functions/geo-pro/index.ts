// ============================================================================
// HEXIS — Edge Function «geo-pro»: ο κώδικας του HEXIS GEOmetry Pro (Τοπογραφικό + ΔΓΜ)
// Ο κώδικας ΔΕΝ υπάρχει στη σελίδα ούτε σε απλή μορφή στο δημόσιο repo: το bundle.ts
// είναι κρυπτογραφημένο (NaCl box) με το δημόσιο κλειδί του geometry/pro-key.pub.
// Το ιδιωτικό κλειδί υπάρχει μόνο στο secret GEO_PRO_SK (φτιάχνεται στο CI, δεν το βλέπει κανείς).
//
// Είσοδος (POST, Authorization: Bearer <JWT χρήστη hexis-app.gr>)
// Έξοδος : { ok:true, until, code }  — μόνο αν ο λογαριασμός έχει ενεργό «syntetagmenes_pro» (ή είναι admin)
//          { ok:false, code:'login'|'pro'|'not_ready'|'server' }
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
    if (!e) {
      const a = await fetch(`${SB}/rest/v1/rpc/is_admin`, { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
      const isAdmin = a.ok && (await a.json()) === true;
      if (!isAdmin) return json({ ok: false, code: "pro" }, 403);
      until = null;
    }

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
