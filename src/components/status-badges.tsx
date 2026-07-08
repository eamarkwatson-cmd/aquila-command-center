import { cn } from "@/lib/utils";

export type PipelineStatus =
  | "Drafting"
  | "Ready for Review"
  | "Needs Revision"
  | "Approved"
  | "Posted"
  | string
  | null;

export type DelegationStatus =
  | "Not Started" | "In Progress" | "Waiting" | "Overdue" | "Done";

export function PipelineBadge({ status }: { status: PipelineStatus }) {
  const map: Record<string, string> = {
    Approved: "bg-status-approved/15 text-status-approved border-status-approved/30",
    "Ready for Review": "bg-status-review/15 text-status-review border-status-review/30",
    "Needs Revision": "bg-status-overdue/15 text-status-overdue border-status-overdue/30",
    Posted: "bg-status-posted/15 text-status-posted border-status-posted/30",
    Drafting: "bg-status-draft/15 text-status-draft border-status-draft/40",
  };
  const cls = (status && map[status]) || "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {status ?? "—"}
    </span>
  );
}

export function DelegationStatusDot({ status }: { status: DelegationStatus }) {
  const color =
    status === "Done" ? "bg-status-approved" :
    status === "Overdue" ? "bg-status-overdue" :
    status === "Waiting" ? "bg-status-review" :
    status === "In Progress" ? "bg-status-posted" :
    "bg-status-draft";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}
