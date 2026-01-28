# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

**Duplicate Compliance Scoring Implementation:**
- Issue: Two separate compliance scoring systems exist (`compliance.ts` and `compliance-v2.ts`). Both calculate scores but with different algorithms. The dashboard uses inconsistent logic for determining status, while the v2 system provides more granular breakdowns.
- Files: `src/lib/compliance.ts`, `src/lib/compliance-v2.ts`, `src/components/dashboard/compliance-score.tsx`
- Impact: Compliance scores may diverge between API responses and UI display. Audit calculations and certification tier eligibility may be inconsistent across the application.
- Fix approach: Consolidate into single scoring engine. Migrate all API routes and components to use compliance-v2, remove legacy compliance.ts. Update dashboard to use breakdown from v2.

**Hardcoded Compliance Score Thresholds:**
- Issue: Compliance status thresholds (90%=compliant, 70%=at-risk, <70%=critical) are hardcoded in multiple places without a central constant.
- Files: `src/lib/compliance.ts` (lines 156-163), `src/components/dashboard/compliance-score.tsx` (lines 12-21)
- Impact: Changing tier requirements requires updates across multiple files. Risk of threshold inconsistency between backend and frontend.
- Fix approach: Create `src/lib/compliance-thresholds.ts` with exported constants, import and use throughout codebase.

**Unsecured Cron Endpoints:**
- Issue: The cron secret verification is optional. If `CRON_SECRET` is not set, the endpoint accepts requests without any authentication.
- Files: `src/app/api/cron/verify-lbp/route.ts` (line 16), `src/app/api/cron/notifications/route.ts` (implied similar pattern)
- Impact: Unauthenticated attackers can trigger LBP verification and notifications repeatedly, causing resource waste and false alerts to organizations.
- Fix approach: Require CRON_SECRET in environment validation. Throw error at startup if missing, don't allow optional fallback.

**Missing File Upload Validation:**
- Issue: Document uploads validate file presence and MIME type but not file size. Large uploads can exhaust R2 bandwidth and storage quota.
- Files: `src/app/api/documents/route.ts` (lines 144-157)
- Impact: Organizations can upload gigabyte-sized files, consuming storage quota and degrading performance for other members.
- Fix approach: Add `MAX_FILE_SIZE` constant (suggest 50MB), check file.size before upload, return 413 if exceeded.

**Mock LBP Verification in Production:**
- Issue: If `LBP_API_KEY` is not configured, the system falls back to deterministic mock verification instead of failing loudly.
- Files: `src/lib/lbp-api.ts` (lines 36-38)
- Impact: LBP credentials are marked as verified based on fake data. Compliance scores and certifications are meaningless if verification is mocked.
- Fix approach: Throw error at startup if LBP_API_KEY is missing. Log explicit warnings if mock mode is active. Never silently mock in production.

## Known Bugs

**Compliance Score Not Reflecting Document Status:**
- Symptoms: Organization compliance score shows high value even after documents are rejected/deleted. Score doesn't recalculate immediately after document changes.
- Files: `src/lib/compliance-v2.ts` (compliance calculation), `src/app/api/documents/[id]/route.ts`
- Trigger: Upload document → approval fails → compliance score unchanged for hours until cron job runs
- Workaround: Manually trigger compliance recalculation via `/api/cron/` or wait for next scheduled update.

**LBP Status Change Notifications Missing Member Email:**
- Symptoms: Notifications sent to `organization.email` rather than individual member email when LBP status changes.
- Files: `src/app/api/cron/verify-lbp/route.ts` (line 56)
- Trigger: LBP license expires → daily cron job runs → email sent to org email, not affected staff member
- Workaround: Organization admin must manually notify staff of license status changes.

**Dashboard Status Indicators Hardcoded to Overall Score:**
- Symptoms: Dashboard shows "Insurance: Current" or "Personnel: All LBPs verified" based only on overall compliance score, not actual data.
- Files: `src/components/dashboard/compliance-score.tsx` (lines 129-143)
- Trigger: Organization has insurance expiring in 25 days (should show warning) but overall score is 82% → displays "Current"
- Impact: Members receive false positive compliance indicators and may miss critical action items.
- Workaround: Check actual insurance dates and personnel verification status manually on dedicated pages.

