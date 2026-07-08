import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info, Star, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
});

type InboxItem = {
  id: string;
  subject: string;
  sender: string;
  category: string;
  summary: string;
  date: string;
  actioned: boolean;
  source?: "notion" | "manual";
};

const CATEGORY_CONFIG = {
  "Urgent": { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  "Notable": { icon: Star, color: "text-gold", bg: "bg-gold/10 border-gold/20" },
  "FYI": { icon: Info, color: "text-navy", bg: "bg-navy/10 border-navy/20" },
};

// Notion page IDs for today's task tracker — Kennedy writes to these each morning
// The app reads the "Notable inbox" section from today's Notion daily page
const NOTION_TODAY_PAGE_ID = "37643f84-8927-81dd-b63a-f9f8480a0e41"; // Wednesday July 8

function parseNotionInboxItems(notionText: string): InboxItem[] {
  const items: InboxItem[] = [];
  if (!notionText) return items;

  // Parse items from the "SOD Inbox" or "Notable inbox" section
  const lines = notionText.split("\n");
  let inInboxSection = false;
  let idx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/notable inbox|sod inbox|inbox highlights/i.test(trimmed)) {
      inInboxSection = true;
      continue;
    }
    if (inInboxSection && /^#{1,3}\s/.test(trimmed) && !/notable inbox|sod inbox|inbox/i.test(trimmed)) {
      inInboxSection = false;
      continue;
    }
    if (inInboxSection && trimmed.startsWith("-") && trimmed.length > 2) {
      const content = trimmed.replace(/^-\s*\*?\*?/, "").replace(/\*\*$/, "").trim();
      if (!content) continue;

      // Try to parse "Subject — detail" pattern
      const dashIdx = content.indexOf(" — ");
      const subject = dashIdx > 0 ? content.slice(0, dashIdx).trim() : content.slice(0, 60);
      const detail = dashIdx > 0 ? content.slice(dashIdx + 3).trim() : "";

      // Determine category from keywords
      let category = "Notable";
      if (/urgent|overdue|deadline|sign|wire|action required/i.test(content)) category = "Urgent";
      if (/fyi|filed|reference|newsletter|no action/i.test(content)) category = "FYI";

      // Extract sender from known patterns like "from:name" or "Name —"
      const sender = subject.includes("(") ? subject.slice(subject.indexOf("(") + 1, subject.indexOf(")")) : "Inbox";

      items.push({
        id: `notion-${idx++}`,
        subject: subject.replace(/\s*\(.*?\)\s*/g, "").trim(),
        sender,
        category,
        summary: detail || content,
        date: new Date().toISOString(),
        actioned: false,
        source: "notion",
      });
    }
  }
  return items;
}

function InboxPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all" | "actioned">("active");
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());

  // Manual items from Supabase
  const { data: manualItems = [] } = useQuery<InboxItem[]>({
    queryKey: ["inbox-manual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inbox_items").select("*").order("date", { ascending: false });
      if (error) throw error;
      return ((data as InboxItem[]) ?? []).map((i) => ({ ...i, source: "manual" as const }));
    },
  });

  // Notion items — read from today's daily task tracker
  const { data: notionItems = [], refetch: refetchNotion, isLoading: notionLoading } = useQuery<InboxItem[]>({
    queryKey: ["inbox-notion"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-test");
      if (error) return [];
      // Use notion-list-pipeline pattern — call edge function that reads today's page
      // For now read from the task tracker page content
      try {
        const res = await fetch(`https://api.notion.com/v1/blocks/${NOTION_TODAY_PAGE_ID}/children`, {
          headers: { "Authorization": `Bearer ${(data as any)?.token ?? ""}`, "Notion-Version": "2022-06-28" },
        });
        if (!res.ok) return [];
        const json = await res.json();
        const text = json.results?.map((b: any) =>
          b.paragraph?.rich_text?.map((t: any) => t.plain_text).join("") ??
          b.bulleted_list_item?.rich_text?.map((t: any) => t.plain_text).join("") ?? ""
        ).join("\n") ?? "";
        return parseNotionInboxItems(text);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Merge — manual items take priority, deduplicate by subject
  const allItems: InboxItem[] = (() => {
    const manualSubjects = new Set(manualItems.map((i) => i.subject.toLowerCase()));
    const extras = notionItems.filter((i) => !manualSubjects.has(i.subject.toLowerCase()));
    return [...manualItems, ...extras];
  })();

  const effectiveItems = allItems.map((i) => ({
    ...i,
    actioned: i.actioned || actionedIds.has(i.id),
  }));

  const filtered = effectiveItems.filter((i) =>
    filter === "all" ? true :
    filter === "active" ? !i.actioned :
    i.actioned
  );

  const urgent = filtered.filter((i) => i.category === "Urgent" && !i.actioned);
  const notable = filtered.filter((i) => i.category === "Notable" && !i.actioned);
  const fyi = filtered.filter((i) => i.category === "FYI" && !i.actioned);

  async function toggleActioned(item: InboxItem) {
    if (item.source === "manual") {
      const { error } = await supabase.from("inbox_items").update({ actioned: !item.actioned }).eq("id", item.id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["inbox-manual"] });
      qc.invalidateQueries({ queryKey: ["inbox-urgent"] });
    } else {
      // Notion items — toggle locally
      setActionedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
    }
    toast.success(item.actioned ? "Marked active" : "Actioned ✓");
  }

  async function remove(item: InboxItem) {
    if (item.source === "manual") {
      await supabase.from("inbox_items").delete().eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["inbox-manual"] });
    } else {
      setActionedIds((prev) => { const n = new Set(prev); n.add(item.id); return n; });
    }
    toast.success("Removed");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inbox Highlights</h1>
          <p className="text-sm text-muted-foreground">
            Kennedy's curated daily digest · pulled from Notion + manual entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { qc.invalidateQueries({ queryKey: ["inbox-notion"] }); refetchNotion(); }}
            title="Refresh from Notion"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            <RefreshCw className={cn("h-3.5 w-3.5", notionLoading && "animate-spin")} />
            Refresh
          </button>
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["active", "all", "actioned"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
              filter === f ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted")}>
            {f === "active" ? `Active (${urgent.length + notable.length + fyi.length})` : f === "actioned" ? "Done" : "All"}
          </button>
        ))}
      </div>

      {filter === "active" && (
        <div className="space-y-6">
          {urgent.length > 0 && <ItemSection title="Urgent" items={urgent} config={CATEGORY_CONFIG.Urgent} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onRemove={remove} />}
          {notable.length > 0 && <ItemSection title="Notable" items={notable} config={CATEGORY_CONFIG.Notable} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onRemove={remove} />}
          {fyi.length > 0 && <ItemSection title="FYI" items={fyi} config={CATEGORY_CONFIG.FYI} expanded={expanded} setExpanded={setExpanded} onToggle={toggleActioned} onRemove={remove} />}
          {urgent.length === 0 && notable.length === 0 && fyi.length === 0 && (
            <div className="rounded-lg border border-border bg-card px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No active inbox items.</p>
              <p className="text-xs text-muted-foreground mt-1">Kennedy updates this each morning during the inbox sweep.</p>
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
                      <div className={cn("text-sm font-medium", item.actioned && "line-through text-muted-foreground")}>{item.subject}</div>
                      <div className="text-xs text-muted-foreground">{item.sender} · {format(new Date(item.date), "MMM d")}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.summary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActioned(item)} className={cn("rounded p-1.5", item.actioned ? "text-muted-foreground hover:bg-muted" : "text-status-approved hover:bg-status-approved/10")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(item)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No items.</div>}
        </div>
      )}

      {creating && (
        <AddItemModal onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["inbox-manual"] }); qc.invalidateQueries({ queryKey: ["inbox-urgent"] }); setCreating(false); }} />
      )}
    </div>
  );
}

function ItemSection({ title, items, config, expanded, setExpanded, onToggle, onRemove }: any) {
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
                  <button onClick={() => setExpanded(isOpen ? null : item.id)} className="flex items-center gap-1 text-left w-full">
                    <span className="text-sm font-medium text-foreground">{item.subject}</span>
                    {item.source === "notion" && <span className="ml-1 rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] text-navy">Notion</span>}
                    {isOpen ? <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground ml-1" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground ml-1" />}
                  </button>
                  <div className="text-xs text-muted-foreground">{item.sender} · {format(new Date(item.date), "MMM d, h:mm a")}</div>
                  {isOpen && <div className="mt-2 text-sm text-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{item.summary}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onToggle(item)} className="rounded p-1.5 text-status-approved hover:bg-status-approved/10"><CheckCircle2 className="h-4 w-4" /></button>
                  <button onClick={() => onRemove(item)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
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
    if (!form.subject || !form.summary) return toast.error("Subject and summary required");
    setSaving(true);
    const { error } = await supabase.from("inbox_items").insert({ ...form, actioned: false });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Added");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">Add inbox item</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Subject</span>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="inp" placeholder="Email subject or topic" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Sender</span>
              <input value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} className="inp" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                <option>Urgent</option><option>Notable</option><option>FYI</option>
              </select></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Summary / Kennedy's note</span>
            <textarea required rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="inp" placeholder="What does Mark need to know?" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Add"}</button>
        </div>
      </form>
    </div>
  );
}
