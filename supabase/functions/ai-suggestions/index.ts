import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { location } = await req.json();
    if (!location) throw new Error("location required");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const prompt = `You are an executive assistant helping to suggest activities for Mark Watson, a venture capital investor and enterprise builder. He is currently in ${location}.

Suggest 4 specific, practical activities for Mark this week in ${location}. Mark enjoys: golf, tennis, sailing/yachting, fine dining, networking dinners, and physical fitness.

Return ONLY a JSON array with this exact format, no other text:
[
  {
    "label": "Short activity name — Venue name",
    "detail": "Address or area · Phone number if known · Booking note (e.g. reserve 48hrs ahead) · One-line description",
    "url": "Direct booking URL or mailto:kennedy.katua@athena.com?subject=Book [activity] for Mark&body=Please book [activity] for Mark in ${location} this week."
  }
]

Be specific to ${location}. Use real venue names, real phone numbers where possible, and real booking URLs (OpenTable, Resy, direct hotel sites). For golf and tennis where direct booking isn't available online, use the mailto format so Kennedy can arrange it.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "[]";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ suggestions, location }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, suggestions: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
