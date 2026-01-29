---
phase: 06-notification-targeting
plan: 03
subsystem: notification-system
tags: [notification-targeting, user-linkage, database-records, gap-closure]
requires: [06-02]
provides: [userId-linked-insurance-notifications]
affects: [user-notification-queries, notification-audit-trail]
tech-stack:
  added: []
  patterns: [userId-threading, parameter-extension]
key-files:
  created: []
  modified:
    - src/app/api/cron/notifications/route.ts
    - src/lib/notifications.ts
decisions:
  - id: 06-03-01
    decision: Thread ownerUserId through entire insurance notification chain
    rationale: Enables "all notifications for user X" queries and proper audit trail
    alternatives: [Add userId in createNotification only, Post-process to add userId]
    chosen: Thread through all layers for clarity and type safety
  - id: 06-03-02
    decision: Make ownerUserId optional parameter
    rationale: Backwards compatibility if called without userId (though all current calls include it)
    alternatives: [Required parameter, Separate function signature]
    chosen: Optional with undefined handling
metrics:
  duration: 3 minutes
  completed: 2026-01-28
---

# Phase 6 Plan 3: Add userId Linkage to Insurance Expiry Notifications

> Insurance expiry notifications now include owner userId for proper user-targeted queries and audit trail.

## What Was Built

Added userId linkage to all insurance expiry notifications (90-day, 60-day, 30-day alerts) so database records connect to specific users, enabling "all notifications for user X" queries.

**Technical implementation:**
1. Extended Prisma query to fetch `clerkUserId` from organization owner
2. Updated `notifyInsuranceExpiry()` signature to accept `ownerUserId?: string`
3. Threaded userId through to both EMAIL and SMS `createNotification()` calls
4. Passed `owner.clerkUserId` in cron route notification call

## Tasks Completed

### Task 1: Add clerkUserId to insurance expiry query
**Commit:** bb876d6
**Files:** src/app/api/cron/notifications/route.ts

Extended the insurance expiry Prisma query's member select to include `clerkUserId` alongside email and phone.

**Before:**
```typescript
select: { email: true, phone: true }
```

**After:**
```typescript
select: { email: true, phone: true, clerkUserId: true }
```

### Task 2: Update notifyInsuranceExpiry to accept and pass userId
**Commit:** bb876d6
**Files:** src/lib/notifications.ts

Updated the `notifyInsuranceExpiry()` function to accept `ownerUserId` parameter and pass it to both EMAIL and SMS `createNotification()` calls.

**Changes:**
1. Added `ownerUserId?: string` to function signature
2. Added `ownerUserId` to destructuring
3. Passed `userId: ownerUserId` to EMAIL createNotification
4. Passed `userId: ownerUserId` to SMS createNotification

Both notification channels now link to the owner's userId in the database.

### Task 3: Pass ownerUserId in cron notification call
**Commit:** bb876d6
**Files:** src/app/api/cron/notifications/route.ts

Updated the cron route to pass the fetched `clerkUserId` to `notifyInsuranceExpiry()`.

**Before:**
```typescript
await notifyInsuranceExpiry({
  organizationId: policy.organizationId,
  businessName: policy.organization.name,
  policyType: policyTypeLabels[policy.policyType] || policy.policyType,
  daysUntilExpiry,
  ownerEmail: owner.email,
  ownerPhone: owner.phone || undefined,
});
```

**After:**
```typescript
await notifyInsuranceExpiry({
  organizationId: policy.organizationId,
  businessName: policy.organization.name,
  policyType: policyTypeLabels[policy.policyType] || policy.policyType,
  daysUntilExpiry,
  ownerEmail: owner.email,
  ownerPhone: owner.phone || undefined,
  ownerUserId: owner.clerkUserId,  // NEW: Link to owner user
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Gap Closure Status

This plan closes the gaps identified in 06-VERIFICATION.md:

**Gap 1: Insurance expiry notifications missing userId linkage**
- Status: ✅ CLOSED
- Solution: clerkUserId fetched in query, passed through notifyInsuranceExpiry, included in createNotification

**Root cause fixed:**
- Query now fetches clerkUserId
- notifyInsuranceExpiry accepts and passes ownerUserId
- Both EMAIL and SMS notifications include userId

**Verification:**
- grep confirms clerkUserId in select: ✅
- Function signature includes ownerUserId: ✅
- userId passed to both createNotification calls: ✅ (count = 2)
- Cron passes owner.clerkUserId: ✅

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Dependencies satisfied:**
- Insurance expiry notifications now link to specific user ID
- "All notifications for user X" queries now possible
- Phase 6 success criterion #4 satisfied

**Ready for:** Phase 6 complete - all notification targeting implemented

## Technical Notes

### userId Threading Pattern

The implementation follows a clean threading pattern:
1. Data layer (Prisma query) → fetches clerkUserId
2. Business logic (notifyInsuranceExpiry) → accepts ownerUserId parameter
3. Database layer (createNotification) → stores userId in Notification record

This pattern maintains type safety and makes the data flow explicit at each layer.

### Backwards Compatibility

The `ownerUserId` parameter is optional (`ownerUserId?: string`), providing backwards compatibility if `notifyInsuranceExpiry` were called without userId (though all current calls include it).

### SMS vs EMAIL Consistency

Both EMAIL and SMS notifications for insurance expiry now include userId, ensuring consistent user linkage regardless of notification channel. This enables:
- Unified "all notifications for user X" queries
- Consistent audit trail across channels
- Per-user notification preferences (future enhancement)

## Verification Evidence

```bash
# clerkUserId in query select (appears twice - 90/60/30 day checks share same include)
$ grep -A2 "where.*OWNER" src/app/api/cron/notifications/route.ts | grep clerkUserId
✅ select: { email: true, phone: true, clerkUserId: true },

# Function signature updated
$ grep "ownerUserId.*string" src/lib/notifications.ts
✅ ownerUserId?: string;  // NEW: Links notification to specific user

# userId passed to both notifications
$ grep -c "userId: ownerUserId" src/lib/notifications.ts
✅ 2

# Cron passes ownerUserId
$ grep "ownerUserId.*owner" src/app/api/cron/notifications/route.ts
✅ ownerUserId: owner.clerkUserId,  // NEW: Link to owner user
```

## Files Modified

### src/app/api/cron/notifications/route.ts
- Line 88: Added `clerkUserId: true` to member select
- Line 129: Added `ownerUserId: owner.clerkUserId` to notifyInsuranceExpiry call

### src/lib/notifications.ts
- Line 230: Added `ownerUserId?: string` to function signature
- Line 238: Added `ownerUserId` to destructuring
- Line 246: Added `userId: ownerUserId` to EMAIL createNotification
- Line 272: Added `userId: ownerUserId` to SMS createNotification
