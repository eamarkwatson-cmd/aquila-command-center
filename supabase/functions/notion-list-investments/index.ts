// Fetches all investments from the Notion Investments database.
// Source ID is read from NOTION_INVESTMENTS_SOURCE_ID env var (preferred)
// or INVESTMENTS_NOTION_SOURCE_ID, falling back to the hardcoded ID.
const FALLBACK_SOURCE_ID = "e745df0f-d7b8-4c86-ab46-2f4535a6f46d";

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

async function queryNotion(token: string, sourceId: string) {
  // Try new data_sources API first
  let res = await fetch(`https://api.notion.com/v1/data_sources/${sourceId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (res.status === 404 || res.status === 400) {
    // Fall back to databases API
    res = await fetch(`https://api.notion.com/v1/databases/${sourceId}/query`, {
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
    if (!token) {
      return new Response(JSON.stringify({
        error: "NOTION_API_KEY is not configured",
        sync_status: "missing_api_key",
        investments: [],
      }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Resolve source ID from env vars, fall back to hardcoded
    const sourceId =
      Deno.env.get("NOTION_INVESTMENTS_SOURCE_ID") ||
      Deno.env.get("INVESTMENTS_NOTION_SOURCE_ID") ||
      FALLBACK_SOURCE_ID;

    const usingFallback = sourceId === FALLBACK_SOURCE_ID &&
      !Deno.env.get("NOTION_INVESTMENTS_SOURCE_ID") &&
      !Deno.env.get("INVESTMENTS_NOTION_SOURCE_ID");

    const res = await queryNotion(token, sourceId);
    const bodyText = await res.text();

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: `Notion API ${res.status}: ${bodyText.slice(0, 300)}`,
        sync_status: "notion_error",
        source_id: sourceId,
        using_fallback_source_id: usingFallback,
        investments: [],
      }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const json = JSON.parse(bodyText);
    const investments = (json.results ?? []).map((page: any) => {
      const p = page.properties ?? {};
      return {
        id: page.id,
        notion_url: `https://notion.so/${page.id.replace(/-/g, "")}`,
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

    return new Response(JSON.stringify({
      investments,
      count: investments.length,
      sync_status: investments.length === 0 ? "empty" : "ok",
      source_id: sourceId,
      using_fallback_source_id: usingFallback,
      fetched_at: new Date().toISOString(),
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({
      error: (e as Error).message,
      sync_status: "exception",
      investments: [],
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
