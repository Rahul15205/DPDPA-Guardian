// End-to-end module tour content. Used by <ModuleTour />.

export type TourStep = {
  num: number;
  title: string;
  role?: string;
  sla?: string;
  what: string;
  who?: string;
  tip?: string;
};

export type ModuleTour = {
  key: string;
  title: string;
  subtitle: string;
  purpose: string;
  steps: TourStep[];
  tips?: string[];
};

export const TOURS: Record<string, ModuleTour> = {
  dashboard: {
    key: "dashboard",
    title: "Dashboard tour",
    subtitle: "Your privacy program control tower",
    purpose:
      "The dashboard rolls up live KPIs from every module — controls coverage, DSAR & grievance SLAs, RoPA inventory, DPA risk and assessment progress — so you always know where to act first.",
    steps: [
      { num: 1, title: "Read the program score", role: "Everyone", what: "The headline percentage shows weighted control coverage across all active regulations." },
      { num: 2, title: "Scan the regulation strip", role: "DPO / Admin", what: "Each regulation tile shows its individual coverage. Click to drill into the regulation matrix." },
      { num: 3, title: "Triage the action queue", role: "Analyst", sla: "Daily", what: "Cards highlight overdue DSARs, grievances breaching SLA, RoPAs needing review, DPAs with critical findings, and assessments in approval." },
      { num: 4, title: "Use the 5×5 risk heatmap", role: "DPO", what: "Aggregated view of open risks across DSAR, grievance, DPA and assessment modules — click any cell to see the contributing items." },
      { num: 5, title: "Open the activity stream", role: "Everyone", what: "Live audit trail of recent actions across the org for transparency and accountability." },
    ],
    tips: ["Pin the dashboard tab during business hours.", "KPIs refresh on every navigation — no manual reload needed."],
  },
  dsar: {
    key: "dsar",
    title: "DSAR module tour",
    subtitle: "Data Subject Access Requests — intake to closure",
    purpose:
      "Manage the full lifecycle of access, correction, erasure, portability and consent-withdrawal requests under DPDPA / GDPR / CCPA, with a public intake portal and a 30-day SLA clock.",
    steps: [
      { num: 1, title: "Intake", role: "Analyst", sla: "24h", what: "Request arrives via the public portal or is logged internally. The system assigns a unique DSAR-ID and starts the 30-day SLA timer." },
      { num: 2, title: "Identity verification", role: "Analyst", sla: "48h", what: "Send an email OTP and/or request an ID document. No data is released until verification is approved." },
      { num: 3, title: "Triage", role: "DPO", sla: "72h", what: "Confirm scope, lawful basis, and link the request to the relevant RoPA activities. Assign owner and set risk band on the 5×5 matrix." },
      { num: 4, title: "Fulfilment", role: "Analyst", sla: "20 days", what: "Pull data from systems-of-record, redact third-party PII, and prepare the response package with attachments." },
      { num: 5, title: "Review & approve", role: "DPO", sla: "48h", what: "DPO reviews the package, adds internal comments, and approves the response." },
      { num: 6, title: "Closure & audit", role: "DPO", what: "Response delivered to the requester, request marked closed, and the full timeline is preserved as legal-hold evidence." },
    ],
    tips: ["Use the Comments tab for internal notes — never visible to the requester.", "Overdue requests automatically appear on the dashboard action queue."],
  },
  grievance: {
    key: "grievance",
    title: "Grievance module tour",
    subtitle: "DPDPA grievance officer workflow",
    purpose:
      "Receive, investigate and resolve privacy complaints with a 15-day SLA and full audit trail. Statutory requirement under DPDPA §13.",
    steps: [
      { num: 1, title: "Intake", role: "Analyst", sla: "12h", what: "Complaint received via portal or internal log. Auto-assigned a Grievance-ID and severity (5×5 risk band)." },
      { num: 2, title: "Acknowledge", role: "Analyst", sla: "24h", what: "Send acknowledgement to the complainant — required by law." },
      { num: 3, title: "Investigate", role: "DPO", sla: "7 days", what: "Gather evidence, interview stakeholders, identify root cause. Link to relevant assessments or RoPAs." },
      { num: 4, title: "Resolve", role: "DPO", sla: "5 days", what: "Apply remediation, document outcome, notify complainant of resolution." },
      { num: 5, title: "Closure & escalation", role: "DPO", what: "Mark closed. Unresolved cases can be escalated to the Data Protection Board." },
    ],
    tips: ["Always attach evidence files — they survive in the audit trail.", "Severity drives SLA prioritisation."],
  },
  ropa: {
    key: "ropa",
    title: "RoPA module tour",
    subtitle: "Records of Processing Activities",
    purpose:
      "Maintain a defensible inventory of every processing activity, with versioned snapshots, action items and a unique RoPA-ID per record. Required under GDPR Article 30 and DPDPA §6.",
    steps: [
      { num: 1, title: "Create the activity (Draft)", role: "Analyst", what: "Start a new RoPA with purpose, lawful basis, data categories, retention and recipients. The system mints a permanent RoPA-ID (e.g. ROPA-2026-0042)." },
      { num: 2, title: "Map data flows & risk", role: "Analyst", what: "Capture data sources, transfers, third parties and apply the 5×5 risk matrix for inherent and residual scoring." },
      { num: 3, title: "Submit for review", role: "Analyst", what: "Move to Under Review. The previous version is preserved as an immutable snapshot." },
      { num: 4, title: "DPO review", role: "DPO", sla: "5 days", what: "DPO inspects, opens action items for gaps, and either approves or sends back with a change note." },
      { num: 5, title: "Approve & publish", role: "DPO", what: "Approved RoPAs become the current version-of-record. Action items are tracked to closure." },
      { num: 6, title: "Periodic review / Archive", role: "DPO", what: "Activities are reviewed annually. Decommissioned ones are archived but kept in version history forever." },
    ],
    tips: ["Every save creates a versioned snapshot — open the History tab to compare or restore.", "Action items appear on the dashboard until closed."],
  },
  "dpa-reviewer": {
    key: "dpa-reviewer",
    title: "DPA Reviewer tour",
    subtitle: "Data Processing Agreement review workflow",
    purpose:
      "Centralised intake, AI-assisted clause extraction, risk scoring and version-controlled approvals for vendor DPAs and SCCs.",
    steps: [
      { num: 1, title: "Draft", role: "Analyst", what: "Upload the DPA, capture vendor, jurisdictions, and applicable regulations. System assigns a DPA-ID and version v1." },
      { num: 2, title: "In Review", role: "DPO / Reviewer", sla: "5 days", what: "Reviewer scores findings (Critical/High/Medium/Low), sets the 5×5 risk band, and adds a change note. Each save is captured as a new version snapshot." },
      { num: 3, title: "Approved", role: "DPO", what: "All critical findings resolved. Agreement is endorsed and surfaced as evidence for the relevant controls." },
      { num: 4, title: "Rejected / Sent back", role: "DPO", what: "Material gaps require remediation. Returns to vendor with redlines; counts as a new version when re-submitted." },
      { num: 5, title: "Archived", role: "DPO", what: "Superseded or terminated agreements are archived. Full version history remains queryable." },
    ],
    tips: ["Use the Version History tab to compare snapshots and restore prior states.", "Risk score 1–25 is computed as Likelihood × Impact on the 5×5 matrix."],
  },
  assessments: {
    key: "assessments",
    title: "Assessments / DPIA tour",
    subtitle: "DPIAs, TIAs, LIAs and vendor assessments",
    purpose:
      "Library-driven assessment engine for DPIA, TIA, LIA, ROPA-deepdive and vendor assessments. Drives inherent & residual risk on the 5×5 matrix and produces audit-ready reports.",
    steps: [
      { num: 1, title: "Pick a template", role: "Analyst", what: "Choose from built-in DPIA, TIA, LIA, ROPA, vendor, or org-defined templates. Each template ships with sections, weighted questions and recommended controls." },
      { num: 2, title: "Draft answers", role: "Analyst", what: "Answer questions, attach mandatory evidence, and let the engine compute inherent risk on the 5×5 matrix." },
      { num: 3, title: "Review", role: "DPO", sla: "5 days", what: "Reviewer adds comments, requests changes, and validates evidence." },
      { num: 4, title: "Approval", role: "DPO / Admin", sla: "3 days", what: "Approver signs off. Mitigations are recorded — residual risk is recomputed on the 5×5 matrix." },
      { num: 5, title: "Completed & monitored", role: "Owner", what: "Approved assessments are versioned. Trigger a new version on any material change to scope or controls." },
    ],
    tips: ["Use the Risk Register tab to track open mitigations.", "Click any 5×5 cell on the matrix to see assessments mapped to that band."],
  },
  controls: {
    key: "controls",
    title: "Controls library tour",
    subtitle: "Answer once — coverage cascades to every regulation",
    purpose:
      "Single library of privacy controls mapped to all active regulations. Updating a control's status instantly recalculates compliance scores everywhere.",
    steps: [
      { num: 1, title: "Browse by category", role: "Everyone", what: "9 categories cover the privacy program — Governance, Lawful Basis, Notice, Rights, Lifecycle, Security, Vendors, Transfers, Risk." },
      { num: 2, title: "Set status", role: "Analyst", what: "Mark each control Not started / In progress / Implemented / N/A. Status is the source of truth for every regulation score." },
      { num: 3, title: "Map evidence", role: "Analyst", what: "Attach policies, screenshots, audit reports — evidence is reused across all mapped regulations." },
      { num: 4, title: "Watch coverage cascade", role: "DPO", what: "Open the Regulations module to see how each control change moved coverage % per regulation." },
    ],
    tips: ["Use the search bar to find any control by code or keyword.", "N/A controls are excluded from scoring with audit justification."],
  },
  regulations: {
    key: "regulations",
    title: "Regulations matrix tour",
    subtitle: "Live coverage across every regulation you've enabled",
    purpose:
      "See how your control implementations satisfy each clause of every active regulation. Drives the dashboard score and gap reports.",
    steps: [
      { num: 1, title: "Select regulations", role: "Admin", what: "Enable the regulations relevant to your business (GDPR, DPDPA, CCPA, ISO 27701, NIST PF, HIPAA, etc.)." },
      { num: 2, title: "Inspect clause coverage", role: "DPO", what: "Each regulation expands into clauses with the controls that satisfy them and the current implementation status." },
      { num: 3, title: "Identify gaps", role: "DPO", what: "Red bands highlight clauses with no implemented controls — direct call-to-action to fix in the Controls module." },
      { num: 4, title: "Export gap report", role: "DPO", what: "Download a regulator-ready coverage and gap report from this page." },
    ],
  },
  notices: {
    key: "notices",
    title: "Privacy notices tour",
    subtitle: "Multi-language notice builder with versioning",
    purpose: "Author, translate and publish privacy notices with a permanent version history so you can prove what was visible to a data subject on any given date.",
    steps: [
      { num: 1, title: "Draft", role: "Analyst", what: "Compose the notice in any supported language. Save as Draft to iterate." },
      { num: 2, title: "Review", role: "DPO", what: "Legal review, redlines and approval." },
      { num: 3, title: "Publish", role: "Admin", what: "Publish to the public URL. The previous version is archived but remains retrievable." },
      { num: 4, title: "Archive on change", role: "DPO", what: "Every republish mints a new version with diff visible in the History tab." },
    ],
  },
  reports: {
    key: "reports",
    title: "Reports tour",
    subtitle: "Board-ready exports for every module",
    purpose: "One place to download CSV, JSON and printable PDF reports across DSAR, Grievance, RoPA, DPA, Assessments, Controls and Regulations.",
    steps: [
      { num: 1, title: "Pick a module", what: "Select the module you want to report on." },
      { num: 2, title: "Choose a format", what: "CSV for spreadsheets, JSON for systems integration, Printable for PDF / board packs." },
      { num: 3, title: "Download", what: "Reports include a summary block plus a detailed table — opens in a new tab for instant Save-as-PDF." },
    ],
  },
  users: {
    key: "users",
    title: "Users & roles tour",
    subtitle: "Org membership, roles and access",
    purpose: "Invite teammates, assign roles (Admin, DPO, Analyst, Auditor, Viewer) and manage organisation-level access.",
    steps: [
      { num: 1, title: "Invite", role: "Admin", what: "Send an email invite — pending invites appear until accepted." },
      { num: 2, title: "Assign role", role: "Admin", what: "Roles control what each user can read and edit across the modules." },
      { num: 3, title: "Audit access", role: "DPO", what: "All role changes are written to the immutable audit log." },
    ],
  },
  settings: {
    key: "settings",
    title: "Settings tour",
    subtitle: "Organisation profile, branding and program preferences",
    purpose: "Configure org profile, default SLAs, branding for public portals and integration secrets.",
    steps: [
      { num: 1, title: "Org profile", role: "Admin", what: "Update legal name, jurisdiction and DPO contact details." },
      { num: 2, title: "Branding", role: "Admin", what: "Logo and primary colour propagate to the public DSAR and Grievance portals." },
      { num: 3, title: "Workflow defaults", role: "DPO", what: "Tune default SLAs, stages and auto-assign rules per module." },
    ],
  },
};
