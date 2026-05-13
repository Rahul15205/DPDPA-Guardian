import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Circle, Clock, MinusCircle, Search, Globe2, Plus, Link2, Unlink, ShieldAlert, AlertTriangle, ShieldCheck, Archive, FileText, BookOpen, Wrench, Info } from "lucide-react";
import { toast } from "sonner";
import { fetchAllControlMappings } from "@/lib/control-mappings";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/regulations")({
  component: RegulationsPage,
});

const STATUS_VALUE: Record<string, number> = {
  not_started: 0, in_progress: 0.5, implemented: 1, not_applicable: -1,
};

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  implemented:    { label: "Implemented",   icon: CheckCircle2, tone: "text-emerald-500" },
  in_progress:    { label: "In progress",   icon: Clock,        tone: "text-amber-500" },
  not_started:    { label: "Not started",   icon: Circle,       tone: "text-muted-foreground" },
  not_applicable: { label: "N/A",           icon: MinusCircle,  tone: "text-muted-foreground" },
};

const CATEGORIES = [
  "Governance & Accountability",
  "Lawful Basis & Consent",
  "Notice & Transparency",
  "Data Subject Rights",
  "Data Lifecycle & Minimization",
  "Security Safeguards",
  "Third-Party & Vendor Management",
  "Cross-Border Transfers",
  "Risk, Breach & Special Categories",
];

type Control = { id: string; code: string; title: string; description: string | null; domain: string; weight: number };

