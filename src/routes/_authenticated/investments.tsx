import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investments")({
  component: InvestmentsPage,
});

type Inv = {
  id: string; name: string; entity: string | null; custodian: string | null;
  platform: string | null; status: string; amount: number | null;
  next_action: string | null; next_action_due: string | null; notes: string | null;
};

const STATUSES = ["Active", "Pending Docs", "Action Needed", "Closed"];

function statusColor(s: string) {
  switch (s) {
    case "Active": return "bg-status-approved/15 text-status-approved border-status-approved/30";
    case "Pending Docs": return "bg-status-review/15 text-status-review border-status-review/30";
    case "Action Needed": return "bg-status-overdue/15 text-status-overdue border-status-overdue/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function InvestmentsPage() {
  const [statusF, setStatusF] = useState("all");
  const [entityF, setEntityF] = useState("all");

  const { data: rows = [] } = useQuery<Inv[]>({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Inv[]) ?? [];
    },
  });

  const entities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity).filter(Boolean))) as string[],
    [rows],
  );
  const filtered = rows.filter(
    (r) => (statusF === "all" || r.status === statusF) && (entityF === "all" || r.entity === entityF),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Investments</h1>
        <p className="text-sm text-muted-foreground">Portfolio and pending actions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={entityF} onChange={(e) => setEntityF(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs">
          <option value="all">All entities</option>
          {entities.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">{r.name}</h3>
              <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", statusColor(r.status))}>
                {r.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {[r.entity, r.custodian, r.platform].filter(Boolean).join(" · ")}
            </div>
            {r.amount != null && (
              <div className="mt-2 text-lg font-semibold text-navy">
                ${Number(r.amount).toLocaleString()}
              </div>
            )}
            {r.next_action && (
              <div className="mt-3 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs">
                <div className="font-medium text-foreground">Next action</div>
                <div className="mt-0.5 text-muted-foreground">{r.next_action}</div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No investments match filters.
          </div>
        )}
      </div>
    </div>
  );
}
