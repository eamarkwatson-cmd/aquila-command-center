import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X, ExternalLink, AlertCircle, Search, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investments")({
  component: InvestmentsPage,
});

type Investment = {
  id?: string;
  name: string; fund_entity: string | null; holding_entity: string | null;
  category: string | null; status: string; amount_committed: string | null;
  capital_call_status: string | null; docsign_status: string | null;
  contact: string | null; notes: string | null; drive_folder_link: string | null;
  next_action: string | null; next_action_due: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  "Active": "bg-status-approved/10 text-status-approved border-status-approved/20",
  "Pending": "bg-status-review/10 text-status-review border-status-review/20",
  "Closed": "bg-muted text-muted-foreground border-border",
  "Exited": "bg-status-posted/10 text-status-posted border-status-posted/20",
};

const CALL_COLORS: Record<string, string> = {
  "Past Due": "bg-destructive/10 text-destructive border-destructive/20",
  "Pending": "bg-status-review/10 text-status-review border-status-review/20",
  "Funded": "bg-status-approved/10 text-status-approved border-status-approved/20",
  "N/A": "bg-muted text-muted-foreground border-border",
};

function InvestmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [entityF, setEntityF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [categoryF, setCategoryF] = useState("all");
  const [selected, setSelected] = useState<Investment | null>(null);
  const [creating, setCreating] = useState(false);

  // Pull from Notion via edge function
  const { data: notionInvestments = [], isLoading: notionLoading, refetch, error: notionError } = useQuery<Investment[]>({
    queryKey: ["investments-notion"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-investments");
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).investments ?? [];
    },
    staleTime: 5 * 60 * 1000, // cache 5 mins
  });

  // Local additions from Supabase (investments added manually in app)
  const { data: localInvestments = [] } = useQuery<Investment[]>({
    queryKey: ["investments-local"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investments").select("*").order("name");
      if (error) throw error;
      return (data as Investment[]) ?? [];
    },
  });

  // Merge: Notion is source of truth, local adds extras
  const allInvestments = useMemo(() => {
    const notionNames = new Set(notionInvestments.map((i) => i.name.toLowerCase()));
    const extras = localInvestments.filter((i) => !notionNames.has(i.name.toLowerCase()));
    return [...notionInvestments, ...extras];
  }, [notionInvestments, localInvestments]);

  const filtered = useMemo(() => {
    let r = allInvestments;
    if (search) r = r.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.fund_entity ?? "").toLowerCase().includes(search.toLowerCase()) || (i.category ?? "").toLowerCase().includes(search.toLowerCase()));
    if (entityF !== "all") r = r.filter((i) => i.holding_entity === entityF);
    if (statusF !== "all") r = r.filter((i) => i.status === statusF);
    if (categoryF !== "all") r = r.filter((i) => i.category === categoryF);
    return r;
  }, [allInvestments, search, entityF, statusF, categoryF]);

  const actionNeeded = allInvestments.filter((i) =>
    i.capital_call_status === "Past Due" ||
    i.docsign_status === "Not Sent" ||
    i.docsign_status === "Pending"
  );

  const totalCommitted = allInvestments.filter((i) => i.amount_committed && i.amount_committed !== "TBC").reduce((sum, i) => {
    const n = parseFloat((i.amount_committed ?? "0").replace(/[$,]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  async function saveLocal(form: Partial<Investment>, existing?: Investment) {
    if (!form.name) return toast.error("Name required");
    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("investments").update(form).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("investments").insert(form as any));
    }
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["investments-local"] });
    toast.success("Saved");
    setSelected(null);
    setCreating(false);
  }

  async function deleteLocal(id: string) {
    if (!confirm("Delete this investment?")) return;
    await supabase.from("investments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["investments-local"] });
    setSelected(null);
    toast.success("Deleted");
  }

  const shortEntity = (e: string | null) => e
    ?.replace("Aquila Capital Partners LLC", "Aquila")
    .replace("Columbia Private Trust IRA", "Columbia IRA")
    .replace("Pacific Premier Trust IRA", "PPT IRA") ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">
            {notionLoading ? "Loading from Notion…" : `${allInvestments.length} holdings · $${(totalCommitted / 1_000_000).toFixed(2)}M tracked`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} title="Refresh from Notion"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {notionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3 text-sm text-destructive">
          Could not load from Notion: {(notionError as Error).message}. Showing locally saved investments only.
        </div>
      )}

      {actionNeeded.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">{actionNeeded.length} investment{actionNeeded.length > 1 ? "s" : ""} need immediate action</span>
          </div>
          <ul className="mt-2 space-y-1">
            {actionNeeded.slice(0, 5).map((i, idx) => (
              <li key={idx} className="cursor-pointer text-xs text-destructive hover:underline" onClick={() => setSelected(i)}>
                • {i.name} — {i.capital_call_status === "Past Due" ? "Capital call past due" : `DocuSign ${i.docsign_status}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search investments…"
            className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={entityF} onChange={(e) => setEntityF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All entities</option>
          <option>Aquila Capital Partners LLC</option>
          <option>Columbia Private Trust IRA</option>
          <option>Pacific Premier Trust IRA</option>
          <option>Personal</option>
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All statuses</option>
          <option>Active</option><option>Pending</option><option>Closed</option><option>Exited</option>
        </select>
        <select value={categoryF} onChange={(e) => setCategoryF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All categories</option>
          {["FinTech","InsurTech","AI","BioTech","DTC","Energy","Fund / LP","Media & Entertainment","Real Estate","Other"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {allInvestments.length}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Investment</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Capital Call</th>
              <th className="px-4 py-3 text-left">DocuSign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {notionLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading from Notion…</td></tr>
            )}
            {!notionLoading && filtered.map((inv, idx) => (
              <tr key={idx} onClick={() => setSelected(inv)}
                className={cn("cursor-pointer hover:bg-muted/30 transition",
                  inv.capital_call_status === "Past Due" && "border-l-4 border-l-destructive")}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{inv.name}</div>
                  {inv.fund_entity && inv.fund_entity !== inv.name && (
                    <div className="text-xs text-muted-foreground">{inv.fund_entity}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{shortEntity(inv.holding_entity)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{inv.category ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{inv.amount_committed ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[inv.status] ?? "bg-muted text-muted-foreground border-border")}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", CALL_COLORS[inv.capital_call_status ?? "N/A"] ?? "bg-muted text-muted-foreground border-border")}>
                    {inv.capital_call_status ?? "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium",
                    inv.docsign_status === "Signed" ? "bg-status-approved/10 text-status-approved border-status-approved/20" :
                    inv.docsign_status === "Not Sent" ? "bg-destructive/10 text-destructive border-destructive/20" :
                    "bg-status-review/10 text-status-review border-status-review/20")}>
                    {inv.docsign_status ?? "N/A"}
                  </span>
                </td>
              </tr>
            ))}
            {!notionLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No investments match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <InvestmentPanel
          investment={selected}
          isLocal={!!selected.id}
          onClose={() => setSelected(null)}
          onSave={(form) => saveLocal(form, selected)}
          onDelete={selected.id ? () => deleteLocal(selected.id!) : undefined}
        />
      )}
      {creating && (
        <InvestmentPanel
          investment={null}
          isLocal={false}
          onClose={() => setCreating(false)}
          onSave={(form) => saveLocal(form)}
        />
      )}
    </div>
  );
}

function InvestmentPanel({ investment, isLocal, onClose, onSave, onDelete }: {
  investment: Investment | null; isLocal: boolean;
  onClose: () => void; onSave: (form: Partial<Investment>) => void; onDelete?: () => void;
}) {
  const [form, setForm] = useState<Partial<Investment>>(investment ?? { status: "Active", capital_call_status: "N/A", docsign_status: "N/A" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const isNotionRecord = investment && !isLocal;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-foreground/20 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold">{investment ? investment.name : "New investment"}</h3>
          <div className="flex items-center gap-2">
            {isNotionRecord && (
              <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-medium text-navy">From Notion</span>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
            )}
            {investment?.drive_folder_link && (
              <a href={investment.drive_folder_link} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-navy hover:bg-muted">
                <ExternalLink className="h-3 w-3" /> Drive
              </a>
            )}
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {isNotionRecord && (
          <div className="bg-navy/5 px-5 py-3 text-xs text-muted-foreground border-b border-border">
            This record is managed in Notion. Changes saved here are stored locally in the app only and won't update Notion.
          </div>
        )}

        <div className="flex-1 space-y-4 p-5">
          <F label="Investment name"><input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" /></F>
          <F label="Fund / Entity"><input value={form.fund_entity ?? ""} onChange={(e) => setForm({ ...form, fund_entity: e.target.value })} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Holding entity">
              <select value={form.holding_entity ?? ""} onChange={(e) => setForm({ ...form, holding_entity: e.target.value })} className="inp">
                <option value="">—</option>
                <option>Aquila Capital Partners LLC</option>
                <option>Columbia Private Trust IRA</option>
                <option>Pacific Premier Trust IRA</option>
                <option>Personal</option>
              </select>
            </F>
            <F label="Category">
              <select value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                <option value="">—</option>
                {["FinTech","InsurTech","AI","BioTech","DTC","Energy","Fund / LP","Media & Entertainment","Real Estate","Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Status">
              <select value={form.status ?? "Active"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="inp">
                <option>Active</option><option>Pending</option><option>Closed</option><option>Exited</option>
              </select>
            </F>
            <F label="Amount committed"><input value={form.amount_committed ?? ""} onChange={(e) => setForm({ ...form, amount_committed: e.target.value })} className="inp" /></F>
            <F label="Capital call">
              <select value={form.capital_call_status ?? "N/A"} onChange={(e) => setForm({ ...form, capital_call_status: e.target.value })} className="inp">
                <option>Funded</option><option>Pending</option><option>Past Due</option><option>N/A</option>
              </select>
            </F>
            <F label="DocuSign">
              <select value={form.docsign_status ?? "N/A"} onChange={(e) => setForm({ ...form, docsign_status: e.target.value })} className="inp">
                <option>Signed</option><option>Pending</option><option>Not Sent</option><option>N/A</option>
              </select>
            </F>
          </div>
          <F label="Contact"><input value={form.contact ?? ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="inp" /></F>
          <F label="Next action"><input value={form.next_action ?? ""} onChange={(e) => setForm({ ...form, next_action: e.target.value })} className="inp" /></F>
          <F label="Notes"><textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" /></F>
          <F label="Drive folder link"><input value={form.drive_folder_link ?? ""} onChange={(e) => setForm({ ...form, drive_folder_link: e.target.value })} className="inp" /></F>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save locally"}
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
