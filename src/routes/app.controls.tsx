import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, ListChecks } from "lucide-react";

export const Route = createFileRoute("/app/controls")({ component: ControlsPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_CONTROLS: any[] = [
  { id: "c1", code: "CTRL-IS-01", title: "Information Security Policy", domain: "Governance & Accountability", description: "Establishment of a formal information security policy approved by management.", status: "implemented" },
  { id: "c2", code: "CTRL-AC-02", title: "User Access Control", domain: "Security Safeguards", description: "Role-based access control (RBAC) implemented for all personal data systems.", status: "implemented" },
  { id: "c3", code: "CTRL-LB-03", title: "Consent Management Workflow", domain: "Lawful Basis & Consent", description: "Mechanism to capture and manage user consent for data processing activities.", status: "in_progress" },
  { id: "c4", code: "CTRL-DR-04", title: "Data Retention Schedule", domain: "Data Lifecycle & Minimization", description: "Defined retention periods for different categories of personal data.", status: "in_progress" },
  { id: "c5", code: "CTRL-TP-05", title: "Vendor DPA Requirements", domain: "Third-Party & Vendor Management", description: "All vendors processing personal data must have an executed DPA.", status: "implemented" },
  { id: "c6", code: "CTRL-XB-06", title: "Cross-Border Transfer Impact Assessment", domain: "Cross-Border Transfers", description: "Assessment of legal mechanisms for data transfer outside of jurisdiction.", status: "not_started" },
  { id: "c7", code: "CTRL-NT-07", title: "Privacy Notice Transparency", domain: "Notice & Transparency", description: "Clear and accessible privacy notices provided at the point of data collection.", status: "implemented" }
];

const MOCK_MAPPINGS: any[] = [
  { control_id: "c1", regulation_code: "ISO 27001", clause_ref: "A.5.1" },
  { control_id: "c1", regulation_code: "DPDPA", clause_ref: "Sec 8" },
  { control_id: "c2", regulation_code: "GDPR", clause_ref: "Art 32" },
  { control_id: "c3", regulation_code: "DPDPA", clause_ref: "Sec 6" },
  { control_id: "c4", regulation_code: "GDPR", clause_ref: "Art 5(1)(e)" },
  { control_id: "c5", regulation_code: "DPDPA", clause_ref: "Sec 8(2)" }
];

const STATUSES = [
  { v: "not_started", l: "Not started" },
  { v: "in_progress", l: "In progress" },
  { v: "implemented", l: "Implemented" },
  { v: "not_applicable", l: "N/A" },
];

const CATEGORY_ORDER = [
  "Governance & Accountability",
  "Lawful Basis & Consent",
  "Notice & Transparency",
  "Data Subject Rights",
  "Data Lifecycle & Minimization",
  "Security Safeguards",
  "Third-Party & Vendor Management",
  "Cross-Border Transfers",
];

function ControlsPage() {
  const { membership } = useAuth();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["controls-mock"],
    queryFn: async () => ({ controls: MOCK_CONTROLS, maps: MOCK_MAPPINGS }),
  });

  const mapsByControl = useMemo(() => {
    const m = new Map<string, any[]>();
    data?.maps.forEach((x: any) => {
      const arr = m.get(x.control_id) ?? [];
      arr.push(x);
      m.set(x.control_id, arr);
    });
    return m;
  }, [data]);

  const filtered = (data?.controls ?? []).filter((c: any) =>
    !q || c.title.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    CATEGORY_ORDER.forEach((cat) => m.set(cat, []));
    filtered.forEach((c: any) => {
      const arr = m.get(c.domain) ?? [];
      arr.push(c);
      m.set(c.domain, arr);
    });
    return Array.from(m.entries()).filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  return (
    <div className="px-8 py-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
             <ShieldCheck className="h-8 w-8 text-primary" /> Controls library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.controls.length ?? 0} controls · mapped to DPDPA, GDPR & ISO 27001. Answer once, coverage cascades.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search controls..." className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          <ModuleTour moduleKey="controls" />
        </div>
      </header>

      <div className="mt-6 grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = filtered.filter((c: any) => c.domain === cat);
          const impl = items.filter((c: any) => c.status === "implemented").length;
          return (
            <div key={cat} className="rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-all cursor-pointer">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">{cat}</div>
              <div className="mt-1 font-display text-lg font-bold">{impl}<span className="text-xs text-muted-foreground">/{items.length}</span></div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-8">
        {grouped.map(([category, items]) => (
          <section key={category}>
            <div className="mb-3 flex items-baseline justify-between border-b pb-2">
              <h2 className="font-display text-xl font-bold text-primary/80">{category}</h2>
              <span className="text-xs text-muted-foreground">{items.length} controls</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Control Detail</th>
                    <th className="px-4 py-3 text-left">Mappings</th>
                    <th className="px-4 py-3 text-left w-44">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((c: any) => (
                    <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-4 font-mono text-[11px] font-bold text-primary">{c.code}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{c.description}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(mapsByControl.get(c.id) ?? []).map((m, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-bold">
                              {m.regulation_code} {m.clause_ref}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Select value={c.status}>
                          <SelectTrigger className="h-8 text-xs font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
