---
phase: 04-public-api-hardening
plan: 02
subsystem: public-api
tags: [security, api, deprecation, enumeration-prevention]
dependency-graph:
  requires: [04-01]
  provides: [legacy-endpoint-deprecation]
  affects: []
tech-stack:
  added: []
  patterns: [deprecation-handler, CUID-detection]
key-files:
  created: []
  modified:
    - src/app/api/public/verify/[businessId]/route.ts
decisions:
  - CUID detection regex: /^c[lm][a-z0-9]{20,}$/i (covers Prisma-generated IDs)
  - All requests return 400 (not 301/302 redirect) to make deprecation explicit
  - Include migration.examples array for self-service migration
metrics:
  duration: 1 min
  completed: 2026-01-28
---

# Phase 04 Plan 02: Legacy Endpoint Deprecation Summary

**One-liner:** Deprecated legacy /verify/[businessId] endpoint with CUID detection to prevent org ID enumeration attacks.

## What Was Built

Updated the legacy verification endpoint (`/api/public/verify/[businessId]`) to reject all requests and direct users to the new query-parameter endpoint. The handler detects different input types and provides context-appropriate error messages.

### Key Changes

1. **Removed database access** - No longer queries organizations by ID
2. **CUID detection** - Identifies internal org IDs by regex pattern `/^c[lm][a-z0-9]{20,}$/i`
3. **NZBN detection** - Uses shared NZBN_REGEX from types/index.ts
4. **Migration guidance** - All responses include clear examples of new endpoint format

### Response Types

| Input Type | Detection | Response |
|------------|-----------|----------|
| CUID org ID | Starts with cl/cm + 20+ alphanumeric | 400 with enumeration attack explanation |
| Valid NZBN | 13 digits | 400 with redirect suggestion to query params |
| Other | Fallback | 400 with generic deprecation message |

## Verification Results

- Legacy endpoint file has 4 mentions of deprecated/enumeration
- No database imports in legacy file (confirmed removed)
- TypeScript compiles without errors for this file
- CORS headers maintained for public API compatibility

## Security Impact

This change completes the SEC-02 requirement from Phase 04:
- Internal organization IDs can no longer be enumerated via the public API
- Attackers cannot iterate through sequential or predictable ID patterns
- Users receive clear guidance to migrate to NZBN/name-based lookups

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/public/verify/[businessId]/route.ts` | Replaced database lookup with deprecation handler |

## Commits

| Hash | Message |
|------|---------|
| 758f546 | feat(04-02): deprecate legacy verification endpoint to prevent enumeration |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 04 is now complete (plans 04-01, 04-02, and 04-03 all done). Ready to proceed to Phase 05 (SMS Notifications) or Phase 06 (Notification Recipients).
