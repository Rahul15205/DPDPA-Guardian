// Smart cross-module linkage engine.
// Given a "subject" (email / vendor / code), discovers related records across modules.
import { supabase } from "@/integrations/supabase/client";

export type LinkedItem = {
  module: "dsar" | "grievance" | "ropa" | "dpa" | "assessment" | "control";
  id: string;
  code?: string | null;
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
};

export type LinkSubject = {
  orgId: string;
  email?: string | null;
  vendorName?: string | null;
  ropaIds?: string[];
  assessmentIds?: string[];
  controlCodes?: string[];
};

export async function findRelated(s: LinkSubject): Promise<LinkedItem[]> {
  const out: LinkedItem[] = [];
  const promises: PromiseLike<void>[] = [];

  if (s.email) {
    const e = s.email.toLowerCase();
    promises.push(
      supabase.from("dsar_requests")
        .select("id, code, requester_email, request_type, status")
        .eq("org_id", s.orgId).ilike("requester_email", e).limit(10)
        .then(({ data }) => {
          (data ?? []).forEach((r) => out.push({
            module: "dsar", id: r.id, code: r.code,
            title: r.code ?? "DSAR", subtitle: `${r.request_type} · ${r.status}`,
            href: `/app/dsar`, badge: r.status,
          }));
        }),
    );
    promises.push(
      supabase.from("grievances")
        .select("id, code, complainant_email, subject, status")
        .eq("org_id", s.orgId).ilike("complainant_email", e).limit(10)
        .then(({ data }) => {
          (data ?? []).forEach((r) => out.push({
            module: "grievance", id: r.id, code: r.code,
            title: r.code ?? "Grievance", subtitle: r.subject,
            href: `/app/grievance`, badge: r.status,
          }));
        }),
    );
  }

  if (s.vendorName) {
    promises.push(
      supabase.from("dpa_reviews")
        .select("id, code, vendor_name, status, risk_band")
        .eq("org_id", s.orgId).ilike("vendor_name", `%${s.vendorName}%`).limit(10)
        .then(({ data }) => {
          (data ?? []).forEach((r) => out.push({
            module: "dpa", id: r.id, code: r.code,
            title: r.code ?? "DPA", subtitle: r.vendor_name,
            href: `/app/dpa-reviewer`, badge: r.risk_band ?? r.status,
          }));
        }),
    );
  }

  if (s.ropaIds?.length) {
    promises.push(
      supabase.from("processing_activities")
        .select("id, code, name, status")
        .in("id", s.ropaIds).limit(20)
        .then(({ data }) => {
          (data ?? []).forEach((r) => out.push({
            module: "ropa", id: r.id, code: r.code,
            title: r.code ?? "RoPA", subtitle: r.name,
            href: `/app/ropa`, badge: r.status,
          }));
        }),
    );
  }

  if (s.assessmentIds?.length) {
    promises.push(
      supabase.from("assessments")
        .select("id, code, name, status, residual_band")
        .in("id", s.assessmentIds).limit(20)
        .then(({ data }) => {
          (data ?? []).forEach((r) => out.push({
            module: "assessment", id: r.id, code: r.code,
            title: r.code ?? "Assessment", subtitle: r.name,
            href: `/app/assessments`, badge: r.residual_band ?? r.status,
          }));
        }),
    );
  }

  await Promise.all(promises);
  return out;
}

// Global cross-module search by free text (codes, names, emails).
export async function globalSearch(orgId: string, term: string): Promise<LinkedItem[]> {
  const t = term.trim();
  if (!t) return [];
  const like = `%${t}%`;
  const out: LinkedItem[] = [];

  const tasks = [
    supabase.from("dsar_requests")
      .select("id, code, requester_email, requester_name, request_type, status")
      .eq("org_id", orgId)
      .or(`code.ilike.${like},requester_email.ilike.${like},requester_name.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "dsar", id: r.id, code: r.code,
        title: r.code ?? "DSAR",
        subtitle: `${r.requester_name} · ${r.request_type}`,
        href: "/app/dsar", badge: r.status,
      }))),
    supabase.from("grievances")
      .select("id, code, complainant_email, subject, status")
      .eq("org_id", orgId)
      .or(`code.ilike.${like},complainant_email.ilike.${like},subject.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "grievance", id: r.id, code: r.code,
        title: r.code ?? "Grievance", subtitle: r.subject,
        href: "/app/grievance", badge: r.status,
      }))),
    supabase.from("processing_activities")
      .select("id, code, name, status")
      .eq("org_id", orgId)
      .or(`code.ilike.${like},name.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "ropa", id: r.id, code: r.code,
        title: r.code ?? "RoPA", subtitle: r.name,
        href: "/app/ropa", badge: r.status,
      }))),
    supabase.from("dpa_reviews")
      .select("id, code, vendor_name, status, risk_band")
      .eq("org_id", orgId)
      .or(`code.ilike.${like},vendor_name.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "dpa", id: r.id, code: r.code,
        title: r.code ?? "DPA", subtitle: r.vendor_name,
        href: "/app/dpa-reviewer", badge: r.risk_band ?? r.status,
      }))),
    supabase.from("assessments")
      .select("id, code, name, status, residual_band")
      .eq("org_id", orgId)
      .or(`code.ilike.${like},name.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "assessment", id: r.id, code: r.code,
        title: r.code ?? "Assessment", subtitle: r.name,
        href: "/app/assessments", badge: r.residual_band ?? r.status,
      }))),
    supabase.from("controls")
      .select("id, code, title, domain")
      .or(`code.ilike.${like},title.ilike.${like}`)
      .limit(5)
      .then(({ data }) => (data ?? []).forEach((r) => out.push({
        module: "control", id: r.id, code: r.code,
        title: r.code, subtitle: r.title,
        href: "/app/controls", badge: r.domain,
      }))),
  ];

  await Promise.all(tasks);
  return out;
}
