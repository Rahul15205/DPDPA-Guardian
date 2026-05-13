import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Proteccio Data — Privacy Compliance Platform" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RootRedirect,
});

function RootRedirect() {
  const navigate = useNavigate();
  const { user, membership, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!membership) navigate({ to: "/onboarding", replace: true });
    else navigate({ to: "/app/dashboard", replace: true });
  }, [loading, user, membership, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading workspace…
    </div>
  );
}
