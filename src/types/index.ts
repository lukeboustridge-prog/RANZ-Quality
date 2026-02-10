export type CertificationTier = "ACCREDITED" | "CERTIFIED" | "MASTER_ROOFER";

export type OrgMemberRole = "OWNER" | "ADMIN" | "STAFF";

export type LBPClass =
  | "CARPENTRY"
  | "ROOFING"
  | "DESIGN_1"
  | "DESIGN_2"
  | "DESIGN_3"
  | "SITE_1"
  | "SITE_2"
  | "SITE_3";

export type LBPStatus =
  | "CURRENT"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "NOT_FOUND";

export type QualificationType =
  | "NZQA"
  | "MANUFACTURER_CERT"
  | "SAFETY"
  | "FIRST_AID"
  | "SITE_SAFE"
  | "OTHER";

export type CPDCategory =
  | "TECHNICAL"
  | "PEER_REVIEW"
  | "INDUSTRY_EVENT"
  | "SELF_STUDY"
  | "OTHER";

export type InsurancePolicyType =
  | "PUBLIC_LIABILITY"
  | "PROFESSIONAL_INDEMNITY"
  | "STATUTORY_LIABILITY"
  | "EMPLOYERS_LIABILITY"
  | "MOTOR_VEHICLE"
  | "CONTRACT_WORKS";

export type ISOElement =
  | "QUALITY_POLICY"
  | "QUALITY_OBJECTIVES"
  | "ORG_STRUCTURE"
  | "PROCESS_MANAGEMENT"
  | "DOCUMENTATION"
  | "TRAINING_COMPETENCE"
  | "CONTRACT_REVIEW"
  | "DOCUMENT_CONTROL"
  | "PURCHASING"
  | "CUSTOMER_PRODUCT"
  | "TRACEABILITY"
  | "PROCESS_CONTROL"
  | "INSPECTION_TESTING"
  | "NONCONFORMING_PRODUCT"
  | "CORRECTIVE_ACTION"
  | "HANDLING_STORAGE"
  | "QUALITY_RECORDS"
  | "INTERNAL_AUDITS"
  | "SERVICING";

export type DocumentType =
  | "POLICY"
  | "PROCEDURE"
  | "FORM"
  | "RECORD"
  | "CERTIFICATE"
  | "OTHER";

export type DocumentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SUPERSEDED"
  | "ARCHIVED";

export type DocumentVersionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type ComplianceStatus =
  | "COMPLIANT"
  | "PARTIAL"
  | "NON_COMPLIANT"
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE";

export type AuditType =
  | "INITIAL_CERTIFICATION"
  | "SURVEILLANCE"
  | "RECERTIFICATION"
  | "FOLLOW_UP"
  | "SPECIAL";

export type AuditStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type AuditRating =
  | "PASS"
  | "PASS_WITH_OBSERVATIONS"
  | "CONDITIONAL_PASS"
  | "FAIL";

export type AuditResponse =
  | "CONFORMING"
  | "MINOR_NONCONFORMITY"
  | "MAJOR_NONCONFORMITY"
  | "OBSERVATION"
  | "NOT_APPLICABLE";

export type FindingSeverity = "OBSERVATION" | "MINOR" | "MAJOR" | "CRITICAL";

export type CAPAStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING_VERIFICATION"
  | "CLOSED"
  | "OVERDUE";

export type CAPASourceType =
  | "AUDIT"
  | "CUSTOMER_COMPLAINT"
  | "INTERNAL_REVIEW"
  | "INCIDENT"
  | "OTHER";

export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "VERIFY"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "LBP_VERIFY"
  | "AUDIT_START"
  | "AUDIT_COMPLETE"
  | "ENROL_APPLY"
  | "ENROL_APPROVE"
  | "ENROL_REJECT"
  | "ENROL_SUSPEND"
  | "ENROL_REINSTATE";

// Supplier Types (ISO Element 9: Purchasing)
export type SupplierStatus = "APPROVED" | "CONDITIONAL" | "SUSPENDED" | "REMOVED";

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  APPROVED: "Approved",
  CONDITIONAL: "Conditional",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

