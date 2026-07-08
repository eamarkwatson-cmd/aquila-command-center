const DATA_SOURCE_ID = "b5fa3013-e00b-4943-a221-e99a6f035384";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = Deno.env.get("NOTION_API_KEY");
    if (!token) throw new Error("NOTION_API_KEY is not configured");
    const attempt = async (url: string, version: string) =>
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": version,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 1 }),
      });
    let res = await attempt(
      `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
      "2025-09-03",
    );
    if (res.status === 404)
      res = await attempt(
        `https://api.notion.com/v1/databases/${DATA_SOURCE_ID}/query`,
        "2022-06-28",
      );
    const text = await res.text();
    if (!res.ok)
      return new Response(
        JSON.stringify({ ok: false, status: res.status, error: text }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    const json = JSON.parse(text);
    return new Response(
      JSON.stringify({ ok: true, count: (json.results ?? []).length }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
