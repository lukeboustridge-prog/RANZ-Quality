# RANZ Certified Business Programme Portal: Complete Technical Design

The Roofing Association of New Zealand's Certified Business Programme Portal represents a strategic digital infrastructure investment that transforms compliance from administrative burden to competitive advantage. This comprehensive design integrates with the existing RANZ Roofing Reports application to create an ecosystem where **certified businesses using certified products** become verifiable, insurable, and defensible in both market and legal contexts.

---

## Part 1: Technical Architecture

### SSO integration using Clerk satellite domains

The multi-application authentication architecture leverages Clerk's satellite domains feature to share authentication state seamlessly between the existing Roofing Reports app and the new Certified Business Portal.

**Primary/Satellite Configuration:**
- **Primary Domain:** `portal.ranz.org.nz` (Certified Business Portal — handles all sign-in/sign-up flows)
- **Satellite Domain:** `reports.ranz.org.nz` (Roofing Reports app — reads auth state from primary)

The satellite configuration requires specific environment variables on each application:

```env
# Certified Business Portal (Primary)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Roofing Reports App (Satellite)
NEXT_PUBLIC_CLERK_IS_SATELLITE=true
NEXT_PUBLIC_CLERK_DOMAIN=reports.ranz.org.nz
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://portal.ranz.org.nz/sign-in
```

The primary application must whitelist satellite origins to prevent open redirect attacks:

```tsx
<ClerkProvider allowedRedirectOrigins={['https://reports.ranz.org.nz']}>
  {children}
</ClerkProvider>
```

**Clerk Organizations for Member Companies:**
Each certified business operates as a Clerk Organization, enabling multi-user access with role-based permissions. This creates natural multi-tenancy where business owners can invite staff, assign roles, and manage access without RANZ administrative involvement.

**Role-Based Access Control Structure:**

| Role | Scope | Permissions |
|------|-------|-------------|
| `org:owner` | Business | Full access, manage billing, invite users |
| `org:admin` | Business | Manage documents, personnel, audits |
| `org:member` | Business | Upload documents, log site visits |
| `ranz:auditor` | RANZ | Read-only access to assigned businesses |
| `ranz:admin` | RANZ | Full portal administration |
| `public:verifier` | Public | Verify certification status only |

Custom session claims embed certification tier directly in JWT tokens for cross-app authorization:

```json
{
  "membership_tier": "{{org.public_metadata.certification_tier}}",
  "compliance_score": "{{org.public_metadata.compliance_score}}",
  "insurance_status": "{{org.public_metadata.insurance_valid}}"
}
```

---

### Recommended technology stack

The portal shares core technology with the existing Roofing Reports application to maximize code reuse and minimize operational complexity:

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Framework** | Next.js 16 (App Router) | Consistency with existing app, RSC benefits |
| **Language** | TypeScript 5.x | Type safety for compliance-critical data |
| **Styling** | Tailwind CSS v4 | Existing team expertise |
| **Database** | PostgreSQL (Neon) | Shared database cluster, serverless scaling |
| **ORM** | Prisma | Type-safe queries, migration management |
| **Authentication** | Clerk | Organizations, RBAC, enterprise SSO ready |
| **File Storage** | Cloudflare R2 | Zero egress fees, S3-compatible, encryption |
| **Mobile** | React Native + Expo | Cross-platform, offline-first capability |
| **Search** | PostgreSQL tsvector | Full-text document search without external service |
| **Queue** | Inngest or Trigger.dev | Background jobs, scheduled tasks, retries |
| **Email** | Resend or Postmark | Transactional notifications, expiry alerts |
| **SMS** | AWS SNS or Twilio | Critical expiry notifications |

**Monorepo Structure:**
```
ranz-platform/
├── apps/
│   ├── certification-portal/    # Next.js 16 - Main portal
│   ├── roofing-reports/         # Next.js 16 - Existing app
│   └── mobile/                  # React Native - Field app
├── packages/
│   ├── database/                # Prisma schema, migrations
│   ├── auth/                    # Clerk utilities, middleware
│   ├── ui/                      # Shared component library
│   └── compliance-engine/       # Scoring algorithms
```

---

### Database architecture for compliance and audit

The database schema must support real-time compliance calculation while maintaining immutable historical records for audit purposes. PostgreSQL partitioning enables **15+ year retention** without performance degradation.

**Core Entity Relationships:**

```
Organization (Certified Business)
├── Members (Staff with credentials)
├── Documents (Policies, certificates, procedures)
├── Projects (Completed works with evidence)
├── InsurancePolicies (Coverage tracking)
├── Audits (Internal and external)
├── CAPARecords (Corrective actions)
└── ComplianceAssessments (ISO element scores)
```

**Prisma Schema — Key Models:**

