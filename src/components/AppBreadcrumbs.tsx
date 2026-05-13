import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  app: "Workspace",
  dashboard: "Dashboard",
  regulations: "Regulations",
  controls: "Controls",
  ropa: "RoPA",
  assessments: "Assessments",
  "dpa-reviewer": "DPA Reviewer",
  dsar: "DSAR",
  grievance: "Grievance",
  notices: "Notices",
  reports: "Reports",
  users: "Users & Roles",
  settings: "Settings",
};

export function AppBreadcrumbs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  let acc = "";
  const crumbs = parts.map((p) => {
    acc += "/" + p;
    return { href: acc, label: LABELS[p] ?? p };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/app/dashboard" className="inline-flex items-center hover:text-foreground">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link to={c.href as never} className="hover:text-foreground">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
