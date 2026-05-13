import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
}

function Onboarding() {
  const navigate = useNavigate();
  const { user, membership, loading, refreshMembership } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [dpoName, setDpoName] = useState("");
  const [dpoEmail, setDpoEmail] = useState("");
  const [grievanceName, setGrievanceName] = useState("");
  const [grievanceEmail, setGrievanceEmail] = useState("");
  const [sdf, setSdf] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (!loading && membership) navigate({ to: "/app/dashboard" });
  }, [loading, user, membership, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: slugify(orgName),
        industry,
        region: "IN",
        sdf_flag: sdf,
        dpo_name: dpoName,
        dpo_email: dpoEmail,
        grievance_officer_name: grievanceName || dpoName,
        grievance_officer_email: grievanceEmail || dpoEmail,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !org) {
      setBusy(false);
      toast.error(error?.message || "Could not create workspace");
      return;
    }
    const { error: memErr } = await supabase
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role: "admin" });
    if (memErr) {
      setBusy(false);
      toast.error(memErr.message);
      return;
    }
    await refreshMembership();
    toast.success("Workspace ready");
    navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Wordmark />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">Step 1 of 1</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Create your workspace</h1>
        <p className="mt-1.5 text-muted-foreground">Tell us about your organization. You can edit any of this later.</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Organization</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Organization name</Label>
                <Input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corporation" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Banking, Healthcare, EdTech…" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Data Protection Officer</h2>
            <p className="mt-1 text-sm text-muted-foreground">DPDPA requires a designated point of contact for data principals.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>DPO name</Label>
                <Input required value={dpoName} onChange={(e) => setDpoName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>DPO email</Label>
                <Input type="email" required value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Grievance Officer</h2>
            <p className="mt-1 text-sm text-muted-foreground">Leave blank to reuse DPO. Statutory under DPDPA Section 8(10).</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={grievanceName} onChange={(e) => setGrievanceName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={grievanceEmail} onChange={(e) => setGrievanceEmail(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between rounded-xl border border-border bg-card p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Significant Data Fiduciary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable if your organization has been (or expects to be) notified as an SDF under DPDPA Section 10.
              </p>
            </div>
            <Switch checked={sdf} onCheckedChange={setSdf} />
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy} size="lg" className="bg-gradient-primary text-primary-foreground">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create workspace
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
