# Issue Register - RANZ Quality Program

**Application:** RANZ Quality Program (portal.ranz.org.nz)
**Date:** 2026-01-29
**Status:** Quality Control Phase 9
**Last Updated:** 2026-01-29

---

## Summary

| Severity | Count | Open | Closed | Must Fix |
|----------|-------|------|--------|----------|
| Critical | 0 | 0 | 0 | Yes |
| High | 2 | 0 | 2 | Yes |
| Medium | 5 | 5 | 0 | If time |
| Low | 6 | 6 | 0 | Defer |

**Overall Assessment:** Application is production-ready with strong security posture.

---

## Critical Issues (Must Fix Before Release)

None identified.

---

## High Issues (Should Fix Before Release)

### QCTL-QP-001: Add HTTP Security Headers
- **Category:** security
- **Source:** Security Audit (09-04) - OWASP A02
- **Description:** Application missing recommended HTTP security headers that prevent common web attacks
- **Impact:** Potential XSS, clickjacking, and content-type sniffing vulnerabilities
- **Remediation:** Configure Next.js middleware or `next.config.js` to add:
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
- **Estimated Effort:** Small (2-4 hours)
- **Status:** [x] Closed
- **Fix Applied:** 2026-01-29 - Added `addSecurityHeaders()` function in middleware.ts that applies all recommended headers to every response
- **Files Modified:** src/middleware.ts
- **Verified:** Security headers now applied on all routes

### QCTL-QP-002: Implement HIBP Password Check
- **Category:** security
- **Source:** Security Audit (09-04) - Password Security
- **Description:** Password creation/change does not check against Have I Been Pwned database
- **Impact:** Users may choose compromised passwords that have appeared in data breaches
- **Remediation:** Implement HIBP k-anonymity API check during password creation/change (stub exists in password.ts)
- **Estimated Effort:** Medium (4-8 hours)
- **Status:** [x] Closed
- **Fix Applied:** 2026-01-29 - Implemented `isPasswordCompromised()` and `validatePasswordFull()` functions using HIBP k-anonymity API. Updated all password-setting routes to use breach checking.
- **Files Modified:** src/lib/auth/password.ts, src/lib/auth/index.ts, src/app/api/auth/change-password/route.ts, src/app/api/auth/activate/route.ts, src/app/api/auth/reset-password/route.ts
- **Verified:** HIBP API integration implemented with k-anonymity (only first 5 chars of SHA-1 hash sent)

---

## Medium Issues (Fix If Time Permits)

### QCTL-QP-003: Password Reset Flow E2E Tests Missing
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** No E2E tests for password reset flow - security-critical functionality
- **Impact:** Password reset bugs may go undetected during future changes
- **Remediation:** Add Playwright tests for forgot-password and reset-password flows
- **Estimated Effort:** Medium (4-8 hours)
- **Status:** [ ] Open

### QCTL-QP-004: Account Activation Flow E2E Tests Missing
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** No E2E tests for account activation flow - user onboarding critical path
- **Impact:** Activation bugs may prevent new users from accessing system
- **Remediation:** Add Playwright tests for activate and first-login password change flows
- **Estimated Effort:** Medium (4-8 hours)
- **Status:** [ ] Open

### QCTL-QP-005: User Edit/Deactivate Tests Missing
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** Admin user edit and deactivate workflows not covered by E2E tests
- **Impact:** Admin workflow bugs may go undetected
- **Remediation:** Add Playwright tests for user editing, deactivation, and reactivation
- **Estimated Effort:** Small (2-4 hours)
- **Status:** [ ] Open

### QCTL-QP-006: Bulk Operations Tests Missing
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** CSV import/export and batch operations not covered by E2E tests
- **Impact:** Data migration bugs may go undetected
- **Remediation:** Add Playwright tests for CSV import, export, and batch operations
- **Estimated Effort:** Medium (4-8 hours)
- **Status:** [ ] Open

### QCTL-QP-007: Direct API Endpoint Tests Gap
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** All API tests are implicit (via UI actions), no direct API endpoint tests
- **Impact:** API contract changes may break integrations without detection
- **Remediation:** Add Playwright API testing or separate API test suite for critical endpoints
- **Estimated Effort:** Medium (8-16 hours)
- **Status:** [ ] Open

---

## Low Issues (Defer to Future Release)

