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

type GEvent = { id: string; grievance_id: string; event_type: string; note: string | null; created_by: string | null; created_at: string };

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
  const orgId = membership?.org_id;
  const canEdit = ["admin", "dpo", "analyst"].includes(membership?.role ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  if (!orgId) return null;
  if (openId) return <Detail id={openId} canEdit={canEdit} onBack={() => setOpenId(null)} />;
  return <List orgId={orgId} canEdit={canEdit} onOpen={setOpenId} />;
}

function List({ orgId, canEdit, onOpen }: { orgId: string; canEdit: boolean; onOpen: (id: string) => void }) {
  const [statusF, setStatusF] = useState("all");
  const [prioF, setPrioF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["grievances", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grievances").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Grievance[];
    },
  });

  const filtered = rows.filter((r) => {
    if (statusF !== "all" && r.status !== statusF) return false;
    if (prioF !== "all" && r.priority !== prioF) return false;
    if (catF !== "all" && r.category !== catF) return false;
    if (q && !`${r.complainant_name} ${r.complainant_email} ${r.subject} ${r.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const now = Date.now();
  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => !["resolved", "rejected", "closed"].includes(r.status)).length,
    overdue: rows.filter((r) => !["resolved", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < now).length,
    high: rows.filter((r) => ["high", "urgent"].includes(r.priority) && !["resolved", "closed", "rejected"].includes(r.status)).length,
  }), [rows, now]);

  const exportCSV = () => {
    const head = ["Created", "Name", "Email", "Subject", "Status", "Priority", "Category", "SLA Due", "Tags"];
    const lines = [head.join(",")].concat(filtered.map((r) => [
      r.created_at, r.complainant_name, r.complainant_email, r.subject, r.status, r.priority, r.category ?? "",
      r.sla_due_at, (r.tags ?? []).join("|"),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `grievance-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Grievance officer inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Statutory DPDPA grievance redressal queue with 15-day SLA, full activity timeline, and customizable categories.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="grievance" />
          <DownloadReportButton
            moduleLabel="Grievances"
            filenameBase="grievances"
            rows={filtered.map((r) => ({
              grievance_id: r.code, complainant_name: r.complainant_name, email: r.complainant_email,
              subject: r.subject, status: r.status, stage: r.current_stage,
              priority: r.priority, severity: r.severity, sla_due_at: r.sla_due_at, created_at: r.created_at,
            }))}
            summary={[
              { label: "Total", value: stats.total },
              { label: "Open", value: stats.open },
              { label: "High/Urgent", value: stats.high },
              { label: "Overdue", value: stats.overdue },
            ]}
          />
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New grievance</Button></DialogTrigger>
              <NewDialog orgId={orgId} onCreated={(id) => { setOpen(false); onOpen(id); }} />
            </Dialog>
          )}
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, name, email…" className="pl-8" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_META) as GStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prioF} onValueChange={setPrioF}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(Object.keys(PRIO_META) as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={catF} onValueChange={setCatF}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Complainant</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">SLA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No grievances match your filters.</td></tr>}
            {filtered.map((r) => {
              const overdue = !["resolved", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < now;
              const days = Math.round((new Date(r.sla_due_at).getTime() - now) / 86400000);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => onOpen(r.id)}>
                  <td className="px-4 py-3"><span className="font-mono text-[11px] font-semibold text-primary">{r.code ?? "—"}</span>{r.current_stage && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.current_stage}</div>}</td>
                  <td className="px-4 py-3 max-w-md"><div className="font-medium line-clamp-1">{r.subject}</div>{r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}</td>
                  <td className="px-4 py-3"><div className="font-medium text-xs">{r.complainant_name}</div><div className="text-[11px] text-muted-foreground">{r.complainant_email}</div></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_META[r.status].tone}`}>{STATUS_META[r.status].label}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${PRIO_META[r.priority]}`}>{r.priority}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs ${overdue ? "text-rose-600 font-semibold" : days <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>{overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

function NewDialog({ orgId, onCreated }: { orgId: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(""); const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal"); const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState(""); const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim()) { toast.error("Name, email and subject required"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("grievances").insert({
        org_id: orgId, complainant_name: name, complainant_email: email,
        subject, description: description || null, priority,
        category: category || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      }).select("id").single();
      if (error) throw error;
      toast.success("Grievance logged");
      onCreated(data.id);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>New grievance</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-2 md:grid-cols-2">
        <div><Label>Complainant name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Subject *</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PRIO_META) as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Tags (comma-separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, repeat-complaint" /></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Logging…" : "Log grievance"}</Button></DialogFooter>
    </DialogContent>
  );
}

