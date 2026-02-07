# ISO 9000 Quality Management Elements

## The 19 Elements

| # | Element | Enum Value | Typical Documents |
|---|---------|-----------|-------------------|
| 1 | Quality Policy | QUALITY_POLICY | Statement of quality commitment |
| 2 | Quality Objectives | QUALITY_OBJECTIVES | Measurable quality goals |
| 3 | Organizational Structure | ORG_STRUCTURE | Org chart, responsibility matrix |
| 4 | Process Management | PROCESS_MANAGEMENT | Process maps, procedures |
| 5 | Documentation | DOCUMENTATION | Document control procedures |
| 6 | Training & Competence | TRAINING_COMPETENCE | Training records, competency matrices |
| 7 | Contract Review | CONTRACT_REVIEW | Contract review procedures |
| 8 | Document Control | DOCUMENT_CONTROL | Version control, distribution lists |
| 9 | Purchasing | PURCHASING | Approved supplier lists, PO procedures |
| 10 | Customer-Supplied Product | CUSTOMER_PRODUCT | Customer material handling procedures |
| 11 | Traceability | TRACEABILITY | Product/material tracking procedures |
| 12 | Process Control | PROCESS_CONTROL | Work instructions, inspection plans |
| 13 | Inspection & Testing | INSPECTION_TESTING | Inspection checklists, test records |
| 14 | Nonconforming Product | NONCONFORMING_PRODUCT | NCR procedures, disposition records |
| 15 | Corrective Action | CORRECTIVE_ACTION | CAR procedures, root cause analysis |
| 16 | Handling & Storage | HANDLING_STORAGE | Material handling, storage procedures |
| 17 | Quality Records | QUALITY_RECORDS | Records retention, indexing |
| 18 | Internal Audits | INTERNAL_AUDITS | Audit schedules, checklists, reports |
| 19 | Servicing | SERVICING | Warranty procedures, service records |

## How the Portal Addresses Each Element

### Well-Covered Elements
- **Element 5 (Documentation):** Full document management with version control, approval workflows
- **Element 8 (Document Control):** Auto-numbering, version history, SHA-256 integrity, soft delete
- **Element 14 (Nonconforming Product):** CAPA system with severity, root cause, corrective/preventive actions
- **Element 15 (Corrective Action):** Full CAPA lifecycle (OPEN → IN_PROGRESS → PENDING_VERIFICATION → CLOSED)
- **Element 17 (Quality Records):** Immutable audit log with hash chain, 15-year retention design
- **Element 18 (Internal Audits):** Audit scheduling, checklists per ISO element, rating system, follow-up tracking

### Partially Covered Elements
- **Element 6 (Training & Competence):** LBP verification exists, CPD fields on model but no tracking UI/pages
- **Element 9 (Purchasing):** Certified products declaration exists for projects, but no approved supplier list
- **Element 11 (Traceability):** Batch/lot numbers on product usage, project photos with GPS
- **Element 13 (Inspection & Testing):** Planned integration with Roofing Reports app (not yet connected)

### Minimal Coverage (Upload-Only)
- **Elements 1-4, 7, 10, 12, 16, 19:** Members can upload documents tagged to these elements, but no guided templates, no workflow automation, no element-specific features

## Document Types per Element
Documents can be classified as: POLICY, PROCEDURE, FORM, RECORD, CERTIFICATE, OTHER

## Compliance Assessment
Each element gets a ComplianceAssessment record with:
- Status: COMPLIANT, PARTIAL, NON_COMPLIANT, NOT_ASSESSED, NOT_APPLICABLE
- Score: 0-100
- Weight: configurable importance factor
- Evidence: linked document IDs
- Review schedule: nextReviewDue date
