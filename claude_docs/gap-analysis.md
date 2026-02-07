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
| Personnel Management | 75% | LBP verification done. CPD tracking incomplete |
| Document Management | 80% | Version control + approval done. No templates, no review reminders |
| Audit Management | 85% | Full audit lifecycle + checklist. No scheduling automation |
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

#### 1. No Document Templates (Elements 1-19)
**Design said:** "RANZ provides pre-approved templates for each ISO element"
**Current state:** Members can upload arbitrary files tagged to elements, but there are no starter templates.
**Impact:** Members don't know *what* to upload. A Quality Policy template, Internal Audit Checklist, Corrective Action Request form etc. would dramatically accelerate adoption.
**Recommendation:** Create downloadable template library (Word/PDF) for at least the critical elements (1, 2, 4, 5, 8, 15, 18).

#### 2. No Document Review Cycle Enforcement (Element 8)
**Design said:** "Review due date tracking" with automated reminders
**Current state:** `reviewDueDate` field exists on Document model but no cron job checks it and no notifications fire when reviews are due.
**Impact:** Documents go stale without periodic review - a core ISO 9000 requirement.
**Recommendation:** Add document review reminder to the notification cron job. Generate DOCUMENT_REVIEW_DUE notifications.

#### 3. No CPD/Training Tracking UI (Element 6)
**Design said:** Full CPD tracking dashboard with points, cycle progress, category breakdown
**Current state:** OrganizationMember has `cpdPointsEarned`, `cpdCycleStart`, `cpdCycleEnd` fields but no pages or API routes to manage them. No Qualification or TrainingRecord models.
**Impact:** Training & Competence (Element 6) cannot be meaningfully assessed.
**Recommendation:** Add Qualification + TrainingRecord models. Build CPD tracking page under staff management.

#### 4. No Management Review Process (Element 4)
**Design said:** Process management with structured workflows
**Current state:** Upload-only. No management review schedule, no review meeting template, no minute recording.
**Impact:** ISO 9000 requires periodic management review of the QMS.
**Recommendation:** Could be addressed with a template + document category for management review minutes.

#### 5. No Audit Scheduling Automation (Element 18)
**Design said:** Auto-calculate next audit date, auto-assign auditors, send prep checklists 30 days before
**Current state:** Audits can be created manually with a scheduled date. No automation for scheduling or auditor assignment.
**Impact:** Audit scheduling is fully manual, which doesn't scale.
**Recommendation:** Add audit scheduling logic to cron job based on tier and last audit date.

#### 6. No Approved Supplier Register (Element 9)
**Design said:** APEX Certified Products Database integration
**Current state:** CertifiedProductUsage model exists for per-project declarations, but no org-level approved supplier list.
**Impact:** Purchasing control (Element 9) is weak.
**Recommendation:** Add an approved supplier/product list at org level, possibly seeded from APEX data.

---

## Feature Gaps by Priority

### HIGH PRIORITY (MVP completeness)

| Gap | Design Phase | Effort | Notes |
|-----|-------------|--------|-------|
| Document review reminders | Phase 1 | Small | Add to existing cron job |
| ISO element templates | Phase 2 | Medium | 7-10 Word templates + download API |
| CPD tracking UI + models | Phase 2 | Medium | New models, page, API routes |
| Audit scheduling automation | Phase 2 | Medium | Cron logic + assignment |
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

### Next Sprint: ISO 9000 Foundation Gaps
1. **Document review reminders** - Wire up `reviewDueDate` to notification cron
2. **ISO element templates** - Create downloadable templates for critical elements
3. **CPD models + basic UI** - Add Qualification + TrainingRecord, basic list page

### Following Sprint: Automation & Scale
4. **Audit scheduling automation** - Cron-based scheduling with tier rules
5. **Approved supplier register** - Org-level product/supplier management
6. **SSO satellite connection** - Connect to Roofing Reports app

### Future: External Integrations
7. **Background job queue** - Move heavy operations off request cycle
8. **Insurer webhook/feed** - Compliance change event dispatch
9. **Full-text search** - PostgreSQL tsvector across documents + orgs
