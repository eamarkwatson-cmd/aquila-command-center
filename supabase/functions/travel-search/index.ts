// Live travel data via Claude + web search. Two modes:
//   { mode: "travel", origin, destination, departDate, returnDate, tripType, stops }
//     -> { flights, hotels, groundTransport, destinationKey }  (matches TravelResults shape)
//   { mode: "city_recs", city }
//     -> { recommendations: [{ category, name, detail, address, phone, booking_url }] }
//
// Requires in Vault/env: ANTHROPIC_API_KEY
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-6";

async function askClaude(apiKey: string, prompt: string, maxTokens = 4000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? "Anthropic API error");
  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

function parseJson(text: string): any {
  const clean = text.replace(/```json|```/g, "").trim();
  // Grab the outermost JSON object in case the model added prose
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(clean.slice(start, end + 1));
}

function travelPrompt(q: any): string {
  return `You are a travel research assistant for a busy executive. Use web search to find CURRENT, REAL options for this trip. Today's date matters — only return options actually bookable now.

TRIP:
- Origin: ${q.origin}
- Destination: ${q.destination}
- Depart: ${q.departDate}
- Return: ${q.returnDate ?? "n/a"} (${q.tripType})
- Stops preference: ${q.stops}

Search the web for real current flight schedules/prices on this route, real hotels near the destination's business district with current typical nightly rates, and real ground transport providers.

Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{
  "flights": [{ "id": "f1", "airline": "Delta", "airlineCode": "DL", "flightNumber": "DL123", "origin": "JFK", "destination": "PHL", "departTime": "2026-07-20T08:15:00", "arriveTime": "2026-07-20T09:30:00", "durationMinutes": 75, "stops": 0, "priceUSD": 240, "cabin": "Business" }],
  "hotels": [{ "id": "h1", "name": "...", "cityKey": "${q.destination.toLowerCase()}", "proximity": "0.3 mi from downtown", "stars": 5, "pricePerNightUSD": 450, "address": "..." }],
  "groundTransport": [{ "id": "g1", "type": "Black Car", "provider": "...", "pickup": "Airport", "dropoff": "Hotel", "estimatedMinutes": 30, "estimatedPriceUSD": 120, "phone": "+1 ...", "notes": "..." }]
}

Rules:
- 4-8 flights honoring the stops preference where possible, mix of times. Prices are realistic current estimates in USD.
- 4-6 hotels, skew 4-5 star (executive traveler). Include real addresses.
- 3-5 ground transport options ("type" must be one of: "Black Car", "Car Rental", "Rail", "Taxi / Rideshare", "Airport Transfer").
- departTime/arriveTime are ISO local datetimes on the requested dates. cabin is one of Economy/Premium/Business/First.
- If a value is unknown, estimate sensibly rather than omitting the field. phone/notes/estimatedPriceUSD may be null.`;
}

function cityRecsPrompt(city: string): string {
  return `You are researching current recommendations in ${city} for a visiting VC executive (Mark's Week). Use web search to find what's CURRENTLY open, well-reviewed, and notable RIGHT NOW — restaurants, coffee, fitness, culture/events happening this week, and business-friendly venues.

Respond with ONLY valid JSON, no markdown fences:
{
  "recommendations": [
    { "category": "Restaurant", "name": "...", "detail": "one line on why it's worth it right now", "address": "...", "phone": "+1 ... or null", "booking_url": "https://... or null" }
  ]
}

Rules:
- 8-14 items across categories: Restaurant, Coffee, Fitness, Culture, Event, Bar, Hotel Amenity.
- Only real, currently operating places. Events must be actually happening around this week.
- Keep "detail" specific and useful (chef, signature dish, what's on, why now).`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured in Supabase Vault");

    const body = await req.json();
    const mode = body.mode ?? "travel";

    if (mode === "city_recs") {
      if (!body.city) throw new Error("city is required");
      const text = await askClaude(apiKey, cityRecsPrompt(body.city), 3000);
      const json = parseJson(text);
      return new Response(JSON.stringify({ ok: true, city: body.city, ...json }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // mode === "travel"
    if (!body.origin || !body.destination || !body.departDate) {
      throw new Error("origin, destination and departDate are required");
    }
    const text = await askClaude(apiKey, travelPrompt(body), 5000);
    const json = parseJson(text);
    return new Response(JSON.stringify({
      ok: true,
      flights: json.flights ?? [],
      hotels: json.hotels ?? [],
      groundTransport: json.groundTransport ?? [],
      destinationKey: (body.destination as string).toLowerCase().trim(),
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("travel-search failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
