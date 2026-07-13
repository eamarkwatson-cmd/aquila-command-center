import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Linkedin, ListChecks, Briefcase,
  Inbox, Calendar, Settings, LogOut, AlertTriangle, BarChart2, Plane,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/pipeline", label: "LinkedIn Pipeline", icon: Linkedin },
  { to: "/delegations", label: "Delegations", icon: ListChecks },
  { to: "/travel-planner", label: "Travel Planner", icon: Plane },
  { to: "/investments", label: "Investments", icon: Briefcase },
  { to: "/inbox", label: "Inbox Highlights", icon: Inbox },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/weekly", label: "Weekly Review", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function greetingFor(name: string | null | undefined) {
  const h = new Date().getHours();
  const t = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${t}${name ? `, ${name}` : ""}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? null);
    })();
  }, []);

  const isKennedy = userEmail === "kennedy.katua@athena.com";

  const { data: attention = 0 } = useQuery({
    queryKey: ["attention-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("delegations")
        .select("id", { head: true, count: "exact" })
        .neq("status", "Done")
        .or("status.eq.Overdue,owner.eq.Mark");
      return count ?? 0;
    },
  });

  const { data: escalatedCount = 0 } = useQuery({
    queryKey: ["escalated-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delegations")
        .select("id, owner, updated_at, status")
        .neq("status", "Done")
        .eq("owner", "Mark");
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return (data ?? []).filter((d: any) => new Date(d.updated_at) < sevenDaysAgo).length;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="h-7 w-7 rounded-sm bg-gold" />
          <div>
            <div className="text-base font-semibold tracking-tight">Aquila</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">EA Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                )}>
                <Icon className="h-4 w-4" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{greetingFor(displayName)}</h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            {isKennedy && escalatedCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <span className="font-medium text-destructive">{escalatedCount} escalated</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span className="font-medium text-foreground">{attention}</span>
              <span className="text-muted-foreground">need attention</span>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