// Programme Enrolment Types (Phase 13)
export type ProgrammeEnrolmentStatus =
  | "PENDING"
  | "ACTIVE"
  | "RENEWAL_DUE"
  | "SUSPENDED"
  | "WITHDRAWN";

export const PROGRAMME_ENROLMENT_STATUS_LABELS: Record<ProgrammeEnrolmentStatus, string> = {
  PENDING: "Pending Review",
  ACTIVE: "Active",
  RENEWAL_DUE: "Renewal Due",
  SUSPENDED: "Suspended",
  WITHDRAWN: "Withdrawn",
};

// Phase 3 Types
export type ProjectType =
  | "NEW_BUILD"
  | "REROOF"
  | "REPAIR"
  | "MAINTENANCE"
  | "INSPECTION"
  | "WARRANTY_CLAIM"
  | "OTHER";

export type ProjectStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type PhotoCategory =
  | "BEFORE"
  | "DURING"
  | "AFTER"
  | "MATERIALS"
  | "SAFETY"
  | "ISSUE"
  | "DETAIL"
  | "TESTIMONIAL";

export type ProjectDocType =
  | "QUOTE"
  | "CONTRACT"
  | "CONSENT"
  | "SPECIFICATION"
  | "WARRANTY"
  | "SIGN_OFF"
  | "INVOICE"
  | "RECORD_OF_WORK"
  | "OTHER";

export type NotificationType =
  | "INSURANCE_EXPIRY"
  | "INSURANCE_EXPIRED"
  | "LBP_EXPIRY"
  | "LBP_STATUS_CHANGE"
  | "AUDIT_SCHEDULED"
  | "AUDIT_REMINDER"
  | "AUDIT_COMPLETED"
  | "CAPA_DUE"
  | "CAPA_OVERDUE"
  | "COMPLIANCE_ALERT"
  | "DOCUMENT_REVIEW_DUE"
  | "TESTIMONIAL_REQUEST"
  | "TESTIMONIAL_RECEIVED"
  | "TIER_CHANGE"
  | "WELCOME"
  | "SYSTEM"
  | "PROGRAMME_RENEWAL"
  | "PROGRAMME_STATUS_CHANGE";

export type NotificationChannel = "EMAIL" | "SMS" | "IN_APP" | "PUSH";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type ReportType =
  | "COMPLIANCE_SUMMARY"
  | "MEMBER_DIRECTORY"
  | "AUDIT_SUMMARY"
  | "INSURANCE_STATUS"
  | "LBP_STATUS"
  | "CAPA_SUMMARY"
  | "PROJECT_PORTFOLIO"
  | "TESTIMONIAL_SUMMARY"
  | "TIER_ANALYSIS";

export type ReportFormat = "PDF" | "CSV" | "XLSX" | "JSON";

// Labels
export const CERTIFICATION_TIER_LABELS: Record<CertificationTier, string> = {
  ACCREDITED: "Accredited",
  CERTIFIED: "Certified",
  MASTER_ROOFER: "Master Roofer",
};

export const ORG_MEMBER_ROLE_LABELS: Record<OrgMemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export const LBP_CLASS_LABELS: Record<LBPClass, string> = {
  CARPENTRY: "Carpentry",
  ROOFING: "Roofing",
  DESIGN_1: "Design 1",
  DESIGN_2: "Design 2",
  DESIGN_3: "Design 3",
  SITE_1: "Site 1",
  SITE_2: "Site 2",
  SITE_3: "Site 3",
};

export const LBP_STATUS_LABELS: Record<LBPStatus, string> = {
  CURRENT: "Current",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  NOT_FOUND: "Not Found",
};

export const QUALIFICATION_TYPE_LABELS: Record<QualificationType, string> = {
  NZQA: "NZQA",
  MANUFACTURER_CERT: "Manufacturer Certification",
  SAFETY: "Safety",
  FIRST_AID: "First Aid",
  SITE_SAFE: "Site Safe",
  OTHER: "Other",
};

export const CPD_CATEGORY_LABELS: Record<CPDCategory, string> = {
  TECHNICAL: "Technical",
  PEER_REVIEW: "Peer Review",
  INDUSTRY_EVENT: "Industry Event",
  SELF_STUDY: "Self Study",
  OTHER: "Other",
};

