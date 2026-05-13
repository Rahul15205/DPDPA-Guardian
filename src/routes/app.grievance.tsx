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
import { GRIEVANCE_DEFAULT_STAGES } from "@/lib/workflow-types";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/grievance")({ component: GrievancePage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_GRIEVANCES: Grievance[] = [
  {
    id: "g1", org_id: "demo", code: "GRV-2024-001", complainant_name: "Vikram Mehta", 
    complainant_email: "v.mehta@example.com", subject: "Inaccurate credit score data", 
    description: "My profile shows a default on a loan that I have already cleared. This is impacting my ability to get new credit.",
    status: "in_review", sla_due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    assigned_to: "Complaints Officer", priority: "high", category: "Data accuracy",
    tags: ["finance-impact", "legal-threat"], severity: "major", created_at: "2024-05-11T10:00:00Z",
    updated_at: "2024-05-12T14:30:00Z", internal_notes: "Checked with the credit team, they are looking into the record update latency.",
    resolution: null, closed_at: null, current_stage: "investigation"
  },
  {
    id: "g2", org_id: "demo", code: "GRV-2024-002", complainant_name: "Sneha Kapur", 
    complainant_email: "sneha.k@example.com", subject: "Unauthorized marketing calls", 
    description: "I am receiving marketing calls despite being on DND and withdrawing consent last month.",
    status: "escalated", sla_due_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    assigned_to: "DPO", priority: "urgent", category: "Unauthorised processing",
    tags: ["consent-violation"], severity: "critical", created_at: "2024-05-05T09:00:00Z",
    updated_at: "2024-05-10T09:00:00Z", internal_notes: "The marketing vendor's local database was not synced with our central DND list.",
    resolution: null, closed_at: null, current_stage: "escalation"
  },
  {
    id: "g3", org_id: "demo", code: "GRV-2024-003", complainant_name: "Arjun Rao", 
    complainant_email: "arjun.r@example.com", subject: "Difficulty in withdrawing consent", 
    description: "The 'Withdraw Consent' button in the mobile app is not working. It gives an error 404.",
    status: "resolved", sla_due_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    assigned_to: "Support Lead", priority: "normal", category: "Consent withdrawal",
    tags: ["tech-bug"], severity: "moderate", created_at: "2024-04-20T15:00:00Z",
    updated_at: "2024-05-01T16:45:00Z", internal_notes: "Fixed the broken API endpoint.",
    resolution: "The app bug has been fixed in v2.4.1. The user's consent has been manually withdrawn in the backend.", 
    closed_at: "2024-05-01T16:45:00Z", current_stage: "closed"
  }
];

type GStatus = "open" | "in_review" | "escalated" | "resolved" | "closed";
type Priority = "low" | "normal" | "high" | "urgent";

type Grievance = {
  id: string; org_id: string; code?: string | null; current_stage?: string | null;
  complainant_name: string; complainant_email: string;
  subject: string; description: string | null;
  status: GStatus; sla_due_at: string;
  assigned_to: string | null; priority: Priority;
  category: string | null; tags: string[] | null;
  severity?: string | null;
  internal_notes: string | null; resolution: string | null;
  closed_at: string | null; created_at: string; updated_at: string;
};

const STATUS_META: Record<GStatus, { label: string; tone: string }> = {
  open: { label: "Open", tone: "bg-blue-500/15 text-blue-600" },
  in_review: { label: "In review", tone: "bg-amber-500/15 text-amber-600" },
  escalated: { label: "Escalated", tone: "bg-rose-500/15 text-rose-600" },
  resolved: { label: "Resolved", tone: "bg-emerald-500/15 text-emerald-600" },
  closed: { label: "Closed", tone: "bg-secondary text-muted-foreground" },
};

const PRIO_META: Record<Priority, string> = {
  low: "bg-secondary text-muted-foreground",
  normal: "bg-sky-500/10 text-sky-600",
  high: "bg-amber-500/10 text-amber-600",
  urgent: "bg-rose-500/15 text-rose-600",
};

const CATEGORIES = ["Data accuracy", "Unauthorised processing", "Consent withdrawal", "Cross-border transfer", "Notice / transparency", "Security incident", "Other"];

function GrievancePage() {
  const { membership } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <div className="p-12 text-center text-muted-foreground"><Button variant="ghost" onClick={() => setOpenId(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><p className="mt-8">Grievance details active (Demo mode)</p></div>;
  return <GrievanceList onOpen={setOpenId} />;
}

function GrievanceList({ onOpen }: { onOpen: (id: string) => void }) {
  const [statusF, setStatusF] = useState("all");
  const [q, setQ] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["grievance-mock"],
    queryFn: async () => MOCK_GRIEVANCES,
  });

  const filtered = rows.filter((r) => {
    if (statusF !== "all" && r.status !== statusF) return false;
    if (q && !r.subject.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: rows.length,
    open: rows.filter((r) => !["resolved", "closed"].includes(r.status)).length,
    overdue: rows.filter((r) => !["resolved", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < Date.now()).length,
    high: rows.filter((r) => ["high", "urgent"].includes(r.priority) && !["resolved", "closed"].includes(r.status)).length,
  };

  return (
    <div className="px-8 py-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Grievance officer inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">DPDPA Redressal queue · {stats.total} complaints · {stats.overdue} overdue</p>
        </div>
        <div className="flex gap-2">
          <ModuleTour moduleKey="grievance" />
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New grievance</Button>
        </div>
      </header>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI icon={Inbox} label="Total" value={stats.total} />
        <KPI icon={Clock} label="Open" value={stats.open} tone="text-sky-600" />
        <KPI icon={AlertTriangle} label="High / Urgent" value={stats.high} tone="text-amber-600" />
        <KPI icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="text-rose-600" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, name..." className="pl-8" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_META) as GStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Complainant</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const overdue = !["resolved", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < Date.now();
              return (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group" onClick={() => onOpen(r.id)}>
                  <td className="px-4 py-4 font-mono text-[11px] font-semibold text-primary">{r.code}</td>
                  <td className="px-4 py-4 max-w-md"><div className="font-medium line-clamp-1">{r.subject}</div></td>
                  <td className="px-4 py-4">
                    <div className="text-xs font-medium">{r.complainant_name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.complainant_email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_META[r.status].tone}`}>
                      {STATUS_META[r.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium uppercase tracking-wider">
                     <Badge variant={r.priority === "urgent" ? "destructive" : "secondary"} className="text-[9px] h-4">{r.priority}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs ${overdue ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
                      {overdue ? "Overdue" : "On track"}
                    </span>
                  </td>
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
