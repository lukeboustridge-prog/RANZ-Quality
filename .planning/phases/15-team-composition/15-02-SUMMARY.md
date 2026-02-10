---
phase: 15-team-composition
plan: 02
subsystem: api, ui
tags: [teams, members, composition-warnings, project-linking, crud, zod, next.js]

# Dependency graph
requires:
  - phase: 15-team-composition/01
    provides: "Team and TeamMember models, Teams CRUD API, /teams list page"
provides:
  - Team detail API (GET/PATCH/DELETE) with computed composition warnings
  - Member management API (POST/DELETE/PATCH) with role and lead designation
  - Team detail page at /teams/[id] with full member management UI
  - Project linking/unlinking for teams
affects: [15-03 (dashboard team summary uses same team data)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Computed warnings array returned alongside team data from GET endpoint"
    - "getOrgAndTeam helper function for DRY auth+ownership checks in member routes"
    - "searchParams for DELETE member ID (REST convention for DELETE with identifier)"

key-files:
  created:
    - src/app/api/teams/[id]/route.ts
    - src/app/api/teams/[id]/members/route.ts
    - src/app/(dashboard)/teams/[id]/page.tsx
  modified: []

key-decisions:
  - "Warnings computed server-side in GET handler, not client-side"
  - "window.confirm for delete team and remove member (consistent with project pattern)"
  - "Inline role editing via select dropdown on member row (no modal)"
  - "Project linking via PATCH on team route with projectId field"

patterns-established:
  - "Team detail API includes member microCredentials for TEAM-04 supervision check"
  - "Available members = allMembers - teamMemberIds (client-side filtering)"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 15 Plan 02: Team Detail & Member Assignment Summary

**Team detail page with member CRUD, composition warnings (no QR, lead lacking supervision), and project linking via PATCH**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T08:33:30Z
- **Completed:** 2026-02-10T08:37:51Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Team detail API at /api/teams/[id] with GET (full detail + computed warnings), PATCH (name/description/project), DELETE
- Member management API at /api/teams/[id]/members with POST (add), DELETE (remove via searchParams), PATCH (role/lead update)
- Computed warnings: NO_QUALIFIED_ROOFER (amber), LEAD_NO_SUPERVISION (amber), NO_LEAD_DESIGNATED (blue/info)
- TEAM-04 check: lead's microCredentials scanned for definition title containing "Supervision" or "Mentoring" with AWARDED status
- Team detail page at /teams/[id] with inline name editing, member table, add-member form, project linking section
- Role-specific badge colors: Qualified Roofer (green), Advancing Roofer (blue), Apprentice (yellow)
- Lead designation with Crown icon badge and toggle button
- Project linking/unlinking with dropdown select from /api/projects
- Delete team with confirmation and redirect to /teams list

## Task Commits

Each task was committed atomically:

1. **Task 1: Team detail API and member management API** - `d8dc8bc` (feat)
2. **Task 2: Team detail page with members, warnings, and project linking** - `9c2fc27` (feat)

## Files Created/Modified
- `src/app/api/teams/[id]/route.ts` - GET detail with warnings, PATCH update, DELETE
- `src/app/api/teams/[id]/members/route.ts` - POST add, DELETE remove, PATCH update role/lead
- `src/app/(dashboard)/teams/[id]/page.tsx` - Full team detail page (792 lines)

## Decisions Made
- Warnings computed server-side in the GET endpoint rather than client-side (keeps logic centralized, enables future API consumers)
- Used window.confirm for destructive actions (delete team, remove member) - consistent with established project pattern
- Inline role editing via native select dropdown on each member row (no modal needed for single-field change)
- Project linking implemented as PATCH field on team rather than separate link/unlink endpoints (simpler API surface)
- Available members for dropdown computed client-side by filtering allMembers against current teamMemberIds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 complete: all 3 plans (01, 02, 03) finished
- Team detail page links from team cards on /teams list page
- Dashboard team summary (Plan 03) already operational with same underlying data
- Ready for Phase 16 (Client Checklists)

---
*Phase: 15-team-composition*
*Completed: 2026-02-10*
