# Gap Analysis: Design Specification vs Current Implementation

*Generated: 2026-02-08*

---

## Summary

The portal has strong implementation of Phases 1-3 core infrastructure. The database schema, API routes, and business logic cover the majority of the design. The primary gaps are in **ISO 9000 workflow depth**, **missing external integrations**, and **features that were designed but not built out**.

---

## Scorecard

| Area | Design Coverage | Status |
|------|----------------|--------|
| Database Schema | 95% | Nearly complete, missing Qualification + TrainingRecord models |
| Authentication & SSO | 90% | Clerk + custom auth both work, satellite domain not yet connected |
| Compliance Scoring | 95% | Full 4-dimension engine with tier eligibility |
| Insurance Management | 90% | CRUD, alerts, gap detection done. COI OCR not built |
| Personnel Management | 95% | LBP verification done. CPD tracking complete with edit/delete and certificate upload |
| Document Management | 90% | Version control + approval done. Downloadable templates added. Review reminders via cron. |
| Audit Management | 95% | Full audit lifecycle + checklist. Tier-based scheduling + follow-up auto-scheduling done |
| CAPA System | 90% | Full lifecycle with overdue tracking |
| Notification System | 90% | Email + SMS + In-App done. Push not implemented |
| Open Badges | 95% | Credential generation, SVG badges, embed widget all done |
| Public Verification | 95% | Verify, search, badge APIs all done |
| Project Evidence | 85% | CRUD done. Photo upload pipeline may need work |
| Admin Dashboard | 80% | Stats, members, compliance grid done. Analytics charts partial |
| Reports | 70% | Report model exists, PDF generation exists. Limited report types |
| External Integrations | 20% | LBP API done. Everything else missing |
| Mobile App | 0% | Not started (Phase 4) |

---

## ISO 9000 Compliance Assessment

### Are we meeting ISO 9000 requirements?

**Short answer: Structurally yes, operationally partially.**

The portal has the right *structure* (19 elements, compliance assessments, document management, audit system), but several ISO 9000 requirements lack the operational depth needed for genuine compliance.

### Critical ISO Gaps

#### 1. ~~No Document Templates (Elements 1-19)~~ CLOSED
**Design said:** "RANZ provides pre-approved templates for each ISO element"
**Resolution:** Downloadable Markdown templates added for all 19 ISO elements. API route generates structured templates on-the-fly from `iso-templates.ts` metadata. Download button added to templates page next to each Upload button. Templates include section headings, placeholder text, responsibility tables, checklists, and auditor checklist references.

#### 2. No Document Review Cycle Enforcement (Element 8)
**Design said:** "Review due date tracking" with automated reminders
**Current state:** `reviewDueDate` field exists on Document model. Cron job now sends 30/7-day + overdue review reminders.
**Status:** Already implemented via notification cron job. No further work needed.

#### 3. ~~No CPD/Training Tracking UI (Element 6)~~ CLOSED
**Design said:** Full CPD tracking dashboard with points, cycle progress, category breakdown
**Resolution:** Qualification + TrainingRecord models exist in schema. Full CRUD API routes (GET/POST/PUT/DELETE) implemented with certificate file upload to R2. UI components updated with edit (pencil icon), delete (trash icon), and certificate upload on both create and edit forms. Certificate badge shown on records with attached files.

#### 4. No Management Review Process (Element 4)
**Design said:** Process management with structured workflows
**Current state:** Upload-only. No management review schedule, no review meeting template, no minute recording.
**Impact:** ISO 9000 requires periodic management review of the QMS.
**Recommendation:** Could be addressed with a template + document category for management review minutes. The new downloadable template for Element 4 (Process Management) provides a starting point.

#### 5. ~~No Audit Scheduling Automation (Element 18)~~ CLOSED
**Design said:** Auto-calculate next audit date, auto-assign auditors, send prep checklists 30 days before
**Resolution:** Tier-based audit frequency implemented (Accredited=24mo, Certified/Master=12mo). Audit completion endpoint now uses `getAuditFrequencyMonths()` instead of hardcoded 365 days. FAIL and CONDITIONAL_PASS audits auto-schedule a FOLLOW_UP audit 90 days after latest CAPA due date, scoped to elements with non-conformities. Cron job auto-schedules overdue audits with 30-day reminders.

#### 6. No Approved Supplier Register (Element 9)
**Design said:** APEX Certified Products Database integration
**Current state:** Full approved supplier register now exists with CRUD, APEX certification tracking, status management, and review scheduling.
**Status:** Implemented. APEX API integration remains a future item.

