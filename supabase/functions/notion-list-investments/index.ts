// Fetches all investments from the Notion Investments database.
const DATA_SOURCE_ID = "e745df0f-d7b8-4c86-ab46-2f4535a6f46d";
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
function extractUrl(prop: any): string | null {
  return prop?.url ?? null;
}

async function queryNotion(token: string) {
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
      return new Response(JSON.stringify({ error: `Notion ${res.status}: ${bodyText}` }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const json = JSON.parse(bodyText);
    const investments = (json.results ?? []).map((page: any) => {
      const p = page.properties ?? {};
      return {
        id: page.id,
        name: extractRichText(p["Investment Name"]) || "(untitled)",
        fund_entity: extractRichText(p["Fund/Entity"]),
        holding_entity: extractSelect(p["Holding Entity"]),
        category: extractSelect(p["Category"]),
        status: extractSelect(p["Status"]) ?? "Active",
        amount_committed: extractRichText(p["Amount Committed"]),
        capital_call_status: extractSelect(p["Capital Call Status"]) ?? "N/A",
        docsign_status: extractSelect(p["DocSign Status"]) ?? "N/A",
        contact: extractRichText(p["Contact"]),
        notes: extractRichText(p["Notes"]),
        drive_folder_link: extractUrl(p["Drive Folder Link"]),
        next_action: null,
        next_action_due: null,
      };
    }).filter((i: any) => i.name && i.name !== "(untitled)");

    return new Response(JSON.stringify({ investments, count: investments.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, investments: [] }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
