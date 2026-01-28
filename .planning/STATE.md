# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.
**Current focus:** Phase 5 - SMS Notification System

## Current Position

Phase: 4 of 8 (Public API Hardening) — COMPLETE
Plan: 3 of 3 in phase (04-01, 04-02, 04-03 complete)
Status: Phase 4 verified, ready for Phase 5
Last activity: 2026-01-28 — Phase 4 verified complete (5/5 must-haves)

Progress: [█████░░░░░] ~62% (16/26 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 5 min
- Total execution time: 71 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | 23 min | 6 min |
| 02 | 3 | 23 min | 8 min |
| 03 | 4 | 18 min | 5 min |
| 04 | 3 | 7 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-03 (5 min), 03-04 (7 min), 04-01 (3 min), 04-03 (3 min), 04-02 (1 min)
- Trend: Consistent 1-3 minute execution on API hardening tasks

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: compliance-v2.ts selected as canonical scoring engine (four-dimension breakdown, issue tracking)
- All phases: Depth=comprehensive (8 phases) to address MVP gaps before Q2 2026 pilot launch
- 01-01: Constants appended to existing types/index.ts (not new file)
- 01-01: Legacy compliance.ts was untracked so removal was fs-only
- 01-03: Reports.ts keeps >= 50 threshold for needsAttention (not part of COMPLIANCE_THRESHOLDS)
- 01-04: Mixed import syntax for COMPLIANCE_THRESHOLDS with type imports
- 02-01: Action items derived from ComplianceResult.issues (replaced manual logic)
- 02-01: DimensionIndicators separated from ComplianceScore (better component separation)
- 02-02: All compliance mutation endpoints call revalidatePath('/dashboard') for immediate updates
- 02-02: Removed duplicate inline scoring functions (insurance, staff routes now use canonical compliance-v2)
- 02-03: useTransition pattern established for all form loading states (replaced manual useState)
- 02-03: LoadingButton component created for reusable loading UI pattern
- 02-03: VerifyLBPButton added to MemberCard for on-demand verification (complements nightly cron)
- 03-01: CRON_SECRET minimum 32 characters enforced via Zod validation (fail-fast security)
- 03-01: Centralized verifyCronRequest utility eliminates duplicate auth code
- 03-01: Unauthorized cron attempts logged with IP, userAgent, path, timestamp
- 03-02: audit-log.ts created with createAuditLog, SHA-256 hash chain, and convenience wrappers
- 03-03: All audit log calls occur after successful database mutations (not before)
- 03-03: Audit logging failures logged to console but don't block operations
- 03-03: Before/after state includes only business-critical fields (not full records)
- 03-04: Admin audit trail viewer at /admin/organizations/[id]/audit with hash chain verification status
- 04-01: Old /api/public/verify/[businessId] endpoint retained for backwards compatibility
- 04-01: Badge URLs still use internal IDs (no public enumeration risk for image endpoint)
- 04-01: NZBN format: exactly 13 digits (New Zealand Business Number standard)
- 04-01: Name search is case-insensitive using Prisma mode: 'insensitive'
- 04-02: CUID detection regex: /^c[lm][a-z0-9]{20,}$/i (covers Prisma-generated IDs)
- 04-02: All legacy endpoint requests return 400 (not 301/302) to make deprecation explicit
- 04-03: 50MB file size limit chosen to balance large PDF/CAD files with storage protection
- 04-03: Two-level validation: framework (Next.js) + handler (explicit control, better errors)
- 04-03: Insurance certificates optional - size validation only when file provided

### Pending Todos

None.

### Blockers/Concerns

**From codebase analysis (CONCERNS.md):**
- Phase 1 addresses: Duplicate compliance scoring causing inconsistencies, hardcoded thresholds [COMPLETE]
- Phase 2 addresses: Dashboard shows false positive indicators, score doesn't recalculate on changes [COMPLETE]
- Phase 3 addresses: Unsecured cron endpoints, missing audit trail implementation [COMPLETE - 4/4 plans]
- Phase 4 addresses: Public API enumeration risk, no file size validation [COMPLETE - 3/3 plans]
- Phase 5-6 address: SMS notifications configured but not called, wrong recipient targeting
- Phase 7 addresses: Report generation stubbed with TODO comments
- Phase 8 addresses: SSO satellite domain not configured

**Discovered during execution:**
- Pre-existing Prisma schema errors (ReportStatus type undefined) - FIXED in 04-01
- Pre-existing TypeScript errors (unrelated to plan changes, require Prisma client regeneration)

**Critical for pilot launch:**
All 8 phases must complete before onboarding 10-30 pilot members in Q2 2026.

## Session Continuity

Last session: 2026-01-28T05:25:13Z
Stopped at: Completed 04-02-PLAN.md
Resume file: None

---
*Next step: /gsd:plan-phase 5 (SMS Notification System)*
