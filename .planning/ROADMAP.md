# Roadmap: RANZ Certified Business Programme Portal

## Milestones

- ✅ **v1.0 MVP** - Phases 1-8 (shipped 2026-01-29)
- ✅ **v1.1 Settings** - Phases 9-12 (shipped 2026-01-31)
- 🚧 **v1.2 RoofWright Programme** - Phases 13-16 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) - SHIPPED 2026-01-29</summary>

**Delivered:** Complete compliance management portal ready for Q2 2026 pilot launch.

**Key accomplishments:**
- Consolidated compliance engine with canonical scoring (compliance-v2.ts)
- Real-time dashboard updates with dimension-specific indicators
- Security foundations with cron endpoint authentication, audit trail with SHA-256 hash chain
- Public verification API using NZBN/trading name
- SMS notifications via Twilio with exponential backoff retry
- Triple-channel notification targeting (org email, member email, member SMS)
- Admin reporting with PDF generation and CSV export
- SSO integration with Clerk metadata sync for satellite domain

**Stats:** 8 phases, 29 plans, 126 min total execution time

</details>

<details>
<summary>✅ v1.1 Settings (Phases 9-12) - SHIPPED 2026-01-31</summary>

**Delivered:** Organization and personal settings management.

**Key accomplishments:**
- Organization profile and notification preferences (ORG-01, ORG-02)
- Staff invitation and role management (ORG-03, ORG-04, ORG-05)
- Personal profile and notification preferences (PERS-01, PERS-02)
- Account security via Clerk (password, 2FA, sessions) (PERS-03, PERS-04, PERS-05)

**Stats:** 4 phases, 9 plans

</details>

### 🚧 v1.2 RoofWright Programme (In Progress)

**Milestone Goal:** Implement RoofWright Quality Programme features — micro-credential management, team composition tracking, structured client process checklists, and formal programme enrolment with annual renewal.

**Phase Numbering:**
- Integer phases (13, 14, 15, 16): Planned milestone work
- Decimal phases (13.1, 13.2): Urgent insertions (if needed)

- [ ] **Phase 13: Programme Enrolment** - Application, approval, status tracking, and renewal
- [ ] **Phase 14: Micro-Credential Management** - Credential definitions, tracking, and expiry
- [ ] **Phase 15: Team Composition Tracking** - Team creation, staff assignment, and warnings
- [ ] **Phase 16: Client Process Checklists** - Template creation, project instances, and procedure docs

## Phase Details

### Phase 13: Programme Enrolment

**Goal:** Organizations can enroll in the RoofWright programme and RANZ can manage their status.

**Depends on:** Nothing (foundation for milestone)

**Requirements:** ENRL-01, ENRL-02, ENRL-03, ENRL-04, ENRL-05, ENRL-06, ENRL-07

**Success Criteria** (what must be TRUE):
1. Org admin can submit an enrolment application for their organization
2. RANZ admin can review pending applications and approve or reject them
3. Enrolled organizations display their programme status on the dashboard with a visual badge/indicator
4. System sends renewal reminders at 90, 60, and 30 days before annual anniversary
5. Public verification page shows RoofWright programme status for enrolled organizations

**Plans:** 4 plans

Plans:
- [ ] 13-01-PLAN.md — Schema, types, and org application flow (ENRL-01, ENRL-03)
- [ ] 13-02-PLAN.md — Admin review, approval, and status management (ENRL-02, ENRL-05)
- [ ] 13-03-PLAN.md — Dashboard badge and public verification (ENRL-04, ENRL-06)
- [ ] 13-04-PLAN.md — Renewal notification cron and documentation (ENRL-07)

---

### Phase 14: Micro-Credential Management

**Goal:** RANZ can define and track micro-credentials, and organizations can manage their staff credentials.

**Depends on:** Phase 13

**Requirements:** MCRED-01, MCRED-02, MCRED-03, MCRED-04, MCRED-05, MCRED-06, MCRED-07

