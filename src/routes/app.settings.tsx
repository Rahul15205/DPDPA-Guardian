import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ModuleTour } from "@/components/ModuleTour";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { membership, user } = useAuth();
  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspace, members, and audit log management.</p>
        </div>
        <ModuleTour moduleKey="settings" />
      </header>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Workspace</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{membership?.org_name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Slug</dt><dd className="font-mono text-xs">{membership?.org_slug}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Your role</dt><dd className="uppercase">{membership?.role}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{user?.email}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
