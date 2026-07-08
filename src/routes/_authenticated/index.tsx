import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PipelineBadge, DelegationStatusDot, type DelegationStatus } from "@/components/status-badges";
import { format, isToday, isPast, differenceInDays } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Calendar, CheckCircle2, Clock, Inbox, Linkedin, Send, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  component: Overview,
});

type Post = { id: string; title: string; status: string | null; scheduledDate: string | null; finalCaption: string };
type Delegation = {
  id: string; title: string; owner: string; status: string;
  priority: string | null; due_date: string | null; notes: string | null;
  created_at: string; updated_at: string;
};
type CalendarEvent = {
  id: string; title: string; start_time: string; end_time: string;
  platform: string | null; join_url: string | null; meeting_id: string | null; passcode: string | null;
};
type InboxItem = {
  id: string; subject: string; sender: string; category: string; summary: string; actioned: boolean;
};

function Overview() {
  const [emailsCleared, setEmailsCleared] = useState<number>(0);
  const [savingEc, setSavingEc] = useState(false);
  const [markLocation, setMarkLocation] = useState<string>("");
  const [savingLoc, setSavingLoc] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
      supabase.from("app_settings").select("value").eq("key", "emails_cleared").maybeSingle()
        .then(({ data }) => setEmailsCleared(Number(data?.value ?? 0)));
      supabase.from("app_settings").select("value").eq("key", "mark_location").maybeSingle()
        .then(({ data }) => setMarkLocation(data?.value as string ?? ""));
    })();
  }, []);

  const isKennedy = userEmail === "kennedy.katua@athena.com";
  const isMark = userEmail === "mew@aquilavc.com";

  const { data: delegations = [] } = useQuery<Delegation[]>({
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

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-today"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("start_time");
      if (error) throw error;
      const today = format(new Date(), "yyyy-MM-dd");
      return (data ?? []).filter((e: CalendarEvent) => e.start_time.startsWith(today));
    },
  });

  const { data: inboxItems = [] } = useQuery<InboxItem[]>({
    queryKey: ["inbox-urgent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inbox_items")
        .select("*").eq("actioned", false).order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((i: InboxItem) => i.category === "Urgent");
    },
  });

  const openDelegations = delegations.filter((d) => d.status !== "Done");
  const awaitingMark = openDelegations.filter((d) => d.owner === "Mark");
  const overdueDelegations = openDelegations.filter((d) => d.status === "Overdue");
  const escalated = openDelegations.filter((d) =>
    d.owner === "Mark" && differenceInDays(new Date(), new Date(d.updated_at)) >= 7
  );
  const approvedPosts = posts.filter((p) => p.status === "Approved");
  const postsReady = approvedPosts.length;

  // Kennedy view: what needs preparing / follow-up
  // Mark view: what needs deciding / approving
  const kennedyQueue = openDelegations.filter((d) => d.owner === "Kennedy");
  const decisionsNeeded = awaitingMark.filter((d) => d.priority === "High");

  async function saveEmails(v: number) {
    setSavingEc(true);
    await supabase.from("app_settings").upsert({ key: "emails_cleared", value: v as any });
    setSavingEc(false);
    toast.success("Emails cleared updated");
  }

  async function saveLocation(v: string) {
    setSavingLoc(true);
    await supabase.from("app_settings").upsert({ key: "mark_location", value: v as any });
    setSavingLoc(false);
    toast.success("Location saved");
  }

  const locationSuggestions: Record<string, { icon: string; suggestions: string[] }> = {
    "Newport": { icon: "⛵", suggestions: ["Golf tee time at Newport National", "Yacht club schedule check", "Tennis court at Newport Athletic Club"] },
    "Austin": { icon: "🎾", suggestions: ["Golf at Austin Country Club", "Dinner reservation at Uchi", "Tennis at Austin Tennis Academy"] },
    "Boston": { icon: "🏛️", suggestions: ["Dinner at Harvest, Cambridge", "Symphony at BSO", "Tennis at Longwood Cricket Club"] },
    "Washington DC": { icon: "🏛️", suggestions: ["Dinner at Fiola", "Golf at Army Navy Country Club", "Monument run route"] },
    "Travel": { icon: "✈️", suggestions: ["Personal time block after business meetings", "Hotel gym or spa booking", "Local restaurant research"] },
  };

  const currentSuggestions = markLocation && locationSuggestions[markLocation]
    ? locationSuggestions[markLocation]
    : null;

  return (
    <div className="space-y-8">
      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Emails Cleared">
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
        <MetricCard label="Posts Ready" value={postsReady} accent="gold" />
        <MetricCard label="Items Awaiting Mark" value={awaitingMark.length} accent={awaitingMark.length > 0 ? "red" : undefined} />
      </div>

      {/* Role-specific view header */}
      {isMark && (
        <div className="rounded-lg border border-navy/20 bg-navy/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-navy">Your view, Mark</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Decisions needed · Approvals · Meetings today</p>
        </div>
      )}
      {isKennedy && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Kennedy's view</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Items to prepare · Follow-ups · Escalations</p>
        </div>
      )}

      {/* Escalations — only show to Kennedy */}
      {isKennedy && escalated.length > 0 && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5">
          <header className="flex items-center gap-2 border-b border-destructive/20 px-5 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">Needs new approach ({escalated.length})</h2>
          </header>
          <ul className="divide-y divide-destructive/10">
            {escalated.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Waiting on Mark · {differenceInDays(new Date(), new Date(d.updated_at))} days with no action
                  </div>
                </div>
                <a
                  href={`https://wa.me/12108635696?text=${encodeURIComponent(`Hi Mark — following up on: ${d.title}. Proposing we change approach. What would you like to do?`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-card px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  Propose solution
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Today's meetings */}
      {events.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Calendar className="h-4 w-4 text-navy" />
            <h2 className="text-sm font-semibold text-foreground">Meetings today</h2>
          </header>
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(e.start_time), "h:mm a")} – {format(new Date(e.end_time), "h:mm a")}
                    {e.platform ? ` · ${e.platform}` : ""}
                  </div>
                  {e.meeting_id && (
                    <div className="text-xs text-muted-foreground">ID: {e.meeting_id}{e.passcode ? ` · Passcode: ${e.passcode}` : ""}</div>
                  )}
                </div>
                {e.join_url && (
                  <a href={e.join_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90">
                    Join
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Approved LinkedIn posts — decisions for Mark */}
      {approvedPosts.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Linkedin className="h-4 w-4 text-navy" />
            <h2 className="text-sm font-semibold text-foreground">LinkedIn posts ready to publish</h2>
            <Link to="/pipeline" className="ml-auto text-xs font-medium text-navy hover:underline">Open pipeline</Link>
          </header>
          <ul className="divide-y divide-border">
            {approvedPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.scheduledDate ? format(new Date(p.scheduledDate), "MMM d, yyyy") : "No date set"}
                  </div>
                </div>
                <PipelineBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Urgent inbox items */}
      {inboxItems.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Inbox className="h-4 w-4 text-navy" />
            <h2 className="text-sm font-semibold text-foreground">Urgent inbox highlights</h2>
            <Link to="/inbox" className="ml-auto text-xs font-medium text-navy hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {inboxItems.slice(0, 5).map((item) => (
              <li key={item.id} className="px-5 py-3">
                <div className="text-sm font-medium text-foreground">{item.subject}</div>
                <div className="text-xs text-muted-foreground">{item.sender} · {item.summary}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Delegations */}
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              {isKennedy ? "Kennedy's queue" : "Items awaiting your action"}
            </h2>
            <Link to="/delegations" className="text-xs font-medium text-navy hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {(isKennedy ? kennedyQueue : awaitingMark).slice(0, 6).map((d) => (
              <li key={d.id} className={cn(
                "flex items-center justify-between px-5 py-3",
                d.status === "Overdue" && "border-l-2 border-l-destructive"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <DelegationStatusDot status={d.status as DelegationStatus} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.owner} · {d.status}</div>
                  </div>
                </div>
                {d.status === "Overdue" && (
                  <span className="ml-2 shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    Overdue
                  </span>
                )}
              </li>
            ))}
            {(isKennedy ? kennedyQueue : awaitingMark).length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">All clear.</li>
            )}
          </ul>
        </section>

        {/* Mark's week — proactive personal activity */}
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <MapPin className="h-4 w-4 text-navy" />
            <h2 className="text-sm font-semibold text-foreground">Mark's week</h2>
          </header>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Location</label>
              <select
                value={markLocation}
                onChange={(e) => setMarkLocation(e.target.value)}
                onBlur={(e) => saveLocation(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Select location…</option>
                <option>Newport</option>
                <option>Austin</option>
                <option>Boston</option>
                <option>Washington DC</option>
                <option>Travel</option>
              </select>
              {savingLoc && <span className="text-xs text-muted-foreground">saving…</span>}
            </div>

            {currentSuggestions ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {currentSuggestions.icon} Suggested this week
                </div>
                {currentSuggestions.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm text-foreground">{s}</span>
                    <button
                      onClick={() => toast.info(`Draft booking for: ${s}`)}
                      className="shrink-0 rounded-md bg-navy px-2 py-1 text-[11px] font-medium text-white hover:bg-navy/90"
                    >
                      Book it
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Set Mark's location to see proactive activity suggestions.</p>
            )}
          </div>
        </section>
      </div>

      {/* LinkedIn pipeline preview */}
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Upcoming LinkedIn Posts</h2>
          <Link to="/pipeline" className="text-xs font-medium text-navy hover:underline">View all</Link>
        </header>
        <ul className="divide-y divide-border">
          {posts.filter((p) => p.status !== "Posted").slice(0, 5).map((p) => (
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
          {posts.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">No scheduled posts.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function MetricCard({
  label, value, children, accent,
}: { label: string; value?: number; children?: React.ReactNode; accent?: "gold" | "red" }) {
  const colorClass = accent === "gold" ? "text-gold" : accent === "red" ? "text-destructive" : "text-navy";
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${colorClass}`}>
        {children ?? value ?? 0}
      </div>
    </div>
  );
}
