import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Copy, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type Event = {
  id: string; title: string; start_time: string; end_time: string;
  platform: string | null; join_url: string | null; meeting_id: string | null;
  passcode: string | null; notes: string | null; created_at: string;
};

const PLATFORMS = ["Zoom", "Microsoft Teams", "Google Meet", "Phone", "In Person", "Other"];

function CalendarPage() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("start_time");
      if (error) throw error;
      return (data as Event[]) ?? [];
    },
  });

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.start_time), day));

  function copyDetails(e: Event) {
    const text = `${e.title}\n${format(parseISO(e.start_time), "h:mm a")} – ${format(parseISO(e.end_time), "h:mm a")}${e.platform ? ` · ${e.platform}` : ""}${e.meeting_id ? `\nMeeting ID: ${e.meeting_id}` : ""}${e.passcode ? ` · Passcode: ${e.passcode}` : ""}${e.join_url ? `\n${e.join_url}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
    setEditing(null);
    toast.success("Deleted");
  }

  const today = new Date();
  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="rounded p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setWeekOffset(0)}
              className={cn("rounded px-3 py-1 text-xs font-medium", isCurrentWeek ? "bg-navy text-white" : "hover:bg-muted")}>
              Today
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="rounded p-1.5 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={() => { setDefaultDate(format(today, "yyyy-MM-dd'T'HH:mm")); setCreating(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
            <Plus className="h-4 w-4" /> Add event
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayEvents = eventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className={cn(
              "min-h-32 rounded-lg border bg-card p-2",
              isToday ? "border-navy bg-navy/5" : "border-border"
            )}>
              <div className="mb-2 flex items-center justify-between">
                <div className={cn("text-xs font-medium", isToday ? "text-navy" : "text-muted-foreground")}>
                  {format(day, "EEE")}
                </div>
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isToday ? "bg-navy text-white" : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-1">
                {dayEvents.map((e) => (
                  <button key={e.id} onClick={() => setEditing(e)}
                    className="w-full rounded bg-navy/10 px-1.5 py-1 text-left text-[11px] text-navy hover:bg-navy/20 line-clamp-2">
                    <span className="font-medium">{format(parseISO(e.start_time), "h:mm a")}</span> {e.title}
                  </button>
                ))}
                <button
                  onClick={() => { setDefaultDate(format(day, "yyyy-MM-dd") + "T09:00"); setCreating(true); }}
                  className="w-full rounded px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's events list */}
      {eventsForDay(today).length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Today's meetings</h2>
          </header>
          <ul className="divide-y divide-border">
            {eventsForDay(today).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(e.start_time), "h:mm a")} – {format(parseISO(e.end_time), "h:mm a")}
                    {e.platform ? ` · ${e.platform}` : ""}
                  </div>
                  {(e.meeting_id || e.passcode) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.meeting_id && `ID: ${e.meeting_id}`}{e.passcode ? ` · Passcode: ${e.passcode}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyDetails(e)}
                    className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditing(e)}
                    className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                    Edit
                  </button>
                  {e.join_url && (
                    <a href={e.join_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 min-h-[44px]">
                      Join
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(creating || editing) && (
        <EventModal
          event={editing}
          defaultDate={defaultDate}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["events"] }); setCreating(false); setEditing(null); }}
          onDelete={editing ? () => deleteEvent(editing.id) : undefined}
        />
      )}
    </div>
  );
}

function EventModal({ event, defaultDate, onClose, onSaved, onDelete }: {
  event: Event | null; defaultDate?: string;
  onClose: () => void; onSaved: () => void; onDelete?: () => void;
}) {
  const [form, setForm] = useState<Partial<Event>>(event ?? {
    start_time: defaultDate ?? "", end_time: defaultDate ?? "", platform: "Zoom",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.start_time || !form.end_time) return toast.error("Title and times required");
    setSaving(true);
    let error;
    if (event) {
      ({ error } = await supabase.from("events").update(form).eq("id", event.id));
    } else {
      ({ error } = await supabase.from("events").insert(form as any));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(event ? "Updated" : "Created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save}
        className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">{event ? "Edit event" : "New event"}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <F label="Title"><input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start time"><input required type="datetime-local" value={form.start_time?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="inp" /></F>
            <F label="End time"><input required type="datetime-local" value={form.end_time?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="inp" /></F>
          </div>
          <F label="Platform">
            <select value={form.platform ?? ""} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="inp">
              <option value="">—</option>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </F>
          <F label="Join URL"><input type="url" value={form.join_url ?? ""} onChange={(e) => setForm({ ...form, join_url: e.target.value || null })} className="inp" placeholder="https://zoom.us/j/..." /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Meeting ID"><input value={form.meeting_id ?? ""} onChange={(e) => setForm({ ...form, meeting_id: e.target.value || null })} className="inp" /></F>
            <F label="Passcode"><input value={form.passcode ?? ""} onChange={(e) => setForm({ ...form, passcode: e.target.value || null })} className="inp" /></F>
          </div>
          <F label="Notes"><textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} className="inp" /></F>
        </div>
        <div className="flex justify-between border-t border-border px-5 py-3">
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete}
                className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">Delete</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
