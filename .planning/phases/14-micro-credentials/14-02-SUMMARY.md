---
phase: 14-micro-credentials
plan: 02
subsystem: api, ui, navigation
tags: [micro-credentials, staff-assignment, status-tracking, admin-detail-page, org-credentials-view, sidebar-nav]

# Dependency graph
requires:
  - phase: 14-micro-credentials
    plan: 01
    provides: "MicroCredentialDefinition and StaffMicroCredential models, admin CRUD for definitions, 3 seeded defaults"
provides:
  - "POST /api/admin/micro-credentials/assign for credential assignment"
  - "GET/PATCH /api/admin/micro-credentials/[id]/staff for staff list and status updates"
  - "GET /api/admin/micro-credentials/assign for org/member lookup"
  - "Admin detail page at /admin/micro-credentials/[id] with staff management"
  - "Org admin credentials overview at /credentials (Server Component)"
  - "Credentials nav item in dashboard sidebar after Programme"
affects: [14-03, 14-04, 15-team-composition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GET handler on assign route for dual-purpose (org lookup + member lookup via query param)"
    - "Server Component credentials page with direct Prisma queries (will convert to use client in Plan 03)"
    - "Inline status editing with select dropdown and save/cancel buttons in admin table"

key-files:
  created:
    - "src/app/api/admin/micro-credentials/assign/route.ts"
    - "src/app/api/admin/micro-credentials/[id]/staff/route.ts"
    - "src/app/(admin)/admin/micro-credentials/[id]/page.tsx"
    - "src/app/(dashboard)/credentials/page.tsx"
  modified:
    - "src/app/(admin)/admin/micro-credentials/page.tsx"
    - "src/components/layout/sidebar.tsx"

key-decisions:
  - "Added GET handler to assign route for org/member dropdowns instead of modifying existing admin/members endpoint"
  - "Inline status editing in staff table (select + save/cancel) rather than modal dialog"
  - "Credentials page as Server Component with direct Prisma queries per plan (will convert in Plan 03)"
  - "View button added to definitions list page linking to detail page for staff management"

patterns-established:
  - "Admin detail page with definition display + staff assignment form + inline status editing"
  - "Dual-purpose API route (GET for lookup data, POST for creation) on /assign"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 14 Plan 02: Staff Assignment and Status Tracking Summary

**Admin credential assignment API with staff management detail page, org credentials overview page, and sidebar navigation update**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T08:00:28Z
- **Completed:** 2026-02-10T08:04:28Z
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 2

## Accomplishments
- RANZ admin can assign micro-credentials to staff members via POST /api/admin/micro-credentials/assign with duplicate prevention (409)
- RANZ admin can view and manage assigned staff at /admin/micro-credentials/[id] with inline status editing
- Staff credential status updates tracked via PATCH with audit logging (MCRED_ASSIGN, MCRED_AWARD, UPDATE)
- AWARDED status transition automatically sets awardedAt/awardedBy, expiry date changes reset alert flags
- Org admin credentials overview at /credentials shows staff grouped by member with status badges and summary cards
- Dashboard sidebar now includes Credentials nav item with GraduationCap icon after Programme

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin assignment API and credential detail page with staff management** - `88c25a6` (feat)
2. **Task 2: Org admin credentials view and dashboard sidebar nav** - `2705ad3` (feat)

## Files Created/Modified
- `src/app/api/admin/micro-credentials/assign/route.ts` - GET for org/member lookup, POST for credential assignment with Zod validation, duplicate check, audit logging
- `src/app/api/admin/micro-credentials/[id]/staff/route.ts` - GET staff list for definition, PATCH for status/expiry/notes updates with audit logging
- `src/app/(admin)/admin/micro-credentials/[id]/page.tsx` - Admin detail page with definition details card, staff table with inline editing, assignment form with org/member dropdowns, summary stats
- `src/app/(dashboard)/credentials/page.tsx` - Server Component org credentials overview with member-grouped list, status badges, summary cards, empty states
- `src/app/(admin)/admin/micro-credentials/page.tsx` - Added View button with Eye icon linking to detail page
- `src/components/layout/sidebar.tsx` - Added GraduationCap Credentials nav item after Programme

## Decisions Made
- Added GET handler to the assign route for org/member dropdown data rather than modifying the existing admin/members endpoint -- keeps the micro-credentials feature self-contained
- Used inline status editing (select dropdown + save/cancel) in the staff table rather than modal dialogs -- consistent with the simpler interaction patterns used elsewhere in the admin portal
- Credentials page implemented as Server Component with direct Prisma queries as specified -- Plan 03 will convert to "use client" when evidence upload interactivity is added
- Added View button to definitions list page to provide clear navigation to the detail/staff management page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created GET endpoint on assign route for org/member lookups**
- **Found during:** Task 1
- **Issue:** Plan referenced fetching from `/api/admin/members` for org list and `/api/admin/companies/[id]` for member list, but admin/members returns orgs without members and admin/companies uses AuthCompany model (not Organization)
- **Fix:** Added GET handler to `/api/admin/micro-credentials/assign` that queries Organization model directly. Supports `?orgId=xxx` param for member fetching.
- **Files modified:** `src/app/api/admin/micro-credentials/assign/route.ts`, `src/app/(admin)/admin/micro-credentials/[id]/page.tsx`
- **Commit:** `88c25a6`

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Staff assignment and status tracking fully operational
- Org credentials view ready for evidence upload enhancement (Plan 03)
- Sidebar navigation updated with Credentials link
- All audit logging in place for credential lifecycle events
- No blockers for Plan 03 (Evidence Upload & Certificate Management)

---
*Phase: 14-micro-credentials*
*Completed: 2026-02-10*
