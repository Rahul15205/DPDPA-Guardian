// Universal download/export helpers used across all modules.

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) {
    downloadBlob(filename, new Blob(["No data\n"], { type: "text/csv" }));
    return;
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set())
  );
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
}

export function downloadJSON(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

export function downloadHTMLReport(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string | number }[];
}) {
  const { filename, title, subtitle, rows, summary } = opts;
  const headers = rows.length
    ? Array.from(
        rows.reduce<Set<string>>((s, r) => {
          Object.keys(r).forEach((k) => s.add(k));
          return s;
        }, new Set())
      )
    : [];
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(formatCell(r[h]))}</td>`).join("")}</tr>`)
    .join("");
  const summaryHtml = summary?.length
    ? `<div class="kpis">${summary.map((s) => `<div class="kpi"><div class="lbl">${escapeHtml(s.label)}</div><div class="val">${escapeHtml(String(s.value))}</div></div>`).join("")}</div>`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  h1{margin:0 0 4px;font-size:22px} .sub{color:#64748b;font-size:13px;margin-bottom:20px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:16px 0 22px}
  .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
  .kpi .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
  .kpi .val{font-size:20px;font-weight:600;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f1f5f9;font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:10px;color:#475569}
  tr:nth-child(even) td{background:#f8fafc}
  .meta{margin-top:24px;font-size:11px;color:#94a3b8}
  @media print { body{padding:12px} .actions{display:none} }
  .actions{position:fixed;top:12px;right:12px}
  .actions button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-weight:500;cursor:pointer}
</style></head><body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>${escapeHtml(title)}</h1>
${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ""}
${summaryHtml}
<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length || 1}" style="text-align:center;color:#94a3b8">No records</td></tr>`}</tbody></table>
<div class="meta">Generated ${new Date().toLocaleString()} · ${rows.length} record${rows.length === 1 ? "" : "s"}</div>
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  // Open in a new tab so the user can immediately Save as PDF, plus also offer download.
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) downloadBlob(filename, blob);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}
