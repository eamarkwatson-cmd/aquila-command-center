import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DelegationStatusDot, type DelegationStatus } from "@/components/status-badges";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays, isSameDay } from "date-fns";
import { Plus, X, Trash2, AlertTriangle, CheckCircle2, Clock, MessageSquare, ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/delegations")({
  component: DelegationsPage,
});

type Row = {
  id: string; title: string; description: string | null;
  owner: "Mark" | "Kennedy" | "Other"; status: DelegationStatus;
  due_date: string | null; priority: "High" | "Medium" | "Low" | null;
  source: string | null; notes: string | null;
  created_at: string; updated_at: string; completed_at: string | null;
};

const STATUSES: DelegationStatus[] = ["Not Started", "In Progress", "Waiting", "Overdue", "Done"];

// Attention scoring
function score(r: Row): number {
  let s = 0;
  if (r.status === "Overdue") s += 50;
  if (r.due_date && new Date(r.due_date) <= new Date() && r.status !== "Done") s += 30;
  if (r.owner === "Mark") s += 25;
  if (r.priority === "High") s += 25;
  if (r.status === "Waiting") s += 20;
  return s;
}

type Preset = "all" | "mark" | "kennedy" | "overdue" | "high" | "due-today" | "done" | "escalated";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mark", label: "Waiting on Mark" },
  { key: "kennedy", label: "Kennedy's queue" },
  { key: "overdue", label: "Overdue" },
  { key: "high", label: "High Priority" },
  { key: "due-today", label: "Due Today" },
  { key: "escalated", label: "Escalated" },
  { key: "done", label: "Done" },
];

