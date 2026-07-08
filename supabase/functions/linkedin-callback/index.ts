// Exchanges LinkedIn OAuth code for an access token, fetches user info,
// and stores the connection in the linkedin_connection table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("LinkedIn secrets not configured");
    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) throw new Error("code and redirect_uri required");

    // Exchange code for token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("LinkedIn token exchange failed", tokenJson);
      throw new Error(`LinkedIn token: ${JSON.stringify(tokenJson)}`);
    }
    const accessToken = tokenJson.access_token as string;
    const expiresIn = (tokenJson.expires_in as number) ?? 60 * 24 * 60 * 60;

    // Fetch userinfo
    const uiRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ui = await uiRes.json();
    if (!uiRes.ok) throw new Error(`LinkedIn userinfo: ${JSON.stringify(ui)}`);
    const personUrn = ui.sub as string;
    const displayName = (ui.name as string) ?? (ui.email as string) ?? "LinkedIn user";
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // upsert single row: clear then insert
    await supabase.from("linkedin_connection").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("linkedin_connection").insert({
      access_token: accessToken,
      person_urn: personUrn,
      display_name: displayName,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, displayName, expiresAt }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
