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
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0a331b] to-[#010b05] text-white shadow-xl md:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Wordmark className="text-white" />
        </div>
        
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#1dd05e] border border-white/10 shadow-inner">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-base leading-tight">{membership.org_name}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">{membership.role}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4 scrollbar-hide">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-white/15 text-white shadow-md border border-white/5"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <n.icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-[#1dd05e]" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Button 
            variant="ghost" 
            size="lg" 
            className="w-full justify-start rounded-xl text-white/60 hover:bg-white/10 hover:text-white" 
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          >
            <LogOut className="mr-3 h-5 w-5" /> <span className="text-base font-medium">Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-x-hidden md:pl-72">
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