---

## Feature Gaps by Priority

### HIGH PRIORITY (MVP completeness)

| Gap | Design Phase | Effort | Status |
|-----|-------------|--------|--------|
| Document review reminders | Phase 1 | Small | **DONE** - Cron job sends 30/7-day + overdue alerts |
| ISO element templates | Phase 2 | Medium | **DONE** - Downloadable Markdown templates for all 19 elements |
| CPD tracking UI + models | Phase 2 | Medium | **DONE** - Full CRUD with edit/delete + certificate upload |
| Audit scheduling automation | Phase 2 | Medium | **DONE** - Tier-based frequency + follow-up auto-scheduling |
| SSO satellite connection | Phase 1 | Small | Config + testing with Roofing Reports |

### MEDIUM PRIORITY (Core programme)

| Gap | Design Phase | Effort | Notes |
|-----|-------------|--------|-------|
| Approved supplier register | Phase 2 | Medium | Org-level product/supplier list |
| Document diff comparison | Phase 2 | Large | Version comparison UI |
| Admin analytics dashboard | Phase 3 | Medium | Charts beyond activity view |
| Webhook subscriptions for insurers | Phase 3 | Medium | Event dispatch system |
| PostgreSQL full-text search | Phase 2 | Small | tsvector on documents + orgs |
| Background job queue | Phase 2 | Medium | Inngest or Trigger.dev for heavy tasks |

### LOW PRIORITY (Advanced/Ecosystem)

| Gap | Design Phase | Effort | Notes |
|-----|-------------|--------|-------|
| Vertical Horizonz API integration | Phase 4 | Large | OAuth2, CPD import |
| APEX Products Database API | Phase 3 | Medium | Read-only product search |
| Insurance COI OCR extraction | Phase 4 | Large | AI-powered document parsing |
| Insurer compliance feed API | Phase 3 | Medium | ACORD-compliant JSON export |
| Push notifications | Phase 4 | Medium | Firebase or similar |
| Mobile app (React Native) | Phase 4 | Very Large | Cross-platform field app |
| Consumer mobile app | Phase 5 | Very Large | Public roofer lookup |
| Builder/council API | Phase 5 | Large | External verification API |
| Predictive audit scheduling | Phase 4 | Large | ML-based scheduling |

---

## Missing Database Models

These models were in the design but not in the current schema:

```prisma
// Training & Competence (Element 6)
model Qualification {
  id               String   @id @default(cuid())
  memberId         String
  qualificationType String  // e.g., "NZQA", "MANUFACTURER_CERT", "SAFETY"
  title            String
  issuingBody      String
  issueDate        DateTime
  expiryDate       DateTime?
  certificateKey   String?  // R2 storage key
  verified         Boolean  @default(false)
  member           OrganizationMember @relation(fields: [memberId], references: [id])
}

model TrainingRecord {
  id           String   @id @default(cuid())
  memberId     String
  courseName   String
  provider     String
  completedAt  DateTime
  cpdPoints    Int      @default(0)
  cpdCategory  String?  // "TECHNICAL", "PEER_REVIEW", "INDUSTRY_EVENT", "SELF_STUDY"
  certificateKey String?
  member       OrganizationMember @relation(fields: [memberId], references: [id])
}
```

---

## Recommended Development Priorities

### ~~Next Sprint: ISO 9000 Foundation Gaps~~ COMPLETED
1. ~~**Document review reminders**~~ - Done (cron job)
2. ~~**ISO element templates**~~ - Done (downloadable Markdown for all 19 elements)
3. ~~**CPD models + basic UI**~~ - Done (full CRUD with edit/delete + certificate upload)

### ~~Following Sprint: Automation & Scale~~ MOSTLY COMPLETED
4. ~~**Audit scheduling automation**~~ - Done (tier-based + follow-up auto-scheduling)
5. ~~**Approved supplier register**~~ - Done (full CRUD with APEX tracking)
6. **SSO satellite connection** - Connect to Roofing Reports app (remaining)

### Next Sprint: Remaining Items
- **SSO satellite connection** - Connect to Roofing Reports app
- **Background job queue** - Move heavy operations off request cycle
- **Insurer webhook/feed** - Compliance change event dispatch

### Future: External Integrations
- **Full-text search** - PostgreSQL tsvector across documents + orgs
- **Vertical Horizonz API** - CPD import
- **APEX Products Database API** - Product search
