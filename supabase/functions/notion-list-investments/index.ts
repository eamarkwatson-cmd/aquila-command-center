import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
    if (!NOTION_API_KEY) throw new Error("NOTION_API_KEY not set");

    const DATA_SOURCE_ID = "e745df0f-d7b8-4c86-ab46-2f4535a6f46d";

    // Try new data source API first
    let rows: any[] = [];
    let res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
    });

    if (res.ok) {
      const data = await res.json();
      rows = data.results ?? [];
    } else {
      // Fallback to database query API
      res = await fetch(`https://api.notion.com/v1/databases/${DATA_SOURCE_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 100 }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Notion API error: ${err}`);
      }
      const data = await res.json();
      // Map database API format to flat objects
      rows = (data.results ?? []).map((page: any) => {
        const p = page.properties;
        const getText = (prop: any) => prop?.title?.[0]?.plain_text ?? prop?.rich_text?.[0]?.plain_text ?? null;
        const getSelect = (prop: any) => prop?.select?.name ?? null;
        const getUrl = (prop: any) => prop?.url ?? null;
        return {
          "Investment Name": getText(p["Investment Name"]),
          "Amount Committed": getText(p["Amount Committed"]),
          "Status": getSelect(p["Status"]),
          "Category": getSelect(p["Category"]),
          "Holding Entity": getSelect(p["Holding Entity"]),
          "Fund/Entity": getText(p["Fund/Entity"]),
          "Capital Call Status": getSelect(p["Capital Call Status"]),
          "DocSign Status": getSelect(p["DocSign Status"]),
          "Contact": getText(p["Contact"]),
          "Notes": getText(p["Notes"]),
          "Drive Folder Link": getUrl(p["Drive Folder Link"]),
        };
      });
    }

    const investments = rows.map((row: any) => ({
      name: row["Investment Name"] ?? "—",
      fund_entity: row["Fund/Entity"] ?? null,
      holding_entity: row["Holding Entity"] ?? null,
      category: row["Category"] ?? null,
      status: row["Status"] ?? "Active",
      amount_committed: row["Amount Committed"] ?? null,
      capital_call_status: row["Capital Call Status"] ?? "N/A",
      docsign_status: row["DocSign Status"] ?? "N/A",
      contact: row["Contact"] ?? null,
      notes: row["Notes"] ?? null,
      drive_folder_link: row["Drive Folder Link"] ?? null,
      next_action: null,
      next_action_due: null,
    })).filter((i: any) => i.name && i.name !== "—");

    return new Response(JSON.stringify({ investments, count: investments.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, investments: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
