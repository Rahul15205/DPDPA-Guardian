import { BANDS, Band, bandFromScore, CELL_BG, IMPACT_LABELS, LIKELIHOOD_LABELS, score } from "@/lib/risk";

type Props = {
  likelihood?: number | null;
  impact?: number | null;
  onChange?: (l: number, i: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
  counts?: Record<string, number>; // key "L-I" -> count for heatmap
  onCellClick?: (l: number, i: number) => void;
};

export function RiskMatrix({ likelihood, impact, onChange, readOnly, size = "md", counts, onCellClick }: Props) {
  const cell = size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs";
  return (
    <div className="inline-block">
      <div className="flex">
        <div className="w-20" />
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center w-full">Impact →</div>
      </div>
      <div className="flex">
        <div className="flex flex-col justify-center w-20 text-[10px] font-medium uppercase tracking-wider text-muted-foreground -rotate-0 pr-1 text-right">Likelihood ↓</div>
        <table className="border-separate border-spacing-1">
          <tbody>
            {[5, 4, 3, 2, 1].map((l) => (
              <tr key={l}>
                <td className="pr-1 text-[10px] text-muted-foreground text-right">{l}<br/><span className="opacity-70">{LIKELIHOOD_LABELS[l - 1]}</span></td>
                {[1, 2, 3, 4, 5].map((i) => {
                  const sc = score(l, i);
                  const band = bandFromScore(sc);
                  const selected = likelihood === l && impact === i;
                  const ct = counts?.[`${l}-${i}`];
                  return (
                    <td key={i}>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          if (onCellClick) onCellClick(l, i);
                          else if (!readOnly && onChange) onChange(l, i);
                        }}
                        className={`${cell} ${CELL_BG[band]} relative rounded font-semibold text-foreground/90 transition-all ${selected ? "ring-2 ring-primary scale-110" : ""} ${readOnly && !onCellClick ? "cursor-default" : "hover:scale-105"}`}
                        title={`L${l} × I${i} = ${sc} (${band})`}
                      >
                        {ct != null ? ct : sc}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td />
              {[1, 2, 3, 4, 5].map((i) => (
                <td key={i} className="text-[10px] text-muted-foreground text-center">{i}<br/><span className="opacity-70">{IMPACT_LABELS[i - 1]}</span></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {BANDS.map((b) => (
          <span key={b} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${CELL_BG[b as Band]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
