import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [testingNotion, setTestingNotion] = useState(false);
  const [testingInvestments, setTestingInvestments] = useState(false);
  const [notionResult, setNotionResult] = useState<"ok" | "error" | null>(null);
  const [investmentsResult, setInvestmentsResult] = useState<"ok" | "error" | null>(null);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [investmentsError, setInvestmentsError] = useState<string | null>(null);

  const { data: linkedin, refetch: refetchLinkedIn } = useQuery({
    queryKey: ["linkedin-conn"],
    queryFn: async () => {
      const { data } = await supabase.from("linkedin_connection")
        .select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["activity-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log")
        .select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const tokenExpired = linkedin && new Date(linkedin.expires_at) < new Date();
  const tokenExpiresIn = linkedin && !tokenExpired
    ? Math.ceil((new Date(linkedin.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  function connectLinkedIn() {
    const clientId = "86d2jr54td5tew";
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const scope = "openid profile w_member_social";
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = url;
  }

  async function testNotion() {
    setTestingNotion(true);
    setNotionResult(null);
    setNotionError(null);
    try {
      const { data, error } = await supabase.functions.invoke("notion-test");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setNotionResult("ok");
      toast.success("Notion Pipeline connection OK");
    } catch (e) {
      setNotionResult("error");
      setNotionError((e as Error).message);
      toast.error("Notion connection failed");
    } finally {
      setTestingNotion(false);
    }
  }

  async function testInvestments() {
    setTestingInvestments(true);
    setInvestmentsResult(null);
    setInvestmentsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("notion-list-investments");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const count = (data as any)?.count ?? 0;
      setInvestmentsResult("ok");
      toast.success(`Investments Notion OK — ${count} holdings found`);
    } catch (e) {
      setInvestmentsResult("error");
      setInvestmentsError((e as Error).message);
      toast.error("Investments Notion connection failed");
    } finally {
      setTestingInvestments(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">System connections and health status.</p>
      </div>

      {/* LinkedIn */}
      <Section title="LinkedIn Connection">
        <div className="space-y-4">
          <StatusRow
            label="Connection status"
            ok={!!linkedin && !tokenExpired}
            okText={linkedin ? `Connected as ${linkedin.person_urn ?? "Mark"}` : "Not connected"}
            failText={tokenExpired ? "Token expired — reconnect required" : "Not connected"}
          />
          {linkedin && !tokenExpired && tokenExpiresIn !== null && (
            <StatusRow label="Token expiry" ok={tokenExpiresIn > 7} okText={`Expires in ${tokenExpiresIn} days`} failText={`Expires in ${tokenExpiresIn} days — reconnect soon`} />
          )}
          {linkedin?.updated_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last connected</span>
              <span className="text-foreground">{format(new Date(linkedin.updated_at), "MMM d, yyyy h:mm a")}</span>
            </div>
          )}
          <button onClick={connectLinkedIn}
            className={cn("rounded-md px-4 py-2 text-sm font-medium text-white", linkedin && !tokenExpired ? "bg-navy/70 hover:bg-navy" : "bg-navy hover:bg-navy/90")}>
            {linkedin && !tokenExpired ? "Reconnect LinkedIn" : "Connect Mark's LinkedIn"}
          </button>
          {(!linkedin || tokenExpired) && (
            <p className="text-xs text-muted-foreground">Mark needs to approve this connection — it takes 30 seconds and only needs to be done once every 2 months.</p>
          )}
        </div>
      </Section>

      {/* Notion Pipeline */}
      <Section title="Notion — LinkedIn Pipeline">
        <div className="space-y-4">
          <StatusRow
            label="Pipeline connection"
            ok={notionResult === "ok"}
            okText="Connected — pipeline is live"
            failText={notionError ?? "Not yet tested"}
            neutral={notionResult === null}
          />
          <button onClick={testNotion} disabled={testingNotion}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60">
            {testingNotion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Test Pipeline Connection
          </button>
        </div>
      </Section>

      {/* Notion Investments */}
      <Section title="Notion — Investments">
        <div className="space-y-4">
          <StatusRow
            label="Investments connection"
            ok={investmentsResult === "ok"}
            okText="Connected — investments are live"
            failText={investmentsError ?? "Not yet tested"}
            neutral={investmentsResult === null}
          />
          <button onClick={testInvestments} disabled={testingInvestments}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60">
            {testingInvestments ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Test Investments Connection
          </button>
          <p className="text-xs text-muted-foreground">
            Uses the same NOTION_API_KEY secret. If this fails, the investments page will show seeded fallback data.
          </p>
        </div>
      </Section>

      {/* Recent Activity */}
      <Section title="Recent Activity">
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((a: any) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground capitalize">{a.action?.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.entity_type} · {a.performed_by ?? "system"}
                    {a.entity_title ? ` · ${a.entity_title}` : ""}
                  </div>
                  {a.details?.title && <div className="text-xs text-muted-foreground truncate max-w-xs">{a.details.title}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {a.created_at ? format(new Date(a.created_at), "MMM d, h:mm a") : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Security */}
      <Section title="Security">
        <div className="space-y-3 text-sm">
          <StatusRow label="Private access" ok={true} okText="Only mew@aquilavc.com and kennedy.katua@athena.com can log in" failText="" />
          <StatusRow label="API secrets" ok={true} okText="All secrets in Supabase edge functions — never exposed in browser" failText="" />
          <StatusRow label="LinkedIn token storage" ok={true} okText="Stored in Supabase linkedin_connection table — server only" failText="" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function StatusRow({ label, ok, okText, failText, neutral }: { label: string; ok: boolean; okText: string; failText: string; neutral?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {neutral ? (
          <span className="text-muted-foreground text-xs">{failText}</span>
        ) : ok ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-status-approved" />
            <span className="text-status-approved text-xs">{okText}</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive text-xs">{failText}</span>
          </>
        )}
      </div>
    </div>
  );
}