```prisma
model Organization {
  id                String   @id @default(cuid())
  clerkOrgId        String   @unique
  name              String
  tradingName       String?
  nzbn              String?  @unique // NZ Business Number
  
  // Certification Status
  certificationTier CertificationTier @default(ACCREDITED)
  certifiedSince    DateTime?
  tierPromotedAt    DateTime?
  
  // Compliance
  complianceScore   Float    @default(0)
  lastAuditDate     DateTime?
  nextAuditDue      DateTime?
  
  // Relations
  members           OrganizationMember[]
  documents         Document[]
  projects          Project[]
  insurancePolicies InsurancePolicy[]
  audits            Audit[]
  capaRecords       CAPARecord[]
  assessments       ComplianceAssessment[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([certificationTier])
  @@index([complianceScore])
}

enum CertificationTier {
  ACCREDITED
  CERTIFIED
  MASTER_ROOFER
}

model Document {
  id              String         @id @default(cuid())
  organizationId  String
  documentNumber  String         // Auto-generated
  title           String
  
  // ISO 9000 Classification
  isoElement      ISOElement
  documentType    DocumentType
  
  // Versioning
  currentVersion  Int            @default(1)
  status          DocumentStatus @default(DRAFT)
  
  // Storage (Cloudflare R2)
  storageKey      String?
  fileHash        String?        // SHA-256 integrity
  
  // Workflow
  reviewDueDate   DateTime?
  approvedBy      String?
  approvedAt      DateTime?
  
  // Soft delete for compliance
  deletedAt       DateTime?
  
  versions        DocumentVersion[]
  organization    Organization   @relation(fields: [organizationId], references: [id])
  
  @@unique([organizationId, documentNumber])
  @@index([isoElement, status])
}

enum ISOElement {
  QUALITY_POLICY           // 1
  QUALITY_OBJECTIVES       // 2
  ORG_STRUCTURE           // 3
  PROCESS_MANAGEMENT      // 4
  DOCUMENTATION           // 5
  TRAINING_COMPETENCE     // 6
  CONTRACT_REVIEW         // 7
  DOCUMENT_CONTROL        // 8
  PURCHASING              // 9
  CUSTOMER_PRODUCT        // 10
  TRACEABILITY            // 11
  PROCESS_CONTROL         // 12
  INSPECTION_TESTING      // 13
  NONCONFORMING_PRODUCT   // 14
  CORRECTIVE_ACTION       // 15
  HANDLING_STORAGE        // 16
  QUALITY_RECORDS         // 17
  INTERNAL_AUDITS         // 18
  SERVICING               // 19
}

model InsurancePolicy {
  id              String    @id @default(cuid())
  organizationId  String
  
  policyType      InsurancePolicyType
  policyNumber    String
  insurer         String
  brokerName      String?
  
  // Coverage
  coverageAmount  Decimal   @db.Decimal(12, 2)
  excessAmount    Decimal?  @db.Decimal(10, 2)
  
  // Dates
  effectiveDate   DateTime
  expiryDate      DateTime
  
  // Document reference
  certificateKey  String?   // R2 storage key
  verified        Boolean   @default(false)
  verifiedAt      DateTime?
  verifiedBy      String?
  
  // Alerts sent
  alert90Sent     Boolean   @default(false)
  alert60Sent     Boolean   @default(false)
  alert30Sent     Boolean   @default(false)
  
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  @@index([expiryDate])
  @@index([organizationId, policyType])
}

enum InsurancePolicyType {
  PUBLIC_LIABILITY
  PROFESSIONAL_INDEMNITY
  STATUTORY_LIABILITY
  EMPLOYERS_LIABILITY
  MOTOR_VEHICLE
  CONTRACT_WORKS
}

model OrganizationMember {
  id              String    @id @default(cuid())
  organizationId  String
  clerkUserId     String
  
  // Personal Details
  firstName       String
  lastName        String
  email           String
  phone           String?
  
  // LBP License
  lbpNumber       String?
  lbpClass        LBPClass?
  lbpVerified     Boolean   @default(false)
  lbpVerifiedAt   DateTime?
  lbpExpiry       DateTime?
  
  // CPD Tracking
  cpdPointsEarned Int       @default(0)
  cpdCycleStart   DateTime?
  cpdCycleEnd     DateTime?
  
  // Role
  role            OrgMemberRole @default(STAFF)
  
  qualifications  Qualification[]
  trainingRecords TrainingRecord[]
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  @@unique([organizationId, email])
  @@index([lbpNumber])
}

enum LBPClass {
  CARPENTRY
  ROOFING
  DESIGN_1
  DESIGN_2
  DESIGN_3
  SITE_1
  SITE_2
  SITE_3
}
```

**Immutable Audit Log (Event Sourcing Pattern):**

```prisma
model AuditLog {
  id              BigInt   @id @default(autoincrement())
  eventId         String   @default(uuid())
  
  // Actor
  actorId         String
  actorEmail      String
  actorRole       String
  ipAddress       String?
  userAgent       String?
  
  // Action
  action          AuditAction
  resourceType    String
  resourceId      String
  
  // State Change
  previousState   Json?
  newState        Json?
  metadata        Json?
  
  // Tamper Evidence
  hash            String   // SHA-256
  previousHash    String?  // Chain to previous
  
  timestamp       DateTime @default(now())
  
  @@index([resourceType, resourceId])
  @@index([actorId, timestamp])
  @@index([timestamp])
}

enum AuditAction {
  CREATE
  READ
  UPDATE
  DELETE
  APPROVE
  REJECT
  VERIFY
  LOGIN
  LOGOUT
  EXPORT
}
```

