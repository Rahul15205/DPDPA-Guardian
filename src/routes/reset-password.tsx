import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean, msg?: string) => {
      if (cancelled) return;
      if (ok) setReady(true);
      else setError(msg ?? "This reset link is invalid or has expired. Please request a new one.");
    };

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const errorDesc = url.searchParams.get("error_description") || hash.get("error_description");
        if (errorDesc) return finish(false, errorDesc);

        // PKCE flow: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          // clean URL
          window.history.replaceState({}, "", url.pathname);
          if (error) return finish(false, error.message);
          return finish(true);
        }

        // Implicit flow: #access_token=...&type=recovery
        if (hash.get("access_token") && hash.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          window.history.replaceState({}, "", url.pathname);
          if (error) return finish(false, error.message);
          return finish(true);
        }

        // Fallback: maybe session already exists
        const { data } = await supabase.auth.getSession();
        if (data.session) return finish(true);

        finish(false);
      } catch (e: any) {
        finish(false, e?.message);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (!cancelled) setReady(true);
      }
    });

    init();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Wordmark />
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Set a new password.
          </h2>
          <p className="mt-4 text-sm opacity-70">
            Use a strong, unique passphrase. Minimum 8 characters.
          </p>
        </div>
        <div className="text-xs opacity-60">© {new Date().getFullYear()} Proteccio Data</div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Wordmark /></div>
          <h1 className="mt-8 font-display text-3xl font-semibold">Reset password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose a new password for your Proteccio account.
          </p>

          {error ? (
            <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Link problem</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <a href="/forgot-password" className="mt-3 inline-block font-medium text-primary hover:underline">
                Request a new reset link
              </a>
            </div>
          ) : !ready ? (
            <div className="mt-8 flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your reset link…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