**Success Criteria** (what must be TRUE):
1. RANZ admin can create and edit micro-credential definitions (title, level, skill standard reference)
2. RANZ admin can assign micro-credentials to staff members with status tracking (Not Started → In Training → Assessment Pending → Awarded → Expired)
3. Org admin can view all their staff members' micro-credential status in a single view
4. Staff members can upload certificate evidence against awarded credentials
5. System sends expiry notifications at 90, 60, and 30 days before credentials expire
6. Portal ships with three default RANZ micro-credential definitions pre-populated

**Plans:** TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD
- [ ] 14-03: TBD

---

### Phase 15: Team Composition Tracking

**Goal:** Organizations can create teams, assign staff with roles, and see composition warnings.

**Depends on:** Phase 14

**Requirements:** TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06

**Success Criteria** (what must be TRUE):
1. Org admin can create named roofing teams and assign staff members with roles (Qualified Roofer / Advancing Roofer / Apprentice)
2. System displays warnings when a team has no Qualified Roofer assigned
3. System displays warnings when a team lead lacks a supervision/mentoring qualification
4. Org admin can link teams to projects from the existing Project Evidence system
5. Dashboard shows team composition summary with qualified-to-apprentice ratio indicators

**Plans:** TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

---

### Phase 16: Client Process Checklists

**Goal:** Organizations can use structured checklists for client process tracking and generate procedure documents.

**Depends on:** Phase 15

**Requirements:** CHKL-01, CHKL-02, CHKL-03, CHKL-04, CHKL-05, CHKL-06, CHKL-07

**Success Criteria** (what must be TRUE):
1. RANZ admin can create and edit checklist templates with sections and items
2. Portal ships with a default RoofWright client process checklist (Initial Contact → Quoting → Site Setup → Execution → Completion) pre-populated
3. Org admin can customize their company's checklist template (add/remove/reorder items)
4. Staff can create checklist instances for projects and mark items complete as work progresses
5. Staff can attach photo evidence to individual checklist items
6. Dashboard shows checklist completion percentage for each project
7. Completed checklists generate a company procedure document linked to ISO Element 12 (Process Control)

**Plans:** TBD

Plans:
- [ ] 16-01: TBD
- [ ] 16-02: TBD
- [ ] 16-03: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 → 15 → 16
(Decimal phases like 13.1 would execute between their surrounding integers)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-01-29 |
| 2. Compliance Engine | v1.0 | 4/4 | Complete | 2026-01-29 |
| 3. Security & Cron | v1.0 | 3/3 | Complete | 2026-01-29 |
| 4. Public Verification | v1.0 | 4/4 | Complete | 2026-01-29 |
| 5. Notifications | v1.0 | 5/5 | Complete | 2026-01-29 |
| 6. Admin Reporting | v1.0 | 4/4 | Complete | 2026-01-29 |
| 7. SSO Integration | v1.0 | 3/3 | Complete | 2026-01-29 |
| 8. Dashboard Polish | v1.0 | 3/3 | Complete | 2026-01-29 |
| 9. Organization Profile | v1.1 | 3/3 | Complete | 2026-01-31 |
| 10. Staff Management | v1.1 | 2/2 | Complete | 2026-01-31 |
| 11. Personal Settings | v1.1 | 3/3 | Complete | 2026-01-31 |
| 12. Account Security | v1.1 | 1/1 | Complete | 2026-01-31 |
| 13. Programme Enrolment | v1.2 | 0/4 | Not started | - |
| 14. Micro-Credentials | v1.2 | 0/3 | Not started | - |
| 15. Team Composition | v1.2 | 0/2 | Not started | - |
| 16. Client Checklists | v1.2 | 0/3 | Not started | - |

**Totals:**
- v1.0: 8 phases, 29 plans ✅
- v1.1: 4 phases, 9 plans ✅
- v1.2: 4 phases, 12 plans (estimated) 🚧

---

*Last updated: 2026-02-10 after Phase 13 plans revised (4 plans, 3 waves)*