**Compliance Scoring Table:**

```prisma
model ComplianceAssessment {
  id              String    @id @default(cuid())
  organizationId  String
  
  isoElement      ISOElement
  
  // Scoring
  status          ComplianceStatus
  score           Float     // 0-100
  weight          Float     @default(1.0) // Element importance
  
  // Evidence
  documentIds     String[]
  auditFindings   String?
  
  // Assessment
  assessedBy      String?
  assessedAt      DateTime  @default(now())
  nextReviewDue   DateTime?
  
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  @@unique([organizationId, isoElement])
}

enum ComplianceStatus {
  COMPLIANT
  PARTIAL
  NON_COMPLIANT
  NOT_ASSESSED
  NOT_APPLICABLE
}
```

---

### Privacy Act 2020 compliance architecture

New Zealand's Privacy Act 2020 establishes 13 Information Privacy Principles (IPPs) governing data collection, storage, use, and disclosure. The portal architecture addresses each principle:

**IPP 5 (Security) Implementation:**
- All data encrypted at rest (PostgreSQL + R2 AES-256)
- TLS 1.3 for all data in transit
- Role-based access controls via Clerk
- Session timeout and IP logging
- Audit logging of all data access

**IPP 9 (Retention) Implementation:**
- Automated retention policy enforcement
- Legal hold mechanism prevents deletion during disputes
- Tiered storage: hot (0-2 years) → warm (2-7 years) → cold archive (7-15+ years)

**IPP 12 (Cross-Border Transfer) Compliance:**
Neon PostgreSQL and Cloudflare R2 both offer Australian/NZ region hosting. The portal should be configured to store all personal information within AU/NZ jurisdictions. European hosting is acceptable given NZ's EU adequacy status (confirmed January 2024).

**Mandatory Breach Notification:**
The portal must implement automatic breach detection and notification workflows to comply with the 72-hour (recommended) notification timeline to the Privacy Commissioner via the NotifyUs portal.

---

### LBP Board API integration

MBIE provides an official API for the Licensed Building Practitioners Register, enabling automated license verification.

**API Access:**
- Portal: `https://portal.api.business.govt.nz/api/lbp`
- Authentication: API key subscription (requires MBIE approval)
- Sandbox available for development

**Verification Workflow:**

```typescript
interface LBPVerificationResult {
  valid: boolean;
  lbpNumber: string;
  name: string;
  licenseClass: string[];
  status: 'CURRENT' | 'SUSPENDED' | 'CANCELLED';
  expiryDate: string;
}

async function verifyLBPLicense(lbpNumber: string): Promise<LBPVerificationResult> {
  const response = await fetch(
    `${LBP_API_BASE}/practitioners/${lbpNumber}`,
    {
      headers: { 'Authorization': `Bearer ${LBP_API_KEY}` }
    }
  );
  return response.json();
}
```

**Automated Re-verification:**
- Initial verification on member addition
- Daily batch job re-verifies all LBP numbers
- Immediate notification if status changes from CURRENT
- Compliance score automatically updated

**Legal Restrictions (Building Act 2004, Section 307):**
LBP register data can only be used for verification purposes. The portal's terms of service must restrict downstream use.

---

### API architecture for external integrations

The portal exposes RESTful APIs for insurers, councils, and consumers while consuming external APIs for data enrichment.

**Public Verification API:**

```
GET /api/v1/verify/{business-id}
Authorization: API-Key {api_key}

Response 200:
{
  "verified": true,
  "businessName": "Example Roofing Ltd",
  "certificationTier": "CERTIFIED",
  "certifiedSince": "2024-03-15",
  "complianceScore": 94,
  "insuranceValid": true,
  "badgeUrl": "https://cdn.ranz.org.nz/badges/certified/example-roofing.svg",
  "lastVerified": "2026-01-27T09:30:00Z"
}
```

**Insurer Compliance Feed API:**

```
GET /api/v1/insurer/compliance-status
Authorization: Bearer {insurer_jwt}

Response 200:
{
  "businesses": [
    {
      "businessId": "org_xxx",
      "complianceScore": 94,
      "insuranceExpiry": "2026-12-31",
      "lastAudit": "2025-11-15",
      "activeFlags": [],
      "tier": "CERTIFIED"
    }
  ],
  "generatedAt": "2026-01-27T09:30:00Z"
}
```

**Webhook Subscriptions:**
Insurers can subscribe to compliance change events:

```json
{
  "event": "compliance.status_changed",
  "business_id": "org_xxx",
  "previous_status": "COMPLIANT",
  "new_status": "AT_RISK",
  "reason": "Insurance policy expired",
  "timestamp": "2026-01-27T00:00:00Z"
}
```

---

## Part 2: Core Functionality — Member Portal

### Certification dashboard design

The member dashboard follows the **BLUF principle** (Bottom Line Up Front) with compliance status immediately visible in the first viewport.

