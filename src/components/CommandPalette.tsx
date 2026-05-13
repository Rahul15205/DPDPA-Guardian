import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Layers, GitMerge, FileCheck2, Inbox, AlertTriangle,
  ScrollText, BarChart3, Settings, Users, ShieldCheck, Plus, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { globalSearch, type LinkedItem } from "@/lib/smart-links";

const NAV = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard", k: "g d" },
  { to: "/app/regulations", icon: GitMerge, label: "Regulations", k: "g r" },
  { to: "/app/controls", icon: Layers, label: "Controls", k: "g c" },
  { to: "/app/ropa", icon: ScrollText, label: "RoPA", k: "g o" },
  { to: "/app/assessments", icon: FileCheck2, label: "Assessments", k: "g a" },
  { to: "/app/dpa-reviewer", icon: ShieldCheck, label: "DPA Reviewer", k: "g p" },
  { to: "/app/dsar", icon: Inbox, label: "DSAR", k: "g s" },
  { to: "/app/grievance", icon: AlertTriangle, label: "Grievance", k: "g v" },
  { to: "/app/notices", icon: ScrollText, label: "Notices", k: "g n" },
  { to: "/app/reports", icon: BarChart3, label: "Reports", k: "g e" },
  { to: "/app/users", icon: Users, label: "Users & Roles", k: "g u" },
  { to: "/app/settings", icon: Settings, label: "Settings", k: "g t" },
] as const;

const QUICK_ACTIONS = [
  { to: "/app/dsar", label: "New DSAR request", icon: Inbox, action: "new" },
  { to: "/app/grievance", label: "New Grievance", icon: AlertTriangle, action: "new" },
  { to: "/app/ropa", label: "New RoPA activity", icon: ScrollText, action: "new" },
  { to: "/app/dpa-reviewer", label: "New DPA review", icon: ShieldCheck, action: "new" },
  { to: "/app/assessments", label: "New Assessment", icon: FileCheck2, action: "new" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { membership } = useAuth();

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!membership?.org_id) return;
    const term = query.trim();
    if (!term || term.length < 2) {
      setResults([]); return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await globalSearch(membership.org_id, term);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, membership?.org_id]);

  const go = useCallback((to: string, search?: Record<string, string>) => {
    setOpen(false);
    setQuery("");
    navigate({ to, search } as never);
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search records, jump to module, run an action…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching…" : "No results. Try a code, email or module name."}
        </CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading={`Records (${results.length})`}>
              {results.map((r) => (
                <CommandItem
                  key={`${r.module}-${r.id}`}
                  value={`${r.module} ${r.code ?? ""} ${r.title} ${r.subtitle ?? ""}`}
                  onSelect={() => go(r.href)}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{r.title}</span>
                  {r.subtitle && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">{r.subtitle}</span>
                  )}
                  {r.badge && (
                    <CommandShortcut className="uppercase tracking-wider">{r.badge}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem
              key={a.label}
              value={`new create ${a.label}`}
              onSelect={() => go(a.to, { action: a.action })}
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Jump to">
          {NAV.map((n) => (
            <CommandItem
              key={n.to}
              value={`go ${n.label}`}
              onSelect={() => go(n.to)}
            >
              <n.icon className="mr-2 h-3.5 w-3.5" /> {n.label}
              <CommandShortcut>{n.k}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
