export type WorkflowStage = {
  key: string;
  label: string;
  role?: string;
  sla_hours?: number;
  description?: string;
  is_closed?: boolean;
};

export type AutoAssignRule = {
  field: "category" | "priority" | "request_type" | "severity";
  equals: string;
  assign_to_email: string;
};

export type Branding = {
  primary_color?: string;
  logo_url?: string | null;
  intro?: string;
};

export type CustomField = {
  id: string;
  org_id: string;
  key: string;
  label: string;
  type: "text" | "long_text" | "dropdown" | "multi_select" | "date" | "number" | "checkbox" | "file";
  options: string[];
  required: boolean;
  show_on_portal: boolean;
  display_order: number;
  helper_text?: string | null;
};

export type DsarWorkflowConfig = {
  org_id: string;
  stages: WorkflowStage[];
  categories: string[];
  priorities: string[];
  request_types: { key: string; label: string }[];
  default_sla_hours: number;
  identity_verification: "off" | "email_otp" | "id_doc" | "email_and_id";
  auto_assign_rules: AutoAssignRule[];
  branding: Branding;
};

export type GrievanceWorkflowConfig = {
  org_id: string;
  stages: WorkflowStage[];
  categories: string[];
  priorities: string[];
  severities: string[];
  default_sla_hours: number;
  auto_assign_rules: AutoAssignRule[];
  branding: Branding;
};

export const DSAR_DEFAULT_STAGES: WorkflowStage[] = [
  { key: "intake", label: "Intake", role: "Analyst", sla_hours: 24, description: "Request received and logged." },
  { key: "verification", label: "Verification", role: "Analyst", sla_hours: 48, description: "Verify requester identity (email OTP / ID document)." },
  { key: "triage", label: "Triage", role: "DPO", sla_hours: 72, description: "Assess scope, lawful basis and assign owner." },
  { key: "fulfilment", label: "Fulfilment", role: "Analyst", sla_hours: 480, description: "Collect data, redact and prepare response." },
  { key: "review", label: "Review & approve", role: "DPO", sla_hours: 48, description: "DPO review and final approval." },
  { key: "closed", label: "Closed", role: "DPO", sla_hours: 0, description: "Response delivered, request closed.", is_closed: true },
];

export const GRIEVANCE_DEFAULT_STAGES: WorkflowStage[] = [
  { key: "intake", label: "Intake", role: "Analyst", sla_hours: 12, description: "Grievance received and acknowledged." },
  { key: "acknowledge", label: "Acknowledge", role: "Analyst", sla_hours: 24, description: "Send acknowledgement to complainant." },
  { key: "investigate", label: "Investigate", role: "DPO", sla_hours: 168, description: "Investigate root cause and gather evidence." },
  { key: "resolve", label: "Resolve", role: "DPO", sla_hours: 120, description: "Apply resolution and notify complainant." },
  { key: "closed", label: "Closed", role: "DPO", sla_hours: 0, description: "Grievance closed and archived.", is_closed: true },
];

export function evaluateAutoAssign(rules: AutoAssignRule[], data: Record<string, unknown>): string | null {
  for (const r of rules) {
    if (String(data[r.field] ?? "") === r.equals) return r.assign_to_email;
  }
  return null;
}
