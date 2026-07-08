import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PipelineBadge, DelegationStatusDot, type DelegationStatus } from "@/components/status-badges";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: Overview,
});

type Post = { id: string; title: string; status: string | null; scheduledDate: string | null };

function Overview() {
  const [emailsCleared, setEmailsCleared] = useState<number>(0);
  const [savingEc, setSavingEc] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "emails_cleared").maybeSingle()
      .then(({ data }) => setEmailsCleared(Number(data?.value ?? 0)));
  }, []);

  const { data: delegations = [] } = useQuery({
    queryKey: ["delegations-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["pipeline-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-pipeline");
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).posts ?? [];
    },
    retry: 0,
  });

  const openDelegations = delegations.filter((d: any) => d.status !== "Done");
  const awaitingMark = openDelegations.filter((d: any) => d.owner === "Mark");
  const postsReady = posts.filter((p) => p.status === "Approved").length;

  const nextPosts = [...posts]
    .filter((p) => p.status !== "Posted")
    .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""))
    .slice(0, 5);

  async function saveEmails(v: number) {
    setSavingEc(true);
    await supabase.from("app_settings").upsert({ key: "emails_cleared", value: v as any });
    setSavingEc(false);
    toast.success("Emails cleared updated");
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Emails Cleared" editable>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0}
              value={emailsCleared}
              onChange={(e) => setEmailsCleared(Number(e.target.value))}
              onBlur={(e) => saveEmails(Number(e.target.value))}
              className="w-20 border-0 border-b border-transparent bg-transparent text-3xl font-semibold text-navy focus:border-navy focus:outline-none"
            />
            {savingEc && <span className="text-xs text-muted-foreground">saving…</span>}
          </div>
        </MetricCard>
        <MetricCard label="Open Delegations" value={openDelegations.length} />
        <MetricCard label="Posts Ready" value={postsReady} />
        <MetricCard label="Items Awaiting Mark" value={awaitingMark.length} accent="gold" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Upcoming LinkedIn Posts</h2>
            <Link to="/pipeline" className="text-xs font-medium text-navy hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {nextPosts.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">No scheduled posts.</li>
            )}
            {nextPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.scheduledDate ? format(new Date(p.scheduledDate), "MMM d, yyyy") : "No date"}
                  </div>
                </div>
                <PipelineBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Open Delegations</h2>
            <Link to="/delegations" className="text-xs font-medium text-navy hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {openDelegations.slice(0, 6).map((d: any) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <DelegationStatusDot status={d.status as DelegationStatus} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.owner} · {d.status}</div>
                  </div>
                </div>
              </li>
            ))}
            {openDelegations.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">No open delegations.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, children, accent,
}: { label: string; value?: number; children?: React.ReactNode; editable?: boolean; accent?: "gold" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent === "gold" ? "text-gold" : "text-navy"}`}>
        {children ?? value ?? 0}
      </div>
    </div>
  );
}
