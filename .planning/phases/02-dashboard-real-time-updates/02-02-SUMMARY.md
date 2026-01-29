---
phase: 02-dashboard-real-time-updates
plan: 02
subsystem: api
tags: [next.js, revalidatePath, cache-invalidation, compliance-v2, real-time-updates]

# Dependency graph
requires:
  - phase: 01-compliance-engine-consolidation
    provides: Canonical compliance-v2.ts scoring engine with updateOrganizationComplianceScore
provides:
  - All compliance-affecting mutation endpoints invalidate dashboard cache
  - Insurance route uses canonical compliance-v2.ts scoring (inline function removed)
  - Real-time dashboard updates on insurance/document/staff mutations
affects: [03-notifications-thresholds, 04-public-api-design, future-api-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns: [revalidatePath after compliance mutations, canonical scoring only]

key-files:
  created: []
  modified:
    - src/app/api/insurance/route.ts
    - src/app/api/documents/[id]/approve/route.ts
    - src/app/api/staff/[id]/verify-lbp/route.ts
    - src/app/api/staff/[id]/route.ts
    - src/app/api/staff/route.ts

key-decisions:
  - "All compliance-affecting endpoints call revalidatePath('/dashboard') after scoring"
  - "Removed duplicate inline scoring functions in favor of canonical compliance-v2.ts"
  - "Staff [id] route DELETE/PUT now use canonical scoring instead of inline function"

patterns-established:
  - "Pattern: Every endpoint that modifies compliance-affecting data must: (1) call updateOrganizationComplianceScore, (2) call revalidatePath('/dashboard')"
  - "Pattern: No inline scoring calculations - always import from compliance-v2.ts"

# Metrics
duration: 8min
completed: 2026-01-28
---

# Phase 02 Plan 02: Dashboard Real-Time Updates Summary

**All compliance mutation endpoints now trigger immediate dashboard cache invalidation with canonical compliance-v2.ts scoring**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-28T03:14:09Z
- **Completed:** 2026-01-28T03:22:11Z
- **Tasks:** 3 (2 new commits, 1 already complete from 02-01)
- **Files modified:** 5

## Accomplishments
- Removed duplicate inline scoring functions from insurance and staff routes
- Added revalidatePath('/dashboard') to all compliance-affecting mutation endpoints
- Dashboard now updates in real-time when users upload insurance, approve documents, or modify staff
- Established consistent pattern: canonical scoring + cache invalidation for all mutations

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix insurance route to use canonical scoring and add revalidatePath** - Already complete from 02-01 (no new commit)
   - Insurance route already had updateOrganizationComplianceScore and revalidatePath
   - Inline function already removed in prior commit
2. **Task 2: Add revalidatePath to document approval route** - `10d0d2b` (feat)
3. **Task 3: Add revalidatePath to LBP verification and staff routes** - `722d16f` (feat)

_Note: Task 1 discovered to be already complete from previous 02-01 execution_

## Files Created/Modified
- `src/app/api/insurance/route.ts` - Already using canonical scoring with revalidatePath (from 02-01)
- `src/app/api/documents/[id]/approve/route.ts` - Added revalidatePath after approval
- `src/app/api/staff/[id]/verify-lbp/route.ts` - Added revalidatePath after LBP verification
- `src/app/api/staff/[id]/route.ts` - Removed inline scoring, added canonical + revalidatePath to PUT/DELETE
- `src/app/api/staff/route.ts` - Added revalidatePath to POST handler

## Decisions Made

**Canonical Scoring Enforcement:**
Removed duplicate inline `updateComplianceScore` functions that used incorrect weights (40/30/30 instead of canonical 50/25/15/10). All routes now import and use `updateOrganizationComplianceScore` from compliance-v2.ts.

**Cache Invalidation Pattern:**
Established consistent pattern: every endpoint that affects compliance score must call `revalidatePath('/dashboard')` immediately after updating the score. This ensures users see fresh data without page refresh.

**Task 1 Already Complete:**
Discovered during execution that insurance route was already properly wired in the 02-01 plan. This is correct behavior - the 02-01 plan likely addressed dashboard/insurance integration while 02-02 focuses on documents/staff/verification endpoints.

## Deviations from Plan

None - plan executed exactly as written. Task 1 was already complete from prior work, which was documented and moved forward.

## Issues Encountered

**Pre-existing TypeScript Errors:**
TypeScript compilation shows 10+ errors in unrelated files (admin routes, prisma config, Prisma schema mismatches). These are pre-existing issues not introduced by this plan:
- `prisma/prisma.config.ts` - Type mismatch
- `src/app/api/admin/bulk/route.ts` - Missing Prisma methods/properties
- Various schema mismatches with generated types

These do not affect the functionality of the modified files and are tracked separately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 03 (Notifications Thresholds):**
- All compliance mutations now trigger scoring updates
- Dashboard cache invalidation pattern established
- Compliance thresholds (from types/index.ts COMPLIANCE_THRESHOLDS) can now be used to trigger notifications
- Insurance expiry alerts, LBP verification failures, and document approval notifications can build on this foundation

**No blockers.** Real-time updates working as expected. Next phase can implement alert triggers based on COMPLIANCE_THRESHOLDS.

---
*Phase: 02-dashboard-real-time-updates*
*Completed: 2026-01-28*
