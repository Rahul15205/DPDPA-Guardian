import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, Sparkles, LogOut, User, Settings as SettingsIcon, Building2, Command as CommandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";

interface Props {
  onStartTour?: () => void;
  notifications?: { id: string; title: string; meta: string; href?: string }[];
}

export function AppHeader({ onStartTour, notifications = [] }: Props) {
  const { user, membership, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.email ?? "U")
    .split("@")[0]
    .split(/[._-]/)
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-1.5 border-b border-border bg-background/80 px-6 py-2 backdrop-blur">
      <AppBreadcrumbs />
      <div className="flex h-12 items-center gap-3">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="group relative flex h-10 flex-1 max-w-xl items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground hover:border-ring/50"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate">Search controls, DSARs, RoPAs, vendors, codes…</span>
        <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <CommandIcon className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        {onStartTour && (
          <Button variant="outline" size="sm" onClick={onStartTour} className="hidden md:inline-flex">
            <Sparkles className="mr-1.5 h-4 w-4" /> Take a tour
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {notifications.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">Live alerts from your privacy program</div>
            </div>
            <div className="max-h-80 divide-y divide-border overflow-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">You're all caught up.</div>
              ) : (
                notifications.map((n) => (
                  <Link key={n.id} to={n.href ?? "/app/dashboard"} className="block px-4 py-3 hover:bg-secondary/50">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.meta}</div>
                  </Link>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                {initials || "U"}
              </div>
              <div className="hidden text-left md:block">
                <div className="text-xs font-medium leading-tight">{user?.email}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{membership?.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{membership?.org_name}</span>
              </div>
              <Badge variant="outline" className="mt-1 text-[10px]">{membership?.role}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
              <User className="mr-2 h-4 w-4" /> Profile & organisation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/users" })}>
              <SettingsIcon className="mr-2 h-4 w-4" /> Users & roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </header>
  );
}
