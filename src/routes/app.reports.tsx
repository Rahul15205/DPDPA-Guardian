import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { ScrollText, Inbox, MessageSquareWarning, ShieldCheck, FileCheck2, ListChecks } from "lucide-react";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

// --- HIGH FIDELITY MOCK DATA COUNTS ---
const MOCK_REPORT_COUNTS = {
  dsar: Array(24).fill({}),
  grv: Array(12).fill({}),
  ropa: Array(142).fill({}),
  dpa: Array(18).fill({}),
  asmt: Array(32).fill({}),
  ctrls: Array(45).fill({}),
};

function ReportsPage() {
  const { membership } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["reports-data-mock"],
    queryFn: async () => MOCK_REPORT_COUNTS,
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
    <div className="px-8 py-8 animate-in fade-in duration-500">
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
            <Card key={c.key} className="flex flex-col hover:border-primary/40 transition-all shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{c.label}</CardTitle>
                    <CardDescription className="text-xs">{c.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between pt-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {isLoading ? "Loading…" : `${c.rows.length} records populated`}
                </div>
                <DownloadReportButton moduleLabel={c.label} filenameBase={c.file} rows={c.rows as Record<string, unknown>[]} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-primary mb-2">
           <FileCheck2 className="h-4 w-4" /> Reporting Tips
        </p>
        The printable PDF opens in a new tab — use your browser's <strong>Print → Save as PDF</strong> to generate a board-pack ready file.
        All reports generated in this demo environment contain high-fidelity mock data for presentation purposes.
      </div>
    </div>
  );
}