function DelegationsPage() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [noteTarget, setNoteTarget] = useState<Row | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["delegations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const today = new Date();
  const escalated = rows.filter((r) =>
    r.owner === "Mark" && r.status !== "Done" &&
    differenceInDays(today, new Date(r.updated_at)) >= 7
  );

  const filtered = useMemo(() => {
    let r = rows;
    switch (preset) {
      case "mark": r = r.filter((x) => x.owner === "Mark" && x.status !== "Done"); break;
      case "kennedy": r = r.filter((x) => x.owner === "Kennedy" && x.status !== "Done"); break;
      case "overdue": r = r.filter((x) => x.status === "Overdue"); break;
      case "high": r = r.filter((x) => x.priority === "High" && x.status !== "Done"); break;
      case "due-today": r = r.filter((x) => x.due_date && isSameDay(new Date(x.due_date), today)); break;
      case "escalated": r = escalated; break;
      case "done": r = r.filter((x) => x.status === "Done"); break;
    }
    // Sort by attention score descending (except Done)
    return [...r].sort((a, b) => score(b) - score(a));
  }, [rows, preset, escalated]);

  async function log(action: string, row: Row, extra?: Record<string, unknown>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        entity_type: "delegation", entity_id: row.id,
        action, performed_by: user?.email ?? null,
        details: { title: row.title, ...(extra ?? {}) } as any,
      });
    } catch { /* non-fatal */ }
  }

  async function quickUpdate(id: string, patch: Partial<Row>, label: string, row: Row) {
    const { error } = await supabase.from("delegations")
      .update({ ...patch, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    qc.invalidateQueries({ queryKey: ["attention-count"] });
    qc.invalidateQueries({ queryKey: ["escalated-count"] });
    qc.invalidateQueries({ queryKey: ["delegations-overview"] });
    await log(`quick_action_${label.toLowerCase().replace(/ /g,'_')}`, row, patch as any);
    toast.success(label);
  }

  async function markDone(row: Row) {
    await quickUpdate(row.id, { status: "Done", completed_at: new Date().toISOString() } as any, "Marked done ✓", row);
  }

  async function waitingOnMark(row: Row) {
    await quickUpdate(row.id, { status: "Waiting", owner: "Mark" }, "→ Waiting on Mark", row);
  }

  async function waitingOnKennedy(row: Row) {
    await quickUpdate(row.id, { status: "Waiting", owner: "Kennedy" }, "→ Waiting on Kennedy", row);
  }

  async function snooze(row: Row) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await quickUpdate(row.id, { due_date: tomorrow.toISOString().split("T")[0] }, "Snoozed 24h ⏰", row);
  }

  async function changePriority(row: Row, priority: "High" | "Medium" | "Low") {
    await quickUpdate(row.id, { priority }, `Priority → ${priority}`, row);
  }

  async function addNote(row: Row) {
    if (!noteText.trim()) return;
    const existing = row.notes ?? "";
    const stamp = format(new Date(), "MMM d, h:mm a");
    const updated = existing ? `${existing}\n\n[${stamp}] ${noteText.trim()}` : `[${stamp}] ${noteText.trim()}`;
    const { error } = await supabase.from("delegations").update({ notes: updated, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    await log("note_added", row, { note: noteText.trim() });
    toast.success("Note added");
    setNoteTarget(null);
    setNoteText("");
  }

  async function proposeWhatsApp(row: Row) {
    const days = differenceInDays(today, new Date(row.updated_at));
    const msg = encodeURIComponent(`Hi Mark — following up on: "${row.title}". This has been waiting ${days} days. Would you like to change our approach or can we close it out?`);
    window.open(`https://wa.me/12108635696?text=${msg}`, "_blank");
    await log("propose_solution", row, { days });
  }

  async function remove(row: Row) {
    if (!confirm("Delete this delegation?")) return;
    await supabase.from("delegations").delete().eq("id", row.id);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    toast.success("Deleted");
  }

  const openCount = rows.filter((r) => r.status !== "Done").length;
  const doneCount = rows.filter((r) => r.status === "Done").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Delegations</h1>
          <p className="text-sm text-muted-foreground">{openCount} open · {doneCount} done · sorted by priority</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
          <Plus className="h-4 w-4" /> New delegation
        </button>
      </div>

      {/* Escalation banner */}
      {escalated.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {escalated.length} item{escalated.length > 1 ? "s" : ""} waiting on Mark for 7+ days — needs new approach
            </span>
            <button onClick={() => setPreset("escalated")} className="ml-auto text-xs font-medium text-destructive underline">View</button>
          </div>
        </div>
      )}

      {/* Filter presets */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((b) => {
          const count =
            b.key === "all" ? rows.length :
            b.key === "mark" ? rows.filter((r) => r.owner === "Mark" && r.status !== "Done").length :
            b.key === "kennedy" ? rows.filter((r) => r.owner === "Kennedy" && r.status !== "Done").length :
            b.key === "overdue" ? rows.filter((r) => r.status === "Overdue").length :
            b.key === "high" ? rows.filter((r) => r.priority === "High" && r.status !== "Done").length :
            b.key === "due-today" ? rows.filter((r) => r.due_date && isSameDay(new Date(r.due_date), today)).length :
            b.key === "escalated" ? escalated.length :
            b.key === "done" ? rows.filter((r) => r.status === "Done").length : 0;
          const active = preset === b.key;
          const isDestructive = (b.key === "escalated" || b.key === "overdue") && count > 0;
          return (
            <button key={b.key} onClick={() => setPreset(b.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                active && isDestructive ? "border-destructive bg-destructive text-white" :
                active ? "border-navy bg-navy text-white" :
                isDestructive ? "border-destructive/30 text-destructive hover:bg-destructive/10" :
                "border-border bg-card text-muted-foreground hover:bg-muted"
              )}>
              {b.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Due</th>
              <th className="px-4 py-3 text-left">Quick actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const s = score(r);
              const sl = s >= 75 ? { label: "Critical", color: "text-destructive" } :
                         s >= 50 ? { label: "High", color: "text-status-review" } :
                         s >= 25 ? { label: "Medium", color: "text-gold" } : null;
              const isEsc = escalated.some((e) => e.id === r.id);
              const overdue = r.status === "Overdue";
              const doneRow = r.status === "Done";
              return (
                <tr key={r.id} className={cn(
                  "hover:bg-muted/30 transition",
                  overdue && "border-l-4 border-l-destructive",
                  doneRow && "opacity-50"
                )}>
                  <td className="px-4 py-3">
                    <button className="text-left" onClick={() => setEditing(r)}>
                      <div className={cn("font-medium hover:underline", doneRow ? "line-through text-muted-foreground" : "text-foreground")}>
                        {r.title}
                      </div>
                      {r.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.description}</div>}
                      {sl && !doneRow && <span className={`text-[10px] font-medium ${sl.color}`}>{sl.label}</span>}
                      {isEsc && !doneRow && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {differenceInDays(today, new Date(r.updated_at))}d waiting
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.owner}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DelegationStatusDot status={r.status} />
                      <select value={r.status}
                        onChange={(e) => quickUpdate(r.id, { status: e.target.value as DelegationStatus }, `Status → ${e.target.value}`, r)}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs">
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.priority === "High" ? "bg-destructive/10 text-destructive" :
                      r.priority === "Medium" ? "bg-gold/10 text-gold" :
                      "bg-muted text-muted-foreground"
                    )}>{r.priority ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.due_date ? format(new Date(r.due_date), "MMM d") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Mark done */}
                      {r.status !== "Done" && (
                        <QBtn title="Mark done" onClick={() => markDone(r)} hover="hover:text-status-approved hover:bg-status-approved/10">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </QBtn>
                      )}
                      {/* Snooze */}
                      <QBtn title="Snooze 24h" onClick={() => snooze(r)} hover="hover:text-gold hover:bg-gold/10">
                        <Clock className="h-3.5 w-3.5" />
                      </QBtn>
                      {/* Propose via WhatsApp (escalated only) */}
                      {isEsc && (
                        <QBtn title="Propose solution via WhatsApp" onClick={() => proposeWhatsApp(r)} hover="hover:text-destructive hover:bg-destructive/10">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </QBtn>
                      )}
                      {/* Add note */}
                      <QBtn title="Add note" onClick={() => { setNoteTarget(r); setNoteText(""); }} hover="hover:text-navy hover:bg-navy/10">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </QBtn>
                      {/* Priority toggle */}
                      <QBtn title="Toggle priority" onClick={() => changePriority(r, r.priority === "High" ? "Medium" : "High")} hover="hover:text-gold hover:bg-gold/10">
                        <Flag className="h-3.5 w-3.5" />
                      </QBtn>
                      {/* Delete */}
                      <QBtn title="Delete" onClick={() => remove(r)} hover="hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </QBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                {preset === "done" ? "No completed delegations yet." : "No delegations match this filter."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add note modal */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setNoteTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Add note — {noteTarget.title}</h3>
              <button onClick={() => setNoteTarget(null)}><X className="h-4 w-4" /></button>
            </div>
            <textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-navy" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setNoteTarget(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
              <button onClick={() => addNote(noteTarget)} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">Save note</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {(creating || editing) && (
        <DelegationModal
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => {
            qc.invalidateQueries({ queryKey: ["delegations"] });
            qc.invalidateQueries({ queryKey: ["attention-count"] });
            qc.invalidateQueries({ queryKey: ["delegations-overview"] });
          }}
        />
      )}
    </div>
  );
}