function riskFromPct(pct: number): { label: string; tone: string; icon: React.ComponentType<{ className?: string }> } {
  if (pct >= 80) return { label: "Low risk", tone: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10", icon: ShieldCheck };
  if (pct >= 50) return { label: "Medium risk", tone: "text-amber-500 border-amber-500/30 bg-amber-500/10", icon: AlertTriangle };
  return { label: "High risk", tone: "text-destructive border-destructive/30 bg-destructive/10", icon: ShieldAlert };
}

function RegulationsPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["regulations-page", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [regs, ctrls, maps, resps] = await Promise.all([
        supabase.from("regulations").select("*").eq("archived", false).order("display_order"),
        supabase.from("controls").select("*").eq("archived", false).order("code"),
        fetchAllControlMappings(),
        supabase.from("control_responses").select("control_id, status").eq("org_id", orgId!),
      ]);
      return {
        regs: regs.data ?? [],
        ctrls: (ctrls.data ?? []) as Control[],
        maps,
        resps: resps.data ?? [],
      };
    },
  });

  const archiveReg = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("regulations").update({ archived: true }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regulations-page", orgId] });
      qc.invalidateQueries({ queryKey: ["controls-page", orgId] });
      toast.success("Regulation archived");
      setActive(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createReg = useMutation({
    mutationFn: async (input: { code: string; name: string; region: string; description: string }) => {
      const { error } = await supabase.from("regulations").insert({
        code: input.code, name: input.name, region: input.region || null, description: input.description || null, display_order: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); toast.success("Regulation created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createStandaloneControl = useMutation({
    mutationFn: async (input: { code: string; title: string; description: string; domain: string; weight: number; regCode?: string; clauseRef?: string }) => {
      const { data: created, error } = await supabase.from("controls")
        .insert({ code: input.code, title: input.title, description: input.description || null, domain: input.domain, weight: input.weight })
        .select("id").single();
      if (error) throw error;
      if (input.regCode && input.clauseRef) {
        const { error: mErr } = await supabase.from("control_mappings").insert({
          control_id: created.id, regulation_code: input.regCode, clause_ref: input.clauseRef,
        });
        if (mErr) throw mErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regulations-page", orgId] });
      qc.invalidateQueries({ queryKey: ["controls-page", orgId] });
      toast.success("Control created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createClause = useMutation({
    mutationFn: async (input: { regCode: string; clauseRef: string; controlId: string }) => {
      const { error } = await supabase.from("control_mappings").insert({
        regulation_code: input.regCode, clause_ref: input.clauseRef, control_id: input.controlId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regulations-page", orgId] });
      qc.invalidateQueries({ queryKey: ["controls-page", orgId] });
      toast.success("Clause created and linked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ctrlById = useMemo(() => new Map((data?.ctrls ?? []).map((c) => [c.id, c])), [data]);
  const respByCtrl = useMemo(() => new Map((data?.resps ?? []).map((r) => [r.control_id, r.status])), [data]);

  const matrix = useMemo(() => {
    const m: Record<string, Map<string, { id: string; control_id: string }[]>> = {};
    for (const x of data?.maps ?? []) {
      m[x.regulation_code] = m[x.regulation_code] ?? new Map();
      const arr = m[x.regulation_code].get(x.clause_ref) ?? [];
      arr.push({ id: x.id, control_id: x.control_id });
      m[x.regulation_code].set(x.clause_ref, arr);
    }
    return m;
  }, [data]);

  const regSummary = useMemo(() => {
    const out: Record<string, { pct: number; total: number; impl: number; inProg: number; gap: number; clauses: number; compliantClauses: number }> = {};
    for (const reg of data?.regs ?? []) {
      const clauses = matrix[reg.code] ?? new Map();
      let num = 0, den = 0, total = 0, impl = 0, inProg = 0, gap = 0, compliantClauses = 0;
      const seen = new Set<string>();
      clauses.forEach((entries) => {
        let cImpl = 0, cTotal = 0;
        entries.forEach(({ control_id }) => {
          if (!seen.has(control_id)) {
            seen.add(control_id);
            total++;
            const status = respByCtrl.get(control_id) ?? "not_started";
            const sv = STATUS_VALUE[status];
            if (sv >= 0) {
              const wt = ctrlById.get(control_id)?.weight ?? 1;
              num += sv * wt; den += wt;
              if (status === "implemented") impl++;
              else if (status === "in_progress") inProg++;
              else gap++;
            }
          }
          const s = respByCtrl.get(control_id) ?? "not_started";
          if (s !== "not_applicable") cTotal++;
          if (s === "implemented") cImpl++;
        });
        if (cTotal > 0 && cImpl === cTotal) compliantClauses++;
      });
      out[reg.code] = {
        pct: den > 0 ? Math.round((num / den) * 100) : 0,
        total, impl, inProg, gap, clauses: clauses.size, compliantClauses,
      };
    }
    return out;
  }, [data, matrix, ctrlById, respByCtrl]);

  const activeReg = active ?? data?.regs[0]?.code ?? null;

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Regulation matrix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clause-level coverage across every regulation. Link controls, score risk, and watch changes cascade to the Controls module.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clauses or controls…" className="pl-9" />
          </div>
          <ModuleTour moduleKey="regulations" />
          <DownloadReportButton
            moduleLabel="Regulations coverage"
            filenameBase="regulations-coverage"
            rows={(data?.regs ?? []).map((r) => {
              const s = regSummary[r.code];
              return {
                code: r.code, name: r.name, region: r.region,
                clauses: s?.clauses ?? 0, controls_implemented: s?.impl ?? 0,
                coverage_pct: s?.pct ?? 0,
              };
            })}
          />
          <LegendPopover />
          <AddNewMenu
            regs={data?.regs ?? []}
            controls={data?.ctrls ?? []}
            onCreateRegulation={(i) => createReg.mutate(i)}
            onCreateClause={(i) => createClause.mutate(i)}
            onCreateControl={(i) => createStandaloneControl.mutate(i)}
          />
        </div>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {(data?.regs ?? []).map((r) => {
          const s = regSummary[r.code];
          const isActive = activeReg === r.code;
          return (
            <button
              key={r.code}
              onClick={() => setActive(r.code)}
              className={`text-left rounded-xl border bg-card p-4 transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.code}</div>
                {r.region && <Badge variant="outline" className="text-[10px]"><Globe2 className="mr-1 h-2.5 w-2.5" />{r.region}</Badge>}
              </div>
              <div className="mt-1.5 font-display text-2xl font-semibold">{s?.pct ?? 0}%</div>
              <Progress value={s?.pct ?? 0} className="mt-2 h-1" />
              <div className="mt-2 line-clamp-1 text-[11px] text-muted-foreground">{r.name}</div>
              <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                <span className="text-emerald-500">{s?.impl ?? 0} done</span>
                <span className="text-amber-500">{s?.inProg ?? 0} wip</span>
                <span>{s?.gap ?? 0} gap</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeReg && data && data.regs.find((r) => r.code === activeReg) && (
        <RegulationDetail
          orgId={orgId!}
          reg={data.regs.find((r) => r.code === activeReg)!}
          clauseMap={matrix[activeReg] ?? new Map()}
          allControls={data.ctrls}
          ctrlById={ctrlById}
          respByCtrl={respByCtrl}
          query={q}
          summary={regSummary[activeReg]}
          onArchive={() => archiveReg.mutate(activeReg)}
        />
      )}
    </div>
  );
}

function RegulationDetail({ orgId, reg, clauseMap, allControls, ctrlById, respByCtrl, query, summary, onArchive }: {
  orgId: string;
  reg: { code: string; name: string; description: string | null; region: string | null };
  clauseMap: Map<string, { id: string; control_id: string }[]>;
  allControls: Control[];
  ctrlById: Map<string, Control>;
  respByCtrl: Map<string, string>;
  query: string;
  summary?: { pct: number; total: number; impl: number; inProg: number; gap: number; clauses: number; compliantClauses: number };
  onArchive: () => void;
}) {
  const qc = useQueryClient();
  const q = query.trim().toLowerCase();

  const linkMut = useMutation({
    mutationFn: async ({ controlId, clauseRef }: { controlId: string; clauseRef: string }) => {
      const { error } = await supabase.from("control_mappings").insert({
        control_id: controlId, regulation_code: reg.code, clause_ref: clauseRef,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); qc.invalidateQueries({ queryKey: ["controls-page", orgId] }); toast.success("Control linked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkMut = useMutation({
    mutationFn: async (mapId: string) => {
      const { error } = await supabase.from("control_mappings").delete().eq("id", mapId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); qc.invalidateQueries({ queryKey: ["controls-page", orgId] }); toast.success("Control unlinked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveClauseMut = useMutation({
    mutationFn: async (clauseRef: string) => {
      const { error } = await supabase.from("control_mappings").delete()
        .eq("regulation_code", reg.code).eq("clause_ref", clauseRef);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); qc.invalidateQueries({ queryKey: ["controls-page", orgId] }); toast.success("Clause archived — all control links removed for this regulation"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveControlMut = useMutation({
    mutationFn: async (controlId: string) => {
      const { error } = await supabase.from("controls").update({ archived: true }).eq("id", controlId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); qc.invalidateQueries({ queryKey: ["controls-page", orgId] }); toast.success("Control archived — hidden from Regulations and Controls modules"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createControlMut = useMutation({
    mutationFn: async (input: { code: string; title: string; description: string; domain: string; weight: number; clauseRef: string }) => {
      const { data: created, error } = await supabase.from("controls")
        .insert({ code: input.code, title: input.title, description: input.description || null, domain: input.domain, weight: input.weight })
        .select("id").single();
      if (error) throw error;
      const { error: mErr } = await supabase.from("control_mappings").insert({
        control_id: created.id, regulation_code: reg.code, clause_ref: input.clauseRef,
      });
      if (mErr) throw mErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regulations-page", orgId] }); qc.invalidateQueries({ queryKey: ["controls-page", orgId] }); toast.success("Control created and linked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = Array.from(clauseMap.entries())
    .map(([clause, entries]) => ({
      clause,
      entries,
      controls: entries.map((e) => ({ map_id: e.id, ctrl: ctrlById.get(e.control_id)! })).filter((x) => x.ctrl),
    }))
    .filter(({ clause, controls }) => {
      if (!q) return true;
      if (clause.toLowerCase().includes(q)) return true;
      return controls.some(({ ctrl }) => ctrl.code.toLowerCase().includes(q) || ctrl.title.toLowerCase().includes(q));
    })
    .sort((a, b) => a.clause.localeCompare(b.clause, undefined, { numeric: true }));

  const overallRisk = riskFromPct(summary?.pct ?? 0);
  const ROverallIcon = overallRisk.icon;

  return (
    <div className="mt-6 rounded-xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{reg.code} · {reg.region}</div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold">{reg.name}</h2>
              <ArchiveRegButton regCode={reg.code} regName={reg.name} onConfirm={onArchive} />
            </div>
            {reg.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{reg.description}</p>}
          </div>
          <div className="grid grid-cols-5 gap-3 text-center">
            <Stat label="Score" value={`${summary?.pct ?? 0}%`} />
            <Stat label="Clauses" value={summary?.clauses ?? 0} />
            <Stat label="Compliant" value={`${summary?.compliantClauses ?? 0}/${summary?.clauses ?? 0}`} />
            <Stat label="Controls" value={summary?.total ?? 0} />
            <div className={`rounded-lg border px-3 py-2 ${overallRisk.tone}`}>
              <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">Risk</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 font-display text-sm font-semibold"><ROverallIcon className="h-3.5 w-3.5" />{overallRisk.label}</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="clauses" className="p-2">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="clauses">Clauses ({filtered.length})</TabsTrigger>
          <TabsTrigger value="controls">All controls</TabsTrigger>
        </TabsList>

        <TabsContent value="clauses" className="p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No clauses match your search.</div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filtered.map(({ clause, controls }) => {
                const total = controls.length;
                const impl = controls.filter(({ ctrl }) => respByCtrl.get(ctrl.id) === "implemented").length;
                const inProg = controls.filter(({ ctrl }) => respByCtrl.get(ctrl.id) === "in_progress").length;
                const pct = total ? Math.round((impl / total) * 100) : 0;
                const risk = riskFromPct(pct);
                const RiskIcon = risk.icon;
                const linkedIds = new Set(controls.map(({ ctrl }) => ctrl.id));
                const available = allControls.filter((c) => !linkedIds.has(c.id));

                return (
                  <AccordionItem key={clause} value={clause} className="rounded-lg border border-border px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 flex-wrap items-center gap-3 pr-4">
                        <div className="font-mono text-xs font-semibold text-primary">{clause}</div>
                        <Badge variant="outline" className="text-[10px]">{total} control{total === 1 ? "" : "s"}</Badge>
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">{impl} done</Badge>
                        {inProg > 0 && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">{inProg} wip</Badge>}
                        <div className="hidden flex-1 md:block"><Progress value={pct} className="h-1.5" /></div>
                        <Badge variant="outline" className={`text-[10px] ${risk.tone}`}><RiskIcon className="mr-1 h-3 w-3" />{risk.label} · {pct}%</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                          <span>Weighted score: <span className="font-semibold text-foreground">{pct}%</span> · {impl}/{total} controls implemented</span>
                          <ConfirmArchiveButton
                            label="Archive clause"
                            title={`Archive ${reg.code} ${clause}?`}
                            description={`All ${total} control link${total === 1 ? "" : "s"} for this clause will be removed from ${reg.code}. Controls themselves remain available globally.`}
                            onConfirm={() => archiveClauseMut.mutate(clause)}
                          />
                        </div>
                        {controls.map(({ map_id, ctrl }) => {
                          const status = respByCtrl.get(ctrl.id) ?? "not_started";
                          const meta = STATUS_META[status];
                          const Icon = meta.icon;
                          return (
                            <div key={map_id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                              <Link to="/app/controls" className="min-w-0 flex-1 hover:underline">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] text-muted-foreground">{ctrl.code}</span>
                                  <span className="font-medium text-sm">{ctrl.title}</span>
                                  <Badge variant="outline" className="text-[10px]">{ctrl.domain}</Badge>
                                  <Badge variant="outline" className="text-[10px]">weight {ctrl.weight}</Badge>
                                </div>
                                {ctrl.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ctrl.description}</p>}
                              </Link>
                              <span className={`text-xs ${meta.tone}`}>{meta.label}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => unlinkMut.mutate(map_id)}>
                                <Unlink className="mr-1 h-3 w-3" /> Unlink
                              </Button>
                              <ConfirmArchiveButton
                                label="Archive"
                                title={`Archive control ${ctrl.code}?`}
                                description={`${ctrl.title} will be hidden from the Controls module and removed from every regulation it is mapped to. You can restore it later by clearing the archived flag.`}
                                onConfirm={() => archiveControlMut.mutate(ctrl.id)}
                                iconOnly
                              />
                            </div>
                          );
                        })}

                        <div className="flex flex-wrap gap-2 pt-2">
                          <LinkExistingPopover
                            available={available}
                            onPick={(id) => linkMut.mutate({ controlId: id, clauseRef: clause })}
                          />
                          <NewControlDialog
                            clauseRef={clause}
                            regCode={reg.code}
                            onCreate={(input) => createControlMut.mutate(input)}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="controls" className="p-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Control</th>
                  <th className="px-3 py-2 text-left">Clauses</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(filtered.flatMap((f) => f.controls.map(({ ctrl }) => ctrl.id)))).map((id) => {
                  const c = ctrlById.get(id)!;
                  const cls = filtered.filter((f) => f.controls.some(({ ctrl }) => ctrl.id === id)).map((f) => f.clause);
                  const status = respByCtrl.get(id) ?? "not_started";
                  const meta = STATUS_META[status];
                  const Icon = meta.icon;
                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.code}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.domain}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {cls.map((cl) => <span key={cl} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{cl}</span>)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${meta.tone}`}>
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LinkExistingPopover({ available, onPick }: { available: Control[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = available
    .filter((c) => !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase()) || c.domain.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs"><Link2 className="mr-1 h-3 w-3" /> Link existing control</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="border-b p-2">
          <Input autoFocus placeholder="Search controls…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No matching controls</div>}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { onPick(c.id); setOpen(false); }}
              className="flex w-full items-start gap-2 border-b border-border/60 p-2 text-left text-xs hover:bg-secondary/60 last:border-0"
            >
              <span className="font-mono text-muted-foreground shrink-0">{c.code}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-[10px] text-muted-foreground">{c.domain}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NewControlDialog({ clauseRef, regCode, onCreate }: {
  clauseRef: string; regCode: string;
  onCreate: (input: { code: string; title: string; description: string; domain: string; weight: number; clauseRef: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState(CATEGORIES[0]);
  const [weight, setWeight] = useState(1);

  const submit = () => {
    if (!code.trim() || !title.trim()) { toast.error("Code and title are required"); return; }
    onCreate({ code: code.trim(), title: title.trim(), description, domain, weight, clauseRef });
    setOpen(false);
    setCode(""); setTitle(""); setDescription(""); setWeight(1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs"><Plus className="mr-1 h-3 w-3" /> New control for this clause</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New control · {regCode} {clauseRef}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SEC-101" />
            </div>
            <div>
              <Label className="text-xs">Weight</Label>
              <Input type="number" min={1} max={5} value={weight} onChange={(e) => setWeight(Number(e.target.value) || 1)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short control name" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What this control requires…" />
          </div>
          <p className="text-[11px] text-muted-foreground">This control will appear in the Controls module under <span className="font-medium">{domain}</span> and be linked to {regCode} {clauseRef}.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create & link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-lg font-semibold ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

type RegLite = { code: string; name: string };
type CtrlLite = { id: string; code: string; title: string; domain: string };

function AddNewMenu({ regs, controls, onCreateRegulation, onCreateClause, onCreateControl }: {
  regs: RegLite[];
  controls: CtrlLite[];
  onCreateRegulation: (i: { code: string; name: string; region: string; description: string }) => void;
  onCreateClause: (i: { regCode: string; clauseRef: string; controlId: string }) => void;
  onCreateControl: (i: { code: string; title: string; description: string; domain: string; weight: number; regCode?: string; clauseRef?: string }) => void;
}) {
  const [open, setOpen] = useState<null | "regulation" | "clause" | "control">(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-9"><Plus className="mr-1 h-4 w-4" /> Add new</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpen("regulation")}>
            <BookOpen className="mr-2 h-4 w-4" /> New regulation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen("clause")}>
            <FileText className="mr-2 h-4 w-4" /> New clause
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen("control")}>
            <Wrench className="mr-2 h-4 w-4" /> New control
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewRegulationDialog open={open === "regulation"} onClose={() => setOpen(null)} onCreate={onCreateRegulation} />
      <NewClauseDialog open={open === "clause"} onClose={() => setOpen(null)} regs={regs} controls={controls} onCreate={onCreateClause} />
      <NewControlGlobalDialog open={open === "control"} onClose={() => setOpen(null)} regs={regs} onCreate={onCreateControl} />
    </>
  );
}

function NewRegulationDialog({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void;
  onCreate: (i: { code: string; name: string; region: string; description: string }) => void;
}) {
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  const [region, setRegion] = useState(""); const [description, setDescription] = useState("");
  const submit = () => {
    if (!code.trim() || !name.trim()) { toast.error("Code and name are required"); return; }
    onCreate({ code: code.trim().toUpperCase(), name: name.trim(), region: region.trim(), description });
    setCode(""); setName(""); setRegion(""); setDescription("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New regulation</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PIPL" /></div>
            <div><Label className="text-xs">Region</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. China" /></div>
          </div>
          <div><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Personal Information Protection Law" /></div>
          <div><Label className="text-xs">Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create regulation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewClauseDialog({ open, onClose, regs, controls, onCreate }: {
  open: boolean; onClose: () => void; regs: RegLite[]; controls: CtrlLite[];
  onCreate: (i: { regCode: string; clauseRef: string; controlId: string }) => void;
}) {
  const [regCode, setRegCode] = useState("");
  const [clauseRef, setClauseRef] = useState("");
  const [controlId, setControlId] = useState("");
  const submit = () => {
    if (!regCode || !clauseRef.trim() || !controlId) { toast.error("Regulation, clause reference and control are required"); return; }
    onCreate({ regCode, clauseRef: clauseRef.trim(), controlId });
    setRegCode(""); setClauseRef(""); setControlId("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New clause</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Regulation</Label>
            <Select value={regCode} onValueChange={setRegCode}>
              <SelectTrigger><SelectValue placeholder="Pick a regulation" /></SelectTrigger>
              <SelectContent>{regs.map((r) => <SelectItem key={r.code} value={r.code}>{r.code} — {r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Clause / Article / Section reference</Label>
            <Input value={clauseRef} onChange={(e) => setClauseRef(e.target.value)} placeholder="e.g. Article 32 or Section 8(1)" />
          </div>
          <div>
            <Label className="text-xs">Link initial control</Label>
            <Select value={controlId} onValueChange={setControlId}>
              <SelectTrigger><SelectValue placeholder="Pick a control" /></SelectTrigger>
              <SelectContent className="max-h-72">{controls.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}</SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">A clause exists once at least one control is linked. You can link more controls later.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create clause</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewControlGlobalDialog({ open, onClose, regs, onCreate }: {
  open: boolean; onClose: () => void; regs: RegLite[];
  onCreate: (i: { code: string; title: string; description: string; domain: string; weight: number; regCode?: string; clauseRef?: string }) => void;
}) {
  const [code, setCode] = useState(""); const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); const [domain, setDomain] = useState(CATEGORIES[0]);
  const [weight, setWeight] = useState(1);
  const [regCode, setRegCode] = useState<string>("");
  const [clauseRef, setClauseRef] = useState("");
  const submit = () => {
    if (!code.trim() || !title.trim()) { toast.error("Code and title are required"); return; }
    onCreate({
      code: code.trim(), title: title.trim(), description, domain, weight,
      regCode: regCode || undefined, clauseRef: clauseRef.trim() || undefined,
    });
    setCode(""); setTitle(""); setDescription(""); setWeight(1); setRegCode(""); setClauseRef("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New control</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SEC-201" /></div>
            <div><Label className="text-xs">Weight</Label><Input type="number" min={1} max={5} value={weight} onChange={(e) => setWeight(Number(e.target.value) || 1)} /></div>
          </div>
          <div><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs font-medium">Optionally link to a regulation clause</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select value={regCode} onValueChange={setRegCode}>
                <SelectTrigger><SelectValue placeholder="Regulation (optional)" /></SelectTrigger>
                <SelectContent>{regs.map((r) => <SelectItem key={r.code} value={r.code}>{r.code}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={clauseRef} onChange={(e) => setClauseRef(e.target.value)} placeholder="Clause ref" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create control</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveRegButton({ regCode, regName, onConfirm }: { regCode: string; regName: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <Archive className="mr-1 h-3 w-3" /> Archive
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive {regCode}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{regName}</span> will be deactivated and hidden from the Regulations and Controls modules. Mappings are preserved and can be restored later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>Archive regulation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmArchiveButton({ label, title, description, onConfirm, iconOnly }: {
  label: string; title: string; description: string; onConfirm: () => void; iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <Archive className={iconOnly ? "h-3 w-3" : "mr-1 h-3 w-3"} />
        {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{description}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>Confirm archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LegendPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9"><Info className="mr-1 h-4 w-4" /> Legend</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b p-3">
          <div className="text-sm font-semibold">Scoring & risk legend</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">How weights, scores and risk tiers are computed across regulations, articles, sections, clauses and controls.</p>
        </div>

        <div className="space-y-3 p-3 text-xs">
          <div>
            <div className="mb-1 font-semibold">Control weight (1–5)</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><span className="font-mono text-foreground">1</span> · Lowest — informational / hygiene controls (e.g. naming conventions, optional notices)</li>
              <li><span className="font-mono text-foreground">2</span> · Low — recommended best-practice controls</li>
              <li><span className="font-mono text-foreground">3</span> · Medium (default) — standard regulatory expectations</li>
              <li><span className="font-mono text-foreground">4</span> · High — material legal/operational impact (DSAR SLA, breach response)</li>
              <li><span className="font-mono text-foreground">5</span> · Highest — statutory must-haves (lawful basis, consent, cross-border safeguards, security of processing)</li>
            </ul>
            <p className="mt-1 text-[11px] text-muted-foreground">Tip: keep most controls at <span className="font-medium text-foreground">3</span> and reserve <span className="font-medium text-foreground">5</span> for clauses where non-compliance triggers regulator action.</p>
          </div>

          <div className="border-t pt-3">
            <div className="mb-1 font-semibold">Status values</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><span className="text-emerald-500 font-medium">Implemented</span> = 1.0 · counts fully toward the score</li>
              <li><span className="text-amber-500 font-medium">In progress</span> = 0.5 · counts as half credit</li>
              <li><span className="text-muted-foreground font-medium">Not started</span> = 0 · pulls the score down</li>
              <li><span className="text-muted-foreground font-medium">N/A</span> · excluded from score &amp; from the denominator</li>
            </ul>
          </div>

          <div className="border-t pt-3">
            <div className="mb-1 font-semibold">Score formula</div>
            <p className="font-mono text-[11px] text-foreground">score% = Σ (status × weight) / Σ weight × 100</p>
            <p className="mt-1 text-[11px] text-muted-foreground">A clause/article/section is <span className="font-medium text-foreground">Compliant</span> only when every applicable control on it is <span className="text-emerald-500">Implemented</span>.</p>
          </div>

          <div className="border-t pt-3">
            <div className="mb-1 font-semibold">Risk tiers (highest → lowest risk)</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/10"><ShieldAlert className="mr-1 h-3 w-3" />High risk</Badge><span className="text-muted-foreground">score &lt; 50%</span></div>
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10"><AlertTriangle className="mr-1 h-3 w-3" />Medium risk</Badge><span className="text-muted-foreground">50% – 79%</span></div>
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10"><ShieldCheck className="mr-1 h-3 w-3" />Low risk</Badge><span className="text-muted-foreground">≥ 80%</span></div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">The same tiers apply at every level: regulation, article, section, clause and individual control.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
