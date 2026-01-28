import type { ISOElement } from "@prisma/client";

export interface AuditQuestion {
  questionNumber: number;
  questionText: string;
  guidance?: string;
  evidenceRequired?: string[];
}

export const AUDIT_QUESTIONS: Record<ISOElement, AuditQuestion[]> = {
  QUALITY_POLICY: [
    {
      questionNumber: 1,
      questionText:
        "Is there a documented quality policy that is appropriate to the organization's purpose?",
      guidance:
        "The policy should be relevant to roofing services and aligned with RANZ standards",
      evidenceRequired: ["Quality Policy document"],
    },
    {
      questionNumber: 2,
      questionText:
        "Is the quality policy communicated and understood by all employees?",
      guidance: "Check for evidence of policy communication (training records, signage)",
    },
    {
      questionNumber: 3,
      questionText: "Is the quality policy reviewed at planned intervals?",
      guidance: "Typically annually - check review records",
    },
  ],
  QUALITY_OBJECTIVES: [
    {
      questionNumber: 1,
      questionText:
        "Are quality objectives established at relevant functions and levels?",
      guidance: "Objectives should be measurable and time-bound",
      evidenceRequired: ["Quality objectives document", "KPI records"],
    },
    {
      questionNumber: 2,
      questionText: "Are objectives consistent with the quality policy?",
    },
    {
      questionNumber: 3,
      questionText: "Are objectives measurable and monitored?",
      evidenceRequired: ["Performance metrics", "Review meeting minutes"],
    },
  ],
  ORG_STRUCTURE: [
    {
      questionNumber: 1,
      questionText:
        "Is there a defined organizational structure with clear roles and responsibilities?",
      evidenceRequired: ["Org chart", "Job descriptions"],
    },
    {
      questionNumber: 2,
      questionText: "Is a management representative appointed for quality?",
    },
    {
      questionNumber: 3,
      questionText: "Are authorities and interrelationships defined and communicated?",
    },
  ],
  PROCESS_MANAGEMENT: [
    {
      questionNumber: 1,
      questionText: "Are core business processes identified and documented?",
      evidenceRequired: ["Process maps", "Procedure documents"],
    },
    {
      questionNumber: 2,
      questionText: "Are process interactions defined?",
    },
    {
      questionNumber: 3,
      questionText: "Are processes monitored for effectiveness?",
      evidenceRequired: ["Process metrics", "Review records"],
    },
  ],
  DOCUMENTATION: [
    {
      questionNumber: 1,
      questionText: "Is there a quality manual or equivalent documentation?",
      evidenceRequired: ["Quality manual or management system description"],
    },
    {
      questionNumber: 2,
      questionText: "Are procedures documented as required by the organization?",
    },
    {
      questionNumber: 3,
      questionText:
        "Is documentation adequate to ensure effective operation and control of processes?",
    },
  ],
  TRAINING_COMPETENCE: [
    {
      questionNumber: 1,
      questionText:
        "Are competence requirements determined for personnel affecting quality?",
      evidenceRequired: ["Competency matrix", "Job specifications"],
    },
    {
      questionNumber: 2,
      questionText: "Is training provided to achieve necessary competence?",
      evidenceRequired: ["Training records", "Certificates"],
    },
    {
      questionNumber: 3,
      questionText: "Are training records maintained?",
    },
    {
      questionNumber: 4,
      questionText: "Are LBP licenses current and appropriate for work undertaken?",
      evidenceRequired: ["LBP register", "License copies"],
    },
  ],
  CONTRACT_REVIEW: [
    {
      questionNumber: 1,
      questionText: "Are customer requirements reviewed before acceptance?",
      evidenceRequired: ["Quote/tender review records", "Contracts"],
    },
    {
      questionNumber: 2,
      questionText: "Are capability and capacity assessed before contract acceptance?",
    },
    {
      questionNumber: 3,
      questionText: "Are contract changes managed and documented?",
      evidenceRequired: ["Variation records"],
    },
  ],
  DOCUMENT_CONTROL: [
    {
      questionNumber: 1,
      questionText: "Are documents approved before issue?",
      evidenceRequired: ["Approval records", "Document register"],
    },
    {
      questionNumber: 2,
      questionText:
        "Are current versions of documents available at points of use?",
    },
    {
      questionNumber: 3,
      questionText: "Are obsolete documents prevented from unintended use?",
    },
    {
      questionNumber: 4,
      questionText: "Is there a master list or equivalent document register?",
      evidenceRequired: ["Document register/master list"],
    },
  ],
  PURCHASING: [
    {
      questionNumber: 1,
      questionText: "Are suppliers evaluated and selected based on quality criteria?",
      evidenceRequired: ["Approved supplier list", "Evaluation records"],
    },
    {
      questionNumber: 2,
      questionText:
        "Do purchase orders clearly specify requirements?",
    },
    {
      questionNumber: 3,
      questionText: "Are APEX-certified products prioritized where available?",
      evidenceRequired: ["Product specifications", "Supplier certificates"],
    },
  ],
  CUSTOMER_PRODUCT: [
    {
      questionNumber: 1,
      questionText: "Is customer-supplied property identified and protected?",
      guidance: "Includes customer materials, site access, existing structures",
    },
    {
      questionNumber: 2,
      questionText:
        "Is customer property damage/loss reported and recorded?",
    },
  ],
  TRACEABILITY: [
    {
      questionNumber: 1,
      questionText: "Can products/materials be traced through project lifecycle?",
      evidenceRequired: ["Material records", "Batch numbers"],
    },
    {
      questionNumber: 2,
      questionText: "Are project records maintained with adequate detail?",
      evidenceRequired: ["Job files", "Site records"],
    },
    {
      questionNumber: 3,
      questionText: "Can specific workers be identified for completed work?",
      evidenceRequired: ["Timesheets", "Work assignments"],
    },
  ],
  PROCESS_CONTROL: [
    {
      questionNumber: 1,
      questionText: "Are work processes controlled under specified conditions?",
      evidenceRequired: ["Work instructions", "Checklists"],
    },
    {
      questionNumber: 2,
      questionText: "Is suitable equipment used and maintained?",
      evidenceRequired: ["Equipment register", "Maintenance records"],
    },
    {
      questionNumber: 3,
      questionText: "Are critical process parameters monitored?",
    },
  ],
  INSPECTION_TESTING: [
    {
      questionNumber: 1,
      questionText: "Are incoming materials inspected or verified?",
      evidenceRequired: ["Delivery records", "Inspection records"],
    },
    {
      questionNumber: 2,
      questionText: "Are in-process inspections performed?",
      evidenceRequired: ["Inspection checklists", "Hold point records"],
    },
    {
      questionNumber: 3,
      questionText: "Is final inspection performed before project handover?",
      evidenceRequired: ["Completion checklists", "Sign-off records"],
    },
  ],
  NONCONFORMING_PRODUCT: [
    {
      questionNumber: 1,
      questionText: "Are nonconformities identified and controlled?",
      evidenceRequired: ["NCR register", "Defect reports"],
    },
    {
      questionNumber: 2,
      questionText: "Is there a process for disposition of nonconforming work?",
    },
    {
      questionNumber: 3,
      questionText: "Are concessions documented when accepted?",
    },
  ],
  CORRECTIVE_ACTION: [
    {
      questionNumber: 1,
      questionText: "Is there a process for investigating root causes of problems?",
      evidenceRequired: ["CAPA procedure", "Investigation records"],
    },
    {
      questionNumber: 2,
      questionText: "Are corrective actions implemented and verified effective?",
      evidenceRequired: ["CAPA register", "Verification records"],
    },
    {
      questionNumber: 3,
      questionText: "Are lessons learned documented and shared?",
    },
  ],
  HANDLING_STORAGE: [
    {
      questionNumber: 1,
      questionText: "Are materials handled to prevent damage or deterioration?",
    },
    {
      questionNumber: 2,
      questionText: "Are storage conditions appropriate for materials used?",
      evidenceRequired: ["Storage area inspection"],
    },
    {
      questionNumber: 3,
      questionText: "Is stock rotation practiced (FIFO)?",
    },
  ],
  QUALITY_RECORDS: [
    {
      questionNumber: 1,
      questionText: "Are quality records identified and controlled?",
      evidenceRequired: ["Records list", "Filing system"],
    },
    {
      questionNumber: 2,
      questionText: "Are records legible and retrievable?",
    },
    {
      questionNumber: 3,
      questionText: "Are retention periods defined and followed?",
      evidenceRequired: ["Retention schedule"],
    },
  ],
  INTERNAL_AUDITS: [
    {
      questionNumber: 1,
      questionText: "Is there a planned internal audit program?",
      evidenceRequired: ["Audit schedule", "Audit plan"],
    },
    {
      questionNumber: 2,
      questionText: "Are audits conducted by competent, independent auditors?",
      evidenceRequired: ["Auditor qualifications", "Independence records"],
    },
    {
      questionNumber: 3,
      questionText: "Are audit findings followed up and closed out?",
      evidenceRequired: ["Audit reports", "Follow-up records"],
    },
  ],
  SERVICING: [
    {
      questionNumber: 1,
      questionText: "Is warranty/callback work managed and tracked?",
      evidenceRequired: ["Warranty register", "Callback records"],
    },
    {
      questionNumber: 2,
      questionText: "Is customer feedback collected and acted upon?",
      evidenceRequired: ["Feedback forms", "Customer surveys"],
    },
    {
      questionNumber: 3,
      questionText: "Are maintenance recommendations provided to customers?",
    },
  ],
};

export function getAuditQuestionsForElements(
  elements: ISOElement[]
): { element: ISOElement; questions: AuditQuestion[] }[] {
  return elements.map((element) => ({
    element,
    questions: AUDIT_QUESTIONS[element] || [],
  }));
}

export function getTotalQuestionCount(elements: ISOElement[]): number {
  return elements.reduce(
    (total, element) => total + (AUDIT_QUESTIONS[element]?.length || 0),
    0
  );
}
