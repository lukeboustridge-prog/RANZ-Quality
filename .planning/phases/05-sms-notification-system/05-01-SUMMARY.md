---
phase: 05-sms-notification-system
plan: 01
subsystem: notifications
tags: [sms, retry, backoff, twilio, notifications, cron]

# Dependency graph
requires:
  - phase: 03-cron-security
    provides: Cron job infrastructure for retry execution
provides:
  - Exponential backoff retry logic for failed SMS notifications
  - Database fields for retry scheduling (lastRetryAt, nextRetryAt)
  - Backoff calculation function (30s, 60s, 120s max)
affects: [06-notification-targeting, 05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [exponential-backoff, retry-scheduling, cron-based-retry]

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/lib/sms.ts
    - src/lib/notifications.ts

key-decisions:
  - "Exponential backoff schedule: 30s, 60s, 120s (capped at 15min max)"
  - "Legacy records without nextRetryAt treated as ready to retry"
  - "lastRetryAt recorded before attempt, nextRetryAt after failure"

patterns-established:
  - "Retry scheduling: Query filters on nextRetryAt to respect backoff delays"
  - "Backoff calculation: Pure function in sms.ts (no side effects)"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase 5 Plan 01: SMS Retry Backoff Summary

**Exponential backoff retry logic for failed SMS notifications with 30s/60s/120s delays, preventing retry storms**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T06:46:58Z
- **Completed:** 2026-01-28T06:50:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Database schema updated with retry timestamp fields (lastRetryAt, nextRetryAt)
- Exponential backoff calculation function implemented (2^(n-1) * 30s, max 15min)
- Retry logic respects scheduled times instead of immediate retry on every cron run

## Task Commits

Each task was committed atomically:

1. **Task 1: Add retry timestamp fields to Notification schema** - `1395649` (feat)
2. **Task 2: Implement exponential backoff calculation** - `b12586f` (feat)
3. **Task 3: Update retry logic with backoff scheduling** - `199072c` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added lastRetryAt and nextRetryAt fields to Notification model with index on nextRetryAt
- `src/lib/sms.ts` - Added calculateNextRetryTime function for exponential backoff calculation
- `src/lib/notifications.ts` - Updated retryFailedNotifications to respect backoff schedule and record retry timestamps

## Decisions Made

**1. Exponential backoff schedule**
- Retry 1: 30 seconds (2^0 * 30s)
- Retry 2: 60 seconds (2^1 * 30s)
- Retry 3: 120 seconds (2^2 * 30s)
- Rationale: Balances fast recovery for transient failures with protection against retry storms

**2. Legacy record handling**
- Records without nextRetryAt treated as ready to retry immediately
- Allows migration from old schema without data backfill
- New failures always get scheduled retry times

**3. Timestamp recording strategy**
- lastRetryAt recorded BEFORE attempt (tracks when retry was attempted)
- nextRetryAt recorded AFTER failure (schedules future retry)
- Enables debugging ("when was last attempt?") and cron scheduling ("when should we retry?")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing TypeScript errors**
- Prisma schema migration requires DATABASE_URL (expected for dev environment)
- Used `npx prisma validate` and `npx prisma generate` instead (no DB connection needed)
- Twilio import errors in TypeScript (pre-existing, unrelated to changes)
- Verification completed via grep commands and Prisma client inspection

**Resolution:** Generated Prisma client successfully, verified fields present in generated types.

## User Setup Required

None - no external service configuration required. This plan extends existing notification infrastructure with retry logic.

**Note for deployment:** Database migration will need to run in production to add the new fields:
```sql
ALTER TABLE "Notification" ADD COLUMN "lastRetryAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "nextRetryAt" TIMESTAMP(3);
CREATE INDEX "Notification_nextRetryAt_idx" ON "Notification"("nextRetryAt");
```

## Next Phase Readiness

**Ready for 05-02:** SMS delivery is now properly rate-limited with exponential backoff. Next plan (notification targeting) can build on this foundation.

**Cron job integration:** The `retryFailedNotifications()` function is ready for cron invocation (e.g., every 1 minute). It will:
- Query only notifications where `nextRetryAt <= now`
- Respect backoff delays automatically
- Stop retrying after 3 attempts (max configured in query)

**Monitoring recommendations:**
- Track retry success rate by attempt number
- Alert if retry queue grows beyond threshold
- Monitor backoff effectiveness (success rate on retry vs immediate)

---
*Phase: 05-sms-notification-system*
*Completed: 2026-01-28*
