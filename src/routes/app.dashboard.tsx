import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import {
  Activity, Inbox, AlertTriangle, Layers, ScrollText, FileCheck2,
  ShieldCheck, Users, Globe2, ArrowRight, X, Sparkles,
  ClipboardCheck, FileText, Workflow, AlertOctagon, TrendingUp, TrendingDown,
  Clock, Target, Zap, CheckCircle2, Calendar, ShieldAlert, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, Tooltip as RTooltip, XAxis, YAxis,
  PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

const REGS = [
  { code: "DPDPA", name: "DPDPA 2023", region: "India" },
  { code: "GDPR", name: "GDPR", region: "EU" },
  { code: "CCPA", name: "CCPA", region: "California" },
  { code: "ISO27001", name: "ISO 27001", region: "Global" },
  { code: "ISO27701", name: "ISO 27701", region: "Global" },
  { code: "NISTPF", name: "NIST PF", region: "USA" },
];

const STATUS_VALUE: Record<string, number> = {
  not_started: 0, in_progress: 0.5, implemented: 1, not_applicable: -1,
};

const TOUR_STEPS = [
  { title: "Compliance health", body: "The hero ring shows your overall compliance score across every regulation in one number." },
  { title: "Action queue", body: "Items needing attention right now — overdue requests, high-risk assessments and critical findings." },
  { title: "30-day trends", body: "Spot momentum: rising request volume, slower SLA, growing risk inventory." },
  { title: "Drill into anything", body: "Click any tile, chart or row to jump straight to the underlying records." },
];

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--secondary-foreground))"];

