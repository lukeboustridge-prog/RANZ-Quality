# Requirements: RANZ Certified Business Programme Portal

**Defined:** 2026-01-31
**Core Value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.

## v1.1 Requirements

Requirements for Settings milestone. Enables members and staff to manage their organization and personal settings.

### Organization Settings

- [x] **ORG-01**: Org admin can update company profile (trading name, contact details, logo, description)
- [x] **ORG-02**: Org admin can configure organization notification preferences (which alerts, email vs SMS, frequency)
- [ ] **ORG-03**: Org admin can invite new staff members via email invitation
- [ ] **ORG-04**: Org admin can remove staff members from organization
- [ ] **ORG-05**: Org admin can assign/change staff roles

### Personal Settings

- [ ] **PERS-01**: User can update personal profile (name, email, phone, profile photo)
- [ ] **PERS-02**: User can configure personal notification preferences (opt-in/out, alert types)
- [ ] **PERS-03**: User can change password
- [ ] **PERS-04**: User can enable/disable 2FA
- [ ] **PERS-05**: User can view active sessions and sign out remotely

## Future Requirements

Deferred to later milestones (from PROJECT.md Out of Scope):

### Public Verification
- **PUB-01**: "Check a Roofer" public search UI
- **PUB-02**: Embeddable badge widget
- **PUB-03**: Rate limiting on public APIs

### Integrations
- **INT-01**: APEX certified products integration
- **INT-02**: CPD auto-tracking from Vertical Horizonz
- **INT-03**: Insurance COI OCR extraction
- **INT-04**: Builder/council API access

### Mobile
- **MOB-01**: Mobile app
- **MOB-02**: Offline-first photo capture
- **MOB-03**: Consumer mobile app

### Other
- **OTHER-01**: Testimonial collection and verification

## Out of Scope

| Feature | Reason |
|---------|--------|
| Billing/payments settings | No payment processing in v1 |
| Theme/appearance customization | Not priority for pilot |
| API key management | No external API access in v1 |
| Data export/download | Covered by admin CSV export |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORG-01 | Phase 9 | Complete |
| ORG-02 | Phase 9 | Complete |
| ORG-03 | Phase 10 | Pending |
| ORG-04 | Phase 10 | Pending |
| ORG-05 | Phase 10 | Pending |
| PERS-01 | Phase 11 | Pending |
| PERS-02 | Phase 11 | Pending |
| PERS-03 | Phase 12 | Pending |
| PERS-04 | Phase 12 | Pending |
| PERS-05 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after Phase 9 execution*
