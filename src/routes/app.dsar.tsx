import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ArrowLeft, Inbox, Clock, AlertTriangle, CheckCircle2, Search, Tag } from "lucide-react";
import { StageBar } from "@/components/workflow/StageBar";
import { WorkflowLegend } from "@/components/workflow/WorkflowLegend";
import { SLAClock } from "@/components/workflow/SLAClock";
import { CommentThread, type Comment } from "@/components/workflow/CommentThread";
import { DSAR_DEFAULT_STAGES } from "@/lib/workflow-types";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/dsar")({ component: DSARPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_DSARS: DSAR[] = [
  {
    id: "d1", org_id: "demo", code: "DSAR-2024-001", requester_name: "Rahul Sharma", 
    requester_email: "rahul.s@example.com", request_type: "access", 
    description: "I would like to receive a copy of all my personal data held by your organization, including transaction history and support chat logs.",
    status: "in_progress", sla_due_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    assigned_to: "DPO Team", source: "Public Portal", priority: "high", category: "Full Access",
    tags: ["vip", "high-volume"], created_at: "2024-05-10T10:00:00Z", updated_at: "2024-05-12T14:30:00Z",
    internal_notes: "Requester has been a premium customer for 5 years.", resolution: null, closed_at: null,
    current_stage: "processing", verification_status: "verified", verified_at: "2024-05-10T11:00:00Z"
  },
  {
    id: "d2", org_id: "demo", code: "DSAR-2024-002", requester_name: "Anita Desai", 
    requester_email: "anita.d@example.com", request_type: "erasure", 
    description: "Please delete my account and all associated personal information from your servers.",
    status: "in_review", sla_due_at: new Date(Date.now() + 15 * 86400000).toISOString(),
    assigned_to: "Legal Dept", source: "Email", priority: "urgent", category: "Account Deletion",
    tags: ["escalated"], created_at: "2024-05-11T09:00:00Z", updated_at: "2024-05-11T09:00:00Z",
    internal_notes: "Pending confirmation from finance team regarding outstanding dues.", resolution: null, closed_at: null,
    current_stage: "verification", verification_status: "pending", verified_at: null
  },
  {
    id: "d3", org_id: "demo", code: "DSAR-2024-003", requester_name: "Michael Smith", 
    requester_email: "m.smith@example.com", request_type: "portability", 
    description: "I need my data in a machine-readable format to move to another provider.",
    status: "completed", sla_due_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    assigned_to: "IT Ops", source: "Public Portal", priority: "normal", category: "Data Export",
    tags: [], created_at: "2024-04-15T15:00:00Z", updated_at: "2024-05-01T16:45:00Z",
    internal_notes: "JSON export provided via secure link.", resolution: "Fulfilled via data export tool.", closed_at: "2024-05-01T16:45:00Z",
    current_stage: "completed", verification_status: "verified", verified_at: "2024-04-15T15:30:00Z"
  },
  {
    id: "d4", org_id: "demo", code: "DSAR-2024-004", requester_name: "Priya Patel", 
    requester_email: "p.patel@example.com", request_type: "withdraw_consent", 
    description: "Stop using my data for personalized advertising. I withdraw my consent.",
    status: "new", sla_due_at: new Date(Date.now() + 28 * 86400000).toISOString(),
    assigned_to: null, source: "App Settings", priority: "normal", category: "Marketing Opt-out",
    tags: ["automated-intake"], created_at: "2024-05-13T08:00:00Z", updated_at: "2024-05-13T08:00:00Z",
    internal_notes: null, resolution: null, closed_at: null,
    current_stage: "intake", verification_status: "verified", verified_at: "2024-05-13T08:00:00Z"
  }
];

type DType = "access" | "correction" | "erasure" | "portability" | "withdraw_consent" | "nomination" | "grievance" | "other";
type DStatus = "new" | "in_review" | "in_progress" | "completed" | "rejected" | "closed";
type Priority = "low" | "normal" | "high" | "urgent";

type DSAR = {
  id: string; org_id: string; code?: string | null; current_stage?: string | null;
  requester_name: string; requester_email: string;
  request_type: DType; description: string | null; status: DStatus;
  sla_due_at: string; assigned_to: string | null; source: string | null;
  priority: Priority; category: string | null; tags: string[] | null;
  internal_notes: string | null; resolution: string | null;
  closed_at: string | null; created_at: string; updated_at: string;
  verification_status?: string; verified_at?: string | null;
};

