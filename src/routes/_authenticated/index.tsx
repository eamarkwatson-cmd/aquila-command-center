import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PipelineBadge, DelegationStatusDot, type DelegationStatus } from "@/components/status-badges";
import { format, differenceInDays } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Calendar, CheckCircle2, Inbox, Linkedin, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  component: Overview,
});

type Post = { id: string; title: string; status: string | null; scheduledDate: string | null; finalCaption: string };
type Delegation = { id: string; title: string; owner: string; status: string; priority: string | null; due_date: string | null; notes: string | null; created_at: string; updated_at: string };
type CalendarEvent = { id: string; title: string; start_time: string; end_time: string; platform: string | null; join_url: string | null; meeting_id: string | null; passcode: string | null };
type InboxItem = { id: string; subject: string; sender: string; category: string; summary: string; actioned: boolean };

const LOCATION_SUGGESTIONS: Record<string, { icon: string; items: { label: string; detail: string; url: string }[] }> = {
  newport: { icon: "⛵", items: [
    { label: "Golf — Newport National Golf Club", detail: "(401) 848-9690 · newportnational.com · Book 5–7 days ahead", url: "mailto:kennedy.katua@athena.com?subject=Book%20golf%20at%20Newport%20National&body=Please%20book%20a%20tee%20time%20for%20Mark%20at%20Newport%20National%20Golf%20Club%20this%20week." },
    { label: "Sailing — Sail Newport", detail: "sailnewport.org · (401) 846-1983 · Yacht charter and racing · Check race schedule", url: "https://sailnewport.org" },
    { label: "Tennis — Newport Athletic Club", detail: "(401) 849-5900 · Call ahead for court availability", url: "mailto:kennedy.katua@athena.com?subject=Book%20tennis%20at%20Newport%20Athletic%20Club&body=Please%20book%20a%20court%20for%20Mark%20this%20week." },
    { label: "Dinner — The Vanderbilt", detail: "thevanderbildthotel.com · Reserve 48–72hrs ahead via Resy · Upscale Newport dining", url: "https://resy.com/cities/newpri/the-vanderbilt" },
    { label: "Dinner — Castle Hill Inn", detail: "castlehillinn.com · (401) 849-3800 · Ocean views · Reserve well in advance", url: "https://www.castlehillinn.com" },
  ]},
  austin: { icon: "🎾", items: [
    { label: "Golf — Austin Country Club", detail: "(512) 328-0090 · Tee times book 5 days ahead · Members and guests", url: "mailto:kennedy.katua@athena.com?subject=Book%20golf%20at%20Austin%20Country%20Club&body=Please%20arrange%20a%20tee%20time%20for%20Mark%20at%20Austin%20Country%20Club%20this%20week." },
    { label: "Golf — Barton Creek Resort", detail: "(512) 329-4000 · Multiple courses · Public access available", url: "mailto:kennedy.katua@athena.com?subject=Book%20golf%20at%20Barton%20Creek&body=Please%20arrange%20a%20tee%20time%20for%20Mark%20at%20Barton%20Creek%20Resort%20this%20week." },
    { label: "Tennis — Austin Tennis Academy", detail: "(512) 477-7773 · Court rental and lessons available", url: "mailto:kennedy.katua@athena.com?subject=Book%20tennis%20at%20Austin%20Tennis%20Academy&body=Please%20book%20a%20court%20for%20Mark%20at%20Austin%20Tennis%20Academy." },
    { label: "Dinner — Uchi Austin", detail: "801 S Lamar Blvd · Resy reservations · Reserve 2–3 days ahead · Japanese cuisine", url: "https://resy.com/cities/aus/uchi" },
    { label: "Dinner — Comedor", detail: "501 Colorado St · Resy · Modern Mexican · Downtown Austin", url: "https://resy.com/cities/aus/comedor" },
  ]},
  boston: { icon: "🏛️", items: [
    { label: "Dinner — Harvest, Cambridge", detail: "44 Brattle St, Cambridge · (617) 868-2255 · Reserve via OpenTable · New American", url: "https://www.opentable.com/harvest" },
    { label: "Tennis — Longwood Cricket Club", detail: "Chestnut Hill · (617) 731-2900 · Historic club · Guest play available with member", url: "mailto:kennedy.katua@athena.com?subject=Tennis%20at%20Longwood%20Cricket%20Club&body=Please%20arrange%20guest%20tennis%20at%20Longwood%20Cricket%20Club%20for%20Mark." },
    { label: "Symphony — BSO at Symphony Hall", detail: "301 Massachusetts Ave · bso.org · Check current program and book tickets", url: "https://www.bso.org" },
    { label: "Golf — Charles River Country Club", detail: "Newton · (617) 965-2090 · Guest play with member", url: "mailto:kennedy.katua@athena.com?subject=Golf%20at%20Charles%20River%20CC&body=Please%20arrange%20golf%20at%20Charles%20River%20Country%20Club%20for%20Mark." },
    { label: "Dinner — No. 9 Park", detail: "9 Park St, Boston · (617) 742-9991 · French-Italian · Near the State House", url: "https://www.no9park.com" },
  ]},
  "washington dc": { icon: "🏛️", items: [
    { label: "Dinner — Fiola", detail: "601 Pennsylvania Ave NW · (202) 628-2888 · Upscale Italian · Reserve via Resy", url: "https://resy.com/cities/was/fiola" },
    { label: "Dinner — Fiola Mare (Georgetown)", detail: "3050 K St NW · (202) 628-0065 · Seafood · Georgetown Waterfront · Reserve via Resy", url: "https://resy.com/cities/was/fiola-mare" },
    { label: "Golf — Army Navy Country Club", detail: "Arlington VA · (703) 521-6400 · Member guest play available", url: "mailto:kennedy.katua@athena.com?subject=Golf%20at%20Army%20Navy%20Country%20Club&body=Please%20arrange%20golf%20at%20Army%20Navy%20Country%20Club%20for%20Mark." },
    { label: "Dinner — Pineapple and Pearls", detail: "715 8th St SE · Tasting menu · One of DC's most acclaimed restaurants · Reserve well ahead", url: "https://resy.com/cities/was/pineapple-and-pearls" },
  ]},
  travel: { icon: "✈️", items: [
    { label: "Block personal time around meetings", detail: "Add a recovery buffer around back-to-back business meetings to protect energy", url: "mailto:kennedy.katua@athena.com?subject=Block%20personal%20time%20during%20travel&body=Please%20add%20personal%20time%20blocks%20around%20Mark%27s%20business%20meetings%20this%20trip." },
    { label: "Hotel gym or spa booking", detail: "Check hotel amenities and pre-book gym session or spa treatment for the trip", url: "mailto:kennedy.katua@athena.com?subject=Book%20hotel%20amenity%20for%20Mark&body=Please%20pre-book%20a%20gym%20session%20or%20spa%20treatment%20for%20Mark%20at%20his%20hotel." },
    { label: "Local restaurant research", detail: "Research top-rated restaurants near Mark's hotel for dinner options", url: "mailto:kennedy.katua@athena.com?subject=Restaurant%20research%20for%20trip&body=Please%20research%20top%20restaurant%20options%20near%20Mark%27s%20hotel%20for%20this%20trip." },
  ]},
};

