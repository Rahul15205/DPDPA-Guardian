import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { ScrollText, Inbox, MessageSquareWarning, ShieldCheck, FileCheck2, ListChecks, BookOpen } from "lucide-react";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;

  const { data, isLoading } = useQuery({
    queryKey: ["reports-data", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [dsar, grv, ropa, dpa, asmt, ctrls] = await Promise.all([
        supabase.from("dsar_requests").select("code,requester_name,requester_email,request_type,status,current_stage,priority,sla_due_at,created_at").eq("org_id", orgId!).order("created_at", { ascending: false }),
        supabase.from("grievances").select("code,complainant_name,complainant_email,subject,status,current_stage,priority,severity,sla_due_at,created_at").eq("org_id", orgId!).order("created_at", { ascending: false }),
        supabase.from("processing_activities").select("code,name,purpose,status,cross_border,data_categories,owner_email,updated_at").eq("org_id", orgId!).order("updated_at", { ascending: false }),
        supabase.from("dpa_reviews").select("code,vendor_name,agreement_title,status,version,risk_band,risk_score,findings_critical,findings_high,findings_medium,findings_low,owner_email,reviewer_email,due_at,created_at").eq("org_id", orgId!).order("created_at", { ascending: false }),
        supabase.from("assessments").select("code,name,type,status,current_stage,owner_email,inherent_band,inherent_score,residual_band,residual_score,progress,due_at").eq("org_id", orgId!).order("started_at", { ascending: false }),
        supabase.from("control_responses").select("control_id,status,updated_at").eq("org_id", orgId!),
      ]);
      return {
        dsar: dsar.data ?? [],
        grv: grv.data ?? [],
        ropa: ropa.data ?? [],
        dpa: dpa.data ?? [],
        asmt: asmt.data ?? [],
        ctrls: ctrls.data ?? [],
      };
    },
  });

  const cards = [
    { key: "dsar", icon: Inbox, label: "DSAR requests", desc: "All access / correction / erasure requests with SLA & stage.", rows: data?.dsar ?? [], file: "dsar" },
    { key: "grievance", icon: MessageSquareWarning, label: "Grievances", desc: "Privacy complaints and resolutions under DPDPA §13.", rows: data?.grv ?? [], file: "grievances" },
    { key: "ropa", icon: ScrollText, label: "RoPA activities", desc: "Records of Processing Activities · Art. 30.", rows: data?.ropa ?? [], file: "ropa" },
    { key: "dpa-reviewer", icon: ShieldCheck, label: "DPA reviews", desc: "Vendor DPA reviews with risk and findings.", rows: data?.dpa ?? [], file: "dpa-reviews" },
    { key: "assessments", icon: FileCheck2, label: "Assessments", desc: "DPIA / TIA / LIA / vendor assessments with 5×5 risk.", rows: data?.asmt ?? [], file: "assessments" },
    { key: "controls", icon: ListChecks, label: "Controls", desc: "Control library status across all categories.", rows: data?.ctrls ?? [], file: "controls" },
  ];

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Download CSV, JSON or printable PDF for any module — board-ready, regulator-ready.</p>
        </div>
        <ModuleTour moduleKey="reports" />
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{c.label}</CardTitle>
                    <CardDescription className="text-xs">{c.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : `${c.rows.length} record${c.rows.length === 1 ? "" : "s"}`}
                </div>
                <DownloadReportButton moduleLabel={c.label} filenameBase={c.file} rows={c.rows as Record<string, unknown>[]} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Tip: the printable PDF opens in a new tab — use your browser's <strong>Print → Save as PDF</strong> to generate a board-pack ready file.
        Need a custom view? Visit any module and use its built-in <Link to="/app/dashboard" className="text-primary underline">Download report</Link> button.
      </div>
    </div>
  );
}
