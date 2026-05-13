import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent. Check your inbox.");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Wordmark />
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Account recovery, the secure way.
          </h2>
          <p className="mt-4 text-sm opacity-70">
            We never email passwords. We send a one-time, time-bound reset link.
          </p>
        </div>
        <div className="text-xs opacity-60">© {new Date().getFullYear()} Proteccio Data</div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Wordmark /></div>
          <h1 className="mt-8 font-display text-3xl font-semibold">Forgot password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your work email and we'll send you a secure reset link.
          </p>

          {sent ? (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                If an account exists for <span className="font-medium">{email}</span>, you'll receive a password reset link shortly. The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
