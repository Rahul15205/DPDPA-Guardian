import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Inbox, AlertTriangle, ScrollText, ShieldCheck, FileCheck2, Command as CommandIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { to: "/app/dsar", icon: Inbox, label: "DSAR request" },
  { to: "/app/grievance", icon: AlertTriangle, label: "Grievance" },
  { to: "/app/ropa", icon: ScrollText, label: "RoPA activity" },
  { to: "/app/dpa-reviewer", icon: ShieldCheck, label: "DPA review" },
  { to: "/app/assessments", icon: FileCheck2, label: "Assessment" },
];

export function QuickActionFab() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/login" || path === "/" || path.startsWith("/onboarding")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-elegant bg-gradient-primary text-primary-foreground hover:scale-105 transition"
            aria-label="Quick create"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>Quick create</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ACTIONS.map((a) => (
            <DropdownMenuItem
              key={a.to}
              onClick={() => navigate({ to: a.to, search: { action: "new" } } as never)}
            >
              <a.icon className="mr-2 h-4 w-4" /> {a.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
          >
            <CommandIcon className="mr-2 h-4 w-4" /> Search everything
            <span className="ml-auto text-[10px] text-muted-foreground">⌘K</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
