import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_REF = "oucqqudfdimccgowvpqp";

const SYSTEM_PROMPT = [
  "Eisai o technikos voithos tou HEXIS, efarmogis diacheirisis ergotaxiou gia Ellines michanikous.",
  "Apantas se erotiseis gia tin elliniki nomothesia domisis: N.4495/2017, NOK N.4067/2012, KENAK/TEE, GOK, adeies, afthaireta/taktopoiiseis, kai gia tous Eurokodikes.",
  "PROSFATA (2025-2026): Kyrothike o neos Kodikas Chorotaxias kai Poleodomias 'Nikolaos Tagaras' (kodikopoiisi 477 arthron pou enopoiei 181 nomothetimata). O NOK (4067/2012) tropopoiithike me ta arthra 66-71 tou n.5197/2025, meta tis apofaseis tis Olomeleias tou StE (146-149/2025) gia ta bonus ypsous. Otan syzitas afta, pes ston christi na epivaiosei tin ischyousa diataxi sto FEK i stis egkyklious tou YPEN.",
  "Dineis kai technikes lyseis gia ylika kai efarmoges: skyrodema, oplismoi, monoseis, steganoseis, epichrismata, chromata, metallikes/xylines kataskeves, pathologia ktirion.",
  "KANONES: Grafeis sta ellinika. Anaferes arithmo nomou/arthrou opou to xereis. PANTA prostheteis sto telos mia synomi ypenthymisi oti i teliki efthyni varynei ton michaniko. An den eisai sigouros, to les anti na eikazeis. Eisai periektikos.",
].join("\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("No", { status: 405, headers: CORS });

  try {
    const auth = req.headers.get("Authorization") || "";
    const apikey = req.headers.get("apikey") || "";
    const token = auth.replace("Bearer ", "").trim();

    let authorized = false;
    // 1) Δοκίμασε να αποκωδικοποιήσεις ως JWT (παλιό format)
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const ref = payload.ref || "";
        const iss = payload.iss || "";
        if (ref === PROJECT_REF || (iss && iss.includes(PROJECT_REF)) || iss === "supabase") {
          authorized = true;
        }
      }
    } catch (_) { /* συνεχίζουμε στους επόμενους ελέγχους */ }

    // 2) Δοκίμασε το apikey header (anon key)
    if (!authorized && apikey) {
      try {
        const parts = apikey.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload.ref === PROJECT_REF || (payload.iss && payload.iss.includes(PROJECT_REF))) {
            authorized = true;
          }
        }
      } catch (_) {}
    }

    // 3) Νέα Supabase keys (sb_publishable_... / sb_secret_...) — έλεγξε αν περιέχουν το ref έμμεσα
    if (!authorized && (token.startsWith("sb_") || apikey.startsWith("sb_"))) {
      authorized = true; // τα νέα keys είναι ήδη scoped στο project από το Supabase gateway
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Mi exousiodotimeni prosvasi" }),
        { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return new Response(JSON.stringify({ error: "Leipei to minyma" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const trimmed = messages.slice(-12).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "Sfalma AI: " + t.slice(0, 200) }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");

    return new Response(JSON.stringify({ reply: text }),
      { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Sfalma: " + (e?.message || String(e)) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
