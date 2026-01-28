# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.
**Current focus:** Phase 7 - Admin Reporting

## Current Position

Phase: 7 of 8 (Admin Reporting) — IN PROGRESS
Plan: 1/3 in phase
Status: PDF generation infrastructure complete
Last activity: 2026-01-28 — Completed 07-01-PLAN.md (single-org PDF reports)

Progress: [████████░░] ~83% (24/29 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: 4 min
- Total execution time: 94 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | 23 min | 6 min |
| 02 | 3 | 23 min | 8 min |
| 03 | 4 | 18 min | 5 min |
| 04 | 3 | 7 min | 2 min |
| 05 | 3 | 9 min | 3 min |
| 06 | 3 | 9 min | 3 min |
| 07 | 1 | 6 min | 6 min |

**Recent Trend:**
- Last 5 plans: 05-02 (2 min), 05-03 (4 min), 06-01 (3 min), 06-02 (2 min), 06-03 (4 min), 07-01 (6 min)
- Trend: Consistent velocity at ~3-4 min/plan for straightforward features

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
- 05-01: Exponential backoff schedule: 30s, 60s, 120s (capped at 15min max)
- 05-01: Legacy records without nextRetryAt treated as ready to retry
- 05-01: lastRetryAt recorded before attempt, nextRetryAt after failure
- 05-02: SMS sent to member.phone (personal) for LBP status changes, not organization.phone
- 05-02: Dual-channel pattern: email to org (detailed), SMS to individual (immediate alert)
- 05-02: CRITICAL priority for LBP status changes (regulatory compliance issue)
- 05-02: Independent error handling per channel (SMS failure doesn't block email)
- 05-03: Admin SMS logs at /admin/notifications/sms with status, date, recipient filters
- 05-03: Expandable rows show full message, failure reason, next retry time
- 05-03: Pagination prevents loading too much data (default 50, max 100 per page)
- 06-01: Triple notification pattern: org email (compliance), member email (personal), member SMS (immediate)
- 06-01: Organization email has userId: null (org-level), member notifications have userId: member.clerkUserId
- 06-01: All emails now use createNotification() for database audit trail (no direct sendEmail)
- 06-01: Message generation helpers (generateMemberLBPMessage, generateOrgLBPMessage) separate content from delivery
- 06-02: Prisma $transaction wraps notification + flag update for atomic insurance expiry alerts
- 06-03: Insurance notifications now include userId via ownerUserId parameter (closes verification gaps)
- 07-01: @react-pdf/renderer chosen for PDF generation (declarative React components, no Puppeteer overhead)
- 07-01: Report ID format RPT-YYYY-XXXXXXXX (year + 8-char UUID prefix) for audit trail linkage
- 07-01: Top 10 issues displayed in PDFs to prevent excessive page count
- 07-01: Buffer to Uint8Array conversion for Next.js Response body compatibility
- 07-01: 30-day validity disclaimer on reports (compliance data is point-in-time snapshot)

### Pending Todos

None.

### Blockers/Concerns

**From codebase analysis (CONCERNS.md):**
- Phase 1 addresses: Duplicate compliance scoring causing inconsistencies, hardcoded thresholds [COMPLETE]
- Phase 2 addresses: Dashboard shows false positive indicators, score doesn't recalculate on changes [COMPLETE]
- Phase 3 addresses: Unsecured cron endpoints, missing audit trail implementation [COMPLETE - 4/4 plans]
- Phase 4 addresses: Public API enumeration risk, no file size validation [COMPLETE - 3/3 plans]
- Phase 5 addresses: SMS notifications with retry, LBP alerts, admin monitoring [COMPLETE - 3/3 plans]
- Phase 6 addresses: Wrong recipient targeting (individual vs org email) [COMPLETE - 3/3 plans]
- Phase 7 addresses: Report generation stubbed with TODO comments
- Phase 8 addresses: SSO satellite domain not configured

**Discovered during execution:**
- Pre-existing Prisma schema errors (ReportStatus type undefined) - FIXED in 04-01
- Pre-existing TypeScript errors (unrelated to plan changes, require Prisma client regeneration)

**Critical for pilot launch:**
All 8 phases must complete before onboarding 10-30 pilot members in Q2 2026.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 07-01-PLAN.md (single-org PDF reports)
Resume file: None

---
*Next step: 07-02 (CSV export) or 07-03 (bulk report generation) - complete admin reporting phase*