**Dashboard Hierarchy:**
1. **Overall Compliance Score** — Large radial gauge (92%)
2. **Action Items** — Prioritized list of tasks requiring attention
3. **Expiring Items** — Countdown timers for insurance, certifications
4. **Next Audit** — Date and preparation checklist
5. **Achievements** — Gamification badges and progress

**Visual Status Encoding:**
- **Green (90-100%):** Fully compliant
- **Yellow (70-89%):** Attention needed
- **Red (<70%):** Critical items require immediate action

```
┌─────────────────────────────────────────────────────────────┐
│  RANZ Certified Business Portal           [Profile] [Help]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  YOUR COMPLIANCE STATUS           MASTER ROOFER 🏆  │   │
│  │  ┌─────────┐                                        │   │
│  │  │   92%   │  ✅ Insurance: Current                 │   │
│  │  │   ◉◉◉◉  │  ✅ Personnel: All LBPs verified       │   │
│  │  └─────────┘  ⚠️ QMS Review: Due in 14 days         │   │
│  │               ✅ Site Audits: On track               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐  │
│  │ 🎯 PRIORITY ACTIONS   │  │ 📅 EXPIRING SOON          │  │
│  │                       │  │                           │  │
│  │ 1. Upload Q1 QMS      │  │ Public Liability    32d   │  │
│  │    review minutes     │  │ PI Insurance        67d   │  │
│  │ 2. Complete safety    │  │ John Smith LBP      89d   │  │
│  │    training module    │  │                           │  │
│  │                       │  │ [View All]                │  │
│  │ [View All Tasks →]    │  │                           │  │
│  └───────────────────────┘  └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Certification badge system

Digital badges follow the **Open Badges 3.0** specification for verifiable credentials that members can embed on websites and share digitally.

**Badge Structure:**

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "https://portal.ranz.org.nz",
    "name": "Roofing Association of New Zealand",
    "image": "https://cdn.ranz.org.nz/logo.png"
  },
  "issuanceDate": "2026-01-15",
  "validUntil": "2027-01-15",
  "credentialSubject": {
    "id": "did:example:org_xxx",
    "achievement": {
      "name": "RANZ Master Roofer",
      "description": "Certified business meeting ISO 9000-style quality standards",
      "criteria": "https://portal.ranz.org.nz/certification/master-roofer",
      "image": "https://cdn.ranz.org.nz/badges/master-roofer.svg"
    }
  }
}
```

**Embeddable Widget:**

```html
<!-- Member embeds on their website -->
<script src="https://portal.ranz.org.nz/badge/embed.js"></script>
<div class="ranz-badge" 
     data-business-id="org_xxx"
     data-style="full">
</div>
```

The badge widget performs real-time verification, preventing display of expired or revoked certifications.

---

### Insurance management module

**Automated COI Processing:**
The portal integrates AI-powered document extraction to parse uploaded insurance certificates:

1. **Upload:** Member uploads COI (PDF or image)
2. **Extract:** OCR extracts policy number, coverage amounts, dates, insurer
3. **Validate:** Compare against minimum coverage requirements
4. **Verify:** Cross-reference with insurer database (if available)
5. **Alert:** Schedule 90/60/30 day expiry notifications

**Minimum Coverage Requirements (configurable by tier):**

| Policy Type | Accredited | Certified | Master Roofer |
|-------------|------------|-----------|---------------|
| Public Liability | $1,000,000 | $2,000,000 | $5,000,000 |
| Professional Indemnity | $500,000 | $1,000,000 | $2,000,000 |
| Statutory Liability | $500,000 | $1,000,000 | $1,000,000 |

**Gap Detection:**
When uploaded coverage falls below tier requirements:
- Immediate flag on dashboard
- Email notification to business owner
- Compliance score reduction
- Notification to RANZ admin if persistent

---

### Personnel and qualifications tracking

**Staff Roster Features:**
- Add/remove organization members
- LBP license upload and auto-verification against MBIE API
- NZQA certificate storage with credential verification
- Training completion tracking from Vertical Horizonz integration
- CPD points accumulation per individual

**LBP Verification Workflow:**

```
Member adds staff → Enter LBP number → System queries MBIE API
                                              ↓
                      ┌─────────────────────────────────────┐
                      │ ✅ VERIFIED                         │
                      │ John Smith - BP123456               │
                      │ Class: Roofing, Carpentry           │
                      │ Status: Current                     │
                      │ Expires: 15 March 2027              │
                      │ [Auto-verified via MBIE LBP API]    │
                      └─────────────────────────────────────┘
```

**CPD Tracking Dashboard:**

