import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const users = [
    { email: "mew@aquilavc.com", password: "Magkat13!!" },
    { email: "kennedy.katua@athena.com", password: "Chronixx@254" },
  ];

  const results: unknown[] = [];
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    results.push({ email: u.email, id: data?.user?.id ?? null, error: error?.message ?? null });
  }
  return new Response(JSON.stringify({ results }), {
    headers: { "content-type": "application/json" },
  });
});
