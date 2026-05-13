import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Plus, FileSearch, AlertTriangle, CheckCircle2,
  Clock, Activity, TrendingUp, Search, X, History, GitBranch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Workflow, ChevronDown, ChevronUp, CircleDot } from "lucide-react";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

const DPA_WORKFLOW_STEPS: {
  key: string;
  label: string;
  role: string;
  sla: string;
  purpose: string;
  actions: string[];
  exit: string;
}[] = [
  {
    key: "draft",
    label: "1. Draft / Intake",
    role: "Privacy Analyst · Procurement",
    sla: "2 business days",
    purpose:
      "A new Data Processing Agreement is logged in the register. The vendor, agreement title, processing scope, data categories and contract owner are captured. A unique DPA ID (DPA-YYYY-NNNN) is auto-assigned and v1 of the version history is sealed.",
    actions: [
      "Create the review with vendor & agreement metadata",
      "Attach the executed DPA / SCC / order form",
      "Link the related RoPA processing activity",
      "Assign a primary owner and target due date",
    ],
    exit: "All mandatory metadata present → move to In Review.",
  },
  {
    key: "in_review",
    label: "2. In Review (Clause Analysis)",
    role: "Privacy Analyst · DPO",
    sla: "5 business days",
    purpose:
      "The reviewer walks through the DPA clause-by-clause against the regulation checklist (DPDPA, GDPR Art. 28, CCPA, HIPAA BAA where relevant). Each gap is logged as a finding with a severity (Critical / High / Medium / Low) and the residual risk score & risk band are calculated.",
    actions: [
      "Run the Analyze DPA tool to extract clauses",
      "Score sub-processor, transfer, security, breach-notice & audit clauses",
      "Record findings with evidence and recommended remediation",
      "Compute risk score → set Risk Band (Very Low → Critical)",
    ],
    exit: "All findings triaged and risk band finalised → submit for Approval, or send back to vendor for remediation.",
  },
  {
    key: "approved",
    label: "3. Approved",
    role: "DPO · Legal",
    sla: "3 business days",
    purpose:
      "The DPO / Legal owner accepts the residual risk and signs off the agreement for use. The record is locked, a new immutable version snapshot is written to history, and downstream controls (contract clauses, vendor risk register, audit log) are updated.",
    actions: [
      "Verify all Critical / High findings are mitigated or accepted",
      "Record approver, approval date and any conditions",
      "Push approved status to the Vendor / RoPA register",
      "Notify the contract owner & procurement",
    ],
    exit: "Approval recorded → vendor is cleared to process personal data under this agreement.",
  },
  {
    key: "rejected",
    label: "4. Rejected / Sent Back",
    role: "DPO · Legal",
    sla: "Immediate",
    purpose:
      "The agreement fails the review (e.g. missing SCCs, no breach-notification SLA, unrestricted sub-processors, inadequate security). The reviewer logs the blocking findings and the rejection reason; vendor is asked to revise & resubmit. A new version is opened on resubmission.",
    actions: [
      "Capture rejection reason and the specific failing clauses",
      "Notify procurement / vendor with required changes",
      "Pause any processing dependent on this DPA",
      "Open a remediation task in the Action Items list",
    ],
    exit: "Vendor returns a revised DPA → re-enter at In Review (new version).",
  },
  {
    key: "archived",
    label: "5. Archived",
    role: "DPO",
    sla: "—",
    purpose:
      "The agreement has expired, been superseded, or the vendor relationship has ended. The record is moved to read-only archive but kept fully searchable for audit. All historical versions remain available in the Version History tab.",
    actions: [
      "Mark archive reason (expired / replaced / off-boarded)",
      "Detach from active RoPA processing activities",
      "Retain for the statutory retention period",
    ],
    exit: "Retention period elapsed → eligible for deletion via Reports module.",
  },
];

