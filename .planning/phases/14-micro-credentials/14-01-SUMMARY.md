---
phase: 14-micro-credentials
plan: 01
subsystem: database, api, ui
tags: [prisma, micro-credentials, admin-crud, nqf-levels, ranz-roofwright]

# Dependency graph
requires:
  - phase: 13-programme-enrolment
    provides: "ProgrammeEnrolment model, admin layout with Programme nav, notification system with preference mappings"
provides:
  - "MicroCredentialDefinition and StaffMicroCredential database models"
  - "MicroCredentialStatus enum with 5 states"
  - "Admin CRUD API for credential definitions (/api/admin/micro-credentials)"
  - "Admin page at /admin/micro-credentials with inline form and table"
  - "3 default RANZ credentials auto-seeded (Reclad/Reroofing L5, Repairs/Maintenance L5, Compliance Practices L4)"
  - "CREDENTIAL_EXPIRY and CREDENTIAL_STATUS_CHANGE notification types"
  - "MCRED_ASSIGN, MCRED_AWARD, MCRED_EXPIRE audit actions"
affects: [14-02, 14-03, 14-04, 15-team-composition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-seed default records on first GET request (check count, createMany with skipDuplicates)"
    - "Inline form toggle pattern for admin CRUD pages (create/edit reuse same form)"

key-files:
  created:
    - "src/app/api/admin/micro-credentials/route.ts"
    - "src/app/api/admin/micro-credentials/[id]/route.ts"
    - "src/app/(admin)/admin/micro-credentials/page.tsx"
  modified:
    - "prisma/schema.prisma"
    - "src/types/index.ts"
    - "src/lib/notifications.ts"
    - "src/app/(admin)/layout.tsx"

key-decisions:
  - "Auto-seed default credentials on first GET request rather than migration script"
  - "Inline form toggle for create/edit rather than window.prompt (more fields than programme page)"
  - "Default definitions protected from deletion via isDefault flag and API-level guard"
  - "StaffMicroCredential uses unique constraint on [definitionId, memberId] for one-per-staff"

patterns-established:
  - "Admin CRUD with inline form: toggle visibility, reuse for create/edit, cancel resets state"
  - "Auto-seed pattern: check isDefault count on GET, createMany if zero"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 14 Plan 01: Micro-credential Schema and Admin Definitions Summary

**MicroCredentialDefinition and StaffMicroCredential models with admin CRUD page, 3 auto-seeded RANZ defaults, and notification/audit type extensions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T07:52:40Z
- **Completed:** 2026-02-10T07:57:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- MicroCredentialDefinition and StaffMicroCredential models created with full indexing, expiry tracking, and certificate evidence fields
- Admin CRUD page at /admin/micro-credentials with inline create/edit form, table view, and delete protection for defaults
- 3 default RANZ credentials auto-seeded on first admin visit (Reclad/Reroofing L5, Repairs/Maintenance L5, Compliance Practices L4)
- NotificationType, AuditAction, and all 4 notification preference mappings extended for credential lifecycle events

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema, migration, and TypeScript types** - `38717aa` (feat)
2. **Task 2: Admin CRUD API, definitions page, seed defaults, and admin nav** - `cd6b6b9` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added MicroCredentialStatus enum, MicroCredentialDefinition model, StaffMicroCredential model, microCredentials relation on OrganizationMember, CREDENTIAL_EXPIRY/CREDENTIAL_STATUS_CHANGE notification types, MCRED_ASSIGN/MCRED_AWARD/MCRED_EXPIRE audit actions
- `src/types/index.ts` - Added MicroCredentialStatus type, MICRO_CREDENTIAL_STATUS_LABELS, extended NotificationType and AuditAction unions, extended NOTIFICATION_TYPE_LABELS
- `src/lib/notifications.ts` - Added CREDENTIAL_EXPIRY and CREDENTIAL_STATUS_CHANGE to all 4 preference mapping objects
- `src/app/api/admin/micro-credentials/route.ts` - GET (list with auto-seed) and POST (create with Zod validation and audit log)
- `src/app/api/admin/micro-credentials/[id]/route.ts` - GET (single with status counts), PATCH (update with audit log), DELETE (with default/assignment guards and audit log)
- `src/app/(admin)/admin/micro-credentials/page.tsx` - Admin page with inline form, table, default badge, delete protection
- `src/app/(admin)/layout.tsx` - Added Micro-credentials nav item with GraduationCap icon after Programme

## Decisions Made
- Auto-seed default credentials on first GET request rather than a separate migration script -- keeps setup zero-config for admin users
- Used inline form toggle pattern (create/edit reuse same form) rather than window.prompt -- credential definitions have more fields than programme actions
- Default definitions protected from deletion via isDefault flag checked at API level with 409 response
- StaffMicroCredential uses @@unique([definitionId, memberId]) to enforce one credential per staff per definition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- MicroCredentialDefinition and StaffMicroCredential models ready for assignment workflows (14-02)
- Admin can manage credential catalogue, 3 defaults pre-populated
- Notification types and audit actions ready for credential lifecycle events
- No blockers for Plan 02 (Staff Assignment & Status Tracking)

---
*Phase: 14-micro-credentials*
*Completed: 2026-02-10*
