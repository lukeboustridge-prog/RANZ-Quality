# Roadmap: RANZ Certified Business Programme Portal

## Overview

This roadmap addresses critical MVP gaps blocking pilot launch with 10-30 members in Q2 2026. The journey moves from fixing the compliance scoring foundation, hardening security, completing notifications, enabling admin reporting, to establishing SSO with the Roofing Reports app. Each phase delivers observable improvements that bring the portal closer to production readiness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Compliance Engine Consolidation** - Fix scoring inconsistencies and dashboard accuracy
- [x] **Phase 2: Dashboard Real-Time Updates** - Enable live compliance recalculation on data changes
- [ ] **Phase 3: Security Foundations** - Secure cron endpoints and implement audit trail
- [ ] **Phase 4: Public API Hardening** - Fix verification API and add upload validation
- [ ] **Phase 5: SMS Notification System** - Complete Twilio integration for critical alerts
- [ ] **Phase 6: Notification Targeting** - Fix LBP and insurance alert routing
- [ ] **Phase 7: Admin Reporting** - Generate PDF/CSV compliance reports
- [ ] **Phase 8: SSO Integration** - Connect portal as primary Clerk domain with Roofing Reports satellite

## Phase Details

### Phase 1: Compliance Engine Consolidation
**Goal**: Single source of truth for compliance scoring eliminates inconsistencies across the application
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. All API routes use compliance-v2.ts for scoring (compliance.ts removed from codebase)
  2. Compliance thresholds (90%/70%) defined in central constants file imported by all components
  3. Dashboard and API endpoints return identical compliance scores for same organization
  4. Four-dimension breakdown (insurance, personnel, documents, audits) consistently available across all scoring calls
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Create central compliance constants and delete legacy compliance.ts
- [x] 01-02-PLAN.md — Migrate UI components to use central constants
- [x] 01-03-PLAN.md — Migrate API routes and lib files to use central constants
- [x] 01-04-PLAN.md — Gap closure: Wire notifications.ts to central constants

### Phase 2: Dashboard Real-Time Updates
**Goal**: Members see compliance changes immediately when uploading documents or updating insurance
**Depends on**: Phase 1 (requires canonical scoring engine)
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. Dashboard compliance indicators reflect actual dimension scores (not overall score)
  2. Uploading insurance certificate immediately updates insurance indicator from red to green
  3. Approving document immediately increments document dimension score
  4. LBP verification status change immediately updates personnel indicator
  5. Member sees spinner/loading state during recalculation (not stale data)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Display dimension-specific compliance indicators from breakdown data
- [x] 02-02-PLAN.md — Wire mutation endpoints to canonical scoring and revalidatePath
- [x] 02-03-PLAN.md — Add useTransition loading states to mutation forms

### Phase 3: Security Foundations
**Goal**: Production environment requires authentication for sensitive endpoints and logs all data access
**Depends on**: Nothing (independent from Phases 1-2)
**Requirements**: SEC-01, SEC-04
**Success Criteria** (what must be TRUE):
  1. Cron endpoints return 401 error if CRON_SECRET header missing or incorrect
  2. Application startup fails with error if CRON_SECRET environment variable not set
  3. All document uploads, insurance changes, and member modifications logged to AuditLog table
  4. Audit log entries include hash chain linking to previous log entry (tamper detection)
  5. RANZ admin can view audit trail for any organization showing who changed what when
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Secure cron endpoints with strict CRON_SECRET validation
- [ ] 03-02-PLAN.md — Create audit-log.ts with SHA-256 hash chain implementation
- [ ] 03-03-PLAN.md — Wire audit logging to insurance, document, and staff mutations
- [ ] 03-04-PLAN.md — Create admin audit trail viewer UI

### Phase 4: Public API Hardening
**Goal**: Public verification API cannot be used to enumerate member businesses or exceed storage quotas
**Depends on**: Nothing (independent from prior phases)
**Requirements**: SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Public verification endpoint accepts NZBN or trading name (not internal organization ID)
  2. Attempting to verify with organization ID returns 400 error with message directing to use NZBN
  3. File upload exceeding 50MB returns 413 error before touching R2
  4. File upload validation checks size before any database writes occur
  5. Verification API returns 404 for non-existent NZBN (not enumeration hint)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: SMS Notification System
**Goal**: Critical alerts (insurance expiry, LBP status changes) reach members via SMS within minutes
**Depends on**: Nothing (independent from prior phases)
**Requirements**: NOTF-01
**Success Criteria** (what must be TRUE):
  1. Insurance policy expiring in 30 days triggers SMS to organization owner phone number
  2. LBP license status changing to SUSPENDED triggers SMS to affected staff member
  3. SMS delivery failures retry up to 3 times with exponential backoff
  4. Notification record in database shows SMS status (PENDING/SENT/FAILED) and Twilio message SID
  5. Admin can view SMS delivery logs showing timestamp, recipient, content, status
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Notification Targeting
**Goal**: Notifications reach the correct recipient (individual member, not just organization email)
**Depends on**: Nothing (independent from prior phases)
**Requirements**: NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. LBP status change notification emails the affected OrganizationMember directly using their email
  2. Insurance expiry notification at 90 days sends to organization owner email
  3. Insurance expiry notification at 30 days sends to both organization email AND owner phone (SMS)
  4. Notification database record links to specific user ID (not just organization ID)
  5. Each expiry alert (90/60/30 days) sends exactly once (flag tracking prevents duplicates)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Admin Reporting
**Goal**: RANZ staff can generate exportable compliance reports for internal review and member distribution
**Depends on**: Phase 1 (requires canonical compliance scoring)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. Admin can generate PDF report for single organization showing compliance breakdown, expiring items, audit history
  2. Admin can export all members as CSV with columns: name, tier, compliance score, insurance status, last audit date
  3. Admin dashboard displays member list with compliance score drill-down showing dimension breakdown
  4. PDF report includes RANZ branding, organization name, generation date, score visualization
  5. CSV export includes NZBN for insurer/partner consumption
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: SSO Integration
**Goal**: Users sign in once at portal.ranz.org.nz and access reports.ranz.org.nz without re-authentication
**Depends on**: Nothing (independent from prior phases)
**Requirements**: SSO-01, SSO-02, SSO-03
**Success Criteria** (what must be TRUE):
  1. Portal ClerkProvider configured with allowedRedirectOrigins including reports.ranz.org.nz
  2. Roofing Reports app environment variables set NEXT_PUBLIC_CLERK_IS_SATELLITE=true
  3. User logged in at portal can navigate to reports.ranz.org.nz and session automatically recognized
  4. JWT claims include certification_tier and compliance_score available in both apps
  5. Logging out from either app terminates session in both
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Compliance Engine Consolidation | 4/4 | Complete | 2026-01-28 |
| 2. Dashboard Real-Time Updates | 3/3 | Complete | 2026-01-28 |
| 3. Security Foundations | 0/4 | Not started | - |
| 4. Public API Hardening | 0/TBD | Not started | - |
| 5. SMS Notification System | 0/TBD | Not started | - |
| 6. Notification Targeting | 0/TBD | Not started | - |
| 7. Admin Reporting | 0/TBD | Not started | - |
| 8. SSO Integration | 0/TBD | Not started | - |
