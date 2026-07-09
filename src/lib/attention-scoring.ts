import { differenceInDays } from "date-fns";

export type ScoredDelegation = {
  id: string;
  title: string;
  owner: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  updated_at: string;
  score: number;
  reasons: string[];
};

export function scoreDelegation(d: {
  id: string; title: string; owner: string; status: string;
  priority: string | null; due_date: string | null; updated_at: string;
}): ScoredDelegation {
  let score = 0;
  const reasons: string[] = [];
  const today = new Date();

  if (d.due_date) {
    const diff = differenceInDays(new Date(d.due_date), today);
    if (diff < 0) { score += 50; reasons.push("Overdue"); }
    else if (diff === 0) { score += 30; reasons.push("Due today"); }
    else if (diff <= 2) { score += 15; reasons.push("Due soon"); }
  }
  if ((d.priority ?? "").toLowerCase() === "high") { score += 20; reasons.push("High priority"); }
  if (d.owner === "Mark" && d.status !== "Done") {
    const stale = differenceInDays(today, new Date(d.updated_at));
    if (stale >= 7) { score += 25; reasons.push(`Awaiting Mark ${stale}d`); }
    else if (stale >= 3) { score += 10; reasons.push(`Awaiting Mark ${stale}d`); }
  }
  if (d.status === "Blocked") { score += 15; reasons.push("Blocked"); }

  return { ...d, score, reasons };
}

export function rankDelegations<T extends Parameters<typeof scoreDelegation>[0]>(items: T[]) {
  return items.map(scoreDelegation).sort((a, b) => b.score - a.score);
}
