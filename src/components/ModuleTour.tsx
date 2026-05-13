import { useState } from "react";
import { Sparkles, ChevronRight, CircleDot, Clock, UserCog, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TOURS } from "@/lib/module-tours";

interface Props {
  moduleKey: keyof typeof TOURS | string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function ModuleTour({ moduleKey, size = "sm", variant = "outline", label = "Take a tour" }: Props) {
  const [open, setOpen] = useState(false);
  const tour = TOURS[moduleKey];
  if (!tour) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl">{tour.title}</DialogTitle>
              <DialogDescription>{tour.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What this module does</div>
          <p className="mt-1 leading-relaxed text-foreground/90">{tour.purpose}</p>
        </div>

        <div className="mt-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">End-to-end workflow</div>
          <ol className="space-y-3">
            {tour.steps.map((s, idx) => (
              <li key={s.num} className="relative rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                    {s.num}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{s.title}</h4>
                      {s.role && (
                        <Badge variant="outline" className="gap-1 text-[10px]"><UserCog className="h-3 w-3" /> {s.role}</Badge>
                      )}
                      {s.sla && (
                        <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> SLA {s.sla}</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.what}</p>
                    {s.tip && (
                      <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-300">
                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" /> {s.tip}
                      </p>
                    )}
                  </div>
                  {idx < tour.steps.length - 1 && (
                    <ChevronRight className="absolute -bottom-3 left-7 h-3.5 w-3.5 rotate-90 text-muted-foreground" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {tour.tips && tour.tips.length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-border p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CircleDot className="h-3 w-3" /> Pro tips
            </div>
            <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
              {tour.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