const TYPE_META: Record<DType, { label: string; tone: string }> = {
  access: { label: "Access", tone: "bg-sky-500/10 text-sky-600" },
  correction: { label: "Correction", tone: "bg-violet-500/10 text-violet-600" },
  erasure: { label: "Erasure", tone: "bg-rose-500/10 text-rose-600" },
  portability: { label: "Portability", tone: "bg-emerald-500/10 text-emerald-600" },
  withdraw_consent: { label: "Withdraw consent", tone: "bg-orange-500/10 text-orange-600" },
  nomination: { label: "Nominee", tone: "bg-indigo-500/10 text-indigo-600" },
  grievance: { label: "Grievance", tone: "bg-amber-500/10 text-amber-600" },
  other: { label: "Other", tone: "bg-secondary text-muted-foreground" },
};

const STATUS_META: Record<DStatus, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-blue-500/15 text-blue-600" },
  in_review: { label: "In review / verifying", tone: "bg-amber-500/15 text-amber-600" },
  in_progress: { label: "In progress", tone: "bg-sky-500/15 text-sky-600" },
  completed: { label: "Completed", tone: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Rejected", tone: "bg-rose-500/15 text-rose-600" },
  closed: { label: "Closed", tone: "bg-secondary text-muted-foreground" },
};

const PRIO_META: Record<Priority, string> = {
  low: "bg-secondary text-muted-foreground",
  normal: "bg-sky-500/10 text-sky-600",
  high: "bg-amber-500/10 text-amber-600",
  urgent: "bg-rose-500/15 text-rose-600",
};

function DSARPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const canEdit = ["admin", "dpo", "analyst"].includes(membership?.role ?? "");
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <div className="p-12 text-center text-muted-foreground"><Button variant="ghost" onClick={() => setOpenId(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><p className="mt-8">DSAR details active (Demo mode)</p></div>;
  return <DSARList canEdit={canEdit} onOpen={setOpenId} />;
}

function DSARList({ canEdit, onOpen }: { canEdit: boolean; onOpen: (id: string) => void }) {
  const [statusF, setStatusF] = useState<string>("all");
  const [typeF, setTypeF] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["dsar-mock"],
    queryFn: async () => MOCK_DSARS,
  });

  const filtered = rows.filter((r) => {
    if (statusF !== "all" && r.status !== statusF) return false;
    if (typeF !== "all" && r.request_type !== typeF) return false;
    if (q && !r.requester_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: rows.length,
    open: rows.filter((r) => !["completed", "rejected", "closed"].includes(r.status)).length,
    overdue: rows.filter((r) => !["completed", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < Date.now()).length,
    dueSoon: rows.filter((r) => !["completed", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() - Date.now() < 7 * 86400000).length,
  };

  return (
    <div className="px-8 py-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Data subject requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">DPDPA / GDPR DSAR queue · {stats.total} requests · {stats.overdue} overdue</p>
        </div>
        <div className="flex gap-2">
          <ModuleTour moduleKey="dsar" />
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New request</Button>
        </div>
      </header>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI icon={Inbox} label="Total" value={stats.total} />
        <KPI icon={Clock} label="Open" value={stats.open} tone="text-sky-600" />
        <KPI icon={AlertTriangle} label="Due ≤ 7 days" value={stats.dueSoon} tone="text-amber-600" />
        <KPI icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="text-rose-600" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email..." className="pl-8" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_META) as DStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Requester</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">SLA</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const overdue = !["completed", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < Date.now();
              return (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group" onClick={() => onOpen(r.id)}>
                  <td className="px-4 py-4 font-mono text-[11px] font-semibold text-primary">{r.code}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{r.requester_name}</div>
                    <div className="text-xs text-muted-foreground">{r.requester_email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${TYPE_META[r.request_type]?.tone}`}>
                      {TYPE_META[r.request_type]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_META[r.status].tone}`}>
                      {STATUS_META[r.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs ${overdue ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
                      {overdue ? "Overdue" : "On track"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
