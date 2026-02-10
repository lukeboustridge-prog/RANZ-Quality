---
phase: 13-programme-enrolment
plan: 03
subsystem: ui
tags: [dashboard, verification, programme, badge, server-component, lucide-react]
dependency-graph:
  requires:
    - phase: 13-01
      provides: ProgrammeEnrolment model, ProgrammeEnrolmentStatus type, PROGRAMME_ENROLMENT_STATUS_LABELS
  provides:
    - ProgrammeBadge dashboard component
    - Dashboard programme status display
    - Public verification RoofWright programme section
  affects: [13-04]
tech-stack:
  added: []
  patterns: [server-component-badge-with-status-config, conditional-public-rendering]
key-files:
  created:
    - src/components/dashboard/programme-badge.tsx
  modified:
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/verify/[businessId]/page.tsx
key-decisions:
  - "Programme badge rendered at top of dashboard before StatsCards for maximum visibility"
  - "Public verification only shows programme for ACTIVE and RENEWAL_DUE statuses"
patterns-established:
  - "Status config object pattern: statusConfig record maps enum values to UI config (colors, icons, labels, subtitle functions)"
  - "Conditional public display: internal statuses (PENDING, SUSPENDED, WITHDRAWN) never shown on public pages"
duration: 4min
completed: 2026-02-10
---

# Phase 13 Plan 03: Dashboard Badge and Public Verification Summary

**ProgrammeBadge component with 4-status rendering on dashboard, plus RoofWright programme card on public verification page for ACTIVE/RENEWAL_DUE orgs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T07:25:03Z
- **Completed:** 2026-02-10T07:28:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created ProgrammeBadge server component with status-appropriate colors, icons, and messaging for ACTIVE/PENDING/RENEWAL_DUE/SUSPENDED states
- Integrated programme badge at top of member dashboard (before StatsCards) for maximum visibility
- Added RoofWright Quality Programme card to public verification page, visible only for ACTIVE and RENEWAL_DUE enrollments

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard programme badge component** - `a605e13` (feat)
2. **Task 2: Public verification page programme status** - `b251293` (feat)

## Files Created/Modified
- `src/components/dashboard/programme-badge.tsx` - Server component rendering status-specific programme badge with Award/AlertTriangle/XCircle icons
- `src/app/(dashboard)/dashboard/page.tsx` - Added programmeEnrolment to org query, renders ProgrammeBadge at top of dashboard
- `src/app/verify/[businessId]/page.tsx` - Added programmeEnrolment to org query, renders RoofWright card for ACTIVE/RENEWAL_DUE orgs

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 13-03-D1 | Programme badge placed before StatsCards at dashboard top | Programme status is the key value indicator -- members should see it first |
| 13-03-D2 | Public verification shows programme for ACTIVE and RENEWAL_DUE only | PENDING/SUSPENDED/WITHDRAWN are internal states not appropriate for public display |
| 13-03-D3 | Used statusConfig object pattern for badge rendering | Clean separation of per-status UI config (colors, icons, labels) from rendering logic; easily extensible |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dashboard and public verification both display programme status correctly
- All programme UI complete -- ready for Plan 13-04 (notifications/renewal)
- Pre-existing build issue (missing RESEND_API_KEY) continues from prior plans; typecheck passes cleanly

---
*Phase: 13-programme-enrolment*
*Completed: 2026-02-10*