**Public Verification API Exposes Internal Organization ID:**
- Symptoms: The `/api/public/verify/[businessId]` endpoint accepts the internal `organization.id` rather than requiring NZBN or trading name.
- Files: `src/app/api/public/verify/[businessId]/route.ts` (lines 11-12)
- Trigger: Attacker can iterate through organization IDs to enumerate all businesses and their compliance status
- Impact: Information disclosure of all member businesses and their compliance scores without authorization.
- Fix approach: Accept NZBN or trading name as lookup parameter instead of internal ID. Limit verification to `certificationTier !== ACCREDITED` or implement rate limiting.

## Security Considerations

**R2 Upload Path Traversal Risk:**
- Risk: File names are passed directly to R2 without sanitization. While the prefix `portal/` prevents escape, inconsistent handling could lead to file overwrites.
- Files: `src/lib/r2.ts` (line 31), `src/app/api/documents/route.ts` (line 164)
- Current mitigation: File names are prefixed with organization ID and timestamp, making collisions unlikely
- Recommendations:
  - Explicitly sanitize file names to remove `/` and `..` characters
  - Add content-type verification for uploaded files (currently relies on user-provided MIME type)
  - Implement virus scanning for document uploads (currently missing)

**Email Exposure in Error Logs:**
- Risk: Console error logs may contain full email addresses from failed email sends, which are stored in server logs.
- Files: `src/lib/email.ts` (line 32), `src/app/api/cron/verify-lbp/route.ts` (line 76)
- Current mitigation: Error messages are vague
- Recommendations: Use error IDs instead of error messages in logs; store full details in secure audit log only.

**Public Badge API Returns Sensitive Data:**
- Risk: The `/api/public/badge/[businessId]` endpoint exposes compliance score, certification tier, and insurance status to anyone who knows the business ID.
- Files: `src/app/api/public/badge/[businessId]/route.ts` (implied, not viewed)
- Current mitigation: Data is meant to be public for the "Check a Roofer" feature, but there's no rate limiting
- Recommendations: Implement rate limiting on public endpoints; consider requiring NZBN instead of internal ID.

**Clerk Organization Role Assumption:**
- Risk: The system assumes Clerk organization metadata properly reflects RANZ roles (ranz:admin, ranz:auditor). If Clerk organization is misconfigured, authorization fails silently.
- Files: `src/middleware.ts` (lines 34-39), `src/app/api/admin/reports/route.ts` (line 10)
- Current mitigation: Middleware redirects to dashboard if role is missing
- Recommendations: Log all role failures; implement audit logging for authorization failures.

## Performance Bottlenecks

**Compliance Score Recalculation is Synchronous and Expensive:**
- Problem: `updateOrganizationComplianceScore()` queries insurance, members, documents, assessments, and audits for every API call that modifies organization state. This blocks the response.
- Files: `src/lib/compliance-v2.ts` (implied full scan), `src/app/api/documents/route.ts` (line 183)
- Cause: No caching; full recalculation on every document upload
- Improvement path:
  - Implement incremental score updates (only recalculate affected components)
  - Cache score with 5-minute TTL; invalidate on relevant changes
  - Move to async background job queue instead of blocking API response

**Batch LBP Verification Lacks Concurrency Control:**
- Problem: The daily LBP verification job processes 10 members at a time via Promise.all(), but doesn't handle MBIE API rate limits. If MBIE API is slow, entire cron job stalls.
- Files: `src/lib/lbp-api.ts` (lines 241-284)
- Cause: No retry logic, no exponential backoff, no circuit breaker for MBIE API
- Improvement path:
  - Add retry logic with exponential backoff
  - Implement circuit breaker pattern for MBIE API
  - Reduce batch size if API responds with 429 (rate limit)
  - Add timeout per verification attempt