export const INSURANCE_POLICY_TYPE_LABELS: Record<InsurancePolicyType, string> =
  {
    PUBLIC_LIABILITY: "Public Liability",
    PROFESSIONAL_INDEMNITY: "Professional Indemnity",
    STATUTORY_LIABILITY: "Statutory Liability",
    EMPLOYERS_LIABILITY: "Employers Liability",
    MOTOR_VEHICLE: "Motor Vehicle",
    CONTRACT_WORKS: "Contract Works",
  };

export const ISO_ELEMENT_LABELS: Record<ISOElement, string> = {
  QUALITY_POLICY: "1. Quality Policy",
  QUALITY_OBJECTIVES: "2. Quality Objectives",
  ORG_STRUCTURE: "3. Organizational Structure",
  PROCESS_MANAGEMENT: "4. Process Management",
  DOCUMENTATION: "5. Documentation",
  TRAINING_COMPETENCE: "6. Training & Competence",
  CONTRACT_REVIEW: "7. Contract Review",
  DOCUMENT_CONTROL: "8. Document Control",
  PURCHASING: "9. Purchasing",
  CUSTOMER_PRODUCT: "10. Customer Product",
  TRACEABILITY: "11. Traceability",
  PROCESS_CONTROL: "12. Process Control",
  INSPECTION_TESTING: "13. Inspection & Testing",
  NONCONFORMING_PRODUCT: "14. Nonconforming Product",
  CORRECTIVE_ACTION: "15. Corrective Action",
  HANDLING_STORAGE: "16. Handling & Storage",
  QUALITY_RECORDS: "17. Quality Records",
  INTERNAL_AUDITS: "18. Internal Audits",
  SERVICING: "19. Servicing",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  POLICY: "Policy",
  PROCEDURE: "Procedure",
  FORM: "Form",
  RECORD: "Record",
  CERTIFICATE: "Certificate",
  OTHER: "Other",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SUPERSEDED: "Superseded",
  ARCHIVED: "Archived",
};

export const DOCUMENT_VERSION_STATUS_LABELS: Record<
  DocumentVersionStatus,
  string
> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  COMPLIANT: "Compliant",
  PARTIAL: "Partial",
  NON_COMPLIANT: "Non-Compliant",
  NOT_ASSESSED: "Not Assessed",
  NOT_APPLICABLE: "Not Applicable",
};

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  INITIAL_CERTIFICATION: "Initial Certification",
  SURVEILLANCE: "Surveillance",
  RECERTIFICATION: "Recertification",
  FOLLOW_UP: "Follow-up",
  SPECIAL: "Special",
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const AUDIT_RATING_LABELS: Record<AuditRating, string> = {
  PASS: "Pass",
  PASS_WITH_OBSERVATIONS: "Pass with Observations",
  CONDITIONAL_PASS: "Conditional Pass",
  FAIL: "Fail",
};

export const AUDIT_RESPONSE_LABELS: Record<AuditResponse, string> = {
  CONFORMING: "Conforming",
  MINOR_NONCONFORMITY: "Minor Non-conformity",
  MAJOR_NONCONFORMITY: "Major Non-conformity",
  OBSERVATION: "Observation",
  NOT_APPLICABLE: "Not Applicable",
};

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  OBSERVATION: "Observation",
  MINOR: "Minor",
  MAJOR: "Major",
  CRITICAL: "Critical",
};

export const CAPA_STATUS_LABELS: Record<CAPAStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_VERIFICATION: "Pending Verification",
  CLOSED: "Closed",
  OVERDUE: "Overdue",
};

export const CAPA_SOURCE_TYPE_LABELS: Record<CAPASourceType, string> = {
  AUDIT: "Audit",
  CUSTOMER_COMPLAINT: "Customer Complaint",
  INTERNAL_REVIEW: "Internal Review",
  INCIDENT: "Incident",
  OTHER: "Other",
};