function Dashboard() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const [tourStep, setTourStep] = useState<number | null>(null);

  const { data: scores } = useQuery({
    queryKey: ["scores", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: ctrls }, { data: maps }, { data: resps }] = await Promise.all([
        supabase.from("controls").select("id, weight"),
        supabase.from("control_mappings").select("control_id, regulation_code"),
        supabase.from("control_responses").select("control_id, status").eq("org_id", orgId!),
      ]);
      const w = new Map((ctrls ?? []).map((c) => [c.id, c.weight]));
      const r = new Map((resps ?? []).map((x) => [x.control_id, x.status]));
      const out: Record<string, { num: number; den: number }> = {};
      for (const m of maps ?? []) {
        const status = r.get(m.control_id) ?? "not_started";
        const sv = STATUS_VALUE[status];
        if (sv < 0) continue;
        const wt = w.get(m.control_id) ?? 1;
        out[m.regulation_code] = out[m.regulation_code] ?? { num: 0, den: 0 };
        out[m.regulation_code].num += sv * wt;
        out[m.regulation_code].den += wt;
      }
      return out;
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis-v2", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [
        ropa, ropaActive, ropaDpia, ropaXBorder, ropaReview, ropaHigh,
        dsarOpen, dsarOverdue, dsarClosed, dsarTotal, dsarNew30,
        grvOpen, grvOverdue, grvCritical, grvTotal, grvClosed, grvNew30,
        notices, asmt, asmtHigh, asmtInProg, asmtCompleted,
        dpa, dpaCritical, dpaOpen,
        members, ctrlTotal, ctrlImpl, ctrlInProg, ctrlNotStarted,
        risks, risksOpen, risksHigh,
      ] = await Promise.all([
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "active"),
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("dpia_required", true),
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("cross_border", true),
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("current_stage", ["dpo_review", "business_approval", "annual_review"]),
        supabase.from("processing_activities").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("risk_band", ["High", "Critical"]),
        supabase.from("dsar_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("status", ["new", "in_review", "in_progress"]),
        supabase.from("dsar_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("status", ["new", "in_review", "in_progress"]).lt("sla_due_at", nowIso),
        supabase.from("dsar_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "closed"),
        supabase.from("dsar_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("dsar_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId!).gte("created_at", since30),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("status", ["open", "in_review"]),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("status", ["open", "in_review"]).lt("sla_due_at", nowIso),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("severity", "critical"),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "closed"),
        supabase.from("grievances").select("id", { count: "exact", head: true }).eq("org_id", orgId!).gte("created_at", since30),
        supabase.from("notices").select("id, published", { count: "exact" }).eq("org_id", orgId!),
        supabase.from("assessments").select("id, status", { count: "exact" }).eq("org_id", orgId!),
        supabase.from("assessments").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("residual_band", ["High", "Critical"]),
        supabase.from("assessments").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "in_progress"),
        supabase.from("assessments").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "completed"),
        supabase.from("dpa_reviews").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("dpa_reviews").select("id", { count: "exact", head: true }).eq("org_id", orgId!).gt("findings_critical", 0),
        supabase.from("dpa_reviews").select("id", { count: "exact", head: true }).eq("org_id", orgId!).neq("status", "completed"),
        supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("controls").select("id", { count: "exact", head: true }),
        supabase.from("control_responses").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "implemented"),
        supabase.from("control_responses").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "in_progress"),
        supabase.from("control_responses").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "not_started"),
        supabase.from("assessment_risks").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("assessment_risks").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "open"),
        supabase.from("assessment_risks").select("id", { count: "exact", head: true }).eq("org_id", orgId!).in("band", ["High", "Critical"]),
      ]);
      const publishedNotices = (notices.data ?? []).filter((n) => n.published).length;
      const draftAsmt = (asmt.data ?? []).filter((a) => a.status === "draft").length;
      const dsarSlaCompliance = (dsarTotal.count ?? 0) > 0
        ? Math.round((((dsarTotal.count ?? 0) - (dsarOverdue.count ?? 0)) / (dsarTotal.count ?? 1)) * 100)
        : 100;
      const grvSlaCompliance = (grvTotal.count ?? 0) > 0
        ? Math.round((((grvTotal.count ?? 0) - (grvOverdue.count ?? 0)) / (grvTotal.count ?? 1)) * 100)
        : 100;
      return {
        ropa: ropa.count ?? 0,
        ropaActive: ropaActive.count ?? 0,
        ropaDpia: ropaDpia.count ?? 0,
        crossBorder: ropaXBorder.count ?? 0,
        ropaReview: ropaReview.count ?? 0,
        ropaHigh: ropaHigh.count ?? 0,
        dsarOpen: dsarOpen.count ?? 0,
        dsarOverdue: dsarOverdue.count ?? 0,
        dsarClosed: dsarClosed.count ?? 0,
        dsarTotal: dsarTotal.count ?? 0,
        dsarNew30: dsarNew30.count ?? 0,
        dsarSla: dsarSlaCompliance,
        grvOpen: grvOpen.count ?? 0,
        grvOverdue: grvOverdue.count ?? 0,
        grvCritical: grvCritical.count ?? 0,
        grvTotal: grvTotal.count ?? 0,
        grvClosed: grvClosed.count ?? 0,
        grvNew30: grvNew30.count ?? 0,
        grvSla: grvSlaCompliance,
        notices: notices.count ?? 0,
        publishedNotices,
        asmt: asmt.count ?? 0,
        draftAsmt,
        asmtHigh: asmtHigh.count ?? 0,
        asmtInProg: asmtInProg.count ?? 0,
        asmtCompleted: asmtCompleted.count ?? 0,
        dpa: dpa.count ?? 0,
        dpaCritical: dpaCritical.count ?? 0,
        dpaOpen: dpaOpen.count ?? 0,
        members: members.count ?? 0,
        ctrlTotal: ctrlTotal.count ?? 0,
        ctrlImpl: ctrlImpl.count ?? 0,
        ctrlInProg: ctrlInProg.count ?? 0,
        ctrlNotStarted: ctrlNotStarted.count ?? 0,
        risks: risks.count ?? 0,
        risksOpen: risksOpen.count ?? 0,
        risksHigh: risksHigh.count ?? 0,
      };
    },
  });

  const { data: trends } = useQuery({
    queryKey: ["dashboard-trends", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: dsars }, { data: grvs }] = await Promise.all([
        supabase.from("dsar_requests").select("created_at").eq("org_id", orgId!).gte("created_at", since),
        supabase.from("grievances").select("created_at").eq("org_id", orgId!).gte("created_at", since),
      ]);
      const buckets: Record<string, { day: string; dsar: number; grievance: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), dsar: 0, grievance: 0 };
      }
      (dsars ?? []).forEach((r) => { const k = r.created_at.slice(0, 10); if (buckets[k]) buckets[k].dsar++; });
      (grvs ?? []).forEach((r) => { const k = r.created_at.slice(0, 10); if (buckets[k]) buckets[k].grievance++; });
      return Object.values(buckets);
    },
  });

  const { data: ropaMix } = useQuery({
    queryKey: ["dashboard-ropa-mix", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("processing_activities").select("lawful_basis").eq("org_id", orgId!);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        const k = r.lawful_basis || "Unspecified";
        map[k] = (map[k] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dashboard-recent", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: dsars }, { data: grvs }] = await Promise.all([
        supabase.from("dsar_requests").select("id, code, requester_name, request_type, status, created_at, sla_due_at").eq("org_id", orgId!).order("created_at", { ascending: false }).limit(5),
        supabase.from("grievances").select("id, code, complainant_name, subject, status, created_at, sla_due_at").eq("org_id", orgId!).order("created_at", { ascending: false }).limit(5),
      ]);
      return { dsars: dsars ?? [], grvs: grvs ?? [] };
    },
  });

  const overall = useMemo(() => {
    if (!scores) return 0;
    let num = 0, den = 0;
    Object.values(scores).forEach((s) => { num += s.num; den += s.den; });
    return den > 0 ? Math.round((num / den) * 100) : 0;
  }, [scores]);

  const ctrlPct = kpis && kpis.ctrlTotal > 0 ? Math.round((kpis.ctrlImpl / kpis.ctrlTotal) * 100) : 0;

  const actionQueue = useMemo(() => {
    if (!kpis) return [] as { label: string; value: number; href: string; tone: "danger" | "warn" | "info" }[];
    return [
      { label: "DSARs overdue", value: kpis.dsarOverdue, href: "/app/dsar", tone: "danger" as const },
      { label: "Grievances overdue", value: kpis.grvOverdue, href: "/app/grievance", tone: "danger" as const },
      { label: "Critical grievances", value: kpis.grvCritical, href: "/app/grievance", tone: "danger" as const },
      { label: "High-risk assessments", value: kpis.asmtHigh, href: "/app/assessments", tone: "warn" as const },
      { label: "RoPA awaiting review", value: kpis.ropaReview, href: "/app/ropa", tone: "warn" as const },
      { label: "DPIA-required RoPA", value: kpis.ropaDpia, href: "/app/ropa", tone: "warn" as const },
      { label: "DPA reviews open", value: kpis.dpaOpen, href: "/app/dpa-reviewer", tone: "info" as const },
      { label: "Open risks", value: kpis.risksOpen, href: "/app/assessments", tone: "warn" as const },
    ].filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [kpis]);

  return (
    <div className="perspective-1000 px-8 py-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Live program posture
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              Welcome back{membership?.org_name ? `, ${membership.org_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {kpis ? `${kpis.dsarOpen + kpis.grvOpen} open requests · ${kpis.dsarOverdue + kpis.grvOverdue} overdue · ${kpis.risksHigh} high-risk items` : "Loading…"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" asChild><Link to="/app/dsar">Open DSAR queue</Link></Button>
              <Button size="sm" variant="outline" asChild><Link to="/app/assessments">Run a DPIA</Link></Button>
              <Button size="sm" variant="ghost" onClick={() => setTourStep(0)}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Take a tour
              </Button>
            </div>
          </div>

          {/* Hero compliance ring */}
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "score", value: overall, fill: "hsl(var(--primary))" }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-3xl font-semibold leading-none">{overall}%</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Compliance</div>
              </div>
            </div>
            <div className="space-y-2">
              <MiniStat icon={Target} label="SLA — DSAR" value={`${kpis?.dsarSla ?? 100}%`} tone={(kpis?.dsarSla ?? 100) >= 90 ? "good" : "warn"} />
              <MiniStat icon={Clock} label="SLA — Grievance" value={`${kpis?.grvSla ?? 100}%`} tone={(kpis?.grvSla ?? 100) >= 90 ? "good" : "warn"} />
              <MiniStat icon={ShieldCheck} label="Controls done" value={`${ctrlPct}%`} tone={ctrlPct >= 70 ? "good" : "warn"} />
            </div>
          </div>
        </div>
      </header>

      {/* Action queue */}
      {actionQueue.length > 0 && (
        <section className="mt-6 card-3d rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Needs your attention</h2>
              <Badge variant="outline" className="text-[10px]">{actionQueue.reduce((s, x) => s + x.value, 0)} items</Badge>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {actionQueue.map((a) => (
              <Link key={a.label} to={a.href} className={`group rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                a.tone === "danger" ? "border-destructive/40 bg-destructive/5" :
                a.tone === "warn" ? "border-amber-500/30 bg-amber-500/5" :
                "border-border bg-secondary/30"
              }`}>
                <div className={`font-display text-2xl font-semibold ${a.tone === "danger" ? "text-destructive" : ""}`}>{a.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{a.label}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Regulation scores */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Regulation coverage</h2>
          <Link to="/app/regulations" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            Open regulation matrix <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {REGS.map((r) => {
            const s = scores?.[r.code];
            const pct = s && s.den > 0 ? Math.round((s.num / s.den) * 100) : 0;
            const tone = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive";
            return (
              <Link key={r.code} to="/app/regulations" className="group card-3d rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{r.code}</div>
                    <div className={`mt-1.5 font-display text-3xl font-semibold ${tone}`}>{pct}%</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.region}</Badge>
                </div>
                <Progress value={pct} className="mt-3 h-1.5" />
                <div className="mt-2 text-xs text-muted-foreground">{r.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Charts row */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="card-3d rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Request volume — last 30 days</h3>
              <p className="text-xs text-muted-foreground">DSARs and grievances received per day</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> DSAR ({kpis?.dsarNew30 ?? 0})</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Grievance ({kpis?.grvNew30 ?? 0})</span>
            </div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <AreaChart data={trends ?? []} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity={0.4} /><stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="dsar" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="grievance" stroke="rgb(245 158 11)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-3d rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Lawful basis mix</h3>
          <p className="text-xs text-muted-foreground">Top processing bases across RoPA</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={ropaMix ?? []} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {(ropaMix ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {(ropaMix ?? []).slice(0, 4).map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 truncate"><span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{m.name}</span>
                <span className="font-semibold">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational KPIs */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Operational KPIs</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Layers} label="Processing activities" value={kpis?.ropa ?? 0} sub={`${kpis?.ropaActive ?? 0} active · ${kpis?.crossBorder ?? 0} cross-border`} href="/app/ropa" accent="primary" />
          <Kpi icon={Workflow} label="RoPA in review" value={kpis?.ropaReview ?? 0} sub={`${kpis?.ropaDpia ?? 0} require DPIA`} href="/app/ropa" tone={kpis?.ropaDpia ? "warn" : "default"} />
          <Kpi icon={ShieldAlert} label="High-risk RoPA" value={kpis?.ropaHigh ?? 0} sub="risk band High/Critical" href="/app/ropa" tone={kpis?.ropaHigh ? "warn" : "default"} />
          <Kpi icon={Database} label="Open risks" value={kpis?.risksOpen ?? 0} sub={`${kpis?.risksHigh ?? 0} high · ${kpis?.risks ?? 0} total`} href="/app/assessments" tone={kpis?.risksHigh ? "warn" : "default"} />

          <Kpi icon={Inbox} label="Open DSARs" value={kpis?.dsarOpen ?? 0} sub={`${kpis?.dsarOverdue ?? 0} overdue · ${kpis?.dsarTotal ?? 0} total`} tone={kpis?.dsarOverdue ? "warn" : "default"} href="/app/dsar" />
          <Kpi icon={CheckCircle2} label="DSAR SLA compliance" value={`${kpis?.dsarSla ?? 100}%`} sub={`${kpis?.dsarClosed ?? 0} closed · ${kpis?.dsarNew30 ?? 0} new (30d)`} href="/app/dsar" />
          <Kpi icon={AlertTriangle} label="Open grievances" value={kpis?.grvOpen ?? 0} sub={`${kpis?.grvOverdue ?? 0} overdue · ${kpis?.grvTotal ?? 0} total`} tone={kpis?.grvOverdue ? "warn" : "default"} href="/app/grievance" />
          <Kpi icon={AlertOctagon} label="Critical grievances" value={kpis?.grvCritical ?? 0} sub={`SLA ${kpis?.grvSla ?? 100}% · ${kpis?.grvNew30 ?? 0} new (30d)`} href="/app/grievance" tone={kpis?.grvCritical ? "warn" : "default"} />

          <Kpi icon={FileCheck2} label="Assessments" value={kpis?.asmt ?? 0} sub={`${kpis?.asmtInProg ?? 0} in progress · ${kpis?.draftAsmt ?? 0} draft`} href="/app/assessments" />
          <Kpi icon={ClipboardCheck} label="High-risk assessments" value={kpis?.asmtHigh ?? 0} sub={`${kpis?.asmtCompleted ?? 0} completed`} href="/app/assessments" tone={kpis?.asmtHigh ? "warn" : "default"} />
          <Kpi icon={FileText} label="DPA reviews" value={kpis?.dpa ?? 0} sub={`${kpis?.dpaOpen ?? 0} open · ${kpis?.dpaCritical ?? 0} critical`} href="/app/dpa-reviewer" tone={kpis?.dpaCritical ? "warn" : "default"} />
          <Kpi icon={ShieldCheck} label="Controls implemented" value={`${kpis?.ctrlImpl ?? 0}/${kpis?.ctrlTotal ?? 0}`} sub={`${ctrlPct}% complete · ${kpis?.ctrlInProg ?? 0} in progress`} href="/app/controls" />

          <Kpi icon={ScrollText} label="Privacy notices" value={kpis?.notices ?? 0} sub={`${kpis?.publishedNotices ?? 0} published`} href="/app/notices" />
          <Kpi icon={Users} label="Team members" value={kpis?.members ?? 0} sub="active users" href="/app/users" />
          <Kpi icon={Globe2} label="Regulations tracked" value={REGS.length} sub="DPDPA · GDPR · CCPA · ISO · NIST" href="/app/regulations" />
          <Kpi icon={Calendar} label="Last 30 days" value={(kpis?.dsarNew30 ?? 0) + (kpis?.grvNew30 ?? 0)} sub={`${kpis?.dsarNew30 ?? 0} DSARs · ${kpis?.grvNew30 ?? 0} grievances`} href="/app/reports" />
        </div>
      </section>

      {/* Controls breakdown bar */}
      <section className="mt-8 card-3d rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Controls progress</h3>
            <p className="text-xs text-muted-foreground">Implementation status across the controls library</p>
          </div>
          <Link to="/app/controls" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            Open controls <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-4 h-32">
          <ResponsiveContainer>
            <BarChart data={[
              { name: "Implemented", value: kpis?.ctrlImpl ?? 0, fill: "hsl(var(--primary))" },
              { name: "In progress", value: kpis?.ctrlInProg ?? 0, fill: "rgb(245 158 11)" },
              { name: "Not started", value: Math.max(0, (kpis?.ctrlTotal ?? 0) - (kpis?.ctrlImpl ?? 0) - (kpis?.ctrlInProg ?? 0)), fill: "hsl(var(--muted))" },
            ]} layout="vertical" margin={{ left: 70, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent activity */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <RecentCard
          title="Recent DSAR requests"
          href="/app/dsar"
          empty="No DSAR requests yet."
          rows={(recent?.dsars ?? []).map((d) => ({
            id: d.id,
            primary: d.requester_name,
            secondary: `${(d as any).code ?? ""} · ${d.request_type} · ${d.status}`,
            meta: new Date(d.sla_due_at).toLocaleDateString(),
          }))}
        />
        <RecentCard
          title="Recent grievances"
          href="/app/grievance"
          empty="No grievances filed."
          rows={(recent?.grvs ?? []).map((g) => ({
            id: g.id,
            primary: g.complainant_name,
            secondary: `${(g as any).code ?? ""} · ${g.subject} · ${g.status}`,
            meta: new Date(g.sla_due_at).toLocaleDateString(),
          }))}
        />
      </section>

      <div className="mt-8 rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Activity className="h-3.5 w-3.5" /> Getting started
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold">Your privacy program in 4 steps</h2>
        <ol className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <li className="rounded-lg border border-border bg-card p-4"><span className="mr-2 font-semibold text-primary">1.</span> Mark <Link to="/app/controls" className="font-medium text-primary hover:underline">controls</Link> as Implemented — scores rise across every regulation.</li>
          <li className="rounded-lg border border-border bg-card p-4"><span className="mr-2 font-semibold text-primary">2.</span> Add your <Link to="/app/ropa" className="font-medium text-primary hover:underline">processing activities</Link>.</li>
          <li className="rounded-lg border border-border bg-card p-4"><span className="mr-2 font-semibold text-primary">3.</span> Run a <Link to="/app/assessments" className="font-medium text-primary hover:underline">DPIA</Link>.</li>
          <li className="rounded-lg border border-border bg-card p-4"><span className="mr-2 font-semibold text-primary">4.</span> Publish a <Link to="/app/notices" className="font-medium text-primary hover:underline">privacy notice</Link>.</li>
        </ol>
      </div>

      {/* Tour overlay */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <button onClick={() => setTourStep(null)} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Step {tourStep + 1} of {TOUR_STEPS.length}</div>
            <h3 className="mt-2 font-display text-xl font-semibold">{TOUR_STEPS[tourStep].title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{TOUR_STEPS[tourStep].body}</p>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setTourStep(null)}>Skip</Button>
              <Button size="sm" onClick={() => setTourStep(tourStep + 1 < TOUR_STEPS.length ? tourStep + 1 : null)}>
                {tourStep + 1 < TOUR_STEPS.length ? "Next" : "Done"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "good" | "warn" }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 backdrop-blur">
      <Icon className={`h-4 w-4 ${tone === "good" ? "text-emerald-500" : "text-amber-500"}`} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, href, tone = "default", accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; sub?: string; href?: string;
  tone?: "default" | "warn"; accent?: "primary";
}) {
  const inner = (
    <div className={`group relative overflow-hidden rounded-xl border bg-card p-5 transition-all ${href ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" : ""} ${tone === "warn" ? "border-destructive/40" : "border-border"}`}>
      {accent === "primary" && <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${tone === "warn" ? "text-destructive" : "text-primary"}`} /> {label}
        </div>
        {tone === "warn" && <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />}
      </div>
      <div className={`relative mt-2 font-display text-3xl font-semibold ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
      {sub && <div className={`relative mt-1 text-xs ${tone === "warn" ? "text-destructive/80" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function RecentCard({ title, href, rows, empty }: {
  title: string; href: string; empty: string;
  rows: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link to={href} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 ? (
          <li className="px-5 py-6 text-center text-xs text-muted-foreground">{empty}</li>
        ) : rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-secondary/40">
            <div className="min-w-0">
              <div className="truncate font-medium">{r.primary}</div>
              <div className="truncate text-xs text-muted-foreground">{r.secondary}</div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{r.meta}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// keep unused icons referenced to avoid TS noise if linting is strict
void TrendingUp; void TrendingDown;
