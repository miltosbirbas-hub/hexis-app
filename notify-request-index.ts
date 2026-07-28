// HEXIS Hub — Ειδοποίηση email για νέο αίτημα module
// Deploy: supabase functions deploy notify-request --project-ref oucqqudfdimccgowvpqp
// Secret: supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref oucqqudfdimccgowvpqp

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = "brb.develop@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODULES: Record<string, string> = {
  mpeton: "Σκυρόδεμα & Τοιχοποιία", rtk: "RTK Checklist", ktima: "Κτηματολόγιο & ΕΓΣΑ'87",
  dxf: "CAD Tools (DXF + LISP)", domisi: "Έλεγχος Δόμησης", nomothesia: "Νομοθεσία",
  kostos: "Κόστος Άδειας", terrain: "BRB Terrain",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, module } = await req.json();
    const name = MODULES[module] ?? module;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HEXIS Hub <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `Νέο αίτημα: ${name} — ${email}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1F2836">
          <p>Ο χρήστης <b>${email}</b> ζήτησε ενεργοποίηση του module:</p>
          <p style="font-size:18px;font-weight:bold;color:#E05A12">${name}</p>
          <p><a href="https://hexis-app.gr/admin.html" style="background:#F26B21;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Άνοιγμα HEXIS Admin</a></p>
        </div>`,
      }),
    });
    const body = await r.text();
    return new Response(JSON.stringify({ ok: r.ok, detail: r.ok ? undefined : body }), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: r.ok ? 200 : 500,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: cors });
  }
});
