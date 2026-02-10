# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.
**Current focus:** v1.2 RoofWright Programme - Phase 15 in progress (Team Composition)

## Current Position

Phase: 15 of 16 (Team Composition) - IN PROGRESS
Plan: 2 of 3 complete (01, 03 done; 02 remaining)
Status: In progress
Last activity: 2026-02-10 — Completed 15-03-PLAN.md (Dashboard Team Summary)

Progress: [█████████░] 94% (47/50 total plans across all milestones)

## Performance Metrics

**v1.0 Milestone (completed):**
- Total plans completed: 29
- Average duration: 4 min
- Total execution time: 126 min
- Phases: 8

**v1.1 Milestone (completed):**
- Total plans completed: 9
- Phases: 4

**v1.2 Milestone (in progress):**
- Total plans: 11 (estimated)
- Plans completed: 9
- Phases: 4
- Status: Phase 15 Plans 01 and 03 complete

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Recent v1.2 design decisions:

- Programme enrolment as Phase 13 (foundation - "all in or not" approach)
- Micro-credentials Phase 14 builds on existing personnel/staff management
- Team composition Phase 15 uses micro-credential data for qualification tracking
- Client checklists Phase 16 integrates with existing Project Evidence system

Phase 13 Plan 01 decisions:
- Programme nav placed after CAPA in sidebar (last in primary nav before secondary)
- Re-application deletes WITHDRAWN record then creates new one (unique constraint)
- Notification mappings added in Task 1 to satisfy typecheck (plan had them in Task 2)

Phase 13 Plan 02 decisions:
- window.prompt/confirm for admin action dialogs (simple, avoids new modal component)
- Programme stats field optional in dashboard Stats interface (backwards-compatible)

Phase 13 Plan 03 decisions:
- Programme badge placed before StatsCards at dashboard top for maximum visibility
- Public verification shows programme for ACTIVE and RENEWAL_DUE only (internal states hidden)
- Used statusConfig object pattern for clean per-status UI configuration

Phase 13 Plan 04 decisions:
- Cumulative threshold checks (<=90, <=60, <=30) for renewal alerts instead of narrow day windows

Phase 14 Plan 01 decisions:
- Auto-seed default credentials on first GET request rather than migration script
- Inline form toggle for create/edit rather than window.prompt (more fields)
- Default definitions protected from deletion via isDefault flag and API-level guard
- StaffMicroCredential uses @@unique([definitionId, memberId]) for one-per-staff

Phase 14 Plan 02 decisions:
- GET handler on assign route for org/member lookups (self-contained, avoids modifying existing endpoints)
- Inline status editing in staff table (select + save/cancel) rather than modal dialogs
- Credentials page as Server Component with direct Prisma queries (will convert to use client in Plan 03)

Phase 14 Plan 03 decisions:
- Converted credentials page from Server Component to use client for evidence upload interactivity
- Certificate evidence stored in R2 under credentials/{orgId}/{memberId}/{credId}/ path
- Signed download URLs generated fresh per request (1 hour default expiry)
- Cron sends notifications only, does NOT auto-transition to EXPIRED status
- Coverage report: overall = orgs with awarded / total orgs, per-org = staff with awarded / total staff
- Tab toggle on admin page rather than separate route for coverage report

Phase 15 Plan 01 decisions:
- UsersRound icon for Teams sidebar (Users already used for Staff)
- 409 status for duplicate team name with friendly error message
- Team cards link to /teams/{id} for detail page (Plan 02)

Phase 15 Plan 03 decisions:
- TeamSummary placed after ActionItems at dashboard bottom (supplementary info)
- Pass null when org has no teams to render nothing (no empty state clutter)
- Max 5 teams shown with "View all" link for larger orgs
- Q:A ratio indicator with green/amber/red color coding

### Pending Todos

None.

### Blockers/Concerns

**Tech Debt (carried from v1.0):**
- CRON_SECRET validated at runtime only, not build-time (medium severity)
- `pnpm build` fails due to missing RESEND_API_KEY in .env (pre-existing, env config issue)

**External Dependencies (not blockers):**
- Clerk JWT template configuration (manual Dashboard step)
- DNS CNAME for production SSO
- Roofing Reports satellite app configuration
- RoofWright micro-credential definitions need alignment with training provider (catalogue structure built, ready for content)

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 15-03-PLAN.md
Resume file: None
Next action: Execute 15-02-PLAN.md (Team Detail & Member Assignment)

---
*Last updated: 2026-02-10 — Phase 15 Plan 03 complete*
