// ============================================================================
// HEXIS — Edge Function «pad-lic»: υπογεγραμμένη άδεια HEXIS PAD (Ed25519)
// POST { op: 'activate' | 'owner', key?, device, model?, cert, sdk, ver? }
//   activate : κωδικός άδειας (pad_activate)
//   owner    : Authorization: Bearer <JWT χρήστη hexis-app.gr> (pad_owner_login)
// Έξοδος: ό,τι επιστρέφει η βάση + { tok, sig } όταν ok
//   tok = base64(JSON { v, k, d, t, e, h, u, n, iat, x })   x = έως πότε δουλεύει χωρίς ίντερνετ
//   sig = base64(Ed25519 υπογραφή του JSON) — η εφαρμογή την ελέγχει με το δημόσιο κλειδί
// Το ιδιωτικό κλειδί υπάρχει μόνο στο secret PAD_SIGN_SK (φτιάχνεται στο CI, δεν το βλέπει κανείς).
// Verify JWT: OFF (ο χρήστης ελέγχεται στη βάση).
// ============================================================================
import nacl from "npm:tweetnacl@1.0.3";

const SB = "https://oucqqudfdimccgowvpqp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8";
// Πιστοποιητικά υπογραφής της γνήσιας εφαρμογής (SHA-256)
const CERT_NEW = "8869136DE32B85F58B170636D1F36C51F5CE1F87B9AE220E4325004682E13236"; // Android 9+ (μετά τη μετάβαση κλειδιού)
const CERT_OLD = "F600CC717C9BE189AE1E7A76319447B104205FA43D43EECD912D5174F8563E66"; // Android 7–8
const DAY = 86400e3;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

let SK: Uint8Array | null = null;
function secretKey() {
  if (SK) return SK;
  const s = Deno.env.get("PAD_SIGN_SK"); if (!s) throw new Error("no signing key");
  SK = unb64(s); if (SK.length !== 64) throw new Error("bad signing key");
  return SK;
}

function certOk(cert: string, sdk: number) {
  const c = String(cert || "").toUpperCase().replace(/[^0-9A-F]/g, "");
  if (c.length !== 64) return false;
  return sdk >= 28 ? c === CERT_NEW : (c === CERT_OLD || c === CERT_NEW);
}

async function rpc(fn: string, body: unknown, auth: string) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { ok: false, code: "server", msg: t.slice(0, 200) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, code: "bad" }, 400); }
  const device = String(b.device || ""), sdk = Number(b.sdk || 0);
  if (device.length < 6) return json({ ok: false, code: "device", msg: "Δεν αναγνωρίστηκε η συσκευή" });
  if (!certOk(String(b.cert || ""), sdk)) return json({ ok: false, code: "tampered", msg: "Μη γνήσια έκδοση της εφαρμογής" });

  let r: Record<string, unknown>;
  if (b.op === "owner") {
    const auth = req.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+/.test(auth)) return json({ ok: false, code: "auth" });
    r = await rpc("pad_owner_login", { p_device: device, p_model: b.model || null }, auth);
  } else {
    r = await rpc("pad_activate", { p_key: String(b.key || ""), p_device: device, p_model: b.model || null }, "Bearer " + ANON);
  }
  if (!r || r.ok !== true) return json(r || { ok: false, code: "server" });

  const now = Date.now(), kind = String(r.kind);
  const grace = (kind === "owner" || kind === "full") ? 30 * DAY : 7 * DAY;
  let x = now + grace;
  if (r.expires_at) x = Math.min(x, Date.parse(String(r.expires_at)));
  const payload = { v: 1, k: r.key, d: device, t: kind, e: r.expires_at ?? null, h: r.hours ?? null, u: r.used_min ?? 0, n: r.name ?? "", iat: now, x };
  const msg = new TextEncoder().encode(JSON.stringify(payload));
  const sig = nacl.sign.detached(msg, secretKey());
  return json({ ...r, tok: b64(msg), sig: b64(sig) });
});
