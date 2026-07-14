const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-5-20250929";

const SINGLE_PROMPT = `You are an executive assistant analyst for a VC investor. Given this investment data, provide: (1) a 2-sentence plain-English status summary, (2) any risks or blockers, (3) the single most important next action. Be direct and concise. Return ONLY valid JSON (no markdown fences) with keys: summary (string), risks (string), next_action (string).`;

const PORTFOLIO_PROMPT = `You are an executive assistant for a VC investor with the following portfolio. Give a 5-bullet portfolio health summary covering: what is on track, what needs immediate attention, what is overdue, any patterns or risks across the portfolio, and one recommended priority action for this week. Be direct and executive-ready. Return ONLY valid JSON (no markdown fences) with key: bullets (array of exactly 5 strings).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const { mode, data } = await req.json();
    if (mode !== "single" && mode !== "portfolio") throw new Error("mode must be single or portfolio");

    const system = mode === "single" ? SINGLE_PROMPT : PORTFOLIO_PROMPT;
    const userMsg = mode === "single"
      ? `Investment:\n${JSON.stringify(data, null, 2)}`
      : `Portfolio (${Array.isArray(data) ? data.length : 0} investments):\n${JSON.stringify(data, null, 2)}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: raw }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(raw);
    const text: string = body?.content?.[0]?.text ?? "";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    let parsed: unknown = null;
    try { parsed = JSON.parse(cleaned); } catch { parsed = { raw: cleaned }; }
    return new Response(JSON.stringify({ ok: true, result: parsed }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