function QBtn({ children, title, onClick, hover }: { children: React.ReactNode; title: string; onClick: () => void; hover: string }) {
  return (
    <button onClick={onClick} title={title}
      className={cn("rounded p-1.5 text-muted-foreground transition", hover)}>
      {children}
    </button>
  );
}

function DelegationModal({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Row>>(row ?? {
    title: "", owner: "Mark", status: "Not Started", priority: "Medium", source: null,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return toast.error("Title required");
    setSaving(true);
    let error;
    if (row) {
      ({ error } = await supabase.from("delegations").update({ ...form, updated_at: new Date().toISOString() } as any).eq("id", row.id));
    } else {
      ({ error } = await supabase.from("delegations").insert(form as any));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(row ? "Updated" : "Created");
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save}
        className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">{row ? "Edit" : "New"} delegation</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <F label="Title"><input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="inp" /></F>
          <F label="Description"><textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Owner">
              <select value={form.owner ?? "Mark"} onChange={(e) => setForm({ ...form, owner: e.target.value as any })} className="inp">
                <option>Mark</option><option>Kennedy</option><option>Other</option>
              </select>
            </F>
            <F label="Status">
              <select value={form.status ?? "Not Started"} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="inp">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </F>
            <F label="Priority">
              <select value={form.priority ?? "Medium"} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="inp">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </F>
            <F label="Source">
              <select value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value || null })} className="inp">
                <option value="">—</option>
                <option>Call</option><option>Email</option><option>WhatsApp</option><option>Slack</option>
              </select>
            </F>
            <F label="Due date">
              <input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} className="inp" />
            </F>
          </div>
          <F label="Notes"><textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" /></F>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
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