**Compliance Assessment Query N+1:**
- Problem: Loading organization with all relations (insurance, members, documents, assessments, audits) without selective includes can load hundreds of unused records.
- Files: `src/lib/compliance-v2.ts` (implied full joins)
- Cause: Not reviewed in depth, but pattern visible in `src/app/api/documents/route.ts` (lines 96-105) which includes full version history
- Improvement path: Implement query optimization with selective field selection using `select` instead of `include`.

## Fragile Areas

**Document Version Uniqueness Constraint:**
- Files: `prisma/schema.prisma` (line 200: `@@unique([documentId, versionNumber, minorVersion])`)
- Why fragile: If version increment logic is buggy (e.g., two uploads race), unique constraint violation will crash the API.
- Safe modification: Add transaction wrapping in `createDocumentWithVersion()` and implement version number generation atomically within database transaction.
- Test coverage: No visible tests for version numbering edge cases; concurrent uploads could trigger violations.

**Audit Checklist Uniqueness:**
- Files: `prisma/schema.prisma` (line 313: `@@unique([auditId, isoElement, questionNumber])`)
- Why fragile: If audit is edited/restarted, duplicate checklist items could exist in the same audit.
- Safe modification: Ensure audit state transitions (SCHEDULED → IN_PROGRESS) prevent checklist modifications. Add validation that audit is IN_PROGRESS before allowing updates.
- Test coverage: Gap in audit state machine validation.

**Role-Based Access Control Hardcoded:**
- Files: `src/middleware.ts` (line 37: exact string match for "ranz:admin" and "ranz:auditor")
- Why fragile: If Clerk role naming changes, authorization fails silently. No audit log of who attempted unauthorized access.
- Safe modification: Move role names to constants; add logging for all authorization failures.
- Test coverage: No visible RBAC tests; role check only verified end-to-end.

**Notifications System Incomplete:**
- Files: `src/types/index.ts` defines `NotificationType` enum with 10+ types, but not all are triggered
- Why fragile: Dashboard may display notification preferences for events that never fire (e.g., `TIER_CHANGE`, `TESTIMONIAL_REQUEST`)
- Safe modification: Audit which notifications are actually sent; remove or implement missing types.
- Test coverage: No notification delivery tests visible.

## Scaling Limits

**Database Connection Pool:**
- Current capacity: Neon default pool is 100 connections
- Limit: At ~50 concurrent users (15 database ops/request), connection pool saturates
- Scaling path: Configure Neon connection pooler to 200+ connections; implement connection pooling in application layer with PgBouncer if needed.

**Cloudflare R2 Egress:**
- Current capacity: Unmetered egress (zero cost)
- Limit: Bandwidth limits depend on Vercel plan and Cloudflare reputation
- Scaling path: Monitor egress patterns; if documents are served frequently, consider CDN caching of public documents.

**LBP API Rate Limits:**
- Current capacity: Unknown MBIE API limits
- Limit: Batch job processes up to 250+ members daily; if MBIE API has lower rate limits, job fails silently
- Scaling path: Contact MBIE for API rate limits; implement adaptive batching based on response times.

**Resend Email Rate Limiting:**
- Current capacity: Resend allows 5000 emails/day on free tier
- Limit: If organization sends 200+ testimonial requests at once, or 500 members get insurance expiry emails simultaneously, quota exceeded
- Scaling path: Implement email queue with rate limiting; upgrade to Resend paid tier; batch newsletter emails.

## Dependencies at Risk

**LBP_API_KEY Missing in Production:**
- Risk: If MBIE API key is not configured, system silently falls back to mock verification. Certifications become meaningless.
- Impact: All LBP credentials are unverified; compliance scores are incorrect.
- Migration plan: Require LBP_API_KEY in environment validation (throw at startup). Remove mock verification fallback.

**Resend Email Provider:**
- Risk: If Resend service is down or revokes API key, all notifications fail. No fallback email provider.
- Impact: Insurance expiry alerts and LBP status change notifications don't reach organizations; members miss critical deadlines.
- Migration plan: Add fallback to SMTP server or secondary email provider. Implement retry queue for failed emails.

**Twilio SMS (Not Yet Implemented):**
- Risk: SMS integration is in schema and dependencies but not implemented. Choosing to implement later creates risk of scope creep.
- Impact: SMS alerts shown in notification preferences but don't actually send.
- Migration plan: Either implement SMS fully (with retry logic, rate limiting) or remove from notification preferences.

