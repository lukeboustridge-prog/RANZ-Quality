# Requirements: RANZ Certified Business Programme Portal

**Defined:** 2026-01-28
**Core Value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.

## v1 Requirements

Requirements for MVP pilot launch (Q2 2026, 10-30 members).

### Dashboard & Compliance

- [ ] **DASH-01**: Dashboard displays accurate compliance indicators per dimension (insurance, personnel, documents, audits) based on actual data, not overall score
- [ ] **DASH-02**: Compliance score updates in real-time when documents, insurance policies, or staff credentials change
- [ ] **COMP-01**: Single compliance scoring engine (consolidate legacy compliance.ts into compliance-v2.ts)
- [ ] **COMP-02**: Compliance thresholds (90%/70%) defined in central constants file and used consistently

### Security & Infrastructure

- [ ] **SEC-01**: Cron endpoints require CRON_SECRET header (throw error if missing, no fallback)
- [ ] **SEC-02**: Public verification API accepts NZBN or trading name lookup (not internal organization ID)
- [ ] **SEC-03**: File uploads validated for size with 50MB maximum limit
- [ ] **SEC-04**: Audit trail logs all data access and changes via AuditLog model with hash chain

### Notifications

- [ ] **NOTF-01**: SMS notifications send via Twilio for critical alerts (insurance expiry, LBP status change)
- [ ] **NOTF-02**: LBP status change notifications email the affected staff member directly (not just organization email)
- [ ] **NOTF-03**: Insurance expiry alerts trigger correctly at 90, 60, and 30 days before expiry

### Admin & Reporting

- [ ] **ADMIN-01**: RANZ admin can generate PDF compliance reports for individual organizations
- [ ] **ADMIN-02**: RANZ admin can export member directory as CSV with compliance summary
- [ ] **ADMIN-03**: Admin dashboard shows compliance score breakdown per member with drill-down

### SSO Integration

- [ ] **SSO-01**: Portal configured as primary Clerk domain (portal.ranz.org.nz)
- [ ] **SSO-02**: Roofing Reports app configured as satellite domain reading auth from portal
- [ ] **SSO-03**: Organization context and certification tier shared via JWT claims across both apps

## v2 Requirements

Deferred to subsequent milestones (post-pilot).

### Public Verification

- **PUB-01**: "Check a Roofer" public search by business name or NZBN
- **PUB-02**: Embeddable badge widget with real-time verification
- **PUB-03**: Rate limiting on public verification endpoints

### Projects & Evidence

- **PROJ-01**: Members can log completed projects with photos
- **PROJ-02**: GPS and timestamp metadata captured from project photos
- **PROJ-03**: Project portfolio displayed on public verification page

### Testimonials

- **TEST-01**: Members can request testimonials from clients via email
- **TEST-02**: Client testimonials verified via email confirmation link
- **TEST-03**: Verified testimonials displayed on public profile

### Advanced Integrations

- **INT-01**: APEX certified products database integration
- **INT-02**: Vertical Horizonz CPD tracking auto-sync
- **INT-03**: Insurance COI OCR extraction

## Out of Scope

Explicitly excluded from current development.

| Feature | Reason |
|---------|--------|
| Mobile app | Phase 4 - focus on web MVP first |
| Offline photo capture | Phase 4 - requires React Native |
| Consumer mobile app | Phase 5 - depends on public verification |
| Builder/council API | Phase 5 - requires partnership agreements |
| Real-time chat | High complexity, not core to compliance value |
| Video uploads | Storage/bandwidth costs, defer to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Pending | Pending |
| DASH-02 | Pending | Pending |
| COMP-01 | Pending | Pending |
| COMP-02 | Pending | Pending |
| SEC-01 | Pending | Pending |
| SEC-02 | Pending | Pending |
| SEC-03 | Pending | Pending |
| SEC-04 | Pending | Pending |
| NOTF-01 | Pending | Pending |
| NOTF-02 | Pending | Pending |
| NOTF-03 | Pending | Pending |
| ADMIN-01 | Pending | Pending |
| ADMIN-02 | Pending | Pending |
| ADMIN-03 | Pending | Pending |
| SSO-01 | Pending | Pending |
| SSO-02 | Pending | Pending |
| SSO-03 | Pending | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 (pending roadmap creation)

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
