# Performance Audit Report - RANZ Quality Program

**Application:** RANZ Quality Program (portal.ranz.org.nz)
**Date:** 2026-01-29
**Tool:** Lighthouse CI
**Requirement:** QCTL-05 - Page load <2s, API response <500ms

## Executive Summary

This document establishes the performance baseline and targets for the RANZ Quality Program application. Lighthouse CI has been configured to automatically enforce these performance budgets during development and CI/CD pipelines.

## Performance Targets (QCTL-05)

| Metric | Target | Lighthouse Assertion |
|--------|--------|---------------------|
| First Contentful Paint (FCP) | <2000ms | error if exceeded |
| Largest Contentful Paint (LCP) | <2500ms | error if exceeded |
| Time to Interactive (TTI) | <3500ms | error if exceeded |
| Cumulative Layout Shift (CLS) | <0.1 | error if exceeded |
| Total Blocking Time (TBT) | <300ms | warning if exceeded |
| Performance Score | >80% | error if below |
| Accessibility Score | >90% | error if below |
| Best Practices Score | >90% | error if below |
| SEO Score | >80% | warning if below |

## Pages Under Test

The following pages are included in the Lighthouse CI configuration:

### 1. Home Page (/)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

### 2. Sign-in Page (/sign-in)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

### 3. Dashboard (/dashboard)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

## Lighthouse Scores Summary

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| / | TBD | TBD | TBD | TBD |
| /sign-in | TBD | TBD | TBD | TBD |
| /dashboard | TBD | TBD | TBD | TBD |

**Note:** Baseline values will be captured during first Lighthouse CI run.

## API Response Time Targets

| Endpoint | Method | Target | Notes |
|----------|--------|--------|-------|
| /api/auth/login | POST | <500ms | Authentication endpoint |
| /api/auth/logout | POST | <500ms | Session termination |
| /api/admin/users | GET | <500ms | Paginated user list |
| /api/admin/users/[id] | GET | <500ms | Single user detail |
| /api/admin/audit-logs | GET | <500ms | Audit log with filters |
| /api/admin/activity | GET | <500ms | Activity dashboard data |
| /api/internal/users | GET | <500ms | Cross-app user lookup |

**Measurement Method:** API response times should be measured via network tab or server-side timing headers during integration testing.

## Core Web Vitals Summary

### Targets
- **FCP (First Contentful Paint):** <2000ms - Time until first content rendered
- **LCP (Largest Contentful Paint):** <2500ms - Time until largest element rendered
- **CLS (Cumulative Layout Shift):** <0.1 - Visual stability score
- **TBT (Total Blocking Time):** <300ms - Main thread blocking time

### Current Status
Baseline measurements pending initial Lighthouse CI run.

## Running Performance Audits

### Local Development
```bash
# Build the application first
npm run build

# Run Lighthouse CI
npm run lighthouse
```

### CI Pipeline
The `npm run lighthouse` command will:
1. Start the production server
2. Run 3 Lighthouse audits per URL
3. Assert against defined performance budgets
4. Upload results to temporary public storage
5. Fail the build if assertions are not met

## Performance Optimization Recommendations

### Pre-emptive Optimizations (Applied)
1. **Next.js App Router** - Server components reduce client-side JavaScript
2. **Turbopack** - Faster development builds
3. **Image optimization** - Next.js automatic image optimization

### Recommended if Targets Not Met
1. **Code splitting** - Dynamic imports for heavy components
2. **Font optimization** - Next.js font optimization with display: swap
3. **Image lazy loading** - Defer offscreen images
4. **Preconnect** - Add preconnect hints for external origins
5. **Cache headers** - Configure appropriate cache-control headers
6. **Bundle analysis** - Use @next/bundle-analyzer to identify large dependencies

## Issues Found

### Critical (Blocking Release)
None identified - baseline pending

### High Priority (Should Fix)
None identified - baseline pending

### Recommendations
Run `npm run lighthouse` after initial production build to establish baseline measurements.

## Conclusion

Performance infrastructure is in place with Lighthouse CI configured to enforce QCTL-05 requirements. The configuration will automatically fail builds that exceed performance budgets, ensuring consistent user experience.

---

*Report generated: 2026-01-29*
*Next review: After initial Lighthouse CI run*