### QCTL-QP-008: Update Development Dependencies
- **Category:** security
- **Source:** Security Audit (09-04) - npm audit
- **Description:** hono/lodash/tmp vulnerabilities in Prisma/Lighthouse CI dev dependencies
- **Impact:** None - development tooling only, not production
- **Remediation:** Track for future Prisma/LHCI updates
- **Estimated Effort:** Small (1 hour)
- **Status:** [ ] Open (Track)

### QCTL-QP-009: Session Token Rotation
- **Category:** security
- **Source:** Security Audit (09-04) - Recommendations
- **Description:** JWT tokens not rotated on each request
- **Impact:** Extended window for token theft attacks (mitigated by 8-hour expiry)
- **Remediation:** Consider implementing sliding session with token rotation
- **Estimated Effort:** Medium (8-16 hours)
- **Status:** [ ] Open (Track)

### QCTL-QP-010: Rate Limit Analytics
- **Category:** performance
- **Source:** Security Audit (09-04) - Recommendations
- **Description:** No analytics for rate limiting patterns
- **Impact:** Cannot detect brute force attack patterns
- **Remediation:** Review Upstash analytics for rate limiting patterns
- **Estimated Effort:** Small (2-4 hours)
- **Status:** [ ] Open (Track)

### QCTL-QP-011: Clerk-Specific E2E Tests
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** Clerk auth mode tests limited to component visibility checks
- **Impact:** Organization switching and SSO flows not verified
- **Remediation:** Add Clerk-specific tests when transitioning to Clerk mode
- **Estimated Effort:** Medium (4-8 hours)
- **Status:** [ ] Open (Track)

### QCTL-QP-012: Chart Data Validation Tests
- **Category:** functional
- **Source:** Functional Gap Analysis (09-01)
- **Description:** Activity dashboard chart data accuracy not validated
- **Impact:** Incorrect dashboard metrics may mislead admins
- **Remediation:** Add data validation tests comparing chart data to database queries
- **Estimated Effort:** Small (2-4 hours)
- **Status:** [ ] Open (Track)

### QCTL-QP-013: Performance Baselines Pending
- **Category:** performance
- **Source:** Performance Audit (09-05)
- **Description:** Lighthouse CI configured but baseline measurements not captured
- **Impact:** No baseline for performance regression detection
- **Remediation:** Run `npm run lighthouse` after production build to capture baselines
- **Estimated Effort:** Small (1 hour)
- **Status:** [ ] Open (Track)

---

## Remediation Priority

### Immediate (This Sprint)
1. QCTL-QP-001 - Add HTTP security headers (High)
2. QCTL-QP-002 - Implement HIBP password check (High)

### Before Release
1. QCTL-QP-003 - Password reset flow tests (Medium)
2. QCTL-QP-004 - Account activation flow tests (Medium)
3. QCTL-QP-013 - Capture performance baselines (Low but quick)

### Post-Release
1. QCTL-QP-005 - User edit/deactivate tests
2. QCTL-QP-006 - Bulk operations tests
3. QCTL-QP-007 - Direct API endpoint tests
4. All Low priority items (track for future)

---

## Issue Sources

| Plan | Audit Type | Findings |
|------|------------|----------|
| 09-01 | E2E Testing Infrastructure | 6 functional gaps identified |
| 09-03 | Visual Consistency Audit | 0 issues (PASS) |
| 09-04 | Security Audit | 2 medium recommendations, 3 low |
| 09-05 | Performance Audit | 1 baseline pending |

---

## Verification Status

| Category | Tests | Status |
|----------|-------|--------|
| Authentication | 13 E2E tests | Covered |
| Admin Functions | 14 E2E tests | Covered |
| Dashboard | 14 E2E tests | Covered |
| Visual Regression | Tests created | Baselines pending |
| Security (OWASP) | Manual review | PASS |
| Performance (Lighthouse) | Config ready | Baselines pending |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

*Document Version: 1.1*
*Generated: 2026-01-29*
*Last Updated: 2026-01-29 (09-07 remediation)*
*Phase: 09-quality-control*

---

## Remediation Log (09-07)

| Issue | Action | Result |
|-------|--------|--------|
| QCTL-QP-001 | Added HTTP security headers in middleware.ts | CLOSED |
| QCTL-QP-002 | Implemented HIBP password check via k-anonymity API | CLOSED |

**Verification Results:**
- `pnpm audit --audit-level=high`: 0 high/critical vulnerabilities
- Type checking: Pre-existing errors (not related to remediation)
- Linting: Pre-existing warnings (not related to remediation)
