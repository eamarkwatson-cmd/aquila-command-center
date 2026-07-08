import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/linkedin/callback")({
  ssr: false,
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [msg, setMsg] = useState("Finalizing LinkedIn connection…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const err = params.get("error");
      if (err) { setStatus("error"); setMsg(params.get("error_description") || err); return; }
      if (!code) { setStatus("error"); setMsg("Missing authorization code."); return; }
      const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
      const { data, error } = await supabase.functions.invoke("linkedin-callback", {
        body: { code, redirect_uri: redirectUri },
      });
      if (error || (data && (data as any).error)) {
        setStatus("error");
        setMsg(error?.message || (data as any).error || "LinkedIn connection failed.");
        return;
      }
      setStatus("done");
      setMsg("Connected. Redirecting…");
      setTimeout(() => navigate({ to: "/settings" }), 900);
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {status === "working" ? "Connecting LinkedIn…" : status === "done" ? "Connected" : "Connection failed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        {status === "error" && (
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="mt-4 rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground"
          >
            Back to Settings
          </button>
        )}
      </div>
    </div>
  );
}
