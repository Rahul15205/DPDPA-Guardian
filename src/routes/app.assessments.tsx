import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, FileCheck2, ShieldAlert, Sparkles, Trash2, ArrowLeft, ListChecks, FileText, Edit3, Copy, Flame, Library, Lock, Unlock, History, Download as DownloadIcon, GitBranch, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RiskMatrix } from "@/components/assessments/RiskMatrix";
import { EvidenceUploader, type Attachment } from "@/components/assessments/EvidenceUploader";
import { RiskLegend } from "@/components/assessments/RiskLegend";
import { WorkflowLegend } from "@/components/assessments/WorkflowLegend";
import { BANDS, Band, bandFromScore, BAND_COLORS, weightedAggregate } from "@/lib/risk";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/assessments")({ component: AssessmentsPage });

type QuestionType = "text" | "long_text" | "choice" | "multi_choice" | "dropdown" | "yes_no" | "number" | "risk" | "likelihood_impact" | "file";
type Question = {
  key: string;
  text: string;
  type: QuestionType;
  options?: string[];
  weight?: number;
  required?: boolean;
  mandatory_evidence?: boolean;
  show_if?: { question_key: string; equals: string };
};
type Section = { title: string; questions: Question[] };
type WorkflowStage = {
  key: string;
  label: string;
  roles?: string[];
  sla_hours?: number;
  parallel?: boolean;
  escalate_to?: string;
};
type UseCase = { key: string; title: string; description: string; prefill?: Record<string, unknown> };

type Template = {
  id: string;
  org_id: string | null;
  name: string;
  type: string;
  category: string | null;
  category_code?: string | null;
  description: string | null;
  sections: Section[];
  is_builtin: boolean;
  version: number;
  parent_id?: string | null;
  locked?: boolean;
  workflow_stages?: WorkflowStage[];
  regulation_tags?: string[];
  use_cases?: UseCase[];
  integration_map?: { ropa?: boolean; vendors?: boolean; controls?: string[] };
  scoring_config?: Record<string, unknown>;
};

type Assessment = {
  id: string;
  org_id: string;
  code?: string | null;
  type: string;
  name: string;
  scope: string | null;
  status: string;
  score: number | null;
  risk_level: string | null;
  template_id: string | null;
  template_name: string | null;
  category: string | null;
  use_case_key: string | null;
  started_at: string | null;
  completed_at: string | null;
  current_stage?: string | null;
  reviewer_email?: string | null;
  approver_email?: string | null;
  owner_email?: string | null;
  due_at?: string | null;
  tags?: string[] | null;
  progress?: number | null;
  linked_ropa_ids?: string[] | null;
  linked_vendor_ids?: string[] | null;
  linked_control_codes?: string[] | null;
  regulation_tags?: string[] | null;
  cia_confidentiality?: number | null;
  cia_integrity?: number | null;
  cia_availability?: number | null;
  inherent_likelihood?: number | null; inherent_impact?: number | null; inherent_score?: number | null; inherent_band?: string | null;
  residual_likelihood?: number | null; residual_impact?: number | null; residual_score?: number | null; residual_band?: string | null;
};

type ResponseRow = {
  id: string;
  assessment_id: string;
  question_key: string;
  question_text: string | null;
  answer: string | null;
  risk_level: string | null;
  notes: string | null;
  likelihood: number | null;
  impact: number | null;
  score: number | null;
  band: string | null;
  weight: number | null;
  attachments: Attachment[] | null;
  mandatory_evidence?: boolean | null;
  reviewer_comment?: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  actor: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type RiskRow = {
  id: string;
  org_id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  likelihood: number; impact: number; score: number; band: string;
  status: string;
  owner_email: string | null;
  mitigation_plan: string | null;
  control_id: string | null;
  created_at: string;
};

const DEFAULT_STAGES: WorkflowStage[] = [
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "approval", label: "Approval" },
  { key: "published", label: "Published" },
];

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-500/15 text-amber-600",
  completed: "bg-emerald-500/15 text-emerald-600",
  archived: "bg-secondary text-muted-foreground",
};

const CATEGORY_ORDER = [
  "Governance & Accountability",
  "Data Discovery & Mapping",
  "Legal Basis & Processing",
  "Risk & Impact",
  "Cross-Border & Transfer",
  "Third-Party & Vendor",
  "Security & Technical",
  "Data Lifecycle & Handling",
  "Data Subject Rights",
  "Breach & Incident",
  "Monitoring, Audit & Compliance",
  "Emerging & Advanced",
];

function AssessmentsPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const canEdit = ["admin", "dpo", "analyst"].includes(membership?.role ?? "");
  const [openId, setOpenId] = useState<string | null>(null);

  if (!orgId) return null;
  if (openId) return <AssessmentRunner id={openId} canEdit={canEdit} orgId={orgId} onBack={() => setOpenId(null)} />;
  return <AssessmentsList orgId={orgId} canEdit={canEdit} onOpen={setOpenId} />;
}

function AssessmentsList({ orgId, canEdit, onOpen }: { orgId: string; canEdit: boolean; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bandFilter, setBandFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [presetTpl, setPresetTpl] = useState<Template | null>(null);

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*").eq("org_id", orgId).order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Assessment[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["assessment-templates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_templates").select("*").or(`is_builtin.eq.true,org_id.eq.${orgId}`).order("category").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["assessment-risks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_risks").select("*").eq("org_id", orgId).order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RiskRow[];
    },
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessments", orgId] }); toast.success("Archived"); },
  });

  const clone = useMutation({
    mutationFn: async (a: Assessment) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { data: na, error } = await supabase.from("assessments").insert({
        org_id: orgId, type: a.type, name: `${a.name} (copy)`, scope: a.scope,
        status: "draft", template_id: a.template_id, template_name: a.template_name,
        category: a.category, parent_id: a.id, version: 1, created_by: uid, started_at: new Date().toISOString(),
      } as never).select("id").single();
      if (error) throw error;
      return na.id as string;
    },
    onSuccess: (id) => { qc.invalidateQueries({ queryKey: ["assessments", orgId] }); toast.success("Cloned"); onOpen(id); },
  });

  const filtered = assessments.filter((a) => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (bandFilter !== "all" && (a.residual_band ?? a.inherent_band ?? a.risk_level) !== bandFilter) return false;
    if (search && !`${a.code ?? ""} ${a.name} ${a.scope ?? ""} ${a.template_name ?? ""} ${a.owner_email ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCsv = () => {
    const rows = [
      ["Code", "Name", "Category", "Status", "Stage", "Owner", "Inherent", "Residual", "Score", "Started"],
      ...filtered.map((a) => [
        a.code ?? "", a.name, a.category ?? "", a.status, a.current_stage ?? "",
        a.owner_email ?? "", a.inherent_band ?? "", a.residual_band ?? "",
        String(a.residual_score ?? a.inherent_score ?? ""), a.started_at ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `assessments-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => ({
    total: assessments.length,
    inProg: assessments.filter((a) => a.status === "in_progress").length,
    done: assessments.filter((a) => a.status === "completed").length,
    critical: risks.filter((r) => r.band === "Critical" || r.band === "High").length,
  }), [assessments, risks]);

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            12 categories · {templates.filter(t => t.is_builtin).length} built-in templates · 5×5 risk methodology · evidence, workflow & risk register integrated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="assessments" />
          <DownloadReportButton
            moduleLabel="Assessments"
            filenameBase="assessments"
            rows={filtered.map((a) => ({
              code: a.code, name: a.name, type: a.type, status: a.status,
              stage: a.current_stage, owner_email: a.owner_email,
              inherent_band: a.inherent_band, inherent_score: a.inherent_score,
              residual_band: a.residual_band, residual_score: a.residual_score,
              progress: a.progress, due_at: a.due_at,
            }))}
            summary={[
              { label: "Total", value: stats.total },
              { label: "In progress", value: stats.inProg },
              { label: "Completed", value: stats.done },
              { label: "High/Critical risks", value: stats.critical },
            ]}
          />
          {canEdit && (
            <Dialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) setPresetTpl(null); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New assessment</Button>
              </DialogTrigger>
              <NewAssessmentDialog templates={templates} orgId={orgId} preset={presetTpl} onCreated={(id) => { setNewOpen(false); setPresetTpl(null); onOpen(id); }} />
            </Dialog>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI icon={FileText} label="Total" value={stats.total} />
        <KPI icon={Edit3} label="In progress" value={stats.inProg} tone="text-amber-600" />
        <KPI icon={FileCheck2} label="Completed" value={stats.done} tone="text-emerald-600" />
        <KPI icon={Flame} label="High/Critical risks" value={stats.critical} tone="text-rose-600" />
      </div>

      <Tabs defaultValue="active" className="mt-6">
        <TabsList>
          <TabsTrigger value="active">Assessments</TabsTrigger>
          <TabsTrigger value="templates"><Library className="mr-1 h-3.5 w-3.5" /> Template library ({templates.length})</TabsTrigger>
          <TabsTrigger value="risks"><Flame className="mr-1 h-3.5 w-3.5" /> Risk register ({risks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Input placeholder="Search ID, name, owner…" className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bandFilter} onValueChange={setBandFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk bands</SelectItem>
                {BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}><DownloadIcon className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Assessment ID</th>
                  <th className="px-4 py-3 text-left">Assessment</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Inherent</th>
                  <th className="px-4 py-3 text-left">Residual</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No assessments. Pick a template from the library to get started.</td></tr>
                )}
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => onOpen(a.id)}>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-primary">{a.code ?? "—"}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{a.template_name ?? a.scope ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{a.category ?? "—"}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">{a.current_stage ?? "draft"}</td>
                    <td className="px-4 py-3">{a.inherent_band ? <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${BAND_COLORS[a.inherent_band as Band] ?? ""}`}>{a.inherent_band} ({a.inherent_score})</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">{a.residual_band ? <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${BAND_COLORS[a.residual_band as Band] ?? ""}`}>{a.residual_band} ({a.residual_score})</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_TONE[a.status] ?? STATUS_TONE.draft}`}>{a.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clone.mutate(a)}><Copy className="h-3.5 w-3.5" /></Button>
                          {a.status !== "archived" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive assessment?</AlertDialogTitle>
                                  <AlertDialogDescription>"{a.name}" will be moved to archived.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => archive.mutate(a.id)}>Archive</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplateLibrary templates={templates} orgId={orgId} canEdit={canEdit} onStart={(t) => { setPresetTpl(t); setNewOpen(true); }} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <RiskRegister orgId={orgId} risks={risks} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function TemplateLibrary({ templates, orgId, canEdit, onStart }: { templates: Template[]; orgId: string; canEdit: boolean; onStart: (t: Template) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessment_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessment-templates", orgId] }); toast.success("Template deleted"); },
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Template[]>();
    [...CATEGORY_ORDER, "Custom"].forEach((c) => m.set(c, []));
    templates.forEach((t) => {
      const cat = t.is_builtin ? (t.category ?? "Uncategorized") : "Custom";
      const arr = m.get(cat) ?? [];
      if (!search || `${t.name} ${(t.regulation_tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase())) arr.push(t);
      m.set(cat, arr);
    });
    return Array.from(m.entries()).filter(([, arr]) => arr.length > 0);
  }, [templates, search]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Input placeholder="Search templates or regulations…" className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" /> Custom template</Button>
            </DialogTrigger>
            <TemplateDialog key={editing?.id ?? "new"} initial={editing} orgId={orgId} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["assessment-templates", orgId] }); }} />
          </Dialog>
        )}
      </div>
      <div className="space-y-6">
        {grouped.map(([category, items]) => (
          <section key={category}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{category} <span className="font-normal">· {items.length}</span></h3>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        {t.is_builtin ? <Badge variant="secondary" className="text-[10px]">Built-in v{t.version}</Badge> : <Badge className="text-[10px]">Custom</Badge>}
                        {(t.regulation_tags ?? []).slice(0, 4).map((r) => (
                          <span key={r} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{r}</span>
                        ))}
                      </div>
                      <div className="mt-2 font-medium">{t.name}</div>
                      {t.description && <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>}
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {t.sections.length} sections · {t.sections.reduce((n, s) => n + s.questions.length, 0)} questions · {(t.use_cases ?? []).length} use cases
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {canEdit && <Button size="sm" onClick={() => onStart(t)}>Start</Button>}
                      {!t.is_builtin && canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete template?</AlertDialogTitle>
                                <AlertDialogDescription>Existing assessments using this template are unaffected.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove.mutate(t.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function NewAssessmentDialog({ templates, orgId, preset, onCreated }: { templates: Template[]; orgId: string; preset: Template | null; onCreated: (id: string) => void }) {
  const [tplId, setTplId] = useState<string>(preset?.id ?? "");
  const [useCaseKey, setUseCaseKey] = useState<string>("");
  const [name, setName] = useState(preset?.name ? `${preset.name} — ${new Date().toLocaleDateString()}` : "");
  const [scope, setScope] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const tpl = templates.find((t) => t.id === tplId) ?? preset;

  const create = async () => {
    if (!tpl || !name.trim()) { toast.error("Pick a template and enter a name"); return; }
    setSaving(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const useCase = (tpl.use_cases ?? []).find((u) => u.key === useCaseKey);
      const { data, error } = await supabase.from("assessments").insert({
        org_id: orgId, type: tpl.type, name, scope: scope || useCase?.description || null,
        status: "in_progress", template_id: tpl.id, template_name: tpl.name,
        category: tpl.category, use_case_key: useCaseKey || null,
        owner_email: ownerEmail || null, reviewer_email: reviewerEmail || null, approver_email: approverEmail || null,
        due_at: dueAt || null,
        current_stage: "draft",
        created_by: uid, started_at: new Date().toISOString(),
      } as never).select("id").single();
      if (error) throw error;
      const rows = tpl.sections.flatMap((s) => s.questions.map((q) => ({
        assessment_id: data.id, question_key: q.key, question_text: q.text, weight: q.weight ?? 1,
      })));
      if (rows.length) await supabase.from("assessment_responses").insert(rows);
      toast.success("Assessment created");
      onCreated(data.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New assessment</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        {!preset && (
          <div>
            <Label>Template</Label>
            <Select value={tplId} onValueChange={setTplId}>
              <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{(t.category ? `[${t.category}] ` : "") + t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {tpl && (tpl.use_cases ?? []).length > 0 && (
          <div>
            <Label>Use-case scenario (optional)</Label>
            <div className="mt-2 grid gap-2">
              {(tpl.use_cases ?? []).map((u) => {
                const active = useCaseKey === u.key;
                return (
                  <button key={u.key} type="button" onClick={() => setUseCaseKey(active ? "" : u.key)}
                    className={`text-left rounded-lg border p-2.5 transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="text-sm font-medium">{u.title}</div>
                    <div className="text-[11px] text-muted-foreground">{u.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CRM rollout DPIA" /></div>
        <div><Label>Scope</Label><Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="What is being assessed?" /></div>
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>Owner email</Label><Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></div>
          <div><Label>Reviewer email</Label><Input type="email" value={reviewerEmail} onChange={(e) => setReviewerEmail(e.target.value)} /></div>
          <div><Label>Approver email</Label><Input type="email" value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} /></div>
        </div>
        <div><Label>Due date</Label><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={create} disabled={saving || !tpl || !name.trim()}>{saving ? "Creating…" : "Create & start"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AssessmentRunner({ id, canEdit, orgId, onBack }: { id: string; canEdit: boolean; orgId: string; onBack: () => void }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const [{ data: a }, { data: r }, { data: rk }, { data: au }] = await Promise.all([
        supabase.from("assessments").select("*").eq("id", id).single(),
        supabase.from("assessment_responses").select("*").eq("assessment_id", id),
        supabase.from("assessment_risks").select("*").eq("assessment_id", id).order("score", { ascending: false }),
        supabase.from("assessment_audit").select("*").eq("assessment_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      let template: Template | null = null;
      if (a?.template_id) {
        const { data: t } = await supabase.from("assessment_templates").select("*").eq("id", a.template_id).single();
        template = t as unknown as Template | null;
      }
      return {
        a: a as unknown as Assessment,
        responses: (r ?? []) as unknown as ResponseRow[],
        template,
        risks: (rk ?? []) as unknown as RiskRow[],
        audit: (au ?? []) as unknown as AuditRow[],
      };
    },
  });

  const saveAnswer = useMutation({
    mutationFn: async (vars: Partial<ResponseRow> & { question_key: string; question_text: string }) => {
      const existing = data?.responses.find((x) => x.question_key === vars.question_key);
      const payload: Record<string, unknown> = {
        answer: vars.answer ?? existing?.answer ?? null,
        risk_level: vars.risk_level ?? existing?.risk_level ?? null,
        notes: vars.notes ?? existing?.notes ?? null,
        likelihood: vars.likelihood ?? existing?.likelihood ?? null,
        impact: vars.impact ?? existing?.impact ?? null,
        score: vars.score ?? existing?.score ?? null,
        band: vars.band ?? existing?.band ?? null,
        attachments: vars.attachments ?? existing?.attachments ?? [],
      };
      if (existing) {
        const { error } = await supabase.from("assessment_responses").update(payload as never).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assessment_responses").insert({ assessment_id: id, question_key: vars.question_key, question_text: vars.question_text, ...payload } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment", id] }),
  });

  const recompute = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const liResponses = data.responses.filter((r) => r.likelihood && r.impact);
      const inh = weightedAggregate(liResponses.map((r) => ({ likelihood: r.likelihood, impact: r.impact, weight: r.weight ?? 1 })));
      // residual = inherent if no separate residual provided
      const { error } = await supabase.from("assessments").update({
        inherent_likelihood: inh.likelihood, inherent_impact: inh.impact, inherent_score: inh.score, inherent_band: inh.band,
        residual_likelihood: inh.likelihood, residual_impact: inh.impact, residual_score: inh.score, residual_band: inh.band,
        risk_level: inh.band, score: inh.score,
      } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment", id] }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessments").update({ status: "completed", completed_at: new Date().toISOString(), current_stage: "published" } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessment", id] }); qc.invalidateQueries({ queryKey: ["assessments"] }); toast.success("Assessment completed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRisk = useMutation({
    mutationFn: async (r: { title: string; likelihood: number; impact: number; description?: string }) => {
      const sc = r.likelihood * r.impact;
      const band = bandFromScore(sc);
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("assessment_risks").insert({
        org_id: orgId, assessment_id: id, title: r.title, description: r.description ?? null,
        likelihood: r.likelihood, impact: r.impact, score: sc, band, status: "open", created_by: uid,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessment", id] }); qc.invalidateQueries({ queryKey: ["assessment-risks", orgId] }); toast.success("Risk added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkSuggestedControls = useMutation({
    mutationFn: async () => {
      const codes = data?.template?.integration_map?.controls ?? [];
      if (!codes.length) return 0;
      const { data: ctls } = await supabase.from("controls").select("id, code").in("code", codes);
      if (!ctls?.length) return 0;
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const rows = ctls.map((c) => ({ org_id: orgId, control_id: c.id, status: "in_progress" as const, updated_by: uid }));
      const { error } = await supabase.from("control_responses").upsert(rows as never, { onConflict: "org_id,control_id" });
      if (error) throw error;
      return ctls.length;
    },
    onSuccess: (n) => toast.success(`Linked ${n} controls — set to In progress`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="px-8 py-8 text-sm text-muted-foreground">Loading assessment…</div>;
  const { a, responses, template, risks, audit } = data;
  const respMap = new Map(responses.map((r) => [r.question_key, r]));
  const totalQ = template?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  const answered = template?.sections.reduce((n, s) => n + s.questions.filter((q) => {
    const r = respMap.get(q.key);
    return r && (r.answer || r.risk_level || r.likelihood);
  }).length, 0) ?? 0;
  const progress = totalQ ? Math.round((answered / totalQ) * 100) : 0;
  const editable = canEdit && a.status !== "completed" && a.status !== "archived";

  return (
    <div className="px-8 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assessments
      </button>
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {a.code && <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">{a.code}</span>}
              {a.category && <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>}
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_TONE[a.status] ?? STATUS_TONE.draft}`}>{a.status.replace("_", " ")}</span>
              {a.inherent_band && <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${BAND_COLORS[a.inherent_band as Band] ?? ""}`}>Inherent: {a.inherent_band} ({a.inherent_score})</span>}
              {a.residual_band && <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${BAND_COLORS[a.residual_band as Band] ?? ""}`}>Residual: {a.residual_band} ({a.residual_score})</span>}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold">{a.name}</h1>
            {a.scope && <p className="mt-1 text-sm text-muted-foreground">{a.scope}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Template: {a.template_name} · v{template?.version ?? 1}{template?.locked && <span className="ml-1 inline-flex items-center gap-0.5"><Lock className="h-3 w-3" /> locked</span>}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="font-display text-2xl font-semibold">{progress}%</div>
            <div className="text-[11px] text-muted-foreground">{answered}/{totalQ} answered</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <WorkflowBar assessment={a} stages={(template?.workflow_stages?.length ? template.workflow_stages : DEFAULT_STAGES)} canEdit={editable} />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          {!template && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Template no longer available.</div>}

          {template && template.sections.map((section, si) => (
            <section key={si} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-5">
                {section.questions.map((q) => {
                  if (q.show_if) {
                    const dep = respMap.get(q.show_if.question_key);
                    if ((dep?.answer ?? "") !== q.show_if.equals) return null;
                  }
                  const r = respMap.get(q.key);
                  return (
                    <div key={q.key} className="border-b border-border/50 pb-4 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <Label className="text-sm">
                          {q.text}
                          {q.required && <span className="ml-1 text-rose-600">*</span>}
                          {q.weight && q.weight > 1 && <span className="ml-1 text-[10px] text-muted-foreground">(weight {q.weight})</span>}
                        </Label>
                      </div>
                      <div className="mt-2 space-y-2">
                        {q.type === "text" && <Input defaultValue={r?.answer ?? ""} disabled={!editable} onBlur={(e) => e.target.value !== (r?.answer ?? "") && saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: e.target.value })} />}
                        {q.type === "long_text" && <Textarea rows={3} defaultValue={r?.answer ?? ""} disabled={!editable} onBlur={(e) => e.target.value !== (r?.answer ?? "") && saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: e.target.value })} />}
                        {q.type === "number" && <Input type="number" defaultValue={r?.answer ?? ""} disabled={!editable} onBlur={(e) => e.target.value !== (r?.answer ?? "") && saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: e.target.value })} />}
                        {q.type === "yes_no" && (
                          <RadioGroup value={r?.answer ?? ""} onValueChange={(v) => saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: v })} disabled={!editable} className="flex gap-3">
                            {["Yes", "No"].map((opt) => (
                              <label key={opt} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/40">
                                <RadioGroupItem value={opt} /> {opt}
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                        {q.type === "dropdown" && q.options && (
                          <Select value={r?.answer ?? ""} onValueChange={(v) => saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: v })} disabled={!editable}>
                            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>{q.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {q.type === "multi_choice" && q.options && (
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const selected = (r?.answer ?? "").split("|").filter(Boolean);
                              return q.options!.map((opt) => {
                                const checked = selected.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/40">
                                    <Checkbox checked={checked} disabled={!editable} onCheckedChange={(v) => {
                                      const next = v ? [...selected, opt] : selected.filter((x) => x !== opt);
                                      saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: next.join("|") });
                                    }} />
                                    {opt}
                                  </label>
                                );
                              });
                            })()}
                          </div>
                        )}
                        {q.type === "choice" && q.options && (
                          <RadioGroup value={r?.answer ?? ""} onValueChange={(v) => saveAnswer.mutate({ question_key: q.key, question_text: q.text, answer: v })} disabled={!editable} className="flex flex-wrap gap-3">
                            {q.options.map((opt) => (
                              <label key={opt} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/40">
                                <RadioGroupItem value={opt} /> {opt}
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                        {q.type === "risk" && (
                          <div className="flex gap-2">
                            {["Low", "Medium", "High"].map((lvl) => {
                              const active = r?.risk_level === lvl;
                              const tone = lvl === "High" ? "border-rose-500 bg-rose-500/10 text-rose-600" : lvl === "Medium" ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-emerald-500 bg-emerald-500/10 text-emerald-600";
                              return (
                                <button key={lvl} disabled={!editable} onClick={() => saveAnswer.mutate({ question_key: q.key, question_text: q.text, risk_level: lvl })} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${active ? tone : "border-border text-muted-foreground"}`}>{lvl}</button>
                              );
                            })}
                          </div>
                        )}
                        {q.type === "likelihood_impact" && (
                          <div className="flex flex-wrap gap-4">
                            <RiskMatrix
                              likelihood={r?.likelihood ?? null}
                              impact={r?.impact ?? null}
                              readOnly={!editable}
                              onChange={(l, i) => saveAnswer.mutate({ question_key: q.key, question_text: q.text, likelihood: l, impact: i, score: l * i, band: bandFromScore(l * i) })}
                            />
                            {r?.band && <span className={`self-start rounded-md border px-2 py-1 text-xs font-medium ${BAND_COLORS[r.band as Band] ?? ""}`}>{r.band} ({r.score})</span>}
                          </div>
                        )}
                        <Textarea rows={1} placeholder="Notes / justification" defaultValue={r?.notes ?? ""} disabled={!editable} onBlur={(e) => e.target.value !== (r?.notes ?? "") && saveAnswer.mutate({ question_key: q.key, question_text: q.text, notes: e.target.value })} className="text-xs" />
                        <EvidenceUploader orgId={orgId} assessmentId={id} questionKey={q.key} disabled={!editable} mandatory={q.mandatory_evidence} value={r?.attachments ?? []} onChange={(att) => saveAnswer.mutate({ question_key: q.key, question_text: q.text, attachments: att })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {editable && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => recompute.mutate()}>Recompute risk</Button>
              <Button onClick={() => complete.mutate()} disabled={progress < 50}>{progress < 50 ? `Answer ≥ 50% to complete (${progress}%)` : "Mark as completed"}</Button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Risk overview</h3>
            <div className="mt-3"><RiskMatrix likelihood={a.residual_likelihood ?? a.inherent_likelihood ?? null} impact={a.residual_impact ?? a.inherent_impact ?? null} readOnly size="sm" /></div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => recompute.mutate()}>Recalculate</Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Risks ({risks.length})</h3></div>
            <ul className="mt-2 space-y-1.5 text-xs">
              {risks.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-border/60 px-2 py-1">
                  <span className="truncate">{r.title}</span>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${BAND_COLORS[r.band as Band] ?? ""}`}>{r.band}</span>
                </li>
              ))}
              {risks.length === 0 && <li className="text-muted-foreground">No risks yet.</li>}
            </ul>
            {editable && <AddRiskInline onAdd={(p) => addRisk.mutate(p)} />}
          </div>

          {template?.integration_map && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Integrations</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {template.integration_map.ropa && <li>· Linked to RoPA</li>}
                {template.integration_map.vendors && <li>· Linked to Vendors</li>}
                {(template.integration_map.controls ?? []).length > 0 && (
                  <li>· Suggested controls: {(template.integration_map.controls ?? []).join(", ")}</li>
                )}
              </ul>
              {editable && (template.integration_map.controls ?? []).length > 0 && (
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => linkSuggestedControls.mutate()}>Link suggested controls</Button>
              )}
            </div>
          )}

          {(template?.regulation_tags ?? []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Regulatory mapping</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {(template?.regulation_tags ?? []).map((t) => <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{t}</span>)}
              </div>
            </div>
          )}

          <WorkflowLegend stages={(template?.workflow_stages?.length ? template.workflow_stages : DEFAULT_STAGES)} currentStage={a.current_stage} />

          <RiskLegend />

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><History className="h-3.5 w-3.5" /> Audit trail ({audit.length})</h3>
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-xs">
              {audit.map((ev) => (
                <li key={ev.id} className="rounded border border-border/60 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{ev.action}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
                  </div>
                  {ev.payload && Object.keys(ev.payload).length > 0 && (
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-muted-foreground">{JSON.stringify(ev.payload, null, 0).slice(0, 200)}</pre>
                  )}
                </li>
              ))}
              {audit.length === 0 && <li className="text-muted-foreground">No audit events yet.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddRiskInline({ onAdd }: { onAdd: (r: { title: string; likelihood: number; impact: number }) => void }) {
  const [title, setTitle] = useState("");
  const [l, setL] = useState(3);
  const [i, setI] = useState(3);
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <Input placeholder="New risk title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
      <div className="flex gap-2">
        <Select value={String(l)} onValueChange={(v) => setL(+v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>L: {n}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(i)} onValueChange={(v) => setI(+v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>I: {n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button size="sm" className="w-full" disabled={!title.trim()} onClick={() => { onAdd({ title, likelihood: l, impact: i }); setTitle(""); }}>
        Add risk ({l}×{i}={l*i}, {bandFromScore(l*i)})
      </Button>
    </div>
  );
}

function WorkflowBar({ assessment, stages, canEdit }: { assessment: Assessment; stages: WorkflowStage[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const current = assessment.current_stage ?? stages[0]?.key ?? "draft";
  const idx = Math.max(0, stages.findIndex((s) => s.key === current));

  const advance = useMutation({
    mutationFn: async (toStage: string) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { error: e1 } = await supabase.from("assessments").update({ current_stage: toStage } as never).eq("id", assessment.id);
      if (e1) throw e1;
      await supabase.from("assessment_workflow_events").insert({ assessment_id: assessment.id, from_stage: current, to_stage: toStage, actor: uid } as never);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessment", assessment.id] }); toast.success("Stage updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const next = stages[idx + 1];
  const prev = stages[idx - 1];

  return (
    <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <div className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                {i < stages.length - 1 && <span className="mx-1 text-muted-foreground/50">›</span>}
              </div>
            );
          })}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-2">
            {prev && <Button size="sm" variant="outline" onClick={() => advance.mutate(prev.key)} disabled={advance.isPending}>← {prev.label}</Button>}
            {next && <Button size="sm" onClick={() => advance.mutate(next.key)} disabled={advance.isPending}>Move to {next.label} →</Button>}
          </div>
        )}
      </div>
      {(assessment.reviewer_email || assessment.approver_email || assessment.owner_email) && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {assessment.owner_email && <span>Owner: <span className="text-foreground">{assessment.owner_email}</span></span>}
          {assessment.reviewer_email && <span>Reviewer: <span className="text-foreground">{assessment.reviewer_email}</span></span>}
          {assessment.approver_email && <span>Approver: <span className="text-foreground">{assessment.approver_email}</span></span>}
        </div>
      )}
    </div>
  );
}

function RiskRegister({ orgId, risks, canEdit }: { orgId: string; risks: RiskRow[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<{ l?: number; i?: number } | null>(null);

  const update = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<RiskRow> }) => {
      const patch: Record<string, unknown> = { ...vars.patch };
      if (patch.likelihood != null && patch.impact != null) {
        const sc = (patch.likelihood as number) * (patch.impact as number);
        patch.score = sc;
        patch.band = bandFromScore(sc);
      }
      const { error } = await supabase.from("assessment_risks").update(patch as never).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessment-risks", orgId] }); toast.success("Updated"); },
  });

  const counts: Record<string, number> = {};
  risks.forEach((r) => { const k = `${r.likelihood}-${r.impact}`; counts[k] = (counts[k] ?? 0) + 1; });
  const filtered = filter ? risks.filter((r) => r.likelihood === filter.l && r.impact === filter.i) : risks;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Heatmap</h3>
        <p className="text-[11px] text-muted-foreground">Click a cell to filter. Numbers = risks at that L×I.</p>
        <div className="mt-3"><RiskMatrix counts={counts} onCellClick={(l, i) => setFilter(filter?.l === l && filter?.i === i ? null : { l, i })} /></div>
        {filter && <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setFilter(null)}>Clear filter</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Risk</th>
              <th className="px-3 py-2 text-left">L×I</th>
              <th className="px-3 py-2 text-left">Band</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">No risks.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2"><div className="font-medium">{r.title}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</td>
                <td className="px-3 py-2 text-xs">{r.likelihood}×{r.impact}={r.score}</td>
                <td className="px-3 py-2"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${BAND_COLORS[r.band as Band] ?? ""}`}>{r.band}</span></td>
                <td className="px-3 py-2"><Input defaultValue={r.owner_email ?? ""} disabled={!canEdit} className="h-7 text-xs" onBlur={(e) => e.target.value !== (r.owner_email ?? "") && update.mutate({ id: r.id, patch: { owner_email: e.target.value } })} /></td>
                <td className="px-3 py-2">
                  <Select value={r.status} onValueChange={(v) => update.mutate({ id: r.id, patch: { status: v } })} disabled={!canEdit}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["open","mitigating","accepted","closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateDialog({ initial, orgId, onSaved }: { initial: Template | null; orgId: string; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Custom");
  const [sections, setSections] = useState<Section[]>(initial?.sections ?? [{ title: "Section 1", questions: [{ key: "q1", text: "", type: "text" }] }]);
  const [saving, setSaving] = useState(false);

  const updateSection = (i: number, patch: Partial<Section>) => setSections((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const updateQ = (si: number, qi: number, patch: Partial<Question>) => setSections((s) => s.map((sec, idx) => idx !== si ? sec : { ...sec, questions: sec.questions.map((q, j) => j === qi ? { ...q, ...patch } : q) }));
  const addSection = () => setSections((s) => [...s, { title: `Section ${s.length + 1}`, questions: [{ key: `q${Date.now()}`, text: "", type: "text" }] }]);
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));
  const addQ = (si: number) => setSections((s) => s.map((sec, idx) => idx !== si ? sec : { ...sec, questions: [...sec.questions, { key: `q${Date.now()}`, text: "", type: "text" }] }));
  const removeQ = (si: number, qi: number) => setSections((s) => s.map((sec, idx) => idx !== si ? sec : { ...sec, questions: sec.questions.filter((_, j) => j !== qi) }));

  const save = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const cleanSections = sections.map((s) => ({
        title: s.title || "Section",
        questions: s.questions.filter((q) => q.text.trim()).map((q) => ({
          key: q.key, text: q.text, type: q.type, weight: q.weight ?? 1,
          ...(q.type === "choice" ? { options: (q.options ?? []).filter(Boolean) } : {}),
        })),
      })).filter((s) => s.questions.length > 0);
      if (cleanSections.length === 0) { toast.error("Add at least one question"); setSaving(false); return; }

      if (initial) {
        const { error } = await supabase.from("assessment_templates").update({ name, description, category, sections: cleanSections } as never).eq("id", initial.id);
        if (error) throw error;
      } else {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("assessment_templates").insert({ org_id: orgId, name, type: "custom", category, description, sections: cleanSections, is_builtin: false, created_by: uid } as never);
        if (error) throw error;
      }
      toast.success("Template saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Edit template" : "Create custom template"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 py-2 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...CATEGORY_ORDER, "Custom"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>

      <div className="space-y-4">
        {sections.map((sec, si) => (
          <div key={si} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input value={sec.title} onChange={(e) => updateSection(si, { title: e.target.value })} className="font-medium" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSection(si)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="mt-3 space-y-3">
              {sec.questions.map((q, qi) => (
                <div key={qi} className="rounded-md border border-border/60 bg-secondary/30 p-2">
                  <div className="flex gap-2">
                    <Input value={q.text} onChange={(e) => updateQ(si, qi, { text: e.target.value })} placeholder="Question text" />
                    <Select value={q.type} onValueChange={(v) => updateQ(si, qi, { type: v as Question["type"] })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short text</SelectItem>
                        <SelectItem value="long_text">Long text</SelectItem>
                        <SelectItem value="choice">Choice</SelectItem>
                        <SelectItem value="risk">Risk (L/M/H)</SelectItem>
                        <SelectItem value="likelihood_impact">5×5 L×I</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} max={5} value={q.weight ?? 1} onChange={(e) => updateQ(si, qi, { weight: +e.target.value })} className="w-16" />
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeQ(si, qi)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {q.type === "choice" && (
                    <Input className="mt-2" placeholder="Options (comma-separated)" value={(q.options ?? []).join(", ")} onChange={(e) => updateQ(si, qi, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addQ(si)}><Plus className="mr-1 h-3 w-3" /> Add question</Button>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addSection}><Plus className="mr-2 h-4 w-4" /> Add section</Button>
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save template"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// suppress unused warnings for icons used in other files
void Sparkles; void ShieldAlert; void ListChecks;
