import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info, Star } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
});

type InboxItem = {
  id: string; subject: string; sender: string; category: string;
  summary: string; date: string; actioned: boolean;
};

const CATEGORY_CONFIG = {
  "Urgent": { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Urgent" },
  "Notable": { icon: Star, color: "text-gold", bg: "bg-gold/10 border-gold/20", label: "Notable" },
  "FYI": { icon: Info, color: "text-navy", bg: "bg-navy/10 border-navy/20", label: "FYI" },
};

function InboxPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "actioned">("active");

  const { data: items = [] } = useQuery<InboxItem[]>({
    queryKey: ["inbox-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inbox_items").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data as InboxItem[]) ?? [];
    },
  });

  const filtered = items.filter((i) =>
    filter === "all" ? true :
    filter === "active" ? !i.actioned :
    i.actioned
  );

  const urgent = filtered.filter((i) => i.category === "Urgent" && !i.actioned);
  const notable = filtered.filter((i) => i.category === "Notable" && !i.actioned);
  const fyi = filtered.filter((i) => i.category === "FYI" && !i.actioned);

  async function toggleActioned(item: InboxItem) {
    const { error } = await supabase.from("inbox_items").update({ actioned: !item.actioned }).eq("id", item.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["inbox-items"] });
    qc.invalidateQueries({ queryKey: ["inbox-urgent"] });
    toast.success(item.actioned ? "Marked active" : "Marked actioned ✓");
  }

  async function remove(id: string) {
    await supabase.from("inbox_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox-items"] });
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inbox Highlights</h1>
          <p className="text-sm text-muted-foreground">Kennedy's curated daily digest for Mark.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["active", "all", "actioned"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
              filter === f ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
            {f === "active" ? "Active" : f === "actioned" ? "Done" : "All"}
          </button>
        ))}
      </div>

      {/* Grouped sections */}
      {filter === "active" && (
        <div className="space-y-6">
          {urgent.length > 0 && <ItemSection title="Urgent" items={urgent} config={CATEGORY_CONFIG.Urgent} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onDelete={remove} />}
          {notable.length > 0 && <ItemSection title="Notable" items={notable} config={CATEGORY_CONFIG.Notable} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onDelete={remove} />}
          {fyi.length > 0 && <ItemSection title="FYI" items={fyi} config={CATEGORY_CONFIG.FYI} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onDelete={remove} />}
          {urgent.length === 0 && notable.length === 0 && fyi.length === 0 && (
            <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              No active inbox items. Add items from Mark's inbox each morning.
            </div>
          )}
        </div>
      )}

      {filter !== "active" && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {filtered.map((item) => {
            const cfg = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.FYI;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className={cn("px-5 py-4", item.actioned && "opacity-50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium", item.actioned ? "line-through text-muted-foreground" : "text-foreground")}>{item.subject}</div>
                      <div className="text-xs text-muted-foreground">{item.sender} · {format(new Date(item.date), "MMM d")}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.summary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActioned(item)} title="Toggle actioned"
                      className={cn("rounded p-1.5", item.actioned ? "text-muted-foreground hover:bg-muted" : "text-status-approved hover:bg-status-approved/10")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(item.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No items.</div>
          )}
        </div>
      )}

      {creating && <AddItemModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["inbox-items"] }); qc.invalidateQueries({ queryKey: ["inbox-urgent"] }); setCreating(false); }} />}
    </div>
  );
}

function ItemSection({ title, items, config, expanded, setExpanded, onToggle, onDelete }: any) {
  const Icon = config.icon;
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className={cn("flex items-center gap-2 border-b border-border px-5 py-3", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
        <h2 className={cn("text-sm font-semibold", config.color)}>{title}</h2>
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium ml-1", config.bg, config.color)}>{items.length}</span>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item: InboxItem) => {
          const isOpen = expanded === item.id;
          return (
            <li key={item.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="flex items-center gap-1 text-left w-full">
                    <span className="text-sm font-medium text-foreground">{item.subject}</span>
                    {isOpen ? <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground ml-1" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground ml-1" />}
                  </button>
                  <div className="text-xs text-muted-foreground">{item.sender} · {format(new Date(item.date), "MMM d, h:mm a")}</div>
                  {isOpen && (
                    <div className="mt-2 text-sm text-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{item.summary}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onToggle(item)} title="Mark actioned"
                    className="rounded p-1.5 text-status-approved hover:bg-status-approved/10">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(item.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ subject: "", sender: "", category: "Urgent", summary: "", date: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject || !form.sender || !form.summary) return toast.error("All fields required");
    setSaving(true);
    const { error } = await supabase.from("inbox_items").insert({ ...form, actioned: false });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Added");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save}
        className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">Add inbox item</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <F label="Subject"><input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="inp" placeholder="Email subject or topic" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Sender"><input required value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} className="inp" placeholder="From: name / company" /></F>
            <F label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                <option>Urgent</option><option>Notable</option><option>FYI</option>
              </select>
            </F>
          </div>
          <F label="Summary / Kennedy's note">
            <textarea required rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="inp" placeholder="What does Mark need to know? What action is needed?" />
          </F>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : "Add"}
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
