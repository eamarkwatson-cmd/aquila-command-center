import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PipelineBadge } from "@/components/status-badges";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, Send, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
});

type Post = {
  id: string;
  title: string;
  status: string | null;
  finalCaption: string;
  scheduledDate: string | null;
  platform: string | null;
  notes: string;
};

function PipelinePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Post | null>(null);
  const [posting, setPosting] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-pipeline");
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).posts as Post[];
    },
  });

  const { data: linkedin } = useQuery({
    queryKey: ["linkedin-conn"],
    queryFn: async () => {
      const { data } = await supabase.from("linkedin_connection")
        .select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const tokenExpired = linkedin && new Date(linkedin.expires_at) < new Date();

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Caption copied");
  }

  async function postToLinkedIn() {
    if (!selected) return;
    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("linkedin-post", {
        body: { commentary: selected.finalCaption },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      // Update Notion status
      const stamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const { data: upd, error: uErr } = await supabase.functions.invoke("notion-update-status", {
        body: {
          pageId: selected.id,
          status: "Posted",
          appendNote: `Posted via dashboard on ${stamp}`,
        },
      });
      if (uErr) throw uErr;
      if ((upd as any)?.error) throw new Error((upd as any).error);
      toast.success("Posted to LinkedIn");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">LinkedIn Pipeline</h1>
          <p className="text-sm text-muted-foreground">Pulled live from Notion.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!linkedin && (
        <Banner tone="warn">
          LinkedIn not connected. Connect Mark's LinkedIn in <a href="/settings" className="underline">Settings</a> to enable posting.
        </Banner>
      )}
      {tokenExpired && (
        <Banner tone="warn">
          LinkedIn token expired. Please reconnect in <a href="/settings" className="underline">Settings</a>.
        </Banner>
      )}

      {isLoading && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading posts…</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Notion error: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data?.map((p) => (
          <button
            key={p.id} onClick={() => setSelected(p)}
            className="text-left rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-navy/40 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2">{p.title}</h3>
              <PipelineBadge status={p.status} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {p.scheduledDate ? format(new Date(p.scheduledDate), "MMM d, yyyy") : "No date"}
              {p.platform ? ` · ${p.platform}` : ""}
            </div>
            <p className="mt-3 text-sm text-foreground/80 line-clamp-3">
              {p.finalCaption.slice(0, 150)}{p.finalCaption.length > 150 ? "…" : ""}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/20" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xl flex-col bg-card shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{selected.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <PipelineBadge status={selected.status} />
                  {selected.scheduledDate && <span>{format(new Date(selected.scheduledDate), "MMM d, yyyy")}</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Final Caption
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
{selected.finalCaption}
              </pre>
              {selected.notes && (
                <>
                  <div className="mt-6 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notes / Feedback
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
{selected.notes}
                  </pre>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border px-6 py-4">
              <button
                onClick={() => copy(selected.finalCaption)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Copy className="h-4 w-4" /> Copy caption
              </button>
              <button
                onClick={postToLinkedIn}
                disabled={posting || selected.status !== "Approved" || !linkedin || tokenExpired}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                title={selected.status !== "Approved" ? "Status must be Approved" : ""}
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post to LinkedIn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground">
      {children}
    </div>
  );
}
