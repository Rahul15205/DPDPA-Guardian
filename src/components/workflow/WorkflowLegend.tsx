import { useState } from "react";
import type { WorkflowStage } from "@/lib/workflow-types";
import { Workflow, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";

export function WorkflowLegend({
  stages,
  currentStage,
  defaultOpen = false,
  title = "Workflow legend",
}: {
  stages: WorkflowStage[];
  currentStage?: string | null;
  defaultOpen?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const currentIdx = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4 text-primary" /> {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Each request progresses through these lifecycle stages. Transitions are logged to the audit trail.
          </p>
          <ol className="space-y-2">
            {stages.map((s, i) => {
              const done = currentIdx >= 0 && i < currentIdx;
              const active = i === currentIdx;
              return (
                <li
                  key={s.key}
                  className={`rounded-md border p-2.5 text-xs ${
                    active
                      ? "border-primary/50 bg-primary/5"
                      : done
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-secondary/20"
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
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {s.sla_hours ? `${s.sla_hours}h SLA` : "—"}
                    </span>
                  </div>
                  {s.description && <p className="mt-1 text-muted-foreground">{s.description}</p>}
                  {s.role && (
                    <div className="mt-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                        {s.role}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