function Overview() {
  const [emailsCleared, setEmailsCleared] = useState<number>(0);
  const [savingEc, setSavingEc] = useState(false);
  const [markLocation, setMarkLocation] = useState<string>("");
  const [savingLoc, setSavingLoc] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
      supabase.from("app_settings").select("value").eq("key", "emails_cleared").maybeSingle()
        .then(({ data }) => setEmailsCleared(Number(data?.value ?? 0)));
      supabase.from("app_settings").select("value").eq("key", "mark_location").maybeSingle()
        .then(({ data }) => setMarkLocation((data?.value as string) ?? ""));
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
      const { data, error } = await supabase.from("inbox_items").select("*").eq("actioned", false).order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((i: InboxItem) => i.category === "Urgent");
    },
  });

  const openDelegations = delegations.filter((d) => d.status !== "Done");
  const awaitingMark = openDelegations.filter((d) => d.owner === "Mark");
  const escalated = openDelegations.filter((d) =>
    d.owner === "Mark" && differenceInDays(new Date(), new Date(d.updated_at)) >= 7
  );
  const approvedPosts = posts.filter((p) => p.status === "Approved");
  const kennedyQueue = openDelegations.filter((d) => d.owner === "Kennedy");

  async function saveEmails(v: number) {
    setSavingEc(true);
    await supabase.from("app_settings").upsert({ key: "emails_cleared", value: String(v) });
    setSavingEc(false);
    toast.success("Emails cleared updated");
  }

  async function saveLocation(v: string) {
    setSavingLoc(true);
    await supabase.from("app_settings").upsert({ key: "mark_location", value: v });
    setSavingLoc(false);
  }

  const locationKey = markLocation.toLowerCase().trim();
  const currentSuggestions = locationKey
    ? Object.entries(LOCATION_SUGGESTIONS).find(([k]) => locationKey.includes(k))?.[1] ?? null
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
              className="w-24 border-0 border-b border-transparent bg-transparent text-3xl font-semibold text-navy focus:border-navy focus:outline-none"
            />
            {savingEc && <span className="text-xs text-muted-foreground">saving…</span>}
          </div>
        </MetricCard>
        <MetricCard label="Open Delegations" value={openDelegations.length} />
        <MetricCard label="Posts Ready" value={approvedPosts.length} accent="gold" />
        <MetricCard label="Items Awaiting Mark" value={awaitingMark.length} accent={awaitingMark.length > 0 ? "red" : undefined} />
      </div>

      {/* Role view header */}
      {isMark && (
        <div className="rounded-lg border border-navy/20 bg-navy/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-navy">Your view, Mark</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Decisions needed · Approvals · Meetings today</p>
        </div>
      )}
      {isKennedy && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Kennedy's view</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Items to prepare · Follow-ups · Escalations</p>
        </div>
      )}

      {/* Escalations — Kennedy only */}
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
                  <div className="text-sm font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Waiting on Mark · {differenceInDays(new Date(), new Date(d.updated_at))} days with no action
                  </div>
                </div>
                <a href={`https://wa.me/12108635696?text=${encodeURIComponent(`Hi Mark — following up on: ${d.title}. This has been waiting ${differenceInDays(new Date(), new Date(d.updated_at))} days. Proposing we change approach — what would you like to do?`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-card px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
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
            <h2 className="text-sm font-semibold">Meetings today</h2>
          </header>
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium">{e.title}</div>
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
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
                    Join
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Approved LinkedIn posts */}
      {approvedPosts.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-navy" />
              <h2 className="text-sm font-semibold">LinkedIn posts ready to publish</h2>
            </div>
            <Link to="/pipeline" className="text-xs font-medium text-navy hover:underline">Open pipeline</Link>
          </header>
          <ul className="divide-y divide-border">
            {approvedPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.scheduledDate ? format(new Date(p.scheduledDate), "MMM d, yyyy") : "No date set"}</div>
                </div>
                <PipelineBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Urgent inbox */}
      {inboxItems.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-navy" />
              <h2 className="text-sm font-semibold">Urgent inbox highlights</h2>
            </div>
            <Link to="/inbox" className="text-xs font-medium text-navy hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {inboxItems.slice(0, 5).map((item) => (
              <li key={item.id} className="px-5 py-3">
                <div className="text-sm font-medium">{item.subject}</div>
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
            <h2 className="text-sm font-semibold">{isKennedy ? "Kennedy's queue" : "Items awaiting your action"}</h2>
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
                    <div className="truncate text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.owner} · {d.status}</div>
                  </div>
                </div>
                {d.status === "Overdue" && (
                  <span className="ml-2 shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Overdue</span>
                )}
              </li>
            ))}
            {(isKennedy ? kennedyQueue : awaitingMark).length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">All clear.</li>
            )}
          </ul>
        </section>

        {/* Mark's week */}
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <MapPin className="h-4 w-4 text-navy" />
            <h2 className="text-sm font-semibold">Mark's week</h2>
          </header>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Location</label>
              <input
                type="text"
                value={markLocation}
                onChange={(e) => setMarkLocation(e.target.value)}
                onBlur={(e) => saveLocation(e.target.value)}
                placeholder="Type a city — Newport, Austin, Boston, Washington DC…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
              {savingLoc && <span className="text-xs text-muted-foreground">saving…</span>}
            </div>

            {currentSuggestions ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {currentSuggestions.icon} Suggested for {markLocation}
                </div>
                {currentSuggestions.items.map((s, i) => (
                  <div key={i} className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                      <a href={s.url}
                        target={s.url.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="shrink-0 rounded-md bg-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-navy/90">
                        Book it
                      </a>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Type Mark's location above to see proactive activity suggestions with booking links.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Upcoming posts */}
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Upcoming LinkedIn Posts</h2>
          <Link to="/pipeline" className="text-xs font-medium text-navy hover:underline">View all</Link>
        </header>
        <ul className="divide-y divide-border">
          {posts.filter((p) => p.status !== "Posted").slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.scheduledDate ? format(new Date(p.scheduledDate), "MMM d, yyyy") : "No date"}</div>
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

function MetricCard({ label, value, children, accent }: { label: string; value?: number; children?: React.ReactNode; accent?: "gold" | "red" }) {
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
