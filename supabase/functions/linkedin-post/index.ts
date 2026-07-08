// Posts a caption to LinkedIn using the stored member token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { commentary } = await req.json();
    if (!commentary) throw new Error("commentary required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: conn, error } = await supabase
      .from("linkedin_connection")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!conn) throw new Error("No LinkedIn connection. Please connect in Settings.");
    if (new Date(conn.expires_at) < new Date())
      throw new Error("LinkedIn token expired. Please reconnect in Settings.");

    const author = `urn:li:person:${conn.person_urn}`;

    // Try /rest/posts first
    const restBody = {
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    let res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(restBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("rest/posts failed, falling back to ugcPosts", res.status, errText);
      // Fallback: /v2/ugcPosts
      const ugcBody = {
        author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: commentary },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };
      res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ugcBody),
      });
      if (!res.ok) {
        const text2 = await res.text();
        throw new Error(`LinkedIn post ${res.status}: ${text2}`);
      }
    }

    const postId =
      res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? null;
    return new Response(JSON.stringify({ ok: true, postId }), {
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
