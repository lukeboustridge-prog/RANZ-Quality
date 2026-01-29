# Functional Gap Analysis - RANZ Quality Program

**Application:** RANZ Quality Program (portal.ranz.org.nz)
**Date:** 2026-01-29
**Tester:** Claude (Automated Analysis)
**Test Infrastructure:** Playwright 1.58.0

---

## Test Coverage Summary

| Category | Tests Written | Automated | Manual Required |
|----------|---------------|-----------|-----------------|
| Authentication Flows | 13 | 13 | 0 |
| Admin Functions | 14 | 14 | 0 |
| Dashboard/Navigation | 14 | 14 | 0 |
| **Total** | **41** | **41** | **0** |

---

## Authentication Flows

### Custom Auth Mode (AUTH_MODE=custom)

| Feature | Test Coverage | Status | Notes |
|---------|--------------|--------|-------|
| Sign in with email/password | auth.spec.ts:120 | Covered | Requires TEST_USER_EMAIL env |
| Sign out clears session | auth.spec.ts:165 | Covered | Tests session cookie removal |
| Protected routes redirect unauthenticated users | auth.spec.ts:12,21 | Covered | Tests /dashboard and /admin |
| Session persists across page refresh | auth.spec.ts:140 | Covered | Tests cookie persistence |
| Password reset flow | - | **Not Covered** | Needs dedicated test |
| Account activation flow | - | **Not Covered** | Needs dedicated test |
| Rate limiting on login attempts | - | **Not Covered** | Needs dedicated test |
| First-login password change | - | **Not Covered** | Needs dedicated test |

### Clerk Auth Mode (AUTH_MODE=clerk)

| Feature | Test Coverage | Status | Notes |
|---------|--------------|--------|-------|
| Clerk sign-in UI renders | auth.spec.ts:31 | Covered | Checks for .cl-rootBox |
| Clerk sign-out works | - | **Partial** | Generic sign-out test |
| Organization switching works | - | **Not Covered** | Needs Clerk-specific test |
| Session syncs with custom auth session | - | **Not Covered** | Cross-mode testing needed |

---

## Admin Functions

### User Management

| Feature | Test Coverage | Status | Notes |
|---------|--------------|--------|-------|
| List users with pagination | admin.spec.ts:56 | Covered | Tests pagination controls |
| Search users by name/email | admin.spec.ts:79 | Covered | Tests search input |
| Filter by status, type, company | - | **Partial** | Search tested, not filters |
| Create new user | admin.spec.ts:158 | Covered | Form load test |
| Edit user details | - | **Not Covered** | Needs dedicated test |
| Deactivate/reactivate user | - | **Not Covered** | Needs dedicated test |
| Bulk CSV import | - | **Not Covered** | Needs dedicated test |
| CSV export | - | **Not Covered** | Needs dedicated test |
| Batch operations | - | **Not Covered** | Needs dedicated test |

### Audit Logs

| Feature | Test Coverage | Status | Notes |
|---------|--------------|--------|-------|
| View audit logs with filters | admin.spec.ts:214 | Covered | Page load test |
| Filter by user, action, date range | admin.spec.ts:225 | Partial | Date filter checked |
| Audit log detail modal | - | **Not Covered** | Needs dedicated test |
| Export audit logs | - | **Not Covered** | Needs dedicated test |

### Activity Dashboard

| Feature | Test Coverage | Status | Notes |
|---------|--------------|--------|-------|
| Activity dashboard charts render | admin.spec.ts:262 | Covered | Page load test |
| Date range selection | - | **Not Covered** | Needs dedicated test |
| Chart data accuracy | - | **Not Covered** | Needs data validation |

---

## API Endpoints

### Authentication APIs

| Endpoint | Method | Test Coverage | Status |
|----------|--------|--------------|--------|
| /api/auth/login | POST | auth.spec.ts:83 | Covered (via UI) |
| /api/auth/logout | POST | auth.spec.ts:165 | Covered (via UI) |
| /api/auth/forgot-password | POST | - | **Not Covered** |
| /api/auth/reset-password | POST | - | **Not Covered** |
| /api/auth/change-password | POST | - | **Not Covered** |
| /api/auth/activate | POST | - | **Not Covered** |
| /api/auth/resend-welcome | POST | - | **Not Covered** |

### Admin APIs

| Endpoint | Method | Test Coverage | Status |
|----------|--------|--------------|--------|
| /api/admin/users | GET | admin.spec.ts:36 | Covered (via UI) |
| /api/admin/users | POST | - | **Not Covered** |
| /api/admin/users/[id] | GET | - | **Not Covered** |
| /api/admin/users/[id] | PUT | - | **Not Covered** |
| /api/admin/users/[id] | PATCH | - | **Not Covered** |
| /api/admin/users/import | POST | - | **Not Covered** |
| /api/admin/users/export | GET | - | **Not Covered** |
| /api/admin/users/batch | POST | - | **Not Covered** |
| /api/admin/companies | GET | - | **Not Covered** |
| /api/admin/audit-logs | GET | admin.spec.ts:214 | Covered (via UI) |
| /api/admin/activity | GET | admin.spec.ts:262 | Covered (via UI) |

### Internal APIs

| Endpoint | Method | Test Coverage | Status |
|----------|--------|--------------|--------|
| /api/internal/users | GET | - | **Not Covered** |

---

## Known Issues

### 1. Test Environment Setup Required
- Tests requiring authentication skip if TEST_USER_EMAIL and TEST_USER_PASSWORD not set
- Admin tests skip if TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set
- Need documented test user seeding process

### 2. Clerk vs Custom Auth Mode
- Some tests only work in custom auth mode (form-based login)
- Clerk auth mode tests are limited to component visibility checks
- No cross-mode verification tests

### 3. API Direct Testing Gap
- All API tests are implicit (via UI actions)
- No direct API endpoint tests
- Consider adding Playwright API testing or separate API test suite

---

## Recommendations

### Priority 1 - Critical Gaps
1. **Password reset flow tests** - Security-critical functionality
2. **Account activation flow tests** - User onboarding critical path
3. **Direct API endpoint tests** - Ensure API contracts are verified

### Priority 2 - Important Gaps
4. **User edit/deactivate tests** - Admin workflow completeness
5. **Bulk operations tests** - CSV import/export verification
6. **Filter functionality tests** - User list filtering coverage

### Priority 3 - Nice to Have
7. **Clerk-specific tests** - Organization switching, SSO flows
8. **Chart data validation** - Activity dashboard accuracy
9. **Cross-browser visual tests** - Layout consistency

---

## Test Execution Instructions

### Running All E2E Tests
```bash
cd "RANZ Quality Program"
npm run test:e2e
```

### Running Specific Test File
```bash
npx playwright test e2e/functional/auth.spec.ts --project=chromium
```

### Running with UI Mode
```bash
npm run test:e2e:ui
```

### Required Environment Variables
```bash
# For authenticated tests (optional - tests skip if not set)
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=testpassword123

# For admin tests (optional - tests skip if not set)
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=adminpassword123
```

---

## Appendix: Test File Index

| File | Tests | Focus Area |
|------|-------|------------|
| e2e/functional/auth.spec.ts | 13 | Authentication flows |
| e2e/functional/admin.spec.ts | 14 | Admin panel functionality |
| e2e/functional/dashboard.spec.ts | 14 | Dashboard and navigation |

---

*Generated: 2026-01-29*
*Next Review: After Phase 9 completion*