// ISO Element Weights for Compliance Scoring
export const ISO_ELEMENT_WEIGHTS: Record<ISOElement, number> = {
  QUALITY_POLICY: 1.5,
  QUALITY_OBJECTIVES: 1.2,
  ORG_STRUCTURE: 1.0,
  PROCESS_MANAGEMENT: 1.3,
  DOCUMENTATION: 1.0,
  TRAINING_COMPETENCE: 1.4,
  CONTRACT_REVIEW: 1.0,
  DOCUMENT_CONTROL: 1.1,
  PURCHASING: 0.8,
  CUSTOMER_PRODUCT: 0.9,
  TRACEABILITY: 1.2,
  PROCESS_CONTROL: 1.3,
  INSPECTION_TESTING: 1.4,
  NONCONFORMING_PRODUCT: 1.1,
  CORRECTIVE_ACTION: 1.2,
  HANDLING_STORAGE: 0.7,
  QUALITY_RECORDS: 1.0,
  INTERNAL_AUDITS: 1.3,
  SERVICING: 0.9,
};

// All ISO elements as an array
export const ALL_ISO_ELEMENTS: ISOElement[] = [
  "QUALITY_POLICY",
  "QUALITY_OBJECTIVES",
  "ORG_STRUCTURE",
  "PROCESS_MANAGEMENT",
  "DOCUMENTATION",
  "TRAINING_COMPETENCE",
  "CONTRACT_REVIEW",
  "DOCUMENT_CONTROL",
  "PURCHASING",
  "CUSTOMER_PRODUCT",
  "TRACEABILITY",
  "PROCESS_CONTROL",
  "INSPECTION_TESTING",
  "NONCONFORMING_PRODUCT",
  "CORRECTIVE_ACTION",
  "HANDLING_STORAGE",
  "QUALITY_RECORDS",
  "INTERNAL_AUDITS",
  "SERVICING",
];

// Minimum insurance coverage requirements by tier
export const INSURANCE_REQUIREMENTS: Record<
  CertificationTier,
  Record<InsurancePolicyType, number | null>
> = {
  ACCREDITED: {
    PUBLIC_LIABILITY: 1000000,
    PROFESSIONAL_INDEMNITY: 500000,
    STATUTORY_LIABILITY: 500000,
    EMPLOYERS_LIABILITY: null,
    MOTOR_VEHICLE: null,
    CONTRACT_WORKS: null,
  },
  CERTIFIED: {
    PUBLIC_LIABILITY: 2000000,
    PROFESSIONAL_INDEMNITY: 1000000,
    STATUTORY_LIABILITY: 1000000,
    EMPLOYERS_LIABILITY: null,
    MOTOR_VEHICLE: null,
    CONTRACT_WORKS: null,
  },
  MASTER_ROOFER: {
    PUBLIC_LIABILITY: 5000000,
    PROFESSIONAL_INDEMNITY: 2000000,
    STATUTORY_LIABILITY: 1000000,
    EMPLOYERS_LIABILITY: null,
    MOTOR_VEHICLE: null,
    CONTRACT_WORKS: null,
  },
};

// Phase 3 Labels
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  NEW_BUILD: "New Build",
  REROOF: "Re-roof",
  REPAIR: "Repair",
  MAINTENANCE: "Maintenance",
  INSPECTION: "Inspection",
  WARRANTY_CLAIM: "Warranty Claim",
  OTHER: "Other",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  BEFORE: "Before",
  DURING: "During",
  AFTER: "After",
  MATERIALS: "Materials",
  SAFETY: "Safety",
  ISSUE: "Issue",
  DETAIL: "Detail",
  TESTIMONIAL: "Testimonial",
};