function Detail({ id, canEdit, onBack }: { id: string; canEdit: boolean; onBack: () => void }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["grievance", id],
    queryFn: async () => {
      const [{ data: r, error: e1 }, { data: ev, error: e2 }, { data: cm, error: e3 }] = await Promise.all([
        supabase.from("grievances").select("*").eq("id", id).single(),
        supabase.from("grievance_events").select("*").eq("grievance_id", id).order("created_at", { ascending: false }),
        supabase.from("grievance_comments").select("*").eq("grievance_id", id).order("created_at", { ascending: true }),
      ]);
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
      return { r: r as Grievance, events: (ev ?? []) as GEvent[], comments: (cm ?? []) as Comment[] };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Grievance>) => {
      const { error } = await supabase.from("grievances").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievance", id] });
      qc.invalidateQueries({ queryKey: ["grievances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postComment = async (body: string, internal: boolean) => {
    const u = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("grievance_comments").insert({ grievance_id: id, body, internal, author: u?.id, author_email: u?.email ?? null });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["grievance", id] });
  };

  if (isLoading || !data) return <div className="px-8 py-8 text-sm text-muted-foreground">Loading…</div>;
  const { r, events, comments } = data;
  const overdue = !["resolved", "rejected", "closed"].includes(r.status) && new Date(r.sla_due_at).getTime() < Date.now();
  const stages = GRIEVANCE_DEFAULT_STAGES;

  return (
    <div className="px-8 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to inbox</button>

      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">{r.code ?? "GRV-…"}</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_META[r.status].tone}`}>{STATUS_META[r.status].label}</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${PRIO_META[r.priority]}`}>{r.priority}</span>
              {r.severity && <Badge variant="outline" className="capitalize">{r.severity}</Badge>}
              {r.category && <Badge variant="secondary">{r.category}</Badge>}
              {overdue && <Badge variant="destructive">SLA overdue</Badge>}
              {(r.tags ?? []).map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px]"><Tag className="h-2.5 w-2.5" />{t}</span>)}
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold">{r.subject}</h1>
            <p className="text-sm text-muted-foreground">{r.complainant_name} · {r.complainant_email}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <SLAClock due={r.sla_due_at} closed={!!r.closed_at} />
            <div className="mt-1">Created {new Date(r.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </header>

      <div className="mt-5">
        <StageBar
          stages={stages}
          current={r.current_stage ?? "intake"}
          canEdit={canEdit}
          onAdvance={(toKey) => {
            const last = stages[stages.length - 1];
            update.mutate({
              current_stage: toKey,
              ...(toKey === last.key ? { status: "closed" as GStatus, closed_at: new Date().toISOString() } : {}),
            });
          }}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Description">
            <p className="whitespace-pre-wrap text-sm">{r.description || <em className="text-muted-foreground">No description</em>}</p>
          </Section>

          <Section title={`Comments (${comments.length})`}>
            <CommentThread comments={comments} canPost={canEdit} onPost={postComment} />
          </Section>

          <Section title="Internal notes">
            <Textarea rows={4} defaultValue={r.internal_notes ?? ""} disabled={!canEdit} placeholder="Private notes…" onBlur={(e) => e.target.value !== (r.internal_notes ?? "") && update.mutate({ internal_notes: e.target.value })} />
          </Section>

          <Section title="Resolution">
            <Textarea rows={4} defaultValue={r.resolution ?? ""} disabled={!canEdit} placeholder="What was done to resolve this grievance…" onBlur={(e) => e.target.value !== (r.resolution ?? "") && update.mutate({ resolution: e.target.value })} />
          </Section>

          <Section title={`Audit trail (${events.length})`}>
            <ul className="space-y-2">
              {events.length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
              {events.map((e) => (
                <li key={e.id} className="rounded-md border border-border/60 bg-secondary/30 p-2 text-xs">
                  <div className="font-medium">{e.event_type}</div>
                  {e.note && <div className="mt-0.5 text-muted-foreground">{e.note}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="space-y-4">
          <WorkflowLegend stages={stages} currentStage={r.current_stage} defaultOpen />

          <Section title="Workflow controls">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={r.status} disabled={!canEdit} onValueChange={(v) => {
                  const closing = ["resolved", "rejected", "closed"].includes(v);
                  update.mutate({ status: v as GStatus, ...(closing ? { closed_at: new Date().toISOString() } : {}) });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(STATUS_META) as GStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={r.severity ?? "moderate"} disabled={!canEdit} onValueChange={(v) => update.mutate({ severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["minor","moderate","major","critical"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={r.priority} disabled={!canEdit} onValueChange={(v) => update.mutate({ priority: v as Priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(PRIO_META) as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={r.category ?? ""} disabled={!canEdit} onValueChange={(v) => update.mutate({ category: v || null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">SLA due date</Label>
                <Input type="date" disabled={!canEdit} defaultValue={r.sla_due_at?.slice(0, 10)} onBlur={(e) => e.target.value && update.mutate({ sla_due_at: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input disabled={!canEdit} defaultValue={(r.tags ?? []).join(", ")} onBlur={(e) => {
                  const next = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                  if (JSON.stringify(next) !== JSON.stringify(r.tags ?? [])) update.mutate({ tags: next });
                }} />
              </div>
            </div>
          </Section>
          {r.closed_at && <div className="rounded-lg border border-border bg-emerald-500/5 p-3 text-xs text-emerald-700"><CheckCircle2 className="mb-1 inline h-3.5 w-3.5" /> Closed on {new Date(r.closed_at).toLocaleString()}</div>}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
