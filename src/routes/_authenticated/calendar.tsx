import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, ExternalLink, Copy, Trash2, Video } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type Ev = {
  id: string; title: string; start_time: string; end_time: string | null;
  platform: string | null; join_url: string | null; meeting_id: string | null;
  passcode: string | null; notes: string | null;
};

function CalendarPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<Ev>>({});

  const { data: events = [] } = useQuery<Ev[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const { data, error } = await supabase.from("events").select("*")
        .gte("start_time", start.toISOString()).lte("start_time", end.toISOString())
        .order("start_time");
      if (error) throw error;
      return (data as Ev[]) ?? [];
    },
  });

  async function add() {
    if (!form.title || !form.start_time) return toast.error("Title and start time required");
    const { error } = await supabase.from("events").insert(form as any);
    if (error) return toast.error(error.message);
    setForm({}); setAdding(false);
    qc.invalidateQueries({ queryKey: ["events"] });
  }
  async function remove(id: string) {
    await supabase.from("events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  }
  async function copyDetails(ev: Ev) {
    const lines = [
      ev.title,
      `${format(new Date(ev.start_time), "p")}${ev.end_time ? " – " + format(new Date(ev.end_time), "p") : ""}`,
      ev.platform && `Platform: ${ev.platform}`,
      ev.join_url && `Join: ${ev.join_url}`,
      ev.meeting_id && `Meeting ID: ${ev.meeting_id}`,
      ev.passcode && `Passcode: ${ev.passcode}`,
      ev.notes,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(lines);
    toast.success("Details copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90">
          <Plus className="h-4 w-4" /> Add event
        </button>
      </div>

      {adding && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <input placeholder="Title" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
          <label className="text-xs text-muted-foreground">Start<input type="datetime-local"
            onChange={(e) => setForm({ ...form, start_time: new Date(e.target.value).toISOString() })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
          <label className="text-xs text-muted-foreground">End<input type="datetime-local"
            onChange={(e) => setForm({ ...form, end_time: new Date(e.target.value).toISOString() })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
          <input placeholder="Platform (Zoom / Meet / Teams)" value={form.platform ?? ""} onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Join URL" value={form.join_url ?? ""} onChange={(e) => setForm({ ...form, join_url: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Meeting ID" value={form.meeting_id ?? ""} onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Passcode" value={form.passcode ?? ""} onChange={(e) => setForm({ ...form, passcode: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button onClick={add} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground">Save</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-24 shrink-0 text-sm font-semibold text-navy">
                {format(new Date(e.start_time), "p")}
                {e.end_time && <div className="text-xs font-normal text-muted-foreground">
                  to {format(new Date(e.end_time), "p")}
                </div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {e.platform && <Video className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {e.platform}
                  {e.meeting_id && ` · ID ${e.meeting_id}`}
                  {e.passcode && ` · Passcode ${e.passcode}`}
                </div>
              </div>
              {e.join_url && (
                <a href={e.join_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-navy-foreground hover:bg-navy/90">
                  <ExternalLink className="h-3 w-3" /> Join
                </a>
              )}
              <button onClick={() => copyDetails(e)} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted" title="Copy details">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(e.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {events.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">No events today.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
