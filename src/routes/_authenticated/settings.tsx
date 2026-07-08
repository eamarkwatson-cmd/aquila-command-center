import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Linkedin, Check, AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKEDIN_CLIENT_ID = "86d2jr54td5tew";
const SCOPES = "openid profile w_member_social";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [emails, setEmails] = useState(0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "emails_cleared").maybeSingle()
      .then(({ data }) => setEmails(Number(data?.value ?? 0)));
  }, []);

  const { data: conn } = useQuery({
    queryKey: ["linkedin-conn"],
    queryFn: async () => {
      const { data } = await supabase.from("linkedin_connection")
        .select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const expired = conn && new Date(conn.expires_at) < new Date();

  function connectLinkedIn() {
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem("li_oauth_state", state);
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  async function testNotion() {
    setTesting(true); setTestResult(null);
    const { data, error } = await supabase.functions.invoke("notion-test");
    setTesting(false);
    if (error) return setTestResult({ ok: false, msg: error.message });
    if ((data as any).ok) setTestResult({ ok: true, msg: `Connected. Query returned ${((data as any).count ?? 0)} item(s).` });
    else setTestResult({ ok: false, msg: (data as any).error || "Notion query failed." });
  }

  async function saveEmails(v: number) {
    await supabase.from("app_settings").upsert({ key: "emails_cleared", value: v as any });
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["attention-count"] });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Connections and dashboard preferences.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-navy/10 p-2 text-navy"><Linkedin className="h-5 w-5" /></div>
            <div>
              <h2 className="text-base font-semibold text-foreground">LinkedIn</h2>
              {conn ? (
                <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  <div>Connected as <span className="font-medium text-foreground">{conn.display_name}</span></div>
                  <div className={cn("text-xs", expired && "text-destructive")}>
                    Token {expired ? "expired" : "expires"} {format(new Date(conn.expires_at), "MMM d, yyyy")}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Not connected. Connect Mark's LinkedIn to enable posting.</p>
              )}
            </div>
          </div>
          <button onClick={connectLinkedIn}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90">
            {conn ? <><RefreshCcw className="h-4 w-4" /> Reconnect</> : "Connect Mark's LinkedIn"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Notion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Server-side API key is configured. Test the connection to confirm access to the pipeline data source.
            </p>
            {testResult && (
              <div className={cn(
                "mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
                testResult.ok ? "border-status-approved/30 bg-status-approved/10 text-status-approved"
                              : "border-destructive/30 bg-destructive/10 text-destructive",
              )}>
                {testResult.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {testResult.msg}
              </div>
            )}
          </div>
          <button onClick={testNotion} disabled={testing}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60">
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Overview counters</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manual value shown on the Overview page.</p>
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Emails cleared</label>
          <input type="number" min={0} value={emails} onChange={(e) => setEmails(Number(e.target.value))}
            className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={() => saveEmails(emails)}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90">
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
