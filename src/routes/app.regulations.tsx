import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, Search, Globe2, ShieldAlert, AlertTriangle, ShieldCheck, BookOpen, Info } from "lucide-react";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/regulations")({ component: RegulationsPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_REGS = [
  { code: "DPDPA", name: "Digital Personal Data Protection Act 2023", region: "India", description: "Comprehensive data protection law governing the processing of personal data in India." },
  { code: "GDPR", name: "General Data Protection Regulation", region: "European Union", description: "The toughest privacy and security law in the world, affecting any entity processing EU data." },
  { code: "CCPA", name: "California Consumer Privacy Act", region: "USA (California)", description: "Providing California residents with the right to know about personal information collected about them." }
];

const MOCK_REG_SUMMARY: Record<string, any> = {
  DPDPA: { pct: 68, clauses: 37, impl: 25, inProg: 8, gap: 4, compliantClauses: 22 },
  GDPR: { pct: 54, clauses: 99, impl: 42, inProg: 30, gap: 27, compliantClauses: 38 },
  CCPA: { pct: 82, clauses: 15, impl: 12, inProg: 2, gap: 1, compliantClauses: 11 }
};

const MOCK_CLAUSES: Record<string, any[]> = {
  DPDPA: [
    { ref: "Section 4", title: "Grounds for processing", status: "implemented", controls: 2 },
    { ref: "Section 6", title: "Consent and Withdrawal", status: "in_progress", controls: 3 },
    { ref: "Section 8", title: "Obligations of Data Fiduciary", status: "implemented", controls: 5 },
    { ref: "Section 13", title: "Right to Grievance Redressal", status: "implemented", controls: 1 }
  ],
  GDPR: [
    { ref: "Article 5", title: "Principles of processing", status: "implemented", controls: 6 },
    { ref: "Article 32", title: "Security of processing", status: "in_progress", controls: 8 },
    { ref: "Article 33", title: "Breach notification", status: "gap", controls: 0 }
  ]
};

function riskFromPct(pct: number) {
  if (pct >= 80) return { label: "Low risk", tone: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10", icon: ShieldCheck };
  if (pct >= 50) return { label: "Medium risk", tone: "text-amber-500 border-amber-500/30 bg-amber-500/10", icon: AlertTriangle };
  return { label: "High risk", tone: "text-destructive border-destructive/30 bg-destructive/10", icon: ShieldAlert };
}

function RegulationsPage() {
  const { membership } = useAuth();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("DPDPA");

  const { data } = useQuery({
    queryKey: ["regulations-mock"],
    queryFn: async () => ({ regs: MOCK_REGS, summary: MOCK_REG_SUMMARY }),
  });

  const activeReg = data?.regs.find(r => r.code === active) || MOCK_REGS[0];
  const summary = MOCK_REG_SUMMARY[active];
  const risk = riskFromPct(summary.pct);
  const RiskIcon = risk.icon;

  return (
    <div className="px-8 py-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" /> Regulation matrix
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clause-level coverage across {MOCK_REGS.length} regulations. Score risk and track gaps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clauses..." className="pl-9" />
          </div>
          <ModuleTour moduleKey="regulations" />
        </div>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {MOCK_REGS.map((r) => {
          const s = MOCK_REG_SUMMARY[r.code];
          const isActive = active === r.code;
          return (
            <button
              key={r.code}
              onClick={() => setActive(r.code)}
              className={`text-left rounded-xl border bg-card p-5 transition-all shadow-sm ${isActive ? "border-primary ring-2 ring-primary/10 bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{r.code}</div>
                <Badge variant="outline" className="text-[10px]"><Globe2 className="mr-1 h-2.5 w-2.5" />{r.region}</Badge>
              </div>
              <div className="mt-2 font-display text-3xl font-bold">{s.pct}%</div>
              <Progress value={s.pct} className="mt-2 h-1.5" />
              <div className="mt-3 line-clamp-1 text-xs font-semibold text-foreground/80">{r.name}</div>
              <div className="mt-2 flex gap-3 text-[10px] font-bold">
                <span className="text-emerald-600">{s.impl} DONE</span>
                <span className="text-amber-600">{s.inProg} WIP</span>
                <span className="text-rose-600">{s.gap} GAP</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
        <div className="bg-secondary/30 p-6 border-b border-border">
           <div className="flex items-start justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold">{activeReg.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{activeReg.description}</p>
              </div>
              <div className={`rounded-lg border px-4 py-2 text-center ${risk.tone}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider">Compliance Risk</div>
                <div className="mt-1 flex items-center gap-1.5 font-display text-lg font-bold">
                  <RiskIcon className="h-4 w-4" /> {risk.label}
                </div>
              </div>
           </div>
        </div>

        <div className="p-6">
           <Accordion type="multiple" className="space-y-3">
              {(MOCK_CLAUSES[active] || []).map((c) => (
                <AccordionItem key={c.ref} value={c.ref} className="border rounded-lg px-4 hover:border-primary/30 transition-colors">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 w-full pr-4 text-left">
                       <span className="font-mono text-xs font-bold text-primary min-w-[80px]">{c.ref}</span>
                       <span className="text-sm font-semibold flex-1">{c.title}</span>
                       <Badge variant={c.status === "implemented" ? "default" : "secondary"} className="text-[9px] uppercase tracking-wider">
                         {c.status.replace("_", " ")}
                       </Badge>
                       <span className="text-[10px] text-muted-foreground font-bold">{c.controls} CONTROLS</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                     <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 p-3 rounded-md italic">
                        <Info className="h-3.5 w-3.5" /> This clause is mapped to {c.controls} specific security and privacy controls in your library.
                     </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
           </Accordion>
        </div>
      </div>
    </div>
  );
}
