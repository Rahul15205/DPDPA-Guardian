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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Download, Edit, Trash2, Globe2, Layers, Users, Building2, BarChart3, ScrollText, Archive, FileCheck2, Workflow, ListChecks, History, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { StageBar } from "@/components/workflow/StageBar";
import { WorkflowLegend } from "@/components/workflow/WorkflowLegend";
import type { WorkflowStage } from "@/lib/workflow-types";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/ropa")({ component: RoPAPage });

type Activity = {
  id: string;
  org_id: string;
  code: string | null;
  name: string;
  purpose: string | null;
  lawful_basis: string | null;
  data_categories: string[] | null;
  data_subjects: string[] | null;
  retention_period: string | null;
  recipients: string[] | null;
  cross_border: boolean;
  transfer_countries: string[] | null;
  owner: string | null;
  owner_email: string | null;
  reviewer_email: string | null;
  approver_email: string | null;
  status: "draft" | "active" | "archived";
  current_stage: string | null;
  dpia_required: boolean;
  risk_band: string | null;
  priority: string;
  due_at: string | null;
  next_review_at: string | null;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActionItem = {
  id: string;
  ropa_id: string;
  org_id: string;
  title: string;
  description: string | null;
  assignee_email: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type RopaEvent = {
  id: string;
  ropa_id: string;
  event_type: string;
  note: string | null;
  created_at: string;
};

const ROPA_STAGES: WorkflowStage[] = [
  { key: "draft", label: "Draft", role: "Analyst", sla_hours: 72, description: "Initial drafting of the processing activity." },
  { key: "review", label: "DPO Review", role: "DPO", sla_hours: 120, description: "DPO reviews lawful basis, retention and recipients." },
  { key: "approval", label: "Business Approval", role: "Business Owner", sla_hours: 120, description: "Process owner signs off scope and purpose." },
  { key: "active", label: "Active", role: "DPO", sla_hours: 0, description: "Live in the Article 30 register." },
  { key: "review_due", label: "Annual Review", role: "DPO", sla_hours: 0, description: "Periodic review pending." },
  { key: "archived", label: "Archived", role: "DPO", sla_hours: 0, description: "Activity decommissioned.", is_closed: true },
];

const LAWFUL_BASES = [
  "Consent",
  "Contract",
  "Legal obligation",
  "Vital interests",
  "Public task",
  "Legitimate interests",
  "Legitimate uses (DPDPA)",
];

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-600",
  archived: "bg-amber-500/15 text-amber-600",
};

const COMMON_CATEGORIES = ["Identity", "Contact", "Financial", "Health", "Biometric", "Location", "Behavioral", "Employment", "Children", "Government IDs"];
const COMMON_SUBJECTS = ["Customers", "Employees", "Prospects", "Vendors", "Visitors", "Minors", "Patients", "Students"];

function RoPAPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const canEdit = ["admin", "dpo", "analyst"].includes(membership?.role ?? "");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [basisFilter, setBasisFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["ropa", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processing_activities")
        .select("*")
        .eq("org_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (a: Partial<Activity>) => {
      const base = {
        org_id: orgId!,
        name: a.name ?? "Untitled",
        purpose: a.purpose ?? null,
        lawful_basis: a.lawful_basis ?? null,
        data_categories: a.data_categories ?? [],
        data_subjects: a.data_subjects ?? [],
        retention_period: a.retention_period ?? null,
        recipients: a.recipients ?? [],
        cross_border: !!a.cross_border,
        transfer_countries: a.transfer_countries ?? [],
        owner: a.owner ?? null,
        owner_email: a.owner_email ?? null,
        reviewer_email: a.reviewer_email ?? null,
        approver_email: a.approver_email ?? null,
        priority: a.priority ?? "normal",
        dpia_required: !!a.dpia_required,
        risk_band: a.risk_band ?? null,
        due_at: a.due_at ?? null,
        next_review_at: a.next_review_at ?? null,
        current_stage: a.current_stage ?? "draft",
        status: (a.status ?? "draft") as Activity["status"],
      };
      if (a.id) {
        const { error } = await supabase.from("processing_activities").update(base).eq("id", a.id);
        if (error) throw error;
      } else {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("processing_activities").insert({ ...base, created_by: uid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ropa", orgId] });
      qc.invalidateQueries({ queryKey: ["scores", orgId] });
      toast.success("Activity saved");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processing_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ropa", orgId] });
      toast.success("Activity deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const advanceStage = useMutation({
    mutationFn: async ({ id, toStage }: { id: string; toStage: string }) => {
      const patch: Partial<Activity> = { current_stage: toStage };
      if (toStage === "active") patch.status = "active";
      else if (toStage === "archived") patch.status = "archived";
      else if (["draft", "review", "approval", "review_due"].includes(toStage)) patch.status = "draft";
      const { error } = await supabase.from("processing_activities").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ropa", orgId] });
      qc.invalidateQueries({ queryKey: ["ropa-events"] });
      toast.success("Stage updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (basisFilter !== "all" && a.lawful_basis !== basisFilter) return false;
      if (q) {
        const hay = [a.code, a.name, a.purpose, a.owner, ...(a.data_categories ?? []), ...(a.recipients ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [activities, q, statusFilter, basisFilter]);

  const stats = useMemo(() => {
    const total = activities.length;
    const active = activities.filter((a) => a.status === "active").length;
    const draft = activities.filter((a) => a.status === "draft").length;
    const archived = activities.filter((a) => a.status === "archived").length;
    const xb = activities.filter((a) => a.cross_border).length;
    const sensitive = activities.filter((a) => (a.data_categories ?? []).some((c) => ["Health", "Biometric", "Children", "Government IDs", "Financial"].includes(c))).length;
    return { total, active, draft, archived, xb, sensitive };
  }, [activities]);

  const exportCsv = () => {
    const headers = ["Name", "Purpose", "Lawful basis", "Data categories", "Data subjects", "Recipients", "Retention", "Cross-border", "Transfer countries", "Owner", "Status", "Updated"];
    const rows = filtered.map((a) => [
      a.name, a.purpose ?? "", a.lawful_basis ?? "",
      (a.data_categories ?? []).join("; "), (a.data_subjects ?? []).join("; "),
      (a.recipients ?? []).join("; "), a.retention_period ?? "",
      a.cross_border ? "Yes" : "No", (a.transfer_countries ?? []).join("; "),
      a.owner ?? "", a.status, new Date(a.updated_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ropa-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Records of Processing Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GDPR Art. 30 / DPDPA Sec. 8 register · {stats.total} activities · {stats.xb} cross-border · {stats.sensitive} involving sensitive data
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="ropa" />
          <DownloadReportButton
            moduleLabel="RoPA"
            filenameBase="ropa"
            rows={filtered.map((a) => ({
              ropa_id: a.code, name: a.name, purpose: a.purpose, status: a.status,
              cross_border: a.cross_border, data_categories: a.data_categories,
              data_subjects: a.data_subjects, retention: a.retention_period,
              owner_email: a.owner_email, updated_at: a.updated_at,
            }))}
            summary={[
              { label: "Total", value: stats.total },
              { label: "Active", value: stats.active },
              { label: "Cross-border", value: stats.xb },
              { label: "Sensitive", value: stats.sensitive },
            ]}
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" /> New activity</Button>
              </DialogTrigger>
              <ActivityDialog
                key={editing?.id ?? "new"}
                initial={editing}
                onSave={(a) => upsert.mutate(a)}
                saving={upsert.isPending}
              />
            </Dialog>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-6">
        <KPI icon={ScrollText} label="Total" value={stats.total} />
        <KPI icon={FileCheck2} label="Active" value={stats.active} tone="text-emerald-600" />
        <KPI icon={Edit} label="Draft" value={stats.draft} tone="text-amber-600" />
        <KPI icon={Archive} label="Archived" value={stats.archived} />
        <KPI icon={Globe2} label="Cross-border" value={stats.xb} tone="text-sky-600" />
        <KPI icon={Layers} label="Sensitive data" value={stats.sensitive} tone="text-rose-600" />
      </div>

      <Tabs defaultValue="register" className="mt-6">
        <TabsList>
          <TabsTrigger value="register"><ScrollText className="mr-1.5 h-3.5 w-3.5" /> Register</TabsTrigger>
          <TabsTrigger value="workflow"><Workflow className="mr-1.5 h-3.5 w-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="inventory"><Layers className="mr-1.5 h-3.5 w-3.5" /> Data inventory</TabsTrigger>
          <TabsTrigger value="transfers"><Globe2 className="mr-1.5 h-3.5 w-3.5" /> Cross-border</TabsTrigger>
          <TabsTrigger value="recipients"><Users className="mr-1.5 h-3.5 w-3.5" /> Recipients</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics</TabsTrigger>
        </TabsList>

        {/* REGISTER */}
        <TabsContent value="register" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search activities, purpose, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={basisFilter} onValueChange={setBasisFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lawful bases</SelectItem>
                {LAWFUL_BASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">RoPA ID</th>
                  <th className="px-4 py-3 text-left">Activity</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Lawful basis</th>
                  <th className="px-4 py-3 text-left">Categories</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Cross-border</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No activities yet. {canEdit && "Click 'New activity' to start your Article 30 register."}
                  </td></tr>
                )}
                {filtered.map((a) => {
                  const stageLabel = ROPA_STAGES.find((s) => s.key === (a.current_stage ?? "draft"))?.label ?? a.current_stage ?? "Draft";
                  return (
                    <tr key={a.id} className="border-t border-border align-top hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailId(a.id)}>
                      <td className="px-4 py-3 font-mono text-[11px] text-primary whitespace-nowrap">{a.code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-2">
                          {a.name}
                          {a.dpia_required && <Badge variant="destructive" className="text-[9px]">DPIA</Badge>}
                        </div>
                        {a.purpose && <div className="text-xs text-muted-foreground line-clamp-2">{a.purpose}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          <Workflow className="h-3 w-3" /> {stageLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{a.lawful_basis ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(a.data_categories ?? []).slice(0, 3).map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                          ))}
                          {(a.data_categories ?? []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(a.data_categories ?? []).length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{a.owner ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {a.cross_border ? (
                          <span className="inline-flex items-center gap-1 text-sky-600"><Globe2 className="h-3 w-3" /> {(a.transfer_countries ?? []).join(", ") || "Yes"}</span>
                        ) : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_TONE[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(a); setOpen(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete activity?</AlertDialogTitle>
                                  <AlertDialogDescription>“{a.name}” will be permanently removed from the RoPA register.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove.mutate(a.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory" className="mt-4">
          <InventoryView activities={activities} />
        </TabsContent>

        {/* TRANSFERS */}
        <TabsContent value="transfers" className="mt-4">
          <TransfersView activities={activities} />
        </TabsContent>

        {/* RECIPIENTS */}
        <TabsContent value="recipients" className="mt-4">
          <RecipientsView activities={activities} />
        </TabsContent>

        {/* WORKFLOW */}
        <TabsContent value="workflow" className="mt-4">
          <WorkflowBoard activities={activities} onOpen={(id) => setDetailId(id)} />
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsView activities={activities} />
        </TabsContent>
      </Tabs>

      <RopaDetailDialog
        ropa={activities.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        canEdit={canEdit}
        onAdvance={(toStage) => detailId && advanceStage.mutate({ id: detailId, toStage })}
      />
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function ActivityDialog({ initial, onSave, saving }: { initial: Activity | null; onSave: (a: Partial<Activity>) => void; saving: boolean }) {
  const [form, setForm] = useState<Partial<Activity>>(
    initial ?? { status: "draft", cross_border: false, data_categories: [], data_subjects: [], recipients: [], transfer_countries: [] }
  );
  const update = (k: keyof Activity, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const csv = (arr?: string[] | null) => (arr ?? []).join(", ");
  const parseCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit activity" : "New processing activity"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Activity name *</Label>
          <Input value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Customer onboarding KYC" />
        </div>
        <div className="md:col-span-2">
          <Label>Purpose</Label>
          <Textarea rows={2} value={form.purpose ?? ""} onChange={(e) => update("purpose", e.target.value)} placeholder="Why this data is processed" />
        </div>
        <div>
          <Label>Lawful basis</Label>
          <Select value={form.lawful_basis ?? ""} onValueChange={(v) => update("lawful_basis", v)}>
            <SelectTrigger><SelectValue placeholder="Select basis" /></SelectTrigger>
            <SelectContent>
              {LAWFUL_BASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Owner</Label>
          <Input value={form.owner ?? ""} onChange={(e) => update("owner", e.target.value)} placeholder="Function or person" />
        </div>
        <div className="md:col-span-2">
          <Label>Data categories <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input value={csv(form.data_categories)} onChange={(e) => update("data_categories", parseCsv(e.target.value))} placeholder="Identity, Contact, Financial" />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {COMMON_CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => update("data_categories", Array.from(new Set([...(form.data_categories ?? []), c])))} className="rounded-md border border-border px-1.5 py-0.5 text-[10px] hover:border-primary">+ {c}</button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Data subjects <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input value={csv(form.data_subjects)} onChange={(e) => update("data_subjects", parseCsv(e.target.value))} placeholder="Customers, Employees" />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {COMMON_SUBJECTS.map((c) => (
              <button key={c} type="button" onClick={() => update("data_subjects", Array.from(new Set([...(form.data_subjects ?? []), c])))} className="rounded-md border border-border px-1.5 py-0.5 text-[10px] hover:border-primary">+ {c}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Retention period</Label>
          <Input value={form.retention_period ?? ""} onChange={(e) => update("retention_period", e.target.value)} placeholder="e.g. 7 years post-closure" />
        </div>
        <div>
          <Label>Recipients <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input value={csv(form.recipients)} onChange={(e) => update("recipients", parseCsv(e.target.value))} placeholder="AWS, Stripe, Salesforce" />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={!!form.cross_border} onCheckedChange={(v) => update("cross_border", v)} />
          <Label>Cross-border transfer</Label>
        </div>
        <div>
          <Label>Transfer countries <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input value={csv(form.transfer_countries)} onChange={(e) => update("transfer_countries", parseCsv(e.target.value))} placeholder="US, IE, SG" disabled={!form.cross_border} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status ?? "draft"} onValueChange={(v) => update("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? "Saving…" : "Save activity"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function InventoryView({ activities }: { activities: Activity[] }) {
  const catMap = useMemo(() => {
    const m = new Map<string, Activity[]>();
    activities.forEach((a) => (a.data_categories ?? []).forEach((c) => {
      const arr = m.get(c) ?? []; arr.push(a); m.set(c, arr);
    }));
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [activities]);

  const subjMap = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => (a.data_subjects ?? []).forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [activities]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Data categories in use</h3>
        <p className="text-xs text-muted-foreground">Categories of personal data processed across your activities</p>
        <div className="mt-4 space-y-2">
          {catMap.length === 0 && <p className="text-sm text-muted-foreground">No data captured yet.</p>}
          {catMap.map(([cat, list]) => {
            const sensitive = ["Health", "Biometric", "Children", "Government IDs", "Financial"].includes(cat);
            return (
              <div key={cat} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={sensitive ? "destructive" : "secondary"}>{cat}</Badge>
                  {sensitive && <span className="text-[10px] uppercase tracking-wider text-rose-600">sensitive</span>}
                </div>
                <div className="text-sm text-muted-foreground">{list.length} activit{list.length === 1 ? "y" : "ies"}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Data subjects</h3>
        <p className="text-xs text-muted-foreground">Whose data you process</p>
        <div className="mt-4 space-y-2">
          {subjMap.length === 0 && <p className="text-sm text-muted-foreground">No data subjects defined.</p>}
          {subjMap.map(([s, n]) => (
            <div key={s} className="flex items-center justify-between text-sm">
              <span>{s}</span>
              <span className="text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransfersView({ activities }: { activities: Activity[] }) {
  const xb = activities.filter((a) => a.cross_border);
  const byCountry = useMemo(() => {
    const m = new Map<string, Activity[]>();
    xb.forEach((a) => (a.transfer_countries ?? []).forEach((c) => {
      const arr = m.get(c) ?? []; arr.push(a); m.set(c, arr);
    }));
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [xb]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Cross-border transfer register</h3>
        <p className="text-xs text-muted-foreground">{xb.length} activities transfer data internationally · evidence transfer mechanism (SCCs / TIA / BCRs)</p>
      </div>
      {byCountry.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          No cross-border transfers recorded.
        </div>
      )}
      {byCountry.map(([country, list]) => (
        <div key={country} className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2">
            <div className="flex items-center gap-2 font-medium">
              <Globe2 className="h-4 w-4 text-sky-600" /> {country}
            </div>
            <span className="text-xs text-muted-foreground">{list.length} activit{list.length === 1 ? "y" : "ies"}</span>
          </div>
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="px-4 py-2 text-sm">
                <span className="font-medium">{a.name}</span>
                {a.lawful_basis && <span className="ml-2 text-xs text-muted-foreground">· {a.lawful_basis}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecipientsView({ activities }: { activities: Activity[] }) {
  const recipMap = useMemo(() => {
    const m = new Map<string, Activity[]>();
    activities.forEach((a) => (a.recipients ?? []).forEach((r) => {
      const arr = m.get(r) ?? []; arr.push(a); m.set(r, arr);
    }));
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [activities]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-lg font-semibold">Recipients & processors</h3>
        <p className="text-xs text-muted-foreground">{recipMap.length} unique recipients receiving personal data · ensure DPA in place</p>
      </div>
      {recipMap.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">No recipients listed yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-left">Activities</th>
              <th className="px-4 py-3 text-left">Categories shared</th>
            </tr>
          </thead>
          <tbody>
            {recipMap.map(([r, list]) => {
              const cats = Array.from(new Set(list.flatMap((a) => a.data_categories ?? [])));
              return (
                <tr key={r} className="border-t border-border">
                  <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" /> {r}</div></td>
                  <td className="px-4 py-3 text-xs">{list.map((a) => a.name).join(", ")}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{cats.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AnalyticsView({ activities }: { activities: Activity[] }) {
  const basisDist = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => { const k = a.lawful_basis ?? "Unspecified"; m.set(k, (m.get(k) ?? 0) + 1); });
    const total = activities.length || 1;
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, pct: Math.round((v / total) * 100) }));
  }, [activities]);

  const completeness = useMemo(() => {
    if (activities.length === 0) return 0;
    const score = activities.reduce((s, a) => {
      let pts = 0;
      if (a.purpose) pts++;
      if (a.lawful_basis) pts++;
      if ((a.data_categories ?? []).length) pts++;
      if ((a.data_subjects ?? []).length) pts++;
      if (a.retention_period) pts++;
      if (a.owner) pts++;
      return s + pts / 6;
    }, 0);
    return Math.round((score / activities.length) * 100);
  }, [activities]);

  const sensitive = activities.filter((a) => (a.data_categories ?? []).some((c) => ["Health", "Biometric", "Children", "Government IDs"].includes(c)));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Article 30 completeness</div>
        <div className="mt-2 font-display text-4xl font-semibold">{completeness}%</div>
        <p className="mt-1 text-xs text-muted-foreground">Average across purpose, basis, categories, subjects, retention & owner.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${completeness}%` }} />
        </div>
      </div>
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Lawful basis distribution</div>
        <div className="mt-3 space-y-2">
          {basisDist.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          {basisDist.map(({ k, v, pct }) => (
            <div key={k}>
              <div className="flex justify-between text-xs"><span>{k}</span><span className="text-muted-foreground">{v} ({pct}%)</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">High-risk activities (sensitive data)</div>
        {sensitive.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None flagged. Update activities with Health, Biometric, Children or Government ID categories to populate.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {sensitive.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-rose-600">{(a.data_categories ?? []).filter((c) => ["Health", "Biometric", "Children", "Government IDs"].includes(c)).join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WorkflowBoard({ activities, onOpen }: { activities: Activity[]; onOpen: (id: string) => void }) {
  const byStage = useMemo(() => {
    const m = new Map<string, Activity[]>();
    ROPA_STAGES.forEach((s) => m.set(s.key, []));
    activities.forEach((a) => {
      const k = a.current_stage ?? "draft";
      const arr = m.get(k) ?? [];
      arr.push(a);
      m.set(k, arr);
    });
    return m;
  }, [activities]);

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {ROPA_STAGES.map((s) => {
        const list = byStage.get(s.key) ?? [];
        return (
          <div key={s.key} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
            </div>
            <div className="max-h-[480px] space-y-1.5 overflow-y-auto p-2">
              {list.length === 0 && <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">Empty</div>}
              {list.slice(0, 30).map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpen(a.id)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs hover:border-primary"
                >
                  <div className="font-mono text-[10px] text-primary">{a.code}</div>
                  <div className="mt-0.5 line-clamp-2 font-medium">{a.name}</div>
                  {a.owner && <div className="mt-1 text-[10px] text-muted-foreground">{a.owner}</div>}
                </button>
              ))}
              {list.length > 30 && (
                <div className="px-2 py-1 text-center text-[10px] text-muted-foreground">+{list.length - 30} more</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RopaDetailDialog({
  ropa,
  open,
  onClose,
  canEdit,
  onAdvance,
}: {
  ropa: Activity | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  onAdvance: (toStage: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        {ropa && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">{ropa.code}</span>
                <DialogTitle className="text-xl">{ropa.name}</DialogTitle>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_TONE[ropa.status]}`}>{ropa.status}</span>
                {ropa.dpia_required && <Badge variant="destructive" className="text-[10px]">DPIA required</Badge>}
              </div>
              {ropa.purpose && <p className="text-sm text-muted-foreground">{ropa.purpose}</p>}
            </DialogHeader>

            <div className="mt-2 space-y-4">
              <StageBar stages={ROPA_STAGES} current={ropa.current_stage ?? "draft"} canEdit={canEdit} onAdvance={onAdvance} />

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold">Article 30 details</h4>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <DT label="Lawful basis" value={ropa.lawful_basis} />
                      <DT label="Owner" value={ropa.owner} />
                      <DT label="Owner email" value={ropa.owner_email} />
                      <DT label="Reviewer" value={ropa.reviewer_email} />
                      <DT label="Approver" value={ropa.approver_email} />
                      <DT label="Retention" value={ropa.retention_period} />
                      <DT label="Risk band" value={ropa.risk_band} />
                      <DT label="Priority" value={ropa.priority} />
                      <DT label="Cross-border" value={ropa.cross_border ? (ropa.transfer_countries ?? []).join(", ") || "Yes" : "No"} />
                      <DT label="Next review" value={ropa.next_review_at ? new Date(ropa.next_review_at).toLocaleDateString() : null} />
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Categories:</span>
                      {(ropa.data_categories ?? []).map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Subjects:</span>
                      {(ropa.data_subjects ?? []).map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Recipients:</span>
                      {(ropa.recipients ?? []).map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  </div>

                  <ActionItemsPanel ropaId={ropa.id} orgId={ropa.org_id} canEdit={canEdit} />
                  <EventsTimeline ropaId={ropa.id} />
                </div>
                <div>
                  <WorkflowLegend stages={ROPA_STAGES} currentStage={ropa.current_stage ?? "draft"} defaultOpen title="RoPA workflow" />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DT({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </>
  );
}

function ActionItemsPanel({ ropaId, orgId, canEdit }: { ropaId: string; orgId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");

  const { data: items = [] } = useQuery({
    queryKey: ["ropa-actions", ropaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ropa_action_items")
        .select("*")
        .eq("ropa_id", ropaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActionItem[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("ropa_action_items").insert({
        ropa_id: ropaId,
        org_id: orgId,
        title,
        assignee_email: assignee || null,
        priority,
        due_at: due ? new Date(due).toISOString() : null,
        created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ropa-actions", ropaId] });
      setTitle(""); setAssignee(""); setDue(""); setPriority("normal");
      toast.success("Action item created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (it: ActionItem) => {
      const done = it.status !== "done";
      const { error } = await supabase
        .from("ropa_action_items")
        .update({ status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null })
        .eq("id", it.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ropa-actions", ropaId] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ropa_action_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ropa-actions", ropaId] }),
  });

  const open = items.filter((i) => i.status !== "done").length;
  const overdue = items.filter((i) => i.status !== "done" && i.due_at && new Date(i.due_at) < new Date()).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" /> Action items
          <Badge variant="secondary" className="text-[10px]">{open} open</Badge>
          {overdue > 0 && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="mr-0.5 h-3 w-3" /> {overdue} overdue</Badge>}
        </h4>
      </div>

      {canEdit && (
        <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-border p-2 md:grid-cols-[1fr_140px_140px_110px_auto]">
          <Input placeholder="What needs to happen?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Assignee email" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!title || create.isPending} onClick={() => create.mutate()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      )}

      <ul className="mt-3 space-y-1.5">
        {items.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">No action items yet.</li>}
        {items.map((it) => {
          const isOverdue = it.status !== "done" && it.due_at && new Date(it.due_at) < new Date();
          return (
            <li key={it.id} className={`flex items-start gap-2 rounded-md border border-border p-2 ${it.status === "done" ? "opacity-60" : ""}`}>
              <Checkbox checked={it.status === "done"} onCheckedChange={() => toggle.mutate(it)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${it.status === "done" ? "line-through" : "font-medium"}`}>{it.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  {it.assignee_email && <span>👤 {it.assignee_email}</span>}
                  {it.due_at && (
                    <span className={isOverdue ? "text-destructive font-medium" : ""}>
                      📅 {new Date(it.due_at).toLocaleDateString()}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] uppercase">{it.priority}</Badge>
                </div>
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => del.mutate(it.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EventsTimeline({ ropaId }: { ropaId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ["ropa-events", ropaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ropa_events")
        .select("*")
        .eq("ropa_id", ropaId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as RopaEvent[];
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-primary" /> Audit timeline
      </h4>
      <ol className="mt-3 space-y-2">
        {events.length === 0 && <li className="text-xs text-muted-foreground">No events yet.</li>}
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            <div className="flex-1">
              <div className="font-medium">{e.event_type}</div>
              {e.note && <div className="text-muted-foreground">{e.note}</div>}
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