**Next.js 16 / React 19 Bleeding Edge:**
- Risk: Major version upgrades may have stability issues. TypeScript strict mode not enforced.
- Impact: Type-related bugs may reach production. Performance regressions in major updates.
- Migration plan: Add `strict: true` to tsconfig.json; implement automated TypeScript checking in CI. Pin minor versions until stable.

## Missing Critical Features

**Report Generation (PDF/CSV/XLSX):**
- Problem: Admin reporting API accepts PDF/CSV/XLSX format but routes to background job queue. Queue is never implemented (line 136 TODO comment).
- Blocks: RANZ admins cannot generate compliance reports, member directories, or audit summaries in exportable formats.
- Impact: High: Compliance officers cannot fulfill reporting requirements.

**Testimonial Email Verification:**
- Problem: When requesting client testimonial, system should send verification email with link. Email sending is stubbed (line 124 TODO comment).
- Blocks: Testimonials cannot be verified as coming from actual clients; any member can fake testimonials.
- Impact: Medium: Public trust in testimonials is undermined.

**SMS Notifications:**
- Problem: SMS provider (Twilio) is configured but never actually called. All SMS notifications marked as PENDING forever.
- Blocks: Organizations cannot receive critical SMS alerts (insurance expiry, LBP status change).
- Impact: High: Insurance lapses may go unnoticed.

**Audit Trail / Immutable Logging:**
- Problem: Schema includes `AuditLog` model with cryptographic hashing (lines 380-410) but `logAction()` function never called.
- Blocks: Compliance audits cannot verify who made changes when. Tamper-evident logging not functional.
- Impact: Critical: ISO 17020 requirement for immutable records not met.

**APEX Certified Products Integration:**
- Problem: Schema includes `apexCertified` and `apexCertId` fields in `CertifiedProductUsage` (lines 697-699) but no API call to APEX database.
- Blocks: Members cannot declare products as APEX-certified; all products default to `apexCertified=false`.
- Impact: Medium: Product supply chain verification not implemented.

## Test Coverage Gaps

**Compliance Scoring Edge Cases:**
- What's not tested:
  - Organization with 0 documents
  - Insurance policies that expired yesterday
  - LBP members with null status
  - Audit score calculation with missing findings
- Files: `src/lib/compliance-v2.ts`, `src/lib/compliance.ts`
- Risk: Compliance calculations may return NaN or incorrect scores without being caught.
- Priority: High

**API Authorization Boundary Tests:**
- What's not tested:
  - Can org member view another org's documents?
  - Can auditor modify organization compliance score?
  - Can public API enumerate all businesses by ID?
- Files: `src/middleware.ts`, `src/app/api/documents/route.ts`, `src/app/api/public/verify/`
- Risk: Authorization bypass vulnerabilities reach production.
- Priority: Critical

**Document Version Concurrency:**
- What's not tested:
  - Two simultaneous document uploads to same ISO element
  - Version number collision when uniqueness constraint exists
  - Race condition between version creation and approval
- Files: `src/lib/document-versioning.ts`, `src/app/api/documents/route.ts`
- Risk: Unique constraint violations or version number confusion under load.
- Priority: High

**Email Delivery Retries:**
- What's not tested:
  - Email provider timeout handling
  - Retry logic for ECONNREFUSED
  - Queue persistence if server crashes mid-send
- Files: `src/lib/email.ts`, `src/app/api/cron/notifications/route.ts`
- Risk: Emails silently fail without retry; members don't receive critical alerts.
- Priority: Medium

**LBP Verification Batch Processing:**
- What's not tested:
  - MBIE API returns error for 3/10 members (partial failure)
  - LBP API timeout after 30 seconds
  - Status change from CURRENT → CANCELLED triggers notification
- Files: `src/lib/lbp-api.ts`, `src/app/api/cron/verify-lbp/route.ts`
- Risk: Silent partial failures; status changes missed; members think they're verified when they're not.
- Priority: High

---

*Concerns audit: 2026-01-28*
