// Fetches the LinkedIn pipeline from Notion. Called server-side only.
const DATA_SOURCE_ID = "b5fa3013-e00b-4943-a221-e99a6f035384";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRichText(prop: any): string {
  if (!prop) return "";
  const arr = prop.rich_text ?? prop.title ?? [];
  return arr.map((r: any) => r.plain_text ?? "").join("");
}
function extractSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}
function extractDate(prop: any): string | null {
  return prop?.date?.start ?? null;
}

async function queryNotion(token: string) {
  // Try new data_sources endpoint first
  let res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (res.status === 404) {
    // fallback to databases endpoint
    res = await fetch(`https://api.notion.com/v1/databases/${DATA_SOURCE_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
    });
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = Deno.env.get("NOTION_API_KEY");
    if (!token) throw new Error("NOTION_API_KEY is not configured");
    const res = await queryNotion(token);
    const bodyText = await res.text();
    if (!res.ok) {
      console.error("Notion error", res.status, bodyText);
      return new Response(JSON.stringify({ error: `Notion ${res.status}: ${bodyText}` }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const json = JSON.parse(bodyText);
    const posts = (json.results ?? []).map((page: any) => {
      const p = page.properties ?? {};
      return {
        id: page.id,
        url: page.url ?? null,
        title: extractRichText(p["Title"]) || "(untitled)",
        status: extractSelect(p["Status"]),
        finalCaption: extractRichText(p["Final Caption"]),
        scheduledDate: extractDate(p["Scheduled Date"]),
        platform: extractSelect(p["Platform"]),
        notes: extractRichText(p["Notes / Feedback"]),
        lastEditedTime: page.last_edited_time ?? null,
        createdTime: page.created_time ?? null,
      };
    });
    return new Response(JSON.stringify({ posts }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
