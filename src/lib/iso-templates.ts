import type { ISOElement } from "@prisma/client";

export interface ISOTemplateGuide {
  element: ISOElement;
  name: string;
  number: number;
  description: string;
  requiredDocumentTypes: string[];
  exampleDocuments: { title: string; type: string; description: string }[];
  auditorChecklist: string[];
  guidance: string;
}

export const ISO_TEMPLATE_GUIDES: Record<ISOElement, ISOTemplateGuide> = {
  QUALITY_POLICY: {
    element: "QUALITY_POLICY",
    name: "Quality Policy",
    number: 1,
    description:
      "A documented quality policy statement that defines the organization's commitment to quality and continuous improvement in roofing services.",
    requiredDocumentTypes: ["POLICY"],
    exampleDocuments: [
      {
        title: "Quality Policy Statement",
        type: "POLICY",
        description:
          "A signed statement from the business owner/director outlining the company's commitment to quality, customer satisfaction, and compliance with NZ building standards.",
      },
      {
        title: "Quality Policy Communication Record",
        type: "RECORD",
        description:
          "Evidence that the quality policy has been communicated to all employees (e.g., meeting minutes, signed acknowledgement forms).",
      },
    ],
    auditorChecklist: [
      "Is there a documented quality policy appropriate to the organization's purpose?",
      "Is the quality policy communicated and understood by all employees?",
      "Is the quality policy reviewed at planned intervals?",
    ],
    guidance:
      "Your quality policy should be a concise statement (1-2 pages) signed by the business owner. It should reference your commitment to RANZ standards, the NZ Building Code, and continuous improvement. Display it prominently in your workplace.",
  },
  QUALITY_OBJECTIVES: {
    element: "QUALITY_OBJECTIVES",
    name: "Quality Objectives",
    number: 2,
    description:
      "Measurable quality objectives that are aligned with the quality policy and tracked over time.",
    requiredDocumentTypes: ["POLICY", "RECORD"],
    exampleDocuments: [
      {
        title: "Annual Quality Objectives",
        type: "POLICY",
        description:
          "A document listing measurable quality targets for the year (e.g., zero leaks warranty claims, 95% on-time completion).",
      },
      {
        title: "KPI Tracking Spreadsheet",
        type: "RECORD",
        description:
          "A spreadsheet or report showing monthly/quarterly tracking of quality objectives against targets.",
      },
    ],
    auditorChecklist: [
      "Are quality objectives established at relevant functions and levels?",
      "Are objectives consistent with the quality policy?",
      "Are objectives measurable and monitored?",
    ],
    guidance:
      "Set 3-5 measurable objectives each year. Good examples: 'Achieve zero leak callbacks within 12 months of completion', 'Complete all projects within 10% of quoted timeframe', 'Maintain 4.5+ customer satisfaction rating'.",
  },
  ORG_STRUCTURE: {
    element: "ORG_STRUCTURE",
    name: "Organizational Structure",
    number: 3,
    description:
      "Documented organizational structure with clear roles, responsibilities, and authorities.",
    requiredDocumentTypes: ["POLICY", "FORM"],
    exampleDocuments: [
      {
        title: "Organization Chart",
        type: "FORM",
        description:
          "A visual chart showing reporting lines, roles, and responsibilities within the business.",
      },
      {
        title: "Job Descriptions",
        type: "POLICY",
        description:
          "Written job descriptions for each role, including quality responsibilities.",
      },
    ],
    auditorChecklist: [
      "Is there a defined organizational structure with clear roles and responsibilities?",
      "Is a management representative appointed for quality?",
      "Are authorities and interrelationships defined and communicated?",
    ],
    guidance:
      "Even small businesses need a simple org chart. Identify who is responsible for quality management, site supervision, and customer communication. Include subcontractor relationships where applicable.",
  },
  PROCESS_MANAGEMENT: {
    element: "PROCESS_MANAGEMENT",
    name: "Process Management",
    number: 4,
    description:
      "Identification and documentation of core business processes and their interactions.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Business Process Map",
        type: "PROCEDURE",
        description:
          "A flowchart or diagram showing how your core processes (quoting, project delivery, handover) connect together.",
      },
      {
        title: "Process Monitoring Checklist",
        type: "FORM",
        description:
          "A checklist used to monitor key process metrics and effectiveness.",
      },
    ],
    auditorChecklist: [
      "Are core business processes identified and documented?",
      "Are process interactions defined?",
      "Are processes monitored for effectiveness?",
    ],
    guidance:
      "Map your business from enquiry to project completion. Key processes typically include: quoting, contract review, material procurement, installation, inspection, handover, and warranty service.",
  },
  DOCUMENTATION: {
    element: "DOCUMENTATION",
    name: "Documentation",
    number: 5,
    description:
      "A quality manual or equivalent documentation describing the management system.",
    requiredDocumentTypes: ["POLICY"],
    exampleDocuments: [
      {
        title: "Quality Manual",
        type: "POLICY",
        description:
          "A document describing how your quality management system works, referencing procedures for each ISO element.",
      },
    ],
    auditorChecklist: [
      "Is there a quality manual or equivalent documentation?",
      "Are procedures documented as required by the organization?",
      "Is documentation adequate to ensure effective operation and control of processes?",
    ],
    guidance:
      "Your quality manual doesn't need to be lengthy. A 10-20 page document that describes your QMS, references your procedures, and explains how you address each of the 19 ISO elements is sufficient.",
  },
  TRAINING_COMPETENCE: {
    element: "TRAINING_COMPETENCE",
    name: "Training & Competence",
    number: 6,
    description:
      "Training records, competency assessments, and continuing professional development for all personnel.",
    requiredDocumentTypes: ["RECORD", "CERTIFICATE", "FORM"],
    exampleDocuments: [
      {
        title: "Staff Training Register",
        type: "RECORD",
        description:
          "A register listing all staff training, qualifications, and certification dates.",
      },
      {
        title: "Competency Matrix",
        type: "FORM",
        description:
          "A matrix mapping required competencies to each role and showing current qualification status.",
      },
      {
        title: "LBP License Copies",
        type: "CERTIFICATE",
        description:
          "Copies of current Licensed Building Practitioner licenses for all licensed staff.",
      },
      {
        title: "Site Safe Passport",
        type: "CERTIFICATE",
        description:
          "Current Site Safe training certificates for all on-site personnel.",
      },
    ],
    auditorChecklist: [
      "Are competence requirements determined for personnel affecting quality?",
      "Is training provided to achieve necessary competence?",
      "Are training records maintained?",
      "Are LBP licenses current and appropriate for work undertaken?",
    ],
    guidance:
      "Maintain a training register for all staff. Include LBP licenses, Site Safe, first aid, manufacturer certifications, and any other relevant qualifications. Track CPD points and set annual training targets.",
  },
  CONTRACT_REVIEW: {
    element: "CONTRACT_REVIEW",
    name: "Contract Review",
    number: 7,
    description:
      "A process for reviewing customer requirements, assessing capability, and managing contract changes.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Quote/Tender Review Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how quotes and tenders are reviewed before submission, including capacity and capability assessment.",
      },
      {
        title: "Contract Review Checklist",
        type: "FORM",
        description:
          "A checklist used when reviewing new contracts to ensure all requirements are understood and achievable.",
      },
    ],
    auditorChecklist: [
      "Are customer requirements reviewed before acceptance?",
      "Are capability and capacity assessed before contract acceptance?",
      "Are contract changes managed and documented?",
    ],
    guidance:
      "Before accepting any job, review the scope, specifications, consent requirements, and your capacity to deliver. Document any variations or changes agreed with the client.",
  },
  DOCUMENT_CONTROL: {
    element: "DOCUMENT_CONTROL",
    name: "Document Control",
    number: 8,
    description:
      "A system for controlling documents including approval, distribution, revision, and disposal of obsolete versions.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Document Control Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how documents are approved, distributed, revised, and obsolete versions controlled.",
      },
      {
        title: "Document Register / Master List",
        type: "FORM",
        description:
          "A master list of all controlled documents showing current version, approval status, and review dates.",
      },
    ],
    auditorChecklist: [
      "Are documents approved before issue?",
      "Are current versions of documents available at points of use?",
      "Are obsolete documents prevented from unintended use?",
      "Is there a master list or equivalent document register?",
    ],
    guidance:
      "The RANZ portal handles much of this automatically with version control and approval workflows. Ensure your physical documents (site copies, printed procedures) are also controlled.",
  },
  PURCHASING: {
    element: "PURCHASING",
    name: "Purchasing",
    number: 9,
    description:
      "Controls for evaluating and selecting suppliers and ensuring purchased materials meet quality requirements.",
    requiredDocumentTypes: ["PROCEDURE", "RECORD"],
    exampleDocuments: [
      {
        title: "Approved Supplier List",
        type: "RECORD",
        description:
          "A list of approved suppliers with evaluation criteria, APEX certification status, and review dates.",
      },
      {
        title: "Purchasing Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how materials are ordered, specifying requirements, and verifying deliveries.",
      },
    ],
    auditorChecklist: [
      "Are suppliers evaluated and selected based on quality criteria?",
      "Do purchase orders clearly specify requirements?",
      "Are APEX-certified products prioritized where available?",
    ],
    guidance:
      "Maintain a list of approved suppliers. Prioritise APEX-certified products where available. When ordering, clearly specify material requirements (profile, gauge, colour, coating).",
  },
  CUSTOMER_PRODUCT: {
    element: "CUSTOMER_PRODUCT",
    name: "Customer Product",
    number: 10,
    description:
      "Controls for identifying, verifying, and protecting customer-supplied property.",
    requiredDocumentTypes: ["PROCEDURE"],
    exampleDocuments: [
      {
        title: "Customer Property Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how customer-supplied materials, site access, and existing structures are identified and protected.",
      },
    ],
    auditorChecklist: [
      "Is customer-supplied property identified and protected?",
      "Is customer property damage/loss reported and recorded?",
    ],
    guidance:
      "This covers anything the customer provides: existing roof structures, supplied materials, site access, and personal property. Have a process for documenting pre-existing conditions and reporting any damage.",
  },
  TRACEABILITY: {
    element: "TRACEABILITY",
    name: "Traceability",
    number: 11,
    description:
      "Systems for tracing materials, products, and work through the project lifecycle.",
    requiredDocumentTypes: ["RECORD", "FORM"],
    exampleDocuments: [
      {
        title: "Material Traceability Record",
        type: "RECORD",
        description:
          "Records showing material batch numbers, suppliers, and which projects they were used on.",
      },
      {
        title: "Project Job File Template",
        type: "FORM",
        description:
          "A standard job file template that captures all project records, worker assignments, and material usage.",
      },
    ],
    auditorChecklist: [
      "Can products/materials be traced through project lifecycle?",
      "Are project records maintained with adequate detail?",
      "Can specific workers be identified for completed work?",
    ],
    guidance:
      "Record batch numbers and suppliers for all materials used on each project. Keep timesheets showing which workers were on which projects. This is critical for warranty claims and liability.",
  },
  PROCESS_CONTROL: {
    element: "PROCESS_CONTROL",
    name: "Process Control",
    number: 12,
    description:
      "Controls for ensuring work processes are carried out under specified conditions with suitable equipment.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Work Instructions",
        type: "PROCEDURE",
        description:
          "Step-by-step instructions for critical roofing processes (e.g., membrane installation, flashing details, penetration sealing).",
      },
      {
        title: "Equipment Register",
        type: "RECORD",
        description:
          "A register of tools and equipment with calibration/maintenance schedules.",
      },
    ],
    auditorChecklist: [
      "Are work processes controlled under specified conditions?",
      "Is suitable equipment used and maintained?",
      "Are critical process parameters monitored?",
    ],
    guidance:
      "Document your critical installation processes. Reference manufacturer specifications and the RANZ Code of Practice. Maintain equipment in good working order with regular checks.",
  },
  INSPECTION_TESTING: {
    element: "INSPECTION_TESTING",
    name: "Inspection & Testing",
    number: 13,
    description:
      "Processes for inspecting incoming materials, in-process work, and final project completion.",
    requiredDocumentTypes: ["FORM", "RECORD"],
    exampleDocuments: [
      {
        title: "Material Delivery Inspection Checklist",
        type: "FORM",
        description:
          "A checklist for inspecting materials on delivery (correct product, quantity, no damage, matching order).",
      },
      {
        title: "In-Process Inspection Checklist",
        type: "FORM",
        description:
          "A checklist for key hold points during installation (e.g., underlay, flashings, fixings, completion).",
      },
      {
        title: "Final Completion Checklist",
        type: "FORM",
        description:
          "A comprehensive sign-off checklist used before project handover to the client.",
      },
    ],
    auditorChecklist: [
      "Are incoming materials inspected or verified?",
      "Are in-process inspections performed?",
      "Is final inspection performed before project handover?",
    ],
    guidance:
      "Inspect materials on delivery. Define hold points during installation where work must be checked before proceeding. Complete a final inspection checklist before handover.",
  },
  NONCONFORMING_PRODUCT: {
    element: "NONCONFORMING_PRODUCT",
    name: "Nonconforming Product",
    number: 14,
    description:
      "A system for identifying, recording, and disposing of work or materials that don't meet requirements.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Non-Conformance Report (NCR) Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how nonconformities are identified, recorded, assessed, and resolved.",
      },
      {
        title: "NCR Form Template",
        type: "FORM",
        description:
          "A standard form for recording nonconformities, including description, cause, disposition, and sign-off.",
      },
    ],
    auditorChecklist: [
      "Are nonconformities identified and controlled?",
      "Is there a process for disposition of nonconforming work?",
      "Are concessions documented when accepted?",
    ],
    guidance:
      "When work doesn't meet specification, record it formally. Decide on disposition: rework, accept with concession, or reject. Track NCRs to identify recurring issues.",
  },
  CORRECTIVE_ACTION: {
    element: "CORRECTIVE_ACTION",
    name: "Corrective Action",
    number: 15,
    description:
      "Processes for investigating root causes of problems and implementing corrective and preventive actions.",
    requiredDocumentTypes: ["PROCEDURE", "RECORD"],
    exampleDocuments: [
      {
        title: "CAPA Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how corrective and preventive actions are raised, investigated, implemented, and verified.",
      },
      {
        title: "Root Cause Analysis Template",
        type: "FORM",
        description:
          "A template for conducting root cause analysis (e.g., 5 Whys, fishbone diagram) on significant issues.",
      },
    ],
    auditorChecklist: [
      "Is there a process for investigating root causes of problems?",
      "Are corrective actions implemented and verified effective?",
      "Are lessons learned documented and shared?",
    ],
    guidance:
      "The RANZ portal includes a CAPA tracking system. Use it to record issues, investigate root causes, implement corrective actions, and verify they're effective. Share lessons learned with your team.",
  },
  HANDLING_STORAGE: {
    element: "HANDLING_STORAGE",
    name: "Handling & Storage",
    number: 16,
    description:
      "Controls for handling, storing, and protecting materials to prevent damage or deterioration.",
    requiredDocumentTypes: ["PROCEDURE"],
    exampleDocuments: [
      {
        title: "Material Handling & Storage Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how roofing materials are received, stored, handled on site, and protected from damage.",
      },
    ],
    auditorChecklist: [
      "Are materials handled to prevent damage or deterioration?",
      "Are storage conditions appropriate for materials used?",
      "Is stock rotation practiced (FIFO)?",
    ],
    guidance:
      "Follow manufacturer guidance for storing materials. Protect long-run steel from moisture and scratching. Store membranes out of direct sunlight. Use FIFO stock rotation to prevent aging.",
  },
  QUALITY_RECORDS: {
    element: "QUALITY_RECORDS",
    name: "Quality Records",
    number: 17,
    description:
      "Systems for identifying, storing, retrieving, and retaining quality records.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Records Management Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how quality records are identified, stored, protected, and how long they're retained.",
      },
      {
        title: "Records Retention Schedule",
        type: "FORM",
        description:
          "A schedule listing each record type, storage location, retention period, and disposal method.",
      },
    ],
    auditorChecklist: [
      "Are quality records identified and controlled?",
      "Are records legible and retrievable?",
      "Are retention periods defined and followed?",
    ],
    guidance:
      "The RANZ portal serves as your primary quality records repository. Define retention periods (minimum 10 years for building work per NZ Building Act). Ensure paper records are also properly filed and protected.",
  },
  INTERNAL_AUDITS: {
    element: "INTERNAL_AUDITS",
    name: "Internal Audits",
    number: 18,
    description:
      "A planned program of internal audits to verify the quality management system is effective.",
    requiredDocumentTypes: ["PROCEDURE", "RECORD"],
    exampleDocuments: [
      {
        title: "Internal Audit Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how internal audits are planned, conducted, reported, and followed up.",
      },
      {
        title: "Annual Audit Schedule",
        type: "RECORD",
        description:
          "A schedule showing planned internal audits across the year, covering all ISO elements.",
      },
    ],
    auditorChecklist: [
      "Is there a planned internal audit program?",
      "Are audits conducted by competent, independent auditors?",
      "Are audit findings followed up and closed out?",
    ],
    guidance:
      "Plan to audit each ISO element at least once per year. For small businesses, consider engaging another RANZ member for independent auditing. Record findings and follow up with corrective actions.",
  },
  SERVICING: {
    element: "SERVICING",
    name: "Servicing",
    number: 19,
    description:
      "Processes for managing warranty work, callbacks, customer feedback, and maintenance recommendations.",
    requiredDocumentTypes: ["PROCEDURE", "FORM"],
    exampleDocuments: [
      {
        title: "Warranty & Callback Procedure",
        type: "PROCEDURE",
        description:
          "A procedure describing how warranty claims and callbacks are received, assessed, actioned, and recorded.",
      },
      {
        title: "Customer Feedback Form",
        type: "FORM",
        description:
          "A form or survey for collecting customer feedback after project completion.",
      },
      {
        title: "Maintenance Schedule Template",
        type: "FORM",
        description:
          "A template provided to customers with recommended maintenance schedules for their roofing system.",
      },
    ],
    auditorChecklist: [
      "Is warranty/callback work managed and tracked?",
      "Is customer feedback collected and acted upon?",
      "Are maintenance recommendations provided to customers?",
    ],
    guidance:
      "Track all warranty claims and callbacks. Collect customer feedback on every project. Provide clients with a maintenance schedule specific to their roofing system. Use the RANZ portal's project module to manage this.",
  },
};

/**
 * Get all template guides as an array sorted by element number.
 */
export function getAllTemplateGuides(): ISOTemplateGuide[] {
  return Object.values(ISO_TEMPLATE_GUIDES).sort(
    (a, b) => a.number - b.number
  );
}
