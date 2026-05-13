import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, FileCheck2, ShieldAlert, Sparkles, Trash2, ArrowLeft, FileText, Edit3, Copy, Library, Lock, History, Download as DownloadIcon, Flame } from "lucide-react";
import { RiskMatrix } from "@/components/assessments/RiskMatrix";
import { RiskLegend } from "@/components/assessments/RiskLegend";
import { BANDS, Band, BAND_COLORS } from "@/lib/risk";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/assessments")({ component: AssessmentsPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_ASSESSMENTS: any[] = [
  {
    id: "a1", code: "ASMT-2024-001", name: "Cloud Infrastructure Security Review",
    type: "DPIA", category: "Governance & Accountability", status: "completed",
    inherent_band: "High", inherent_score: 16, residual_band: "Medium", residual_score: 9,
    template_name: "DPIA (Standard)", started_at: "2024-01-15T10:00:00Z", completed_at: "2024-02-01T14:30:00Z",
    current_stage: "published", owner_email: "security@demo.com", progress: 100
  },
  {
    id: "a2", code: "ASMT-2024-002", name: "HR Management System Migration",
    type: "DPIA", category: "Risk & Impact", status: "in_progress",
    inherent_band: "Critical", inherent_score: 25, residual_band: "High", residual_score: 12,
    template_name: "DPIA (Standard)", started_at: "2024-05-01T09:00:00Z", completed_at: null,
    current_stage: "review", owner_email: "hr@demo.com", progress: 65
  },
  {
    id: "a3", code: "ASMT-2024-003", name: "CCTV Surveillance Audit",
    type: "Privacy Audit", category: "Security & Technical", status: "completed",
    inherent_band: "Medium", inherent_score: 8, residual_band: "Low", residual_score: 4,
    template_name: "Privacy Audit Template", started_at: "2024-03-10T10:00:00Z", completed_at: "2024-03-25T11:00:00Z",
    current_stage: "published", owner_email: "admin@demo.com", progress: 100
  },
  {
    id: "a4", code: "ASMT-2024-004", name: "Mobile App Biometric Integration",
    type: "DPIA", category: "Data Discovery & Mapping", status: "in_progress",
    inherent_band: "High", inherent_score: 20, residual_band: "High", residual_score: 16,
    template_name: "DPIA (Standard)", started_at: "2024-05-10T14:00:00Z", completed_at: null,
    current_stage: "draft", owner_email: "dev@demo.com", progress: 20
  }
];

const MOCK_TEMPLATES: any[] = [
  { id: "t1", name: "DPIA (Standard)", type: "DPIA", category: "Risk & Impact", is_builtin: true, version: 1.2, description: "Standard Data Protection Impact Assessment as per Art 35 GDPR / Sec 10 DPDPA.", regulation_tags: ["GDPR", "DPDPA"], sections: [{ questions: [{}, {}, {}, {}] }] },
  { id: "t2", name: "Privacy Audit Template", type: "Audit", category: "Monitoring, Audit & Compliance", is_builtin: true, version: 1.0, description: "Comprehensive privacy audit against internal policies.", regulation_tags: ["ISO 27001", "DPDPA"], sections: [{ questions: [{}, {}, {}] }] },
  { id: "t3", name: "Vendor Security Assessment", type: "VSA", category: "Third-Party & Vendor", is_builtin: true, version: 2.1, description: "Assess third-party vendors for data security practices.", regulation_tags: ["NIST", "SOC2"], sections: [{ questions: [{}, {}, {}, {}, {}] }] }
];

const MOCK_RISKS: any[] = [
  { id: "rk1", title: "Unauthorized access to sensitive personal data", likelihood: 4, impact: 4, score: 16, band: "High", status: "open", assessment_id: "a1" },
  { id: "rk2", title: "Inadequate data retention policy for backups", likelihood: 3, impact: 3, score: 9, band: "Medium", status: "mitigated", assessment_id: "a1" },
  { id: "rk3", title: "Missing cross-border transfer mechanisms", likelihood: 5, impact: 4, score: 20, band: "High", status: "open", assessment_id: "a2" },
  { id: "rk4", title: "Lack of consent withdrawal logging", likelihood: 2, impact: 2, score: 4, band: "Low", status: "closed", assessment_id: "a3" }
];

