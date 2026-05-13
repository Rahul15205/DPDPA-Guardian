import { useState } from "react";
import { BANDS, Band, BAND_COLORS, LIKELIHOOD_LABELS, IMPACT_LABELS } from "@/lib/risk";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

const BAND_RANGES: Record<Band, string> = {
  "Very Low": "1 – 4",
  Low: "5 – 9",
  Medium: "10 – 14",
  High: "15 – 19",
  Critical: "20 – 25",
};

export function RiskLegend({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-primary" /> Risk legend & methodology
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
            <div className="font-semibold">Formula</div>
            <div className="mt-1 font-mono text-sm">Risk Score = Likelihood × Impact</div>
            <div className="mt-1 text-muted-foreground">5×5 matrix, scores from 1 to 25.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Likelihood</div>
              <ol className="mt-1 space-y-0.5 text-xs">
                {LIKELIHOOD_LABELS.map((l, i) => (
                  <li key={l}><span className="font-mono text-muted-foreground">{i + 1}</span> · {l}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Impact</div>
              <ol className="mt-1 space-y-0.5 text-xs">
                {IMPACT_LABELS.map((l, i) => (
                  <li key={l}><span className="font-mono text-muted-foreground">{i + 1}</span> · {l}</li>
                ))}
              </ol>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">5-band categorisation</div>
            <div className="mt-2 space-y-1">
              {BANDS.map((b) => (
                <div key={b} className="flex items-center justify-between gap-2 text-xs">
                  <span className={`rounded-md border px-2 py-0.5 font-medium ${BAND_COLORS[b as Band]}`}>{b}</span>
                  <span className="font-mono text-muted-foreground">{BAND_RANGES[b as Band]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs space-y-1">
            <div><span className="font-semibold">Inherent risk:</span> raw risk before any controls.</div>
            <div><span className="font-semibold">Residual risk:</span> remaining risk after mitigations.</div>
            <div><span className="font-semibold">CIA overlay:</span> optional Confidentiality / Integrity / Availability scores (1–5).</div>
          </div>
        </div>
      )}
    </div>
  );
}