```
┌─────────────────────────────────────────────────────────────┐
│  📚 CPD Progress - Current Cycle 2024-2026                  │
│                                                             │
│  ████████████████████████████░░░░░░░░░░░  32/40 points     │
│                                                             │
│  Breakdown:                                                 │
│  • Technical Training:      16 pts (min 10) ✅              │
│  • Peer Review/Mentoring:    8 pts (min 5)  ✅              │
│  • Industry Events:          6 pts                          │
│  • Self-Study:               2 pts                          │
│                                                             │
│  📅 Cycle ends: March 31, 2026 (428 days)                   │
│  🎯 On track - ahead of average member                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Quality Management System documentation (19 ISO elements)

The portal maps all documentation to the 19 ISO 9000 elements, providing structured templates and workflow automation.

**ISO Element Dashboard:**

| # | Element | Status | Documents | Last Review |
|---|---------|--------|-----------|-------------|
| 1 | Quality Policy | ✅ | 1 | 15/01/2026 |
| 2 | Quality Objectives | ✅ | 1 | 15/01/2026 |
| 3 | Organizational Structure | ⚠️ | 2 | 90 days ago |
| 4 | Process Management | ✅ | 5 | 01/12/2025 |
| 5 | Documentation | ✅ | 3 | 10/01/2026 |
| ... | ... | ... | ... | ... |
| 19 | Servicing | ✅ | 2 | 05/01/2026 |

**Document Control Features:**
- Automatic version numbering (v1.0 → v1.1 → v2.0)
- Approval workflows with digital signatures
- Review due date tracking
- Superseded document archival (never deleted)
- Full revision history with diff comparison

**Template Library:**
RANZ provides pre-approved templates for each ISO element:
- Quality Policy template with RANZ standards
- Site Inspection Checklist (linked to Roofing Reports)
- Complaint Register template
- Internal Audit Checklist
- Corrective Action Request (CAR) form

---

### Project evidence repository

Each completed project can have associated evidence for portfolio building and dispute documentation.

**Project Record Structure:**

```prisma
model Project {
  id              String   @id @default(cuid())
  organizationId  String
  
  // Project Details
  projectNumber   String
  clientName      String
  siteAddress     String
  consentNumber   String?
  
  // Dates
  startDate       DateTime
  completionDate  DateTime?
  
  // Classification
  projectType     ProjectType
  roofingSystem   String
  
  // Evidence
  photos          ProjectPhoto[]
  documents       ProjectDocument[]
  
  // Quality Objectives
  zeroLeaks       Boolean  @default(true)
  clientFeedback  String?
  rating          Int?     // 1-5 stars
  
  // Materials
  productsUsed    CertifiedProductUsage[]
  
  // Record of Work
  rowSubmitted    Boolean  @default(false)
  rowDate         DateTime?
  
  organization    Organization @relation(fields: [organizationId], references: [id])
}

model ProjectPhoto {
  id            String    @id @default(cuid())
  projectId     String
  
  storageKey    String    // R2 key
  thumbnailKey  String
  
  category      PhotoCategory
  capturedAt    DateTime
  latitude      Float?
  longitude     Float?
  
  description   String?
  tags          String[]
  
  uploadedBy    String
  uploadedAt    DateTime @default(now())
}

enum PhotoCategory {
  BEFORE
  DURING  
  AFTER
  MATERIALS
  SAFETY
  ISSUE
  TESTIMONIAL
}
```

---

### Certified products declaration

Integration with APEX Group's approved products database enables members to declare their supply chain.

**Workflow:**
1. Member selects products from APEX-approved list
2. Products linked to specific projects
3. Batch/lot numbers recorded for traceability
4. Non-approved products flagged with justification requirement

**Products Declaration UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Certified Products Register                             │
│                                                             │
│  Your declared supply chain for: Project #2026-0142        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ APEX-Certified Products                          │   │
│  │                                                      │   │
│  │ • Colorsteel Endura® - Batch ER-2025-8847           │   │
│  │ • Marley Roofing Underlays - Lot ML-2026-001        │   │
│  │ • Ridgelock Fasteners - 316SS Grade                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Non-Certified Products (requires justification)         │
│  • [None declared]                                          │
│                                                             │
│  [+ Add Product]  [Import from APEX Database]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Core Functionality — RANZ Admin Portal

### Compliance monitoring dashboard

The admin dashboard provides a bird's-eye view of all member compliance with drill-down capability.

**Heat Map Visualization:**

```
┌───────────────────────────────────────────────────────────────────────┐
│  RANZ Admin - Member Compliance Overview                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  SUMMARY                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │   247    │ │   198    │ │    38    │ │    11    │                 │
│  │  Total   │ │ Compliant│ │ At Risk  │ │ Critical │                 │
│  │ Members  │ │   80%    │ │   15%    │ │    5%    │                 │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│                                                                       │
│  TIER DISTRIBUTION                                                    │
│  Accredited:   ████████████████████  147 (60%)                       │
│  Certified:    ███████████           78 (31%)                        │
│  Master Roofer:███                   22 (9%)                         │
│                                                                       │
│  COMPLIANCE GRID                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Member          │ Ins │ LBP │ QMS │ Audit │ CPD │ Score │     │   │
│  │ Smith Roofing   │ 🟢  │ 🟢  │ 🟢  │  🟢   │ 🟢  │  98%  │ ▸   │   │
│  │ Jones & Co      │ 🟢  │ 🟡  │ 🟢  │  🟢   │ 🟢  │  89%  │ ▸   │   │
│  │ Premier Roof ⚠️ │ 🟡  │ 🟢  │ 🟡  │  🟢   │ 🟡  │  72%  │ ▸   │   │
│  │ Budget Roofs 🚨 │ 🔴  │ 🔴  │ 🔴  │  🟡   │ 🔴  │  34%  │ ▸   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [☑️ Select]  [📧 Bulk Email]  [📊 Export]  [🔔 Send Alerts]          │
└───────────────────────────────────────────────────────────────────────┘
```

### Automated workflow engine

**Expiry Alert Sequence:**

| Days Before | Channel | Action |
|-------------|---------|--------|
| 90 | Email | Gentle reminder with renewal link |
| 60 | Email + SMS | Urgent reminder, compliance impact warning |
| 30 | Email + SMS | Final warning, admin copied |
| 0 | System | Mark non-compliant, badge suspended |
| +7 | Email | Notice of suspension sent to insurers |

**Audit Scheduling Automation:**
- Calculate next audit date based on tier requirements
- Auto-assign auditors based on region and workload
- Send preparation checklists to member 30 days before
- Track auditor availability and conflict of interest

### Audit management system

**Digital Audit Workflow:**

```
Schedule → Assign Auditor → Send Notification → Conduct Audit
                                                     ↓
                                              Document Findings
                                                     ↓
                                    ┌────────────────────────────────┐
                                    │ Minor findings → CAPA created  │
                                    │ Major findings → Escalation    │
                                    │ Critical → Immediate suspension│
                                    └────────────────────────────────┘
                                                     ↓
                                              Follow-up Audit
                                                     ↓
                                              Close Out
