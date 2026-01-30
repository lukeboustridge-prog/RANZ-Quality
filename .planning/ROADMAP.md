# Roadmap: RANZ Certified Business Programme Portal

## Milestones

- [x] **v1.0 MVP** - Phases 1-8 (shipped 2026-01-29)
- [ ] **v1.1 Settings** - Phases 9-12 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-8) - SHIPPED 2026-01-29</summary>

v1.0 delivered the core compliance management portal with:
- Compliance engine with 4-dimension scoring
- Real-time dashboard updates
- Security foundations (cron auth, audit trail, file validation)
- Notifications via email and SMS
- Admin reporting (PDF reports, CSV export)
- SSO integration for Roofing Reports satellite domain

29 plans completed across 8 phases in 126 minutes total execution time.

</details>

### v1.1 Settings (In Progress)

**Milestone Goal:** Enable members and staff to manage their organization profile, personal settings, notification preferences, and account security.

**Phase Numbering:**
- Integer phases (9, 10, 11, 12): Planned milestone work
- Decimal phases (9.1, 9.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 9: Organization Profile** - Company details and notification preferences
- [ ] **Phase 10: Staff Management** - Invite, remove, and manage staff roles
- [ ] **Phase 11: Personal Settings** - User profile and notification preferences
- [ ] **Phase 12: Account Security** - Password, 2FA, and session management via Clerk

## Phase Details

### Phase 9: Organization Profile
**Goal**: Org admins can maintain their company's public-facing profile and control how the organization receives notifications
**Depends on**: v1.0 MVP (Phase 8)
**Requirements**: ORG-01, ORG-02
**Success Criteria** (what must be TRUE):
  1. Org admin can update trading name, contact details, description from settings page
  2. Org admin can upload/change company logo (displayed on profile and reports)
  3. Org admin can configure which notification types the organization receives
  4. Org admin can choose notification channels (email, SMS, or both) for organization alerts
  5. Non-admin staff cannot access organization settings
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md - Schema changes for org profile and notification preferences
- [x] 09-02-PLAN.md - Organization profile editing UI and API
- [x] 09-03-PLAN.md - Organization notification preferences UI and API

### Phase 10: Staff Management
**Goal**: Org admins can manage their team by inviting new members, removing departed staff, and assigning appropriate roles
**Depends on**: Phase 9
**Requirements**: ORG-03, ORG-04, ORG-05
**Success Criteria** (what must be TRUE):
  1. Org admin can send email invitation to new staff member
  2. Invited user receives email and can join the organization
  3. Org admin can remove a staff member from the organization
  4. Org admin can change a staff member's role (admin vs member)
  5. Staff member sees their role reflected in navigation and permissions
**Plans**: TBD

Plans:
- [ ] 10-01: Staff invitation flow via Clerk
- [ ] 10-02: Staff removal and role management

### Phase 11: Personal Settings
**Goal**: Users can manage their own profile information and notification preferences independent of their organization
**Depends on**: Phase 10
**Requirements**: PERS-01, PERS-02
**Success Criteria** (what must be TRUE):
  1. User can update their name, email, and phone number
  2. User can upload/change their profile photo
  3. User can opt in/out of specific notification types
  4. User's notification preferences are respected by the notification system
**Plans**: TBD

Plans:
- [ ] 11-01: Personal profile editing via Clerk UserProfile
- [ ] 11-02: Personal notification preferences

### Phase 12: Account Security
**Goal**: Users can manage their account security settings including password, two-factor authentication, and active sessions
**Depends on**: Phase 11
**Requirements**: PERS-03, PERS-04, PERS-05
**Success Criteria** (what must be TRUE):
  1. User can change their password from security settings
  2. User can enable two-factor authentication (TOTP or SMS)
  3. User can disable two-factor authentication if already enabled
  4. User can view list of active sessions with device/location info
  5. User can sign out of any session remotely
**Plans**: TBD

Plans:
- [ ] 12-01: Security settings page with Clerk components

**Note:** Phase 12 primarily exposes Clerk's built-in security UI components. Clerk handles password management, 2FA enrollment, and session management natively. The work is integration and UI, not building these features from scratch.

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 9.1 (if any) -> 10 -> 10.1 (if any) -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 9. Organization Profile | v1.1 | 3/3 | Complete | 2026-01-31 |
| 10. Staff Management | v1.1 | 0/2 | Not started | - |
| 11. Personal Settings | v1.1 | 0/2 | Not started | - |
| 12. Account Security | v1.1 | 0/1 | Not started | - |

**Totals:**
- Phases: 4
- Plans: 8 (estimated)
- Requirements covered: 10/10

---
*Created: 2026-01-31*
*Last updated: 2026-01-31 after Phase 9 execution*
