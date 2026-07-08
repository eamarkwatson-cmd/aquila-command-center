import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
});

type Item = {
  id: string; subject: string; sender: string | null;
  category: "Urgent" | "Notable" | "FYI"; summary: string | null; date: string; actioned: boolean;
};

function categoryColor(c: string) {
  switch (c) {
    case "Urgent": return "bg-status-overdue/15 text-status-overdue border-status-overdue/30";
    case "Notable": return "bg-status-review/15 text-status-review border-status-review/30";
    default: return "bg-status-draft/15 text-status-draft border-status-draft/30";
  }
}

function InboxPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subject: "", sender: "", category: "FYI", summary: "" });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["inbox"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inbox_items").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data as Item[]) ?? [];
    },
  });

  async function toggle(id: string, actioned: boolean) {
    const { error } = await supabase.from("inbox_items").update({ actioned }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }
  async function remove(id: string) {
    await supabase.from("inbox_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }
  async function add() {
    if (!form.subject) return toast.error("Subject required");
    const { error } = await supabase.from("inbox_items").insert(form as any);
    if (error) return toast.error(error.message);
    setForm({ subject: "", sender: "", category: "FYI", summary: "" });
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["inbox"] });
    toast.success("Added");
  }

  const sorted = [...items].sort((a, b) => {
    const order = { Urgent: 0, Notable: 1, FYI: 2 } as const;
    return order[a.category] - order[b.category];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inbox Highlights</h1>
          <p className="text-sm text-muted-foreground">Curated daily digest.</p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90">
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {adding && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
          <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
          <input placeholder="Sender" value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option>Urgent</option><option>Notable</option><option>FYI</option>
          </select>
          <textarea placeholder="Summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button onClick={add} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground">Save</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {sorted.map((it) => (
            <li key={it.id} className="flex items-start gap-4 px-5 py-4">
              <input type="checkbox" checked={it.actioned} onChange={(e) => toggle(it.id, e.target.checked)}
                className="mt-1 h-4 w-4 accent-navy" />
              <div className={cn("min-w-0 flex-1", it.actioned && "text-muted-foreground line-through")}>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", categoryColor(it.category))}>
                    {it.category}
                  </span>
                  <span className="text-sm font-medium text-foreground">{it.subject}</span>
                </div>
                {it.sender && <div className="text-xs text-muted-foreground">from {it.sender}</div>}
                {it.summary && <p className="mt-1 text-sm text-foreground/80">{it.summary}</p>}
              </div>
              <div className="text-xs text-muted-foreground">{format(new Date(it.date), "MMM d")}</div>
              <button onClick={() => remove(it.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {sorted.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No highlights yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
