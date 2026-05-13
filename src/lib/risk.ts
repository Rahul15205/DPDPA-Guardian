// Shared 5x5 risk methodology helpers
export const BANDS = ["Very Low", "Low", "Medium", "High", "Critical"] as const;
export type Band = typeof BANDS[number];

export function bandFromScore(score: number): Band {
  if (score >= 20) return "Critical";
  if (score >= 15) return "High";
  if (score >= 10) return "Medium";
  if (score >= 5) return "Low";
  return "Very Low";
}

export const BAND_COLORS: Record<Band, string> = {
  "Very Low": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Low: "bg-lime-500/15 text-lime-700 border-lime-500/30",
  Medium: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  High: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  Critical: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export const CELL_BG: Record<Band, string> = {
  "Very Low": "bg-emerald-500/40",
  Low: "bg-lime-500/40",
  Medium: "bg-amber-500/50",
  High: "bg-orange-500/60",
  Critical: "bg-rose-500/70",
};

export function score(l: number, i: number) {
  return Math.max(1, Math.min(5, l)) * Math.max(1, Math.min(5, i));
}

export type Resp = {
  likelihood?: number | null;
  impact?: number | null;
  weight?: number | null;
  band?: string | null;
};

export function weightedAggregate(responses: Resp[]) {
  const items = responses.filter((r) => r.likelihood && r.impact);
  if (items.length === 0) return { likelihood: 0, impact: 0, score: 0, band: "Very Low" as Band };
  const totalW = items.reduce((s, r) => s + (r.weight ?? 1), 0);
  const wl = items.reduce((s, r) => s + (r.likelihood ?? 0) * (r.weight ?? 1), 0) / totalW;
  const wi = items.reduce((s, r) => s + (r.impact ?? 0) * (r.weight ?? 1), 0) / totalW;
  const lk = Math.round(wl);
  const im = Math.round(wi);
  const sc = score(lk, im);
  return { likelihood: lk, impact: im, score: sc, band: bandFromScore(sc) };
}

export const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
export const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Severe"];
