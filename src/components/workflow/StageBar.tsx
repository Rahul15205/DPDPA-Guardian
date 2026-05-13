import type { WorkflowStage } from "@/lib/workflow-types";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "lucide-react";

export function StageBar({
  stages,
  current,
  onAdvance,
  canEdit,
}: {
  stages: WorkflowStage[];
  current: string | null | undefined;
  onAdvance?: (toKey: string) => void;
  canEdit?: boolean;
}) {
  const idx = Math.max(0, stages.findIndex((s) => s.key === current));
  const next = stages[idx + 1];
  const prev = stages[idx - 1];

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={s.description ?? ""}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  {s.role && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.role}</span>}
                </div>
                {i < stages.length - 1 && <ChevronRight className="mx-1 h-3.5 w-3.5 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>
        {canEdit && onAdvance && (
          <div className="flex shrink-0 gap-2">
            {prev && (
              <Button size="sm" variant="outline" onClick={() => onAdvance(prev.key)}>
                ← {prev.label}
              </Button>
            )}
            {next && (
              <Button size="sm" onClick={() => onAdvance(next.key)}>
                Move to {next.label} →
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