```

**Audit Checklist (Digital Form):**

```prisma
model AuditChecklist {
  id            String   @id @default(cuid())
  auditId       String
  
  isoElement    ISOElement
  questionText  String
  
  response      AuditResponse
  finding       String?
  severity      FindingSeverity?
  
  evidenceKeys  String[]  // R2 photo references
  auditorNotes  String?
  
  audit         Audit @relation(fields: [auditId], references: [id])
}

enum AuditResponse {
  CONFORMING
  MINOR_NONCONFORMITY
  MAJOR_NONCONFORMITY
  OBSERVATION
  NOT_APPLICABLE
}

enum FindingSeverity {
  OBSERVATION
  MINOR
  MAJOR
  CRITICAL
}
```

### Member verification API

**Public "Check a Roofer" Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Check a RANZ Certified Roofer                           │
│                                                             │
│  Enter business name or NZBN:                               │
│  [Example Roofing Ltd________________] [Search]             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ✅ VERIFIED MEMBER                                         │
│                                                             │
│  Example Roofing Ltd                                        │
│  NZBN: 9429041234567                                        │
│                                                             │
│  Certification: MASTER ROOFER 🏆                            │
│  Member Since: March 2018                                   │
│  Compliance Score: 96%                                      │
│  Insurance: Current ✓                                       │
│  Last Audit: November 2025                                  │
│                                                             │
│  [View Certificate]  [Report Concern]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Integration Specifications

### Roofing Reports app integration

**Bi-directional Data Flow:**

```
Roofing Reports App                    Certified Business Portal
        │                                        │
        │  ← Certification status lookup         │
        │     (is this company certified?)       │
        │                                        │
        │  → Inspection findings feed            │
        │     (link disputes to compliance)      │
        │                                        │
        │  → Project evidence sync               │
        │     (photos feed company portfolio)    │
        │                                        │
```

**API Calls from Roofing Reports:**

```typescript
// Check if company is certified before referencing in report
const certification = await fetch(
  `${PORTAL_API}/api/internal/certification/${businessId}`,
  { headers: { 'X-Internal-Key': SHARED_SECRET } }
);

// Response includes:
// - tier, complianceScore, insuranceValid, lastAuditDate
```

**Shared Database Schema:**
Both applications share the same PostgreSQL cluster (Neon) with schema separation:
- `roofing_reports.*` — Existing inspection tables
- `certification.*` — New certification tables
- `shared.*` — Organizations, users, projects

### Insurance provider integration

**Real-Time Compliance API for Underwriters:**

Insurers receive webhook notifications when:
- Insurance policy expires or is cancelled
- Compliance score drops below threshold
- Audit finds major non-conformities
- Certification tier changes

**Data Export Format (ACORD-Compliant JSON):**

```json
{
  "exportDate": "2026-01-27T09:30:00Z",
  "members": [
    {
      "businessId": "org_xxx",
      "legalName": "Example Roofing Ltd",
      "nzbn": "9429041234567",
      "certificationTier": "MASTER_ROOFER",
      "complianceScore": 96,
      "lastAuditDate": "2025-11-15",
      "auditFindings": {
        "major": 0,
        "minor": 1,
        "observations": 2
      },
      "insurancePolicies": [
        {
          "type": "PUBLIC_LIABILITY",
          "amount": 5000000,
          "expiry": "2026-12-31",
          "insurer": "Vero Insurance"
        }
      ],
      "claimsHistory": [],
      "riskIndicators": []
    }
  ]
}
```

### External system integrations

**Vertical Horizonz Training Records:**
- OAuth2 connection to training platform
- Automatic CPD points import on course completion
- Training certificate PDF retrieval
- Real-time completion webhooks

**APEX Certified Products Database:**
- Read-only API to query approved products
- Product search by category, manufacturer
- Certification status and specifications
- Batch/lot number validation

### Public-facing tools

**Embeddable Directory Widget:**

```html
<!-- For RANZ main website -->
<iframe src="https://portal.ranz.org.nz/embed/directory?region=auckland" 
        width="100%" 
        height="600"
        frameborder="0">
