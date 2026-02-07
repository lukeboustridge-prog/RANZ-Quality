# Database Schema

Full schema: `prisma/schema.prisma` (1284 lines)

## Core Models

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| `Organization` | Member business entity | members, documents, insurance, audits, CAPA, assessments, projects, testimonials |
| `OrganizationMember` | Staff within a business | LBP credentials, role |
| `InsurancePolicy` | Insurance coverage tracking | 90/60/30-day alert flags |
| `Document` | QMS documentation per ISO element | versions, approval workflow |
| `DocumentVersion` | Immutable version history | SHA-256 file hash, approval chain |
| `ComplianceAssessment` | Per-element compliance scoring | unique per org+element |
| `Audit` | Internal/external audit records | checklist items, CAPA links |
| `AuditChecklist` | Audit questions + responses per ISO element | evidence keys, findings |
| `CAPARecord` | Corrective/Preventive Actions | severity, assignment, verification |
| `AuditLog` | Immutable event sourcing | SHA-256 hash chain, tamper evidence |
| `Project` | Completed works evidence | photos, documents, products |
| `ProjectPhoto` | GPS-tagged project photos | categories, EXIF metadata |
| `ProjectDocument` | Project supporting documents | quotes, contracts, warranties |
| `CertifiedProductUsage` | APEX product declarations per project | batch/lot traceability |
| `Testimonial` | Client feedback with verification | email verification token |
| `Notification` | Multi-channel notification records | scheduling, retry, delivery tracking |
| `NotificationPreference` | Per-user notification opt-in/out | email + SMS by category |
| `OrganizationNotificationPreference` | Org-level notification routing | override contact info |
| `Report` | Generated report tracking | parameters, storage key |

## Custom Auth Models (Migration System)
| Model | Purpose |
|-------|---------|
| `AuthUser` | Custom auth users (parallel to Clerk) |
| `AuthCompany` | Company entity for custom auth |
| `AuthSession` | JWT session management with revocation |
| `AuthPasswordReset` | Password reset tokens (1hr expiry) |
| `AuthUserPermission` | Granular per-app permissions |
| `AuthAuditLog` | Auth-specific audit logging |

## Key Enums

- **CertificationTier:** ACCREDITED, CERTIFIED, MASTER_ROOFER
- **ISOElement:** 19 elements (QUALITY_POLICY through SERVICING)
- **InsurancePolicyType:** PUBLIC_LIABILITY, PROFESSIONAL_INDEMNITY, STATUTORY_LIABILITY, EMPLOYERS_LIABILITY, MOTOR_VEHICLE, CONTRACT_WORKS
- **LBPClass:** CARPENTRY, ROOFING, DESIGN_1-3, SITE_1-3
- **LBPStatus:** CURRENT, SUSPENDED, CANCELLED, EXPIRED, NOT_FOUND
- **DocumentStatus:** DRAFT, PENDING_APPROVAL, APPROVED, SUPERSEDED, ARCHIVED
- **AuditType:** INITIAL_CERTIFICATION, SURVEILLANCE, RECERTIFICATION, FOLLOW_UP, SPECIAL
- **AuditRating:** PASS, PASS_WITH_OBSERVATIONS, CONDITIONAL_PASS, FAIL
- **CAPAStatus:** OPEN, IN_PROGRESS, PENDING_VERIFICATION, CLOSED, OVERDUE
- **NotificationType:** 17 types covering insurance, LBP, audit, CAPA, compliance, testimonials, system

## Compliance Scoring Weights
- Documentation: 50% (weighted by ISO element importance)
- Insurance: 25% (per-tier minimum coverage requirements)
- Personnel: 15% (owner, LBP verification, staff count)
- Audit: 10% (last audit rating, CAPA status)
