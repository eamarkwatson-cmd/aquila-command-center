const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOD_PROMPT = `You are Kennedy Katua, Executive Assistant to Mark Watson, a VC investor and enterprise builder at Aquila Capital Partners. 

You must generate two SOD (Start of Day) updates in Mark's preferred format.

LOCKED WHATSAPP FORMAT:
- Lead with: "Good morning Mark, happy [Day] [Date]! Here's your [Day] rundown."
- Section 1: "Today's calendar" — list every event with time, emoji, name, platform/link, meeting ID, and any conflict flags inline
- Section 2: "Urgent" — bullet each item with a relevant emoji, lead with the issue then the ask, max 2 lines each
- Section 3: "Morning read" — one pick only, title in quotes, source, word count, one line on why it's relevant
- Close with: "Have a great morning!"
- NO "Notable inbox" or "Pending items" in WhatsApp — those go in Slack only

LOCKED SLACK FORMAT:
- Same header as WhatsApp
- Same "Today's calendar" section
- Same "Urgent" section  
- Add "Notable inbox" section (3-5 items max, 1-2 lines each)
- Close with: "Please let me know if there is anything additional you'd like me to prioritize today."

Mark's communication style: brief, direct, solution-oriented. Lead with the answer. No throat-clearing. No fluff.

Return ONLY valid JSON (no markdown fences) with keys:
- whatsapp: string (the full WhatsApp message)
- slack: string (the full Slack message)
- morning_read_title: string
- morning_read_source: string`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const { date, day, calendar_events, pending_delegations, mark_location, inbox_highlights, morning_read_suggestion } = await req.json();

    const userMsg = `Generate SOD updates for ${day} ${date}.

MARK'S LOCATION: ${mark_location || "Newport, RI"}

TODAY'S CALENDAR EVENTS:
${calendar_events?.length ? calendar_events.map((e: any) => 
  `- ${e.start_time}: ${e.title}${e.join_url ? ` (${e.join_url})` : ""}${e.meeting_id ? ` · ID: ${e.meeting_id}` : ""}${e.passcode ? ` · Passcode: ${e.passcode}` : ""}`
).join("\n") : "No events found"}

URGENT / PENDING ITEMS (Mark to action):
${pending_delegations?.filter((d: any) => d.owner === "Mark" && d.status !== "Done").slice(0, 8).map((d: any) =>
  `- [${d.priority ?? "Normal"}] ${d.title}${d.notes ? ": " + d.notes.slice(0, 100) : ""}`
).join("\n") || "None"}

KENNEDY'S QUEUE (in progress):
${pending_delegations?.filter((d: any) => d.owner === "Kennedy" && d.status !== "Done").slice(0, 5).map((d: any) =>
  `- ${d.title}`
).join("\n") || "None"}

INBOX HIGHLIGHTS:
${inbox_highlights?.slice(0, 5).map((i: any) => `- ${i.subject}: ${i.summary || ""}`).join("\n") || "None"}

MORNING READ SUGGESTION: ${morning_read_suggestion || "Find a relevant article from tech/finance/AI/defense/insurance news relevant to Mark's portfolio (FinTech, InsurTech, AI, BioTech, Defense)."}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: SOD_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const raw = await res.text();
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: raw }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

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
