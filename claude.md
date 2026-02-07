# RANZ Certified Business Programme Portal

## What This Is
Web portal for RANZ member businesses to manage ISO 9000-style quality certification. Tracks compliance across 19 ISO elements, insurance, personnel (LBP), and audits. Produces a weighted compliance score that determines certification tier (Accredited → Certified → Master Roofer). Public verification API and embeddable badges let consumers verify certified businesses.

## Stack
Next.js 16, TypeScript, Tailwind v4, Prisma (PostgreSQL/Neon), Clerk auth, Cloudflare R2, Resend email, Twilio SMS, Zod validation.

## Quick Reference

### Key Commands
```bash
pnpm dev             # Start dev server (Turbopack)
pnpm build           # Prisma generate + Next.js build
pnpm test            # Jest unit tests
pnpm test:e2e        # Playwright E2E
pnpm typecheck       # TypeScript check
pnpm db:studio       # Prisma Studio
```

### Critical Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema (1284 lines) |
| `src/middleware.ts` | Auth + security headers |
| `src/lib/compliance-v2.ts` | Compliance scoring engine |
| `src/lib/notifications.ts` | Email/SMS/In-App notifications |
| `src/lib/badges.ts` | Open Badges 3.0 + SVG generation |
| `src/lib/lbp-api.ts` | MBIE LBP verification |
| `src/lib/audit-log.ts` | Immutable audit trail |
| `src/lib/auth/` | Custom auth system (JWT, sessions, migration) |
| `src/types/index.ts` | Shared types, ISO element weights, insurance requirements |

### Route Groups
- `(auth)/` - Sign-in/sign-up
- `(dashboard)/` - Member portal (dashboard, documents, insurance, staff, audits, capa, projects, settings)
- `(admin)/admin/` - RANZ admin (members, users, reports, audit-logs, activity)
- Public: `/verify/[id]`, `/search`, `/testimonial/submit`

### Auth
- **Primary:** Clerk with Organizations (multi-tenancy)
- **Custom:** JWT auth system ready (AUTH_MODE env var)
- **Roles:** OWNER, ADMIN, STAFF (org-level) + ranz:admin, ranz:auditor (system-level)

### Compliance Scoring (4 dimensions)
- Documentation: 50% (19 ISO elements, weighted)
- Insurance: 25% (per-tier minimums)
- Personnel: 15% (LBP verified, owner assigned)
- Audit: 10% (last rating, open CAPAs)

## Detailed Documentation
All detailed docs are in `claude_docs/`:

| Document | Contents |
|----------|----------|
| [architecture.md](claude_docs/architecture.md) | Full stack, route structure, API endpoints, all lib files |
| [database-schema.md](claude_docs/database-schema.md) | All models, enums, relationships |
| [compliance-engine.md](claude_docs/compliance-engine.md) | Scoring algorithm details, thresholds, tier eligibility |
| [iso-9000-elements.md](claude_docs/iso-9000-elements.md) | 19 elements mapped to portal coverage |
| [sso-and-auth.md](claude_docs/sso-and-auth.md) | Clerk, custom auth, roles, permissions, migration |
| [notifications-and-alerts.md](claude_docs/notifications-and-alerts.md) | Email/SMS/In-App, preferences, cron jobs |
| [public-apis.md](claude_docs/public-apis.md) | Verification, search, badges, embed widget |
| [testing-and-qa.md](claude_docs/testing-and-qa.md) | Jest, Playwright, QA artifacts |
| [design-spec.md](claude_docs/design-spec.md) | Original design decisions, roadmap, requirements |
| [gap-analysis.md](claude_docs/gap-analysis.md) | Design vs implementation gaps, ISO 9000 assessment, priorities |

## Current Status
Feature-complete for core Phases 1-3. Main gaps are ISO 9000 operational depth (templates, review cycles, CPD tracking), external integrations (Vertical Horizonz, APEX, insurer feeds), and SSO satellite connection to Roofing Reports. See `claude_docs/gap-analysis.md` for full analysis.
