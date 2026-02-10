---
phase: 13-programme-enrolment
plan: 01
subsystem: programme-enrolment
tags: [prisma, schema, api, forms, navigation]
dependency-graph:
  requires: []
  provides: [ProgrammeEnrolment-model, programme-types, programme-apply-api, programme-pages, sidebar-programme-nav]
  affects: [13-02, 13-03, 13-04]
tech-stack:
  added: []
  patterns: [server-component-status-page, client-form-with-api-post, zod-validation, audit-log-integration]
key-files:
  created:
    - src/app/api/programme/apply/route.ts
    - src/app/(dashboard)/programme/page.tsx
    - src/app/(dashboard)/programme/apply/page.tsx
  modified:
    - prisma/schema.prisma
    - src/types/index.ts
    - src/components/layout/sidebar.tsx
    - src/lib/notifications.ts
decisions:
  - id: 13-01-D1
    description: "Programme nav placed after CAPA in sidebar (last in primary nav before secondary)"
    rationale: "Programme is a top-level feature but less frequently accessed than daily ops items"
  - id: 13-01-D2
    description: "Re-application deletes WITHDRAWN record then creates new one (vs updating in place)"
    rationale: "Clean separation of enrolment history; unique constraint on organizationId requires delete-then-create"
  - id: 13-01-D3
    description: "Notification mappings added in Task 1 (plan had them in Task 2) to satisfy typecheck"
    rationale: "NotificationType union expansion required all four mapping objects to be updated before typecheck could pass"
metrics:
  duration: 8 min
  completed: 2026-02-10
---

# Phase 13 Plan 01: Schema, Types, and Application Flow Summary

Database schema, TypeScript types, and org-facing application flow for RoofWright programme enrolment.

## One-liner

ProgrammeEnrolment model with 5 status states, application API with role/duplicate checks, status page, and sidebar nav.

## What Was Done

### Task 1: Prisma Schema, Migration, and TypeScript Types (9d43926)
- Added `ProgrammeEnrolmentStatus` enum with 5 states: PENDING, ACTIVE, RENEWAL_DUE, SUSPENDED, WITHDRAWN
- Added `ProgrammeEnrolment` model with application, review, renewal tracking, and suspension fields
- Added `programmeEnrolment` relation to Organization model
- Added `PROGRAMME_RENEWAL` and `PROGRAMME_STATUS_CHANGE` to NotificationType enum
- Added 5 enrolment audit actions: ENROL_APPLY, ENROL_APPROVE, ENROL_REJECT, ENROL_SUSPEND, ENROL_REINSTATE
- Exported `ProgrammeEnrolmentStatus` type and `PROGRAMME_ENROLMENT_STATUS_LABELS` from types
- Updated all four notification preference mapping objects for new notification types
- Applied schema via `pnpm prisma db push`

### Task 2: Application Form, API, Programme Page, and Sidebar (c60a0e1)
- Created `POST /api/programme/apply` with:
  - Clerk auth, OWNER/ADMIN role validation
  - Existing enrolment check (409 if not WITHDRAWN)
  - WITHDRAWN re-application support (delete old, create new)
  - Zod validation for optional message field
  - Audit log via `createAuditLog` with ENROL_APPLY action
  - Returns 201 with created enrolment
- Created `/programme` page (Server Component):
  - Shows programme info card with benefits when no enrolment
  - Shows status badge and contextual message when enrolled
  - Status-specific messaging (PENDING review, ACTIVE with anniversary, RENEWAL_DUE, SUSPENDED with reason)
  - WITHDRAWN status shows re-application button
- Created `/programme/apply` page (Client Component):
  - Form with read-only org name from Clerk, optional message textarea (500 char limit)
  - POSTs to API, handles 409 conflict, redirects on success
- Added Programme nav item with Award icon to sidebar after CAPA

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Notification mappings moved from Task 2 to Task 1**
- **Found during:** Task 1 typecheck verification
- **Issue:** Expanding NotificationType union in types caused TypeScript errors in notifications.ts because the four Record mapping objects were missing the new keys
- **Fix:** Added PROGRAMME_RENEWAL and PROGRAMME_STATUS_CHANGE to all four notification mapping objects in Task 1 instead of Task 2
- **Files modified:** src/lib/notifications.ts
- **Commit:** 9d43926

**2. [Pre-existing] Build failure due to missing RESEND_API_KEY**
- **Found during:** Task 2 build verification
- **Issue:** `pnpm build` fails at page data collection for `/api/admin/bulk` because RESEND_API_KEY is not set in .env
- **Impact:** This is a pre-existing issue unrelated to our changes. Verified by stashing changes and running build which shows same failure
- **Note:** TypeScript typecheck passes cleanly; this is an environment config issue only

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 13-01-D1 | Programme nav placed after CAPA | Top-level feature but less frequent than daily ops |
| 13-01-D2 | Re-application deletes WITHDRAWN record | Unique constraint requires delete-then-create |
| 13-01-D3 | Notification mappings in Task 1 | Required for typecheck to pass |

## Next Phase Readiness

- ProgrammeEnrolment model is in database and ready for admin review endpoints (13-02)
- All 5 audit actions registered for future admin operations
- Notification types registered for renewal and status change notifications (13-03)
- Status page structure ready for enhanced display once admin review flow exists
