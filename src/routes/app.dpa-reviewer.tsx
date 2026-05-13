import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Plus, FileSearch, AlertTriangle, CheckCircle2,
  Clock, Activity, TrendingUp, Search, X, History, GitBranch,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Workflow, ChevronDown, ChevronUp, CircleDot } from "lucide-react";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/dpa-reviewer")({ component: DPAReviewerPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_DPA_REVIEWS: DPAReview[] = [
  {
    id: "dpa1", code: "DPA-2024-0001", vendor_name: "Amazon Web Services (AWS)", 
    agreement_title: "AWS Service Terms & DPA (Global)", jurisdictions: ["USA", "EU", "IN"],
    regulations: ["GDPR", "DPDPA", "HIPAA"], status: "approved", 
    risk_band: "Low", risk_score: 5, findings_critical: 0, findings_high: 0, findings_medium: 1, findings_low: 3,
    summary: "Standard AWS DPA with robust security clauses. Cross-border transfer relies on SCCs and Data Privacy Framework.",
    reviewer_email: "dpo@demo.com", owner_email: "it-ops@demo.com",
    linked_control_codes: ["CTRL-AWS-01", "CTRL-ENC-05"], document_name: "aws_dpa_2024_v1.pdf",
    due_at: null, completed_at: "2024-02-15T10:00:00Z", created_at: "2024-01-10T10:00:00Z",
    version: 3, change_summary: "Updated for DPDPA compliance clauses."
  },
  {
    id: "dpa2", code: "DPA-2024-0002", vendor_name: "Google Cloud Platform (GCP)", 
    agreement_title: "Cloud Data Processing Addendum (CDPA)", jurisdictions: ["EU", "IN"],
    regulations: ["GDPR", "DPDPA"], status: "in_review", 
    risk_band: "Medium", risk_score: 12, findings_critical: 0, findings_high: 2, findings_medium: 4, findings_low: 5,
    summary: "Reviewing breach notification SLAs which are currently set at 72 hours. Need to align with internal 24-hour policy.",
    reviewer_email: "analyst@demo.com", owner_email: "dev-lead@demo.com",
    linked_control_codes: ["CTRL-GCP-08"], document_name: "gcp_cdpa_draft.pdf",
    due_at: new Date(Date.now() + 3 * 86400000).toISOString(), completed_at: null, created_at: "2024-05-01T09:00:00Z",
    version: 1, change_summary: "Initial intake for new project."
  },
  {
    id: "dpa3", code: "DPA-2024-0003", vendor_name: "Salesforce CRM", 
    agreement_title: "Master Subscription Agreement & DPA", jurisdictions: ["Global"],
    regulations: ["GDPR", "CCPA", "DPDPA"], status: "rejected", 
    risk_band: "Critical", risk_score: 22, findings_critical: 2, findings_high: 5, findings_medium: 2, findings_low: 1,
    summary: "Agreement lacks explicit sub-processor liability and the data retention clause is too vague for current project requirements.",
    reviewer_email: "dpo@demo.com", owner_email: "sales-ops@demo.com",
    linked_control_codes: [], document_name: "salesforce_msa_v4.pdf",
    due_at: null, completed_at: "2024-05-10T15:00:00Z", created_at: "2024-04-15T11:00:00Z",
    version: 2, change_summary: "Rejection following legal review of sub-processor clauses."
  }
];

type DPAReview = {
  id: string; code: string | null; vendor_name: string;
  agreement_title: string | null; jurisdictions: string[];
  regulations: string[]; status: string;
  risk_band: string | null; risk_score: number | null;
  findings_critical: number; findings_high: number; findings_medium: number; findings_low: number;
  summary: string | null; reviewer_email: string | null; owner_email: string | null;
  linked_control_codes: string[]; document_name: string | null;
  due_at: string | null; completed_at: string | null; created_at: string;
  version: number; change_summary: string | null;
};

const STATUSES = ["draft", "in_review", "approved", "rejected", "archived"];
const BANDS = ["Critical", "High", "Medium", "Low", "Very Low"];

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  archived: "bg-secondary text-secondary-foreground",
};

const bandColor: Record<string, string> = {
  Critical: "bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold",
  High: "bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold",
  Medium: "bg-amber-500/5 text-amber-600 border-amber-500/20",
  Low: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "Very Low": "bg-muted text-muted-foreground",
};

function DPAReviewerPage() {
  const { membership } = useAuth();
  const [reviews, setReviews] = useState<DPAReview[]>(MOCK_DPA_REVIEWS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<DPAReview | null>(null);

  const kpis = useMemo(() => {
    const total = reviews.length;
    const inReview = reviews.filter((r) => r.status === "in_review").length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const critical = reviews.filter((r) => r.risk_band === "Critical").length;
    const avgScore = Math.round(reviews.reduce((s, r) => s + (r.risk_score || 0), 0) / total);
    return { total, inReview, approved, critical, avgScore };
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search && !r.vendor_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reviews, search, statusFilter]);

  return (
    <div className="space-y-6 p-6 lg:p-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> DPA Reviewer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Review Data Processing Agreements · {kpis.total} reviews · {kpis.critical} high risk agreements detected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="dpa-reviewer" />
          <Button variant="outline"><FileSearch className="h-4 w-4 mr-2" /> Analyze DPA</Button>
          <Button><Plus className="h-4 w-4 mr-2" /> New Review</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total Reviews" value={kpis.total} icon={<FileSearch className="h-4 w-4" />} />
        <Kpi label="In Review" value={kpis.inReview} icon={<Clock className="h-4 w-4" />} tone="warning" />
        <Kpi label="Approved" value={kpis.approved} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <Kpi label="Critical Risk" value={kpis.critical} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
        <Kpi label="Avg Risk Score" value={kpis.avgScore} icon={<Activity className="h-4 w-4" />} />
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Agreement Inventory</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search vendor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead className="text-[11px] uppercase">DPA ID</TableHead>
                  <TableHead className="text-[11px] uppercase">Vendor / Agreement</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Risk Band</TableHead>
                  <TableHead className="text-[11px] uppercase">Findings</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setDetail(r)}>
                    <TableCell className="font-mono text-[11px] font-bold text-primary">{r.code}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{r.vendor_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.agreement_title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] uppercase ${statusVariant[r.status]}`}>{r.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                       {r.risk_band && <Badge variant="outline" className={`text-[9px] ${bandColor[r.risk_band]}`}>{r.risk_band} ({r.risk_score})</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.findings_critical > 0 && <span className="text-[10px] font-bold text-rose-600">{r.findings_critical}C</span>}
                        {r.findings_high > 0 && <span className="text-[10px] font-bold text-amber-600">{r.findings_high}H</span>}
                        {r.findings_medium > 0 && <span className="text-[10px] font-bold text-amber-500">{r.findings_medium}M</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono text-[10px] gap-1"><GitBranch className="h-3 w-3" /> v{r.version}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {detail && (
        <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{detail.vendor_name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <div><Label className="text-xs text-muted-foreground uppercase">Summary</Label><p className="text-sm mt-1">{detail.summary}</p></div>
               <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-muted-foreground uppercase">Reviewer</Label><p className="text-xs mt-1 font-medium">{detail.reviewer_email}</p></div>
                  <div><Label className="text-xs text-muted-foreground uppercase">Last Updated</Label><p className="text-xs mt-1 font-medium">{format(new Date(detail.created_at), "MMM d, yyyy")}</p></div>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: any; tone?: string }) {
  const toneCls = tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : tone === "destructive" ? "text-rose-600" : "text-primary";
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          <span className={toneCls}>{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