function DPAWorkflowLegend({ currentStatus }: { currentStatus?: string }) {
  const [open, setOpen] = useState(true);
  const currentIdx = DPA_WORKFLOW_STEPS.findIndex((s) => s.key === currentStatus);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4 text-primary" />
          DPA Review Workflow — what happens at each step
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {DPA_WORKFLOW_STEPS.length} stages · click to {open ? "collapse" : "expand"}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <CardContent className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-4">
            Every DPA review follows this five-stage lifecycle. Each stage records who is
            accountable, the SLA target, the actions performed and the exit criteria. Stage
            transitions are written to the immutable version history with the actor, timestamp
            and a snapshot of the record.
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DPA_WORKFLOW_STEPS.map((s, i) => {
              const done = currentIdx >= 0 && i < currentIdx;
              const active = i === currentIdx;
              return (
                <div
                  key={s.key}
                  className={`rounded-lg border p-3 text-xs ${
                    active
                      ? "border-primary/60 bg-primary/5 shadow-sm"
                      : done
                      ? "border-success/30 bg-success/5"
                      : "border-border bg-secondary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <CircleDot
                        className={`h-4 w-4 ${
                          active ? "text-primary" : done ? "text-success" : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-semibold text-sm">{s.label}</span>
                    </div>
                    <Badge variant="outline" className={statusVariant[s.key] || ""}>
                      {s.key.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        {s.role}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        SLA: {s.sla}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{s.purpose}</p>
                    <div>
                      <div className="font-semibold text-foreground/80 mb-1">Key actions</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {s.actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded border border-dashed border-border bg-background/50 p-2">
                      <span className="font-semibold text-foreground/80">Exit criteria: </span>
                      <span className="text-muted-foreground">{s.exit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-md border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> Use the Version History
            tab inside any review to see every stage transition, who made it, and to roll back to a
            prior version if needed.
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export const Route = createFileRoute("/app/dpa-reviewer")({ component: DPAReviewerPage });

type DPAReview = {
  id: string;
  code: string | null;
  vendor_name: string;
  agreement_title: string | null;
  jurisdictions: string[];
  regulations: string[];
  status: string;
  risk_band: string | null;
  risk_score: number | null;
  findings_critical: number;
  findings_high: number;
  findings_medium: number;
  findings_low: number;
  summary: string | null;
  reviewer_email: string | null;
  owner_email: string | null;
  linked_control_codes: string[];
  document_name: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  version: number;
  change_summary: string | null;
};

type DPAVersion = {
  id: string;
  version: number;
  snapshot: any;
  change_summary: string | null;
  changed_by_email: string | null;
  created_at: string;
};

const STATUSES = ["draft", "in_review", "approved", "rejected", "archived"];
const BANDS = ["Critical", "High", "Medium", "Low", "Very Low"];

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  archived: "bg-secondary text-secondary-foreground",
};

const bandColor: Record<string, string> = {
  Critical: "bg-destructive/15 text-destructive border-destructive/30",
  High: "bg-warning/20 text-warning border-warning/40",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-success/15 text-success border-success/30",
  "Very Low": "bg-muted text-muted-foreground",
};

function DPAReviewerPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id ?? null;
  const [reviews, setReviews] = useState<DPAReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [detail, setDetail] = useState<DPAReview | null>(null);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dpa_reviews")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setReviews((data as DPAReview[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const kpis = useMemo(() => {
    const total = reviews.length;
    const inReview = reviews.filter((r) => r.status === "in_review").length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const rejected = reviews.filter((r) => r.status === "rejected").length;
    const critical = reviews.filter((r) => r.risk_band === "Critical").length;
    const high = reviews.filter((r) => r.risk_band === "High").length;
    const overdue = reviews.filter(
      (r) => r.due_at && new Date(r.due_at) < new Date() && r.status !== "approved" && r.status !== "archived"
    ).length;
    const avgScore = total
      ? Math.round(reviews.reduce((s, r) => s + (r.risk_score || 0), 0) / total)
      : 0;
    return { total, inReview, approved, rejected, critical, high, overdue, avgScore };
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.vendor_name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.agreement_title?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reviews, search, statusFilter]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> DPA Reviewer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Review Data Processing Agreements. Each review gets a unique DPA ID, risk band,
            findings count, and links into your controls library.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="dpa-reviewer" />
          <DownloadReportButton
            moduleLabel="DPA Reviews"
            filenameBase="dpa-reviews"
            rows={filtered.map((r) => ({
              dpa_id: r.code, vendor: r.vendor_name, agreement: r.agreement_title,
              status: r.status, version: r.version, risk_band: r.risk_band, risk_score: r.risk_score,
              critical: r.findings_critical, high: r.findings_high, medium: r.findings_medium, low: r.findings_low,
              owner_email: r.owner_email, reviewer_email: r.reviewer_email,
              due_at: r.due_at, created_at: r.created_at,
            }))}
            summary={[
              { label: "Total", value: kpis.total },
              { label: "In review", value: kpis.inReview },
              { label: "Approved", value: kpis.approved },
              { label: "Critical risk", value: kpis.critical },
            ]}
          />
          <Button variant="outline" onClick={() => setAnalyzerOpen(true)}>
            <FileSearch className="h-4 w-4 mr-2" /> Analyze DPA
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Review
          </Button>
        </div>
      </header>

      {/* Workflow Legend */}
      <DPAWorkflowLegend />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Kpi label="Total Reviews" value={kpis.total} icon={<FileSearch className="h-4 w-4" />} />
        <Kpi label="In Review" value={kpis.inReview} icon={<Clock className="h-4 w-4" />} tone="warning" />
        <Kpi label="Approved" value={kpis.approved} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <Kpi label="Rejected" value={kpis.rejected} icon={<X className="h-4 w-4" />} tone="destructive" />
        <Kpi label="Critical Risk" value={kpis.critical} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
        <Kpi label="High Risk" value={kpis.high} icon={<TrendingUp className="h-4 w-4" />} tone="warning" />
        <Kpi label="Overdue" value={kpis.overdue} icon={<Clock className="h-4 w-4" />} tone="destructive" />
        <Kpi label="Avg Risk Score" value={kpis.avgScore} icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">DPA Reviews</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ID, vendor…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[220px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FileSearch className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No DPA reviews yet. Click "New Review" to log one or "Analyze DPA" to upload a document.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">DPA ID</TableHead>
                    <TableHead>Vendor / Agreement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setDetail(r)}
                    >
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.vendor_name}</div>
                        {r.agreement_title && (
                          <div className="text-xs text-muted-foreground">{r.agreement_title}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant[r.status] || ""}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.risk_band ? (
                          <Badge variant="outline" className={bandColor[r.risk_band] || ""}>
                            {r.risk_band}{r.risk_score ? ` · ${r.risk_score}` : ""}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 text-xs">
                          {r.findings_critical > 0 && <span className="px-1.5 rounded bg-destructive/15 text-destructive">{r.findings_critical}C</span>}
                          {r.findings_high > 0 && <span className="px-1.5 rounded bg-warning/20 text-warning">{r.findings_high}H</span>}
                          {r.findings_medium > 0 && <span className="px-1.5 rounded bg-warning/10 text-warning">{r.findings_medium}M</span>}
                          {r.findings_low > 0 && <span className="px-1.5 rounded bg-success/15 text-success">{r.findings_low}L</span>}
                          {(r.findings_critical + r.findings_high + r.findings_medium + r.findings_low) === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] gap-1">
                          <GitBranch className="h-3 w-3" /> v{r.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.owner_email || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.due_at ? format(new Date(r.due_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analyzer (themed iframe) */}
      <Sheet open={analyzerOpen} onOpenChange={setAnalyzerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              Analyze DPA Document
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Upload your DPA — analysis runs locally in your browser. Use "New Review" afterwards to log findings against a DPA ID.
            </p>
          </SheetHeader>
          <iframe
            src="/dpa-review-tool.html"
            title="DPA Analyzer"
            className="flex-1 w-full border-0 bg-background"
          />
        </SheetContent>
      </Sheet>

      {/* New Review form */}
      <NewReviewDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        orgId={orgId}
        onCreated={load}
      />

      {/* Detail panel */}
      <DetailDialog
        review={detail}
        onClose={() => setDetail(null)}
        onChanged={load}
      />
    </div>
  );
}

function Kpi({
  label, value, icon, tone,
}: { label: string; value: number; icon: React.ReactNode; tone?: "warning" | "success" | "destructive" }) {
  const toneCls =
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[11px] uppercase tracking-wider">{label}</span>
          <span className={toneCls}>{icon}</span>
        </div>
        <div className={`text-2xl font-semibold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewReviewDialog({
  open, onOpenChange, orgId, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; orgId: string | null; onCreated: () => void }) {
  const [form, setForm] = useState({
    vendor_name: "", agreement_title: "", status: "draft",
    risk_band: "", risk_score: "",
    findings_critical: "0", findings_high: "0", findings_medium: "0", findings_low: "0",
    summary: "", reviewer_email: "", owner_email: "", due_at: "",
    jurisdictions: "", regulations: "", linked_control_codes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!orgId) return toast.error("No organization");
    if (!form.vendor_name) return toast.error("Vendor name is required");
    setSaving(true);
    const { error } = await supabase.from("dpa_reviews").insert({
      org_id: orgId,
      vendor_name: form.vendor_name,
      agreement_title: form.agreement_title || null,
      status: form.status,
      risk_band: form.risk_band || null,
      risk_score: form.risk_score ? Number(form.risk_score) : null,
      findings_critical: Number(form.findings_critical) || 0,
      findings_high: Number(form.findings_high) || 0,
      findings_medium: Number(form.findings_medium) || 0,
      findings_low: Number(form.findings_low) || 0,
      summary: form.summary || null,
      reviewer_email: form.reviewer_email || null,
      owner_email: form.owner_email || null,
      due_at: form.due_at || null,
      jurisdictions: form.jurisdictions ? form.jurisdictions.split(",").map((s) => s.trim()).filter(Boolean) : [],
      regulations: form.regulations ? form.regulations.split(",").map((s) => s.trim()).filter(Boolean) : [],
      linked_control_codes: form.linked_control_codes ? form.linked_control_codes.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("DPA review created");
    onOpenChange(false);
    onCreated();
    setForm({
      vendor_name: "", agreement_title: "", status: "draft",
      risk_band: "", risk_score: "",
      findings_critical: "0", findings_high: "0", findings_medium: "0", findings_low: "0",
      summary: "", reviewer_email: "", owner_email: "", due_at: "",
      jurisdictions: "", regulations: "", linked_control_codes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New DPA Review</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor *">
            <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
          </Field>
          <Field label="Agreement title">
            <Input value={form.agreement_title} onChange={(e) => setForm({ ...form, agreement_title: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
          </Field>
          <Field label="Risk band">
            <Select value={form.risk_band || "none"} onValueChange={(v) => setForm({ ...form, risk_band: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Risk score (1–25)">
            <Input type="number" min={0} max={25} value={form.risk_score} onChange={(e) => setForm({ ...form, risk_score: e.target.value })} />
          </Field>
          <Field label="Critical findings">
            <Input type="number" min={0} value={form.findings_critical} onChange={(e) => setForm({ ...form, findings_critical: e.target.value })} />
          </Field>
          <Field label="High findings">
            <Input type="number" min={0} value={form.findings_high} onChange={(e) => setForm({ ...form, findings_high: e.target.value })} />
          </Field>
          <Field label="Medium findings">
            <Input type="number" min={0} value={form.findings_medium} onChange={(e) => setForm({ ...form, findings_medium: e.target.value })} />
          </Field>
          <Field label="Low findings">
            <Input type="number" min={0} value={form.findings_low} onChange={(e) => setForm({ ...form, findings_low: e.target.value })} />
          </Field>
          <Field label="Reviewer email">
            <Input value={form.reviewer_email} onChange={(e) => setForm({ ...form, reviewer_email: e.target.value })} />
          </Field>
          <Field label="Owner email">
            <Input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
          </Field>
          <Field label="Jurisdictions (comma)">
            <Input value={form.jurisdictions} onChange={(e) => setForm({ ...form, jurisdictions: e.target.value })} placeholder="EU, UK, IN" />
          </Field>
          <Field label="Regulations (comma)">
            <Input value={form.regulations} onChange={(e) => setForm({ ...form, regulations: e.target.value })} placeholder="GDPR, DPDPA" />
          </Field>
          <Field label="Linked controls (codes)" className="col-span-2">
            <Input value={form.linked_control_codes} onChange={(e) => setForm({ ...form, linked_control_codes: e.target.value })} placeholder="CTRL-001, CTRL-014" />
          </Field>
          <Field label="Summary" className="col-span-2">
            <Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Create Review"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DetailDialog({
  review, onClose, onChanged,
}: { review: DPAReview | null; onClose: () => void; onChanged: () => void }) {
  const [status, setStatus] = useState<string>("");
  const [tab, setTab] = useState<"details" | "versions">("details");
  const [versions, setVersions] = useState<DPAVersion[]>([]);
  const [vLoading, setVLoading] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [selectedVer, setSelectedVer] = useState<DPAVersion | null>(null);

  useEffect(() => {
    if (review) { setStatus(review.status); setTab("details"); setChangeNote(""); setSelectedVer(null); }
  }, [review]);

  const loadVersions = async (id: string) => {
    setVLoading(true);
    const { data, error } = await supabase
      .from("dpa_review_versions")
      .select("*")
      .eq("dpa_review_id", id)
      .order("version", { ascending: false });
    if (error) toast.error(error.message);
    setVersions((data as DPAVersion[]) || []);
    setVLoading(false);
  };

  useEffect(() => {
    if (review && tab === "versions") loadVersions(review.id);
  }, [review, tab]);

  if (!review) return null;

  const updateStatus = async (next: string) => {
    setStatus(next);
    const { error } = await supabase
      .from("dpa_reviews")
      .update({
        status: next,
        completed_at: next === "approved" ? new Date().toISOString() : null,
        change_summary: changeNote || `Status changed to ${next}`,
      })
      .eq("id", review.id);
    if (error) return toast.error(error.message);
    setChangeNote("");
    toast.success(`Status updated · new version saved`);
    onChanged();
    if (tab === "versions") loadVersions(review.id);
  };

  const restoreVersion = async (v: DPAVersion) => {
    const s = v.snapshot || {};
    const { error } = await supabase
      .from("dpa_reviews")
      .update({
        vendor_name: s.vendor_name,
        agreement_title: s.agreement_title,
        status: s.status,
        risk_band: s.risk_band,
        risk_score: s.risk_score,
        findings_critical: s.findings_critical,
        findings_high: s.findings_high,
        findings_medium: s.findings_medium,
        findings_low: s.findings_low,
        summary: s.summary,
        reviewer_email: s.reviewer_email,
        owner_email: s.owner_email,
        jurisdictions: s.jurisdictions,
        regulations: s.regulations,
        linked_control_codes: s.linked_control_codes,
        change_summary: `Restored from v${v.version}`,
      })
      .eq("id", review.id);
    if (error) return toast.error(error.message);
    toast.success(`Restored to v${v.version} (saved as new version)`);
    onChanged();
    loadVersions(review.id);
  };

  return (
    <Dialog open={!!review} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{review.code}</span>
            <span>{review.vendor_name}</span>
            <Badge variant="outline" className="font-mono gap-1">
              <GitBranch className="h-3 w-3" /> v{review.version}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab("details")}
            className={`px-3 py-2 text-sm border-b-2 ${tab === "details" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >Details</button>
          <button
            onClick={() => setTab("versions")}
            className={`px-3 py-2 text-sm border-b-2 flex items-center gap-1.5 ${tab === "versions" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            <History className="h-3.5 w-3.5" /> Version history
          </button>
        </div>

        {tab === "details" && (
          <div className="space-y-4 pt-2">
            {review.agreement_title && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Agreement</div>
                <div className="text-sm">{review.agreement_title}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                <Select value={status} onValueChange={updateStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Risk</div>
                {review.risk_band ? (
                  <Badge variant="outline" className={bandColor[review.risk_band] || ""}>
                    {review.risk_band}{review.risk_score ? ` · ${review.risk_score}` : ""}
                  </Badge>
                ) : <span className="text-sm text-muted-foreground">Not scored</span>}
              </div>
            </div>

            <div>
              <Label className="text-xs">Change note (saved with next version)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Updated SCC module, escalating to legal"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <FindingPill n={review.findings_critical} label="Critical" tone="destructive" />
              <FindingPill n={review.findings_high} label="High" tone="warning" />
              <FindingPill n={review.findings_medium} label="Medium" tone="warning" />
              <FindingPill n={review.findings_low} label="Low" tone="success" />
            </div>

            <Row label="Owner" value={review.owner_email} />
            <Row label="Reviewer" value={review.reviewer_email} />
            <Row label="Jurisdictions" value={review.jurisdictions.join(", ")} />
            <Row label="Regulations" value={review.regulations.join(", ")} />
            <Row label="Linked controls" value={review.linked_control_codes.join(", ")} />
            <Row label="Due" value={review.due_at ? format(new Date(review.due_at), "PPP") : null} />
            <Row label="Completed" value={review.completed_at ? format(new Date(review.completed_at), "PPP") : null} />
            {review.summary && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Summary</div>
                <div className="text-sm whitespace-pre-wrap">{review.summary}</div>
              </div>
            )}
          </div>
        )}

        {tab === "versions" && (
          <div className="pt-2">
            {vLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading history…</div>
            ) : versions.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No history yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVer(v)}
                      className={`w-full text-left rounded-md border p-3 hover:bg-muted/50 transition ${selectedVer?.id === v.id ? "border-primary bg-muted/40" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="font-mono gap-1">
                          <GitBranch className="h-3 w-3" /> v{v.version}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(v.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.changed_by_email || "system"}
                      </div>
                      {v.change_summary && (
                        <div className="text-xs mt-1 line-clamp-2">{v.change_summary}</div>
                      )}
                      <div className="flex gap-2 mt-2 text-[11px]">
                        <Badge variant="outline" className={statusVariant[v.snapshot?.status] || ""}>
                          {(v.snapshot?.status || "").replace("_", " ")}
                        </Badge>
                        {v.snapshot?.risk_band && (
                          <Badge variant="outline" className={bandColor[v.snapshot.risk_band] || ""}>
                            {v.snapshot.risk_band}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-md border p-3 max-h-[55vh] overflow-y-auto bg-muted/30">
                  {selectedVer ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-sm">Snapshot · v{selectedVer.version}</div>
                        {selectedVer.version !== review.version && (
                          <Button size="sm" variant="outline" onClick={() => restoreVersion(selectedVer)}>
                            Restore this version
                          </Button>
                        )}
                      </div>
                      <pre className="text-[11px] whitespace-pre-wrap break-words">
{JSON.stringify(selectedVer.snapshot, null, 2)}
                      </pre>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">Select a version to view its snapshot.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FindingPill({ n, label, tone }: { n: number; label: string; tone: "destructive" | "warning" | "success" }) {
  const cls =
    tone === "destructive" ? "bg-destructive/10 text-destructive" :
    tone === "warning" ? "bg-warning/15 text-warning" :
    "bg-success/15 text-success";
  return (
    <div className={`rounded-md p-3 ${cls}`}>
      <div className="text-xl font-semibold">{n}</div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm border-b py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