export const PROJECT_DOC_TYPE_LABELS: Record<ProjectDocType, string> = {
  QUOTE: "Quote",
  CONTRACT: "Contract",
  CONSENT: "Building Consent",
  SPECIFICATION: "Specification",
  WARRANTY: "Warranty",
  SIGN_OFF: "Sign-off",
  INVOICE: "Invoice",
  RECORD_OF_WORK: "Record of Work",
  OTHER: "Other",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  INSURANCE_EXPIRY: "Insurance Expiry Warning",
  INSURANCE_EXPIRED: "Insurance Expired",
  LBP_EXPIRY: "LBP Expiry Warning",
  LBP_STATUS_CHANGE: "LBP Status Changed",
  AUDIT_SCHEDULED: "Audit Scheduled",
  AUDIT_REMINDER: "Audit Reminder",
  AUDIT_COMPLETED: "Audit Completed",
  CAPA_DUE: "CAPA Due Soon",
  CAPA_OVERDUE: "CAPA Overdue",
  COMPLIANCE_ALERT: "Compliance Alert",
  DOCUMENT_REVIEW_DUE: "Document Review Due",
  TESTIMONIAL_REQUEST: "Testimonial Request",
  TESTIMONIAL_RECEIVED: "Testimonial Received",
  TIER_CHANGE: "Certification Tier Changed",
  WELCOME: "Welcome",
  SYSTEM: "System Notification",
  PROGRAMME_RENEWAL: "Programme Renewal Reminder",
  PROGRAMME_STATUS_CHANGE: "Programme Status Changed",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> =
  {
    EMAIL: "Email",
    SMS: "SMS",
    IN_APP: "In-App",
    PUSH: "Push Notification",
  };

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> =
  {
    LOW: "Low",
    NORMAL: "Normal",
    HIGH: "High",
    CRITICAL: "Critical",
  };

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  QUEUED: "Queued",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  COMPLIANCE_SUMMARY: "Compliance Summary",
  MEMBER_DIRECTORY: "Member Directory",
  AUDIT_SUMMARY: "Audit Summary",
  INSURANCE_STATUS: "Insurance Status",
  LBP_STATUS: "LBP Status",
  CAPA_SUMMARY: "CAPA Summary",
  PROJECT_PORTFOLIO: "Project Portfolio",
  TESTIMONIAL_SUMMARY: "Testimonial Summary",
  TIER_ANALYSIS: "Tier Analysis",
};

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  PDF: "PDF",
  CSV: "CSV",
  XLSX: "Excel",
  JSON: "JSON",
};

// NZ Regions for filtering
export const NZ_REGIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatu-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
] as const;

export type NZRegion = (typeof NZ_REGIONS)[number];

// ============================================================================
// Compliance Scoring Constants
// ============================================================================

/**
 * Compliance threshold values
 * These define the scoring boundaries for compliance status
 *
 * @see CLAUDE.md - Part 2: Compliance scoring thresholds
 */
export const COMPLIANCE_THRESHOLDS = {
  /** Score >= 90% = Compliant (green) */
  COMPLIANT: 90,
  /** Score >= 70% = At Risk (yellow) */
  AT_RISK: 70,
  /** Score < 70% = Critical (red) */
  CRITICAL: 0,
} as const;

/**
 * Helper function to get compliance status level from score
 * Replaces hardcoded threshold logic throughout the codebase
 */
export function getComplianceStatusLevel(score: number): 'compliant' | 'at-risk' | 'critical' {
  if (score >= COMPLIANCE_THRESHOLDS.COMPLIANT) return 'compliant';
  if (score >= COMPLIANCE_THRESHOLDS.AT_RISK) return 'at-risk';
  return 'critical';
}

/**
 * Type-safe status metadata for UI components
 */
export const COMPLIANCE_STATUS_METADATA = {
  compliant: { label: 'Compliant', color: 'green', textColor: 'text-green-600', bgGradient: 'from-green-500 to-green-600' },
  'at-risk': { label: 'At Risk', color: 'yellow', textColor: 'text-yellow-600', bgGradient: 'from-yellow-500 to-yellow-600' },
  critical: { label: 'Critical', color: 'red', textColor: 'text-red-600', bgGradient: 'from-red-500 to-red-600' },
} as const;

export type ComplianceStatusLevel = keyof typeof COMPLIANCE_STATUS_METADATA;

// ============================================================================
// File Upload Constants
// ============================================================================

/**
 * Maximum file size for uploads (50MB)
 * Used by document and insurance upload endpoints
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_MB = 50;

// ============================================================================
// NZBN Validation
// ============================================================================

/**
 * New Zealand Business Number (NZBN) validation regex
 * NZBN is exactly 13 digits
 */
export const NZBN_REGEX = /^\d{13}$/;
