# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.
**Current focus:** v1.2 RoofWright Programme - Phase 13 in progress

## Current Position

Phase: 13 of 16 (Programme Enrolment)
Plan: 3 of 4 complete
Status: In progress
Last activity: 2026-02-10 — Completed 13-02-PLAN.md (Admin Review)

Progress: [████████░░] 82% (41/50 total plans across all milestones)

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
- Plans completed: 3
- Phases: 4
- Status: Phase 13 Plans 01, 02, 03 complete

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
- RoofWright micro-credential definitions need alignment with training provider (can build catalogue structure first)

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 13-02-PLAN.md
Resume file: None
Next action: Execute 13-04-PLAN.md (Notifications & Renewal)

---
*Last updated: 2026-02-10 — Phase 13 Plan 02 complete*
