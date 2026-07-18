import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, Linkedin, Mail, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/weekly")({
  component: WeeklyReviewPage,
});

type Post = { id: string; title: string; status: string | null; scheduledDate: string | null };
type Delegation = { id: string; title: string; owner: string; status: string; completed_at: string | null; updated_at: string };

function WeeklyReviewPage() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: delegations = [] } = useQuery<Delegation[]>({
    queryKey: ["delegations-weekly"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: posts = [], error: pipelineError } = useQuery<Post[]>({
    queryKey: ["pipeline-weekly"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-pipeline");
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).posts ?? [];
    },
    retry: 0,
  });

  const { data: emailsCleared = 0 } = useQuery({
    queryKey: ["emails-cleared"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "emails_cleared").maybeSingle();
      return Number(data?.value ?? 0);
    },
  });

  // Completed this week
  const completedThisWeek = delegations.filter((d) =>
    d.status === "Done" &&
    d.completed_at &&
    new Date(d.completed_at) >= weekStart &&
    new Date(d.completed_at) <= weekEnd
  );

  // Still open
  const stillOpen = delegations.filter((d) => d.status !== "Done");
  const awaitingMark = stillOpen.filter((d) => d.owner === "Mark");
  const kennedyQueue = stillOpen.filter((d) => d.owner === "Kennedy");

  // LinkedIn posts published this week (scheduled date within this week; undated Posted items still count)
  const postedThisWeek = posts.filter((p) => {
    if (p.status !== "Posted") return false;
    if (!p.scheduledDate) return true;
    const d = new Date(p.scheduledDate);
    return d >= weekStart && d <= weekEnd;
  });
  const approvedPosts = posts.filter((p) => p.status === "Approved");

  // Hours freed estimate (each completed delegation = 20 min saved)
  const minutesSaved = completedThisWeek.length * 20;
  const hoursSaved = Math.round(minutesSaved / 60 * 10) / 10;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Weekly Review</h1>
        <p className="text-sm text-muted-foreground">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </p>
      </div>

      {pipelineError && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          LinkedIn numbers unavailable — Notion connection failed, so post counts below show 0.
          Likely cause: <code className="font-mono">NOTION_API_KEY</code> missing from Supabase Vault.
        </div>
      )}

      {/* Value created this week */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ValueCard label="Completed" value={completedThisWeek.length} unit="tasks" color="green" />
        <ValueCard label="Hours freed" value={hoursSaved} unit="est." color="navy" />
        <ValueCard label="Emails cleared" value={emailsCleared} unit="total" color="gold" />
        <ValueCard label="Posts published" value={postedThisWeek.length} unit="this week" color="navy" />
      </div>

      {/* Completed this week */}
      <Section title="Completed this week" icon={<CheckCircle2 className="h-4 w-4 text-status-approved" />} count={completedThisWeek.length}>
        {completedThisWeek.length === 0 ? (
          <Empty>No completions logged this week yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {completedThisWeek.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-approved" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.owner} · {d.completed_at ? format(new Date(d.completed_at), "MMM d") : "—"}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Still open */}
      <Section title="Still open" icon={<Clock className="h-4 w-4 text-status-review" />} count={stillOpen.length}>
        {stillOpen.length === 0 ? (
          <Empty>All clear — nothing open.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {stillOpen.slice(0, 10).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.owner} · {d.status}</div>
                </div>
                <StatusPill status={d.status} />
              </li>
            ))}
            {stillOpen.length > 10 && (
              <li className="px-5 py-3 text-xs text-muted-foreground">+{stillOpen.length - 10} more</li>
            )}
          </ul>
        )}
      </Section>

      {/* Waiting on Mark */}
      {awaitingMark.length > 0 && (
        <Section title="Waiting on Mark" icon={<AlertTriangle className="h-4 w-4 text-status-overdue" />} count={awaitingMark.length}>
          <ul className="divide-y divide-border">
            {awaitingMark.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="text-sm font-medium text-foreground">{d.title}</div>
                <StatusPill status={d.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* LinkedIn this week */}
      <Section title="LinkedIn posts" icon={<Linkedin className="h-4 w-4 text-navy" />} count={postedThisWeek.length + approvedPosts.length}>
        {postedThisWeek.length === 0 && approvedPosts.length === 0 ? (
          <Empty>No posts published or approved yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {postedThisWeek.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="text-sm font-medium text-foreground">{p.title}</div>
                <span className="rounded-full border border-status-posted/30 bg-status-posted/10 px-2.5 py-0.5 text-xs font-medium text-status-posted">Posted</span>
              </li>
            ))}
            {approvedPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="text-sm font-medium text-foreground">{p.title}</div>
                <span className="rounded-full border border-status-approved/30 bg-status-approved/10 px-2.5 py-0.5 text-xs font-medium text-status-approved">Approved — ready</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Emails */}
      <Section title="Inbox" icon={<Mail className="h-4 w-4 text-navy" />}>
        <div className="px-5 py-4">
          <div className="text-3xl font-semibold text-navy">{emailsCleared.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">Total emails cleared since tracking began</div>
        </div>
      </Section>
    </div>
  );
}

function ValueCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: "green" | "navy" | "gold" }) {
  const colorClass = color === "green" ? "text-status-approved" : color === "gold" ? "text-gold" : "text-navy";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-3xl font-semibold", colorClass)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-sm text-muted-foreground">{children}</div>;
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Overdue" ? "border-status-overdue/30 bg-status-overdue/10 text-status-overdue" :
    status === "In Progress" ? "border-status-posted/30 bg-status-posted/10 text-status-posted" :
    status === "Waiting" ? "border-status-review/30 bg-status-review/10 text-status-review" :
    "border-border bg-muted text-muted-foreground";
  return (
    <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {status}
    </span>
  );
}
