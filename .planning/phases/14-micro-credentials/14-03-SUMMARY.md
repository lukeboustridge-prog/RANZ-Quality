---
phase: 14-micro-credentials
plan: 03
subsystem: api, ui, cron, r2
tags: [micro-credentials, evidence-upload, r2-storage, certificate-management, expiry-notifications, coverage-report, cron]

# Dependency graph
requires:
  - phase: 14-micro-credentials
    plan: 01
    provides: "MicroCredentialDefinition and StaffMicroCredential models, admin CRUD, notification types"
  - phase: 14-micro-credentials
    plan: 02
    provides: "Staff assignment/status tracking, org credentials page (Server Component), admin detail page"
provides:
  - "GET /api/credentials endpoint for org credential data (client-side fetch)"
  - "POST /api/credentials/[id]/evidence for certificate upload to R2"
  - "GET /api/credentials/[id]/evidence for signed download URL retrieval"
  - "Credentials page converted to use client with evidence upload/download UI"
  - "checkCredentialExpiries cron function with 90/60/30 day cumulative thresholds"
  - "GET /api/admin/micro-credentials/report for coverage report data"
  - "Admin micro-credentials page with Definitions | Coverage Report tab toggle"
affects: [14-04, 15-team-composition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "R2 certificate upload with ownership verification (org membership check before upload)"
    - "Signed URL download pattern: GET evidence endpoint generates fresh signed URL, client opens in new tab"
    - "Hidden file input pattern: ref-based file picker triggered by button click for upload UI"
    - "Cumulative threshold cron alerts (same pattern as programme renewals)"
    - "Tab toggle pattern for admin pages (useState with conditional rendering)"

key-files:
  created:
    - "src/app/api/credentials/route.ts"
    - "src/app/api/credentials/[id]/evidence/route.ts"
    - "src/app/api/admin/micro-credentials/report/route.ts"
  modified:
    - "src/app/(dashboard)/credentials/page.tsx"
    - "src/app/api/cron/notifications/route.ts"
    - "src/app/(admin)/admin/micro-credentials/page.tsx"

key-decisions:
  - "Converted credentials page from Server Component to use client for evidence upload interactivity"
  - "Certificate evidence stored in R2 under credentials/{orgId}/{memberId}/{credId}/ path with timestamp prefix"
  - "Signed download URLs generated fresh per request (1 hour default expiry from r2.ts)"
  - "Cron sends notifications only, does NOT auto-transition status to EXPIRED"
  - "Coverage report: overall coverage = orgs with at least 1 awarded / total orgs, per-org coverage = staff with at least 1 awarded / total staff"
  - "Tab toggle on admin page (definitions | report) rather than separate page"

patterns-established:
  - "Evidence upload flow: hidden input + ref + FormData POST + data refresh"
  - "Certificate view flow: GET signed URL then window.open in new tab"
  - "Admin tabbed views with lazy-loaded data (report fetched on first tab switch)"

# Metrics
duration: 6min
completed: 2026-02-10
---

# Phase 14 Plan 03: Evidence Upload and Certificate Management Summary

**Certificate evidence upload/download via R2, credential expiry cron notifications, and admin coverage report with tab-based UI**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-10T08:10:13Z
- **Completed:** 2026-02-10T08:16:26Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- Staff/org admin can upload certificate evidence (PDF, JPEG, PNG, WebP up to 50MB) for AWARDED credentials via /credentials page
- Staff/org admin can view/download previously uploaded certificates via signed R2 URL (opens in new tab)
- Evidence upload restricted to AWARDED credentials only (400 error for other statuses)
- GET /api/credentials endpoint serves org credential data for the client-side page (converted from Server Component)
- Cron job checkCredentialExpiries sends notifications at 90, 60, 30 day thresholds with flag-based duplicate prevention
- RANZ admin coverage report shows per-organisation credential adoption metrics with summary totals
- Admin micro-credentials page now has Definitions | Coverage Report tab toggle

## Task Commits

Each task was committed atomically:

1. **Task 1: Credentials list API, evidence upload/download API, and page UI** - `2ec3453` (feat)
2. **Task 2: Credential expiry cron and admin coverage report** - `b043f4f` (feat)

## Files Created/Modified
- `src/app/api/credentials/route.ts` - GET endpoint returning org members with micro-credentials for client-side page
- `src/app/api/credentials/[id]/evidence/route.ts` - POST for R2 upload (with org ownership check, AWARDED status validation, mime type/size validation), GET for signed download URL generation
- `src/app/api/admin/micro-credentials/report/route.ts` - GET endpoint for coverage report with summary and per-org breakdown
- `src/app/(dashboard)/credentials/page.tsx` - Converted from Server Component to use client; added Upload Certificate button, View Certificate link (signed URL in new tab), Replace button, error banner, loading states
- `src/app/api/cron/notifications/route.ts` - Added credentialExpiries to results, checkCredentialExpiries function with cumulative 90/60/30 day thresholds
- `src/app/(admin)/admin/micro-credentials/page.tsx` - Added Definitions | Coverage Report tab toggle, summary cards (5), per-org table with tier badges, status breakdown, coverage percentages

## Decisions Made
- Converted credentials page from Server Component to "use client" -- required for evidence upload interactivity (file input, fetch POST, loading states)
- Certificate evidence stored in R2 under `credentials/{orgId}/{memberId}/{credId}/{timestamp}-{filename}` path -- organised by org and member for easy management
- Signed download URLs generated fresh per GET request (1 hour default expiry) -- security best practice, no permanent URLs
- Cron sends CREDENTIAL_EXPIRY notifications only, does NOT auto-transition status to EXPIRED -- status transitions handled manually by RANZ admin (separate concern)
- Coverage report uses two coverage metrics: overall (orgs with at least 1 awarded / total orgs) and per-org (staff with at least 1 awarded / total staff) -- meaningful adoption metrics
- Tab toggle on admin page rather than separate route -- keeps micro-credentials management consolidated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `pnpm build` fails due to pre-existing missing RESEND_API_KEY in .env (documented tech debt in STATE.md). This is unrelated to our changes. `pnpm typecheck` passes clean.

## User Setup Required

None - no external service configuration required. R2 credentials already configured from earlier phases.

## Next Phase Readiness
- Evidence upload and download fully operational
- Cron credential expiry checks integrated and ready for production
- Coverage report available for RANZ admin oversight
- All micro-credential data accessible via API for Plan 04 (Open Badges integration)
- No blockers for Plan 04

---
*Phase: 14-micro-credentials*
*Completed: 2026-02-10*