const CATEGORY_ORDER = [
  "Governance & Accountability",
  "Data Discovery & Mapping",
  "Legal Basis & Processing",
  "Risk & Impact",
  "Cross-Border & Transfer",
  "Third-Party & Vendor",
  "Security & Technical",
  "Monitoring, Audit & Compliance"
];

function AssessmentsPage() {
  const { membership } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <div className="p-12 text-center text-muted-foreground"><Button variant="ghost" onClick={() => setOpenId(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><p className="mt-8">Assessment runner active (Demo mode)</p></div>;
  return <AssessmentsList canEdit={true} onOpen={setOpenId} />;
}

function AssessmentsList({ canEdit, onOpen }: { canEdit: boolean; onOpen: (id: string) => void }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bandFilter, setBandFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments-mock"],
    queryFn: async () => MOCK_ASSESSMENTS,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-mock"],
    queryFn: async () => MOCK_TEMPLATES,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["risks-mock"],
    queryFn: async () => MOCK_RISKS,
  });

  const filtered = assessments.filter((a: any) => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (bandFilter !== "all" && a.residual_band !== bandFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: assessments.length,
    inProg: assessments.filter((a: any) => a.status === "in_progress").length,
    done: assessments.filter((a: any) => a.status === "completed").length,
    critical: risks.filter((r: any) => r.band === "High" || r.band === "Critical").length,
  };

  return (
    <div className="px-8 py-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DPIA / PIA register · {stats.total} assessments · {stats.critical} high/critical risks identified
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="assessments" />
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New assessment</Button>
        </div>
      </header>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI icon={FileText} label="Total" value={stats.total} />
        <KPI icon={Edit3} label="In progress" value={stats.inProg} tone="text-amber-600" />
        <KPI icon={FileCheck2} label="Completed" value={stats.done} tone="text-emerald-600" />
        <KPI icon={Flame} label="High risks" value={stats.critical} tone="text-rose-600" />
      </div>

      <Tabs defaultValue="active" className="mt-6">
        <TabsList className="bg-card border p-1 rounded-lg">
          <TabsTrigger value="active">Register</TabsTrigger>
          <TabsTrigger value="templates"><Library className="mr-1 h-3.5 w-3.5" /> Library ({templates.length})</TabsTrigger>
          <TabsTrigger value="risks"><ShieldAlert className="mr-1 h-3.5 w-3.5" /> Risk register ({risks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search assessments…" className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORY_ORDER.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Assessment</th>
                  <th className="px-4 py-3 text-left">Residual Risk</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group" onClick={() => onOpen(a.id)}>
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-primary">{a.code}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{a.template_name}</div>
                    </td>
                    <td className="px-4 py-4">
                       <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${BAND_COLORS[a.residual_band as Band] ?? ""}`}>
                        {a.residual_band} ({a.residual_score})
                       </span>
                    </td>
                    <td className="px-4 py-4">
                       <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${a.status === "completed" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                        {a.status.replace("_", " ")}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium">{a.owner_email}</td>
                    <td className="px-4 py-4 text-right">
                       <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
             {templates.map((t: any) => (
               <div key={t.id} className="rounded-xl border p-4 bg-card shadow-sm hover:border-primary/40 transition-all cursor-pointer">
                 <div className="flex justify-between items-start">
                   <Badge variant="secondary" className="text-[9px]">v{t.version}</Badge>
                   <div className="flex gap-1">{t.regulation_tags.map((r: any) => <span key={r} className="text-[9px] font-bold text-primary">{r}</span>)}</div>
                 </div>
                 <h3 className="mt-2 font-bold text-sm">{t.name}</h3>
                 <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                 <Button size="sm" variant="ghost" className="mt-4 w-full h-8 text-xs border">Start Assessment</Button>
               </div>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
           <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
             <table className="w-full text-sm">
               <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                 <tr>
                   <th className="px-4 py-3 text-left">Risk Title</th>
                   <th className="px-4 py-3 text-left">Score</th>
                   <th className="px-4 py-3 text-left">Band</th>
                   <th className="px-4 py-3 text-left">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {risks.map((r: any) => (
                   <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                     <td className="px-4 py-4 font-medium">{r.title}</td>
                     <td className="px-4 py-4 font-bold">{r.score}</td>
                     <td className="px-4 py-4">
                       <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${BAND_COLORS[r.band as Band] ?? ""}`}>
                        {r.band}
                       </span>
                     </td>
                     <td className="px-4 py-4 text-xs uppercase font-medium">{r.status}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>
      </Tabs>
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
