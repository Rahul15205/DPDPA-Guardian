import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fetchAllControlMappings } from "@/lib/control-mappings";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/controls")({
  component: ControlsPage,
});

const STATUSES = [
  { v: "not_started", l: "Not started" },
  { v: "in_progress", l: "In progress" },
  { v: "implemented", l: "Implemented" },
  { v: "not_applicable", l: "N/A" },
];

function ControlsPage() {
  const { membership } = useAuth();
  const orgId = membership?.org_id;
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["controls-page", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: controls }, allMaps, { data: responses }, { data: regs }] = await Promise.all([
        supabase.from("controls").select("*").eq("archived", false).order("code"),
        fetchAllControlMappings(),
        supabase.from("control_responses").select("*").eq("org_id", orgId!),
        supabase.from("regulations").select("code").eq("archived", false),
      ]);
      const activeRegCodes = new Set((regs ?? []).map((r) => r.code));
      const maps = (allMaps ?? []).filter((m) => activeRegCodes.has(m.regulation_code));
      return { controls: controls ?? [], maps, responses: responses ?? [] };
    },
  });

  const respByControl = useMemo(() => {
    const m = new Map<string, string>();
    data?.responses.forEach((r) => m.set(r.control_id, r.status));
    return m;
  }, [data]);

  const mapsByControl = useMemo(() => {
    const m = new Map<string, { regulation_code: string; clause_ref: string }[]>();
    data?.maps.forEach((x) => {
      const arr = m.get(x.control_id) ?? [];
      arr.push({ regulation_code: x.regulation_code, clause_ref: x.clause_ref });
      m.set(x.control_id, arr);
    });
    return m;
  }, [data]);

  const setStatus = useMutation({
    mutationFn: async ({ controlId, status }: { controlId: string; status: string }) => {
      const { error } = await supabase
        .from("control_responses")
        .upsert(
          { org_id: orgId!, control_id: controlId, status: status as never, updated_by: (await supabase.auth.getUser()).data.user?.id },
          { onConflict: "org_id,control_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["controls-page", orgId] });
      qc.invalidateQueries({ queryKey: ["scores", orgId] });
      toast.success("Status updated — scores recalculated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const CATEGORY_ORDER = [
    "Governance & Accountability",
    "Lawful Basis & Consent",
    "Notice & Transparency",
    "Data Subject Rights",
    "Data Lifecycle & Minimization",
    "Security Safeguards",
    "Third-Party & Vendor Management",
    "Cross-Border Transfers",
    "Risk, Breach & Special Categories",
  ];

  const filtered = (data?.controls ?? []).filter((c) =>
    !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase()) || c.domain.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    CATEGORY_ORDER.forEach((cat) => m.set(cat, []));
    filtered.forEach((c) => {
      const arr = m.get(c.domain) ?? [];
      arr.push(c);
      m.set(c.domain, arr);
    });
    return Array.from(m.entries()).filter(([, arr]) => arr.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const regCount = useMemo(() => {
    const s = new Set<string>();
    data?.maps.forEach((m) => s.add(m.regulation_code));
    return s.size;
  }, [data]);

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Controls library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.controls.length ?? 0} controls across 9 categories · mapped to {regCount} regulations & international standards. Answer once, coverage cascades.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search controls or category…" className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          <ModuleTour moduleKey="controls" />
          <DownloadReportButton
            moduleLabel="Controls"
            filenameBase="controls"
            rows={filtered.map((c) => ({
              code: c.code, title: c.title, category: c.domain,
              status: respByControl.get(c.id) ?? "not_started",
              regulations: (mapsByControl.get(c.id) ?? []).map((m) => m.regulation_code).join("; "),
            }))}
          />
        </div>
      </header>

      <div className="mt-6 grid gap-2 md:grid-cols-3 lg:grid-cols-5">
        {CATEGORY_ORDER.map((cat) => {
          const items = filtered.filter((c) => c.domain === cat);
          const impl = items.filter((c) => respByControl.get(c.id) === "implemented").length;
          return (
            <a key={cat} href={`#cat-${cat}`} className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground line-clamp-1">{cat}</div>
              <div className="mt-1 font-display text-lg font-semibold">{impl}<span className="text-xs text-muted-foreground">/{items.length}</span></div>
            </a>
          );
        })}
      </div>

      <div className="mt-6 space-y-8">
        {grouped.map(([category, items]) => (
          <section key={category} id={`cat-${category}`}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">{category}</h2>
              <span className="text-xs text-muted-foreground">{items.length} control{items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Control</th>
                    <th className="px-4 py-3 text-left">Mapped regulations</th>
                    <th className="px-4 py-3 text-left w-44">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const maps = mapsByControl.get(c.id) ?? [];
                    return (
                      <tr key={c.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.title}</div>
                          {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {maps.slice(0, 8).map((m, i) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {m.regulation_code}
                              </span>
                            ))}
                            {maps.length > 8 && (
                              <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                +{maps.length - 8} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={respByControl.get(c.id) ?? "not_started"}
                            onValueChange={(v) => setStatus.mutate({ controlId: c.id, status: v })}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
