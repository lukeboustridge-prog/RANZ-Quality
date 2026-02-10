# Requirements: RANZ Certified Business Programme Portal

**Defined:** 2026-02-10
**Core Value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.

## v1.2 Requirements

Requirements for the RoofWright Programme milestone. Each maps to roadmap phases.

### Micro-Credentials

- [ ] **MCRED-01**: RANZ admin can create/edit/delete micro-credential definitions (title, level, skill standard reference, issuing body, requirements description)
- [ ] **MCRED-02**: RANZ admin can assign a micro-credential to a staff member with status (Not Started / In Training / Assessment Pending / Awarded / Expired)
- [ ] **MCRED-03**: Org admin can view micro-credential status for all staff in their organisation
- [ ] **MCRED-04**: Staff member can upload certificate evidence against an awarded micro-credential
- [ ] **MCRED-05**: System tracks expiry dates and sends notifications when credentials are expiring (90/60/30 days)
- [ ] **MCRED-06**: RANZ admin can view a report of micro-credential coverage across all member organisations
- [ ] **MCRED-07**: System ships with three default RANZ micro-credential definitions (Reclad/Reroofing L5, Repairs/Maintenance L5, Compliance Practices L4)

### Team Composition

- [ ] **TEAM-01**: Org admin can create and name roofing teams within their organisation
- [ ] **TEAM-02**: Org admin can assign staff members to teams with a role (Qualified Roofer / Advancing Roofer / Apprentice)
- [ ] **TEAM-03**: System displays a warning when a team has no Qualified Roofer assigned
- [ ] **TEAM-04**: System displays a warning when a team lead lacks a supervision/mentoring qualification
- [ ] **TEAM-05**: Org admin can link a team to a project (from existing Project Evidence system)
- [ ] **TEAM-06**: Dashboard shows team composition summary with ratio indicators

### Client Process Checklist

- [ ] **CHKL-01**: RANZ admin can create/edit checklist templates with sections and items
- [ ] **CHKL-02**: System ships with a default RoofWright client process checklist (Initial Contact, Quoting, Site Setup, Execution, Completion) pre-populated from the proposal
- [ ] **CHKL-03**: Org admin can customise their company's checklist template (add/remove/reorder items)
- [ ] **CHKL-04**: Staff can create a checklist instance for a project and complete items as work progresses
- [ ] **CHKL-05**: Staff can attach photo evidence to individual checklist items
- [ ] **CHKL-06**: Dashboard shows checklist completion percentage per project
- [ ] **CHKL-07**: Completed checklists generate a company procedure document (linked to ISO Element 12 — Process Control)

### Programme Enrolment

- [ ] **ENRL-01**: Org admin can apply to enrol their organisation in the RoofWright programme
- [ ] **ENRL-02**: RANZ admin can review and approve/reject enrolment applications
- [ ] **ENRL-03**: Enrolled organisations have status tracking (Pending / Active / Renewal Due / Suspended / Withdrawn)
- [ ] **ENRL-04**: System sends renewal notifications 90/60/30 days before annual anniversary
- [ ] **ENRL-05**: RANZ admin can suspend or reinstate an organisation's programme status
- [ ] **ENRL-06**: Dashboard displays RoofWright programme status prominently (badge/indicator)
- [ ] **ENRL-07**: Public verification page shows RoofWright programme status for enrolled organisations

## Future Requirements

Deferred to future milestones:

### External Integrations
- **VHINT-01**: Auto-import CPD records from Vertical Horizonz API
- **APEX-01**: Search APEX certified products database from within portal
- **INSUR-01**: Insurance COI OCR extraction for auto-population

### Public Features
- **PUB-01**: "Check a Roofer" public search UI with RoofWright filter
- **PUB-02**: Embeddable RoofWright badge widget for member websites

### Mobile
- **MOB-01**: Mobile-optimised checklist completion for on-site use
- **MOB-02**: Offline-first photo capture with GPS tagging

## Out of Scope

Explicitly excluded from v1.2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| NZQA framework integration | Micro-credential definitions managed internally; NZQA alignment is training provider's responsibility |
| Automated assessment/grading | Assessment happens externally; portal tracks outcomes only |
| Compliance score impact | RoofWright status is display-only, does not affect existing 4-dimension scoring |
| Training delivery/LMS | Portal tracks credentials, not course content delivery |
| Financial/billing for programme | Enrolment is administrative, not a payment gateway |
| Team scheduling/rostering | Teams are for composition tracking, not workforce management |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENRL-01 | Phase 13 | Pending |
| ENRL-02 | Phase 13 | Pending |
| ENRL-03 | Phase 13 | Pending |
| ENRL-04 | Phase 13 | Pending |
| ENRL-05 | Phase 13 | Pending |
| ENRL-06 | Phase 13 | Pending |
| ENRL-07 | Phase 13 | Pending |
| MCRED-01 | Phase 14 | Pending |
| MCRED-02 | Phase 14 | Pending |
| MCRED-03 | Phase 14 | Pending |
| MCRED-04 | Phase 14 | Pending |
| MCRED-05 | Phase 14 | Pending |
| MCRED-06 | Phase 14 | Pending |
| MCRED-07 | Phase 14 | Pending |
| TEAM-01 | Phase 15 | Pending |
| TEAM-02 | Phase 15 | Pending |
| TEAM-03 | Phase 15 | Pending |
| TEAM-04 | Phase 15 | Pending |
| TEAM-05 | Phase 15 | Pending |
| TEAM-06 | Phase 15 | Pending |
| CHKL-01 | Phase 16 | Pending |
| CHKL-02 | Phase 16 | Pending |
| CHKL-03 | Phase 16 | Pending |
| CHKL-04 | Phase 16 | Pending |
| CHKL-05 | Phase 16 | Pending |
| CHKL-06 | Phase 16 | Pending |
| CHKL-07 | Phase 16 | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 25 (100%)
- Unmapped: 0

**Phase breakdown:**
- Phase 13 (Programme Enrolment): 7 requirements
- Phase 14 (Micro-Credentials): 7 requirements
- Phase 15 (Team Composition): 6 requirements
- Phase 16 (Client Checklists): 7 requirements

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after v1.2 roadmap created with 100% requirement coverage*
