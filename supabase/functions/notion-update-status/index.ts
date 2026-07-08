// Updates a Notion pipeline page's Status and appends a note.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = Deno.env.get("NOTION_API_KEY");
    if (!token) throw new Error("NOTION_API_KEY is not configured");
    const { pageId, status, appendNote } = await req.json();
    if (!pageId || !status) throw new Error("pageId and status required");

    const properties: Record<string, unknown> = {
      Status: { select: { name: status } },
    };
    if (appendNote) {
      properties["Notes / Feedback"] = {
        rich_text: [{ type: "text", text: { content: appendNote } }],
      };
    }

    const attempt = async (version: string) =>
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": version,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties }),
      });

    let res = await attempt("2025-09-03");
    if (res.status === 400 || res.status === 404) res = await attempt("2022-06-28");
    const text = await res.text();
    if (!res.ok) {
      console.error("Notion update failed", res.status, text);
      return new Response(JSON.stringify({ error: `Notion ${res.status}: ${text}` }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
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
