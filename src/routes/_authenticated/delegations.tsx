import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DelegationStatusDot, type DelegationStatus } from "@/components/status-badges";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Plus, X, Trash2, AlertTriangle, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/delegations")({
  component: DelegationsPage,
});

type Row = {
  id: string; title: string; description: string | null; owner: "Mark" | "Kennedy" | "Other";
  status: DelegationStatus; due_date: string | null; priority: "High" | "Medium" | "Low" | null;
  source: string | null; notes: string | null; created_at: string; updated_at: string;
  completed_at: string | null;
};

const STATUSES: DelegationStatus[] = ["Not Started", "In Progress", "Waiting", "Overdue", "Done"];

function DelegationsPage() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<"all" | "mark" | "kennedy" | "escalated">("all");
  const [ownerF, setOwnerF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["delegations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const escalated = rows.filter((r) =>
    r.owner === "Mark" &&
    r.status !== "Done" &&
    differenceInDays(new Date(), new Date(r.updated_at)) >= 7
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (preset === "mark") r = r.filter((x) => x.owner === "Mark" && x.status !== "Done");
    if (preset === "kennedy") r = r.filter((x) => x.owner === "Kennedy" && x.status !== "Done");
    if (preset === "escalated") r = escalated;
    if (ownerF !== "all") r = r.filter((x) => x.owner === ownerF);
    if (statusF !== "all") r = r.filter((x) => x.status === statusF);
    return r;
  }, [rows, preset, ownerF, statusF, escalated]);

  async function updateStatus(id: string, status: DelegationStatus) {
    const patch: any = { status };
    if (status === "Done") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("delegations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    qc.invalidateQueries({ queryKey: ["attention-count"] });
    qc.invalidateQueries({ queryKey: ["delegations-overview"] });
    qc.invalidateQueries({ queryKey: ["escalated-count"] });
  }

  async function markDone(id: string) {
    await updateStatus(id, "Done");
    toast.success("Marked as done ✓");
  }

  async function snooze(id: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { error } = await supabase.from("delegations").update({
      due_date: tomorrow.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    toast.success("Snoozed 24 hours");
  }

  async function remove(id: string) {
    if (!confirm("Delete this delegation?")) return;
    const { error } = await supabase.from("delegations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["delegations"] });
    toast.success("Deleted");
  }

  function proposeWhatsApp(title: string) {
    const msg = encodeURIComponent(`Hi Mark — following up on: "${title}". This has been waiting for a while. Would you like to change our approach or can we close it out?`);
    window.open(`https://wa.me/12108635696?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Delegations</h1>
          <p className="text-sm text-muted-foreground">Track ownership, status, and priority.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90"
        >
          <Plus className="h-4 w-4" /> New delegation
        </button>
      </div>

      {/* Escalation banner */}
      {escalated.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {escalated.length} item{escalated.length > 1 ? "s" : ""} waiting on Mark for 7+ days — needs a new approach
            </span>
            <button
              onClick={() => setPreset("escalated")}
              className="ml-auto text-xs font-medium text-destructive underline"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Filter presets */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: "all", label: "All" },
          { k: "mark", label: "Waiting on Mark" },
          { k: "kennedy", label: "Kennedy's queue" },
          { k: "escalated", label: `Escalated${escalated.length > 0 ? ` (${escalated.length})` : ""}` },
        ].map((b) => (
          <button
            key={b.k} onClick={() => setPreset(b.k as any)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              preset === b.k
                ? b.k === "escalated"
                  ? "border-destructive bg-destructive text-white"
                  : "border-navy bg-navy text-navy-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >{b.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select value={ownerF} onChange={(e) => setOwnerF(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs">
            <option value="all">All owners</option>
            <option>Mark</option><option>Kennedy</option><option>Other</option>
          </select>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Due</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const overdue = r.status === "Overdue";
              const isEscalated = escalated.some((e) => e.id === r.id);
              const daysSinceUpdate = differenceInDays(new Date(), new Date(r.updated_at));
              return (
                <tr key={r.id} className={cn(
                  "hover:bg-muted/30",
                  overdue && "border-l-4 border-l-destructive",
                  isEscalated && "bg-destructive/3",
                )}>
                  <td className="px-4 py-3">
                    <button className="text-left font-medium text-foreground hover:underline"
                      onClick={() => setEditing(r)}>
                      {r.title}
                    </button>
                    {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                    {isEscalated && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {daysSinceUpdate}d waiting — needs new approach
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.owner}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DelegationStatusDot status={r.status} />
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value as DelegationStatus)}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                      >
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.due_date ? format(new Date(r.due_date), "MMM d") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Mark done */}
                      <button
                        onClick={() => markDone(r.id)}
                        title="Mark done"
                        className="rounded p-1.5 text-muted-foreground hover:bg-status-approved/10 hover:text-status-approved"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      {/* Snooze */}
                      <button
                        onClick={() => snooze(r.id)}
                        title="Snooze 24h"
                        className="rounded p-1.5 text-muted-foreground hover:bg-gold/10 hover:text-gold"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {/* Propose solution (escalated items only) */}
                      {isEscalated && (
                        <button
                          onClick={() => proposeWhatsApp(r.title)}
                          title="Propose solution via WhatsApp"
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => remove(r.id)}
                        title="Delete"
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No delegations match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <DelegationModal
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["delegations"] });
            qc.invalidateQueries({ queryKey: ["attention-count"] });
            qc.invalidateQueries({ queryKey: ["delegations-overview"] });
            qc.invalidateQueries({ queryKey: ["escalated-count"] });
          }}
        />
      )}
    </div>
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
      ({ error } = await supabase.from("delegations").update(form).eq("id", row.id));
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
          <Field label="Title">
            <input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Description">
            <textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <select value={form.owner ?? "Mark"} onChange={(e) => setForm({ ...form, owner: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Mark</option><option>Kennedy</option><option>Other</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status ?? "Not Started"} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority ?? "Medium"} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </Field>
            <Field label="Source">
              <select value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value || null })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">—</option>
                <option>Call</option><option>Email</option><option>WhatsApp</option><option>Slack</option>
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
