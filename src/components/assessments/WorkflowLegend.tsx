import { useState } from "react";
import { Workflow, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";

export type WorkflowStageDef = { key: string; label: string; roles?: string[]; sla_hours?: number };

const STAGE_DESCRIPTIONS: Record<string, { desc: string; roles: string[]; sla: string }> = {
  draft: { desc: "Assessment is being scoped and questionnaire filled in by the assessor.", roles: ["Assessor", "Owner"], sla: "No SLA" },
  in_progress: { desc: "Responses, evidence and risk scoring are actively captured.", roles: ["Assessor"], sla: "5 business days" },
  review: { desc: "Reviewer validates responses, evidence and inherent/residual risk.", roles: ["Reviewer", "DPO"], sla: "3 business days" },
  approval: { desc: "Approver signs off on residual risk and mitigation plan.", roles: ["Approver", "DPO"], sla: "2 business days" },
  published: { desc: "Assessment is locked, exported to register and audit log sealed.", roles: ["DPO"], sla: "—" },
  completed: { desc: "Assessment closed; findings flow to Reports & Risk Register.", roles: ["DPO"], sla: "—" },
  archived: { desc: "Retained for audit purposes only; no further changes allowed.", roles: ["Admin"], sla: "—" },
};

export function WorkflowLegend({
  stages,
  currentStage,
  defaultOpen = false,
}: {
  stages: WorkflowStageDef[];
  currentStage?: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const currentIdx = Math.max(0, stages.findIndex((s) => s.key === currentStage));

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4 text-primary" /> Workflow legend
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Each assessment progresses through these lifecycle stages. Transitions are logged to the audit trail.
          </p>
          <ol className="space-y-2">
            {stages.map((s, i) => {
              const meta = STAGE_DESCRIPTIONS[s.key] ?? {
                desc: "Custom workflow stage.",
                roles: s.roles ?? [],
                sla: s.sla_hours ? `${s.sla_hours}h SLA` : "—",
              };
              const done = currentStage ? i < currentIdx : false;
              const active = currentStage ? i === currentIdx : false;
              return (
                <li
                  key={s.key}
                  className={`rounded-md border p-2.5 text-xs ${
                    active ? "border-primary/50 bg-primary/5" : done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Circle className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                      <span className="text-muted-foreground">{i + 1}.</span> {s.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{meta.sla}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{meta.desc}</p>
                  {(meta.roles?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {meta.roles.map((r) => (
                        <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="rounded-md border border-border bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> Only users with the matching role can advance a stage. Skipped or returned stages are recorded as workflow events.
          </div>
        </div>
      )}
    </div>
  );
}
