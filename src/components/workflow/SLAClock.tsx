import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function SLAClock({
  due,
  closed,
}: {
  due: string | null | undefined;
  closed?: boolean;
}) {
  if (!due) return <span className="text-xs text-muted-foreground">No SLA</span>;
  const ms = new Date(due).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  const hours = Math.round(ms / 3600000);
  if (closed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Closed
      </span>
    );
  }
  if (ms < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
        <AlertTriangle className="h-3 w-3" /> {Math.abs(days)}d overdue
      </span>
    );
  }
  if (hours <= 24) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> {hours}h left
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <Clock className="h-3 w-3" /> {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3" /> {days}d left
    </span>
  );
}
