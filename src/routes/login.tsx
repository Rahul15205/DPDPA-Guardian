import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, membership, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: membership ? "/app/dashboard" : "/onboarding" });
    }
  }, [loading, user, membership, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* animated 3D backdrop */}
      <div className="pointer-events-none absolute inset-0 aurora" aria-hidden />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="blob-3d left-[8%] top-[12%] h-72 w-72 bg-primary/30" />
        <span className="blob-3d right-[6%] top-[40%] h-80 w-80 bg-chart-2/30" style={{ animationDelay: "-4s" }} />
        <span className="blob-3d left-[40%] bottom-[-6%] h-72 w-72 bg-warning/25" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="relative hidden flex-1 flex-col justify-between bg-sidebar/95 p-12 text-sidebar-foreground lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <Wordmark />
        <div className="relative max-w-md perspective-1000">
          <div className="float-3d preserve-3d">
            <h2 className="font-display text-3xl font-semibold leading-tight">
              The privacy operating system for the world's most regulated companies.
            </h2>
            <p className="mt-4 text-sm opacity-70">
              One control library. Every framework. Zero spreadsheets.
            </p>
          </div>
        </div>
        <div className="relative text-xs opacity-60">© {new Date().getFullYear()} Proteccio Data</div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-12 perspective-1000">
        <div className="card-3d w-full max-w-sm rounded-2xl border border-border/60 bg-card/80 p-8 shadow-elev backdrop-blur-xl">
          <div className="lg:hidden"><Wordmark /></div>
          <h1 className="mt-2 font-display text-3xl font-semibold">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Welcome back to Proteccio.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-glow">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Proteccio? <Link to="/signup" className="font-medium text-primary hover:underline">Create a workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
