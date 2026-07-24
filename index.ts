// ============================================================================
// HEXIS Νομοθεσία — Supabase Edge Function «nomothesia-ai» (v2 — με streaming)
// Proxy προς Anthropic API με server-side key (ίδιο pattern με translate-report)
// ============================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY secret");

    const body = await req.json();

    // Server-side lock: δεν εμπιστευόμαστε τον client για model/max_tokens
    const wantsSearch = Array.isArray(body.tools) && body.tools.some((t: any) => t?.name === "web_search");
    const wantsStream = body.stream === true;
    const payload: Record<string, unknown> = {
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(Number(body.max_tokens) || 1000, 1500),
      system: typeof body.system === "string" ? body.system.slice(0, 8000) : undefined,
      messages: Array.isArray(body.messages) ? body.messages.slice(-20) : [],
      stream: wantsStream,
    };
    if (wantsSearch) payload.tools = [{ type: "web_search_20250305", name: "web_search" }];

    if (!(payload.messages as unknown[]).length) {
      return new Response(JSON.stringify({ error: "No messages" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    // Streaming: περνάμε το SSE body κατευθείαν στον client
    if (wantsStream && res.ok && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          ...CORS,
          "Content-Type": res.headers.get("Content-Type") || "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
