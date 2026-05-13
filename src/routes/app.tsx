import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Layers, GitMerge, FileCheck2, Inbox, AlertTriangle,
  ScrollText, BarChart3, Settings, LogOut, Building2, Users, ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickActionFab } from "@/components/QuickActionFab";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

const nav = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/regulations", icon: GitMerge, label: "Regulations" },
  { to: "/app/controls", icon: Layers, label: "Controls" },
  { to: "/app/ropa", icon: ScrollText, label: "RoPA" },
  { to: "/app/assessments", icon: FileCheck2, label: "Assessments" },
  { to: "/app/dpa-reviewer", icon: ShieldCheck, label: "DPA Reviewer" },
  { to: "/app/dsar", icon: Inbox, label: "DSAR" },
  { to: "/app/grievance", icon: AlertTriangle, label: "Grievance" },
  { to: "/app/notices", icon: ScrollText, label: "Notices" },
  { to: "/app/reports", icon: BarChart3, label: "Reports" },
  { to: "/app/users", icon: Users, label: "Users & Roles" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

function AppShell() {
  const navigate = useNavigate();
  const { user, membership, loading, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!membership) navigate({ to: "/onboarding" });
  }, [loading, user, membership, navigate]);

  if (loading || !user || !membership) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Wordmark className="text-sidebar-foreground" />
        </div>
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{membership.org_name}</div>
            <div className="text-[11px] uppercase tracking-wider opacity-60">{membership.role}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-x-hidden">
        <AppHeader />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
      <QuickActionFab />
    </div>
  );
}