</iframe>
```

**Consumer Lookup API:**

```
GET /api/public/search?q=roofing+auckland&tier=MASTER_ROOFER

Response:
{
  "results": [
    {
      "name": "Example Roofing Ltd",
      "tier": "MASTER_ROOFER",
      "region": "Auckland",
      "verificationUrl": "https://portal.ranz.org.nz/verify/org_xxx"
    }
  ],
  "total": 12
}
```

---

## Part 5: Implementation Roadmap

### Phase 1 — MVP with pilot group (Q2 2026)

**Duration:** 12 weeks  
**Pilot:** 10 selected members across all three tiers

**Features:**
- SSO architecture with Roofing Reports
- Basic certification dashboard
- Insurance policy upload and tracking
- Expiry alert system (email only)
- Staff roster (manual LBP entry, no API verification)
- Simple document storage (no versioning)

**Technical Deliverables:**
- Clerk configuration with satellite domains
- Core database schema deployed
- Cloudflare R2 bucket configuration
- Basic Next.js application
- Webhook integration with Roofing Reports

**Success Criteria:**
- 10 pilot members onboarded
- Insurance policies tracked with alerts functioning
- SSO working between both applications
- Positive usability feedback from pilot group

**Estimated Cost:** $120,000–$150,000

---

### Phase 2 — Core programme rollout (Q3 2026)

**Duration:** 12 weeks  
**Rollout:** All Certified and Master Roofer tier members (~100)

**Features:**
- Full 19-element ISO documentation system
- Document version control and approval workflows
- LBP API integration for automated verification
- Audit management system
- Compliance scoring algorithm v1
- Admin compliance dashboard
- Embeddable certification badges

**Technical Deliverables:**
- MBIE LBP API integration
- Document versioning with Prisma
- Audit checklist digital forms
- Compliance calculation engine
- Badge generation service

**Success Criteria:**
- 100 members actively using portal
- Average compliance score >80%
- First audits conducted digitally
- Badges embedded on 50%+ member websites

**Estimated Cost:** $180,000–$220,000

---

### Phase 3 — Automation and full rollout (Q4 2026)

**Duration:** 12 weeks  
**Rollout:** All members including Accredited tier (~250)

**Features:**
- Automated compliance scoring with real-time updates
- SMS alert integration
- Project evidence repository
- Client testimonial collection
- CAPA tracking and resolution
- Bulk admin operations
- Advanced reporting and analytics
- "Check a Roofer" public tool

**Technical Deliverables:**
- SMS provider integration (Twilio/AWS SNS)
- Project/photo upload pipeline
- CAPA workflow engine
- Public verification API
- Analytics dashboard (Metabase or custom)

**Success Criteria:**
- 200+ members active
- <5% members with critical compliance gaps
- Public verification tool receiving >100 queries/month
- Audit administration time reduced by 50%

**Estimated Cost:** $150,000–$180,000

---

### Phase 4 — Advanced features (2027)

**Duration:** Ongoing  
**Focus:** Mobile, automation, external integrations

**Features:**
- React Native mobile app for site documentation
- Offline-first photo capture with sync
- CPD auto-tracking from Vertical Horizonz
- Real-time insurer reporting feed
- Insurance COI OCR extraction
- Predictive audit scheduling

**Estimated Cost:** $200,000–$250,000

---

### Phase 5 — Industry ecosystem (2028+)

**Duration:** Ongoing  
**Focus:** External API access and industry network effects

**Features:**
- Builder/council API access for verification
- Direct insurer integration for underwriting
- Consumer mobile app for roofer lookup
- Integration with building consent systems
- Cross-industry data sharing (plumbers, electricians)

**Estimated Cost:** $150,000–$200,000 annually for ongoing development

---

## Part 6: Cost Estimates

### Development costs by phase

| Phase | Duration | Internal Cost | External Cost | Total |
|-------|----------|---------------|---------------|-------|
| Phase 1 (MVP) | 12 weeks | $90,000 | $30,000 | $120,000–$150,000 |
| Phase 2 (Core) | 12 weeks | $140,000 | $40,000 | $180,000–$220,000 |
| Phase 3 (Full) | 12 weeks | $120,000 | $30,000 | $150,000–$180,000 |
| Phase 4 (Advanced) | 6 months | $160,000 | $60,000 | $200,000–$250,000 |
| **Total (18 months)** | | | | **$650,000–$800,000** |

### Ongoing operational costs

| Item | Monthly | Annual |
|------|---------|--------|
| Neon PostgreSQL (Pro) | $200 | $2,400 |
| Cloudflare R2 (10TB) | $150 | $1,800 |
| Clerk (1,000 MAUs) | $100 | $1,200 |
| Vercel Pro | $50 | $600 |
| Resend (Email) | $30 | $360 |
| Twilio (SMS) | $100 | $1,200 |
| MBIE API (if charged) | TBD | TBD |
| Monitoring (Sentry, etc.) | $50 | $600 |
| **Total Infrastructure** | **~$680** | **~$8,200** |
| Support/Maintenance (0.5 FTE) | $4,000 | $48,000 |
| **Total Operational** | | **~$56,000/year** |

### Third-party integration costs

| Integration | One-time | Ongoing |
|-------------|----------|---------|
| MBIE LBP API | Free (application required) | Free |
| Vertical Horizonz API | $5,000 setup | $500/month |
| Insurance COI OCR (Unstract/similar) | $10,000 setup | $0.10/document |
| APEX Products Database | TBD (partnership) | TBD |

---

## Part 7: Security Architecture

### Role-based access control matrix

| Resource | Owner | Admin | Member | Auditor | Public |
|----------|-------|-------|--------|---------|--------|
| Organization Profile | RW | RW | R | R | — |
| Documents | RW | RW | RW | R | — |
| Insurance Policies | RW | RW | RW | R | — |
| Audit Records | R | RW | R | RW | — |
| Compliance Scores | R | R | R | R | — |
| Verification Status | R | R | R | R | R |
| Admin Dashboard | — | — | — | — | — |
| RANZ Admin | — | — | — | — | RANZ only |

### Data encryption

- **At Rest:** AES-256 (PostgreSQL TDE, R2 default encryption)
- **In Transit:** TLS 1.3 (enforced)
- **Application Layer:** Sensitive fields encrypted with customer-managed keys (future enhancement)

### Audit logging requirements

Every data access and modification is logged with:
- Actor identification (user ID, email, role)
- Action performed (CRUD operation)
- Resource affected (type and ID)
- Timestamp (UTC)
- IP address and user agent
- Previous and new state (for modifications)
- Cryptographic hash chain for tamper evidence

**Retention:** Audit logs retained for minimum **15 years** per ISO requirements, stored in partitioned PostgreSQL tables with annual archival to cold storage.

### Backup and disaster recovery

| Component | Backup Frequency | Retention | RTO | RPO |
|-----------|------------------|-----------|-----|-----|
| PostgreSQL | Continuous (Neon) | 30 days | 1 hour | 0 (Point-in-time) |
| Cloudflare R2 | Cross-region replication | Indefinite | 4 hours | 0 |
| Configuration | Git (Vercel) | Indefinite | 30 mins | 0 |

---

## Part 8: Success Metrics

### Key Performance Indicators

**Member Adoption:**
- Monthly Active Users (MAU) — Target: 80% of members
- Document upload rate per member
- Mobile app downloads and active sessions
- Time spent in portal per session

**Compliance Effectiveness:**
- Average compliance score across membership
- Percentage of members with critical gaps
- Insurance lapse rate (before vs. after portal)
- Audit finding resolution time

**Operational Efficiency:**
- Admin hours spent on compliance monitoring (target: 50% reduction)
- Audit scheduling automation rate
- Alert-to-resolution cycle time
- Member support ticket volume

**Business Impact:**
- Certification badge verification requests
- Public "Check a Roofer" queries
- Insurer API usage volume
- Warranty claim rate correlation with compliance scores

**Revenue:**
- Certification revenue per member
- Premium tier upgrade rate
- Insurance partnership revenue
- Data/API licensing revenue (future)

---

## Conclusion: Strategic digital infrastructure for industry leadership

The RANZ Certified Business Programme Portal transforms compliance management from administrative overhead into a **defensible competitive advantage** for members. By digitizing the entire certification lifecycle—from insurance tracking to audit management to public verification—RANZ creates network effects that strengthen over time.

**Three critical success factors emerge from this design:**

First, the **SSO architecture with the Roofing Reports app** creates a unified ecosystem where inspection data flows into certification records, and certification status informs inspection reports. This bidirectional integration is the technical foundation for the insurance warranty proposition—insurers can trust that certified businesses are continuously monitored, not just annually audited.

Second, the **LBP Board API integration** provides automated credential verification that manual processes cannot match. When a staff member's license expires or is suspended, the system knows immediately—protecting both the business and their clients from inadvertent non-compliance.

Third, the **Open Badges 3.0 certification credentials** transform abstract membership into verifiable, embeddable proof. Every time a consumer sees a RANZ badge on a member's website and clicks to verify, the association's brand is reinforced and the certification's value is demonstrated.

The phased implementation approach allows RANZ to validate assumptions with pilot members before full rollout, reducing technical and adoption risk. The cost structure—approximately $650,000–$800,000 over 18 months with ~$56,000 annual operating costs—is modest relative to the value created for members and the industry positioning achieved.

This portal is not merely a compliance tool; it is the digital infrastructure that makes the Master Roofer credential meaningful in the market. It connects certified businesses to certified products through verifiable, insurable quality standards—creating an ecosystem where quality is not just claimed but proven.