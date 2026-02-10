---
phase: 15-team-composition
plan: 01
subsystem: database, api, ui
tags: [prisma, teams, crud, sidebar, zod, next.js]

# Dependency graph
requires:
  - phase: 14-micro-credentials
    provides: "StaffMicroCredential, MicroCredentialDefinition models; OrganizationMember model"
provides:
  - Team and TeamMember database models with TeamRole enum
  - Teams CRUD API (GET list, POST create) with org scoping
  - Teams list page with create form at /teams
  - Sidebar navigation entry for Teams
affects: [15-02 (team detail/members), 15-03 (team warnings/dashboard)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Team org scoping via clerkOrgId lookup then organizationId filter"
    - "Unique constraint on team name per org (@@unique([organizationId, name]))"

key-files:
  created:
    - src/app/api/teams/route.ts
    - src/app/(dashboard)/teams/page.tsx
  modified:
    - prisma/schema.prisma
    - src/types/index.ts
    - src/components/layout/sidebar.tsx

key-decisions:
  - "UsersRound icon for Teams sidebar (Users already used for Staff)"
  - "409 status for duplicate team name with friendly error message"

patterns-established:
  - "Team API follows credentials route pattern: auth check, org lookup, scoped query"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 15 Plan 01: Team Foundation Summary

**Team and TeamMember Prisma models with TeamRole enum, org-scoped CRUD API, list page with create form, and sidebar navigation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T08:27:37Z
- **Completed:** 2026-02-10T08:31:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Team and TeamMember models added to Prisma schema with all fields, relations, indexes, and unique constraints
- TeamRole enum (QUALIFIED_ROOFER, ADVANCING_ROOFER, APPRENTICE) with TypeScript type and labels
- GET /api/teams returns org-scoped teams with member and project includes
- POST /api/teams creates teams with Zod validation, handles duplicate names with 409
- Teams list page shows team cards with member count, role breakdown badges, and project links
- Sidebar includes Teams nav item after Credentials with UsersRound icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema, migration, and TypeScript types** - `7159996` (feat)
2. **Task 2: Teams API endpoints, list page, and sidebar navigation** - `c71c110` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added TeamRole enum, Team model, TeamMember model, reverse relations
- `src/types/index.ts` - Added TeamRole type and TEAM_ROLE_LABELS constant
- `src/app/api/teams/route.ts` - GET (list) and POST (create) team endpoints
- `src/app/(dashboard)/teams/page.tsx` - Teams list page with create form and team cards
- `src/components/layout/sidebar.tsx` - Added Teams nav item with UsersRound icon

## Decisions Made
- Used UsersRound icon for Teams sidebar entry since Users icon is already used for Staff
- Duplicate team name returns 409 Conflict with user-friendly error message
- Team cards are clickable Links to /teams/{id} (detail page created in Plan 02)
- Role breakdown displayed as small badges on team cards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Team and TeamMember models ready for Plan 02 (team detail page, member assignment)
- TeamRole enum ready for role assignment in team member management
- API pattern established for extending with team detail routes

---
*Phase: 15-team-composition*
*Completed: 2026-02-10*
