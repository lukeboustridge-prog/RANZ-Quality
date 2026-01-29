# RANZ Certified Business Programme Portal

## What This Is

A compliance management portal for RANZ member roofing businesses that transforms certification from administrative burden to competitive advantage. Members track insurance, staff credentials, and QMS documentation while RANZ monitors compliance across the membership. Public verification allows consumers to check roofer credentials.

**Shipped v1.0 MVP** on 2026-01-29 with complete compliance engine, real-time dashboard, security foundations, notifications, admin reporting, and SSO integration.

## Core Value

**Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.**

If everything else fails, members must be able to prove their certification status to insurers and consumers.

## Current State

**Version:** v1.0 MVP (shipped 2026-01-29)
**Next:** Pilot launch with 10-30 members in Q2 2026

**What's working:**
- Compliance engine with 4-dimension scoring (Insurance, Personnel, Documents, Audits)
- Real-time dashboard updates on data changes
- Cron endpoint security with CRON_SECRET authentication
- Audit trail with SHA-256 hash chain for tamper detection
- Public verification API (NZBN/trading name lookup)
- SMS notifications via Twilio with exponential backoff retry
- Triple-channel notification targeting (org email, member email, member SMS)
- PDF compliance reports with @react-pdf/renderer
- CSV export with dimension scores and NZBN
- SSO metadata sync for satellite domain (Roofing Reports)

**Manual configuration pending:**
- Clerk JWT template configuration in Dashboard
- DNS CNAME for production SSO (clerk.reports.ranz.org.nz)

**Tech debt:**
- CRON_SECRET validated at runtime only, not build-time

## Requirements

### Validated

All v1.0 requirements shipped and verified:

- Dashboard & Compliance (4)
  - DASH-01: Dimension-specific compliance indicators — v1.0
  - DASH-02: Real-time compliance updates — v1.0
  - COMP-01: Single compliance engine (compliance-v2.ts) — v1.0
  - COMP-02: Central compliance thresholds — v1.0

- Security & Infrastructure (4)
  - SEC-01: Cron endpoint authentication — v1.0
  - SEC-02: NZBN/trading name verification API — v1.0
  - SEC-03: 50MB file upload validation — v1.0
  - SEC-04: Audit trail with hash chain — v1.0

- Notifications (3)
  - NOTF-01: SMS via Twilio — v1.0
  - NOTF-02: LBP alerts to member directly — v1.0
  - NOTF-03: Insurance expiry alerts (90/60/30 days) — v1.0

- Admin & Reporting (3)
  - ADMIN-01: PDF compliance reports — v1.0
  - ADMIN-02: CSV member export — v1.0
  - ADMIN-03: Compliance drill-down — v1.0

- SSO Integration (3)
  - SSO-01: Portal as primary domain — v1.0
  - SSO-02: Satellite domain config documented — v1.0
  - SSO-03: JWT claims sharing — v1.0

### Active

(None yet — requirements defined during next milestone planning)

### Out of Scope

Deferred to future milestones:

- APEX certified products integration (Phase 2)
- Testimonial collection and verification (Phase 3)
- Mobile app (Phase 4)
- Offline-first photo capture (Phase 4)
- CPD auto-tracking from Vertical Horizonz (Phase 4)
- Insurance COI OCR extraction (Phase 4)
- Builder/council API access (Phase 5)
- Consumer mobile app (Phase 5)
- "Check a Roofer" public search UI (v2)
- Embeddable badge widget (v2)
- Rate limiting on public APIs (v2)

## Context

**Pilot Timeline:** Q2 2026 with 10-30 selected members across all three tiers (Accredited, Certified, Master Roofer).

**Existing Ecosystem:**
- RANZ Roofing Reports app exists at reports.ranz.org.nz (satellite domain for SSO)
- Master Roofers Code of Practice defines technical standards
- RANZ Compliance Wizard deployed at ranz-compliance-master.vercel.app

**Regulatory Requirements:**
- Privacy Act 2020 (NZ) compliance for data handling
- Building Act 2004, Section 307 restricts LBP data use
- ISO 17020 requirements for audit trail immutability
- 15+ year document retention for compliance records

**Codebase:**
- 124 TypeScript/TSX files
- 21,192 lines of code
- Next.js 16, PostgreSQL/Neon, Prisma, Clerk, Cloudflare R2

## Constraints

- **Stack:** Next.js 16, TypeScript, PostgreSQL/Neon, Prisma, Clerk, Cloudflare R2 (already deployed)
- **Auth:** Clerk Organizations with satellite domain support for Roofing Reports SSO
- **Hosting:** Vercel (primary), must support Neon serverless PostgreSQL
- **No AI in production:** Built with AI assistance but deploys as conventional web app
- **Data residency:** AU/NZ regions only for personal information (Neon + R2 support this)
- **Timeline:** Pilot ready, full rollout by end of 2026

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk Organizations for multi-tenancy | Built-in RBAC, SSO support, reduces auth complexity | Good |
| PostgreSQL/Neon over Supabase | Prisma compatibility, serverless scaling, shared with Roofing Reports | Good |
| Cloudflare R2 over AWS S3 | Zero egress fees, S3-compatible API, AES-256 encryption | Good |
| compliance-v2.ts as canonical | Four-dimension scoring with detailed breakdown, issue tracking | Good |
| Open Badges 3.0 for credentials | W3C standard, verifiable, embeddable on member websites | Pending |
| @react-pdf/renderer for reports | Declarative React components, no Puppeteer overhead | Good |
| Fire-and-forget Clerk sync | Non-blocking, doesn't fail compliance calculations | Good |
| Triple notification pattern | Org email (compliance), member email (personal), SMS (immediate) | Good |
| SHA-256 hash chain for audit | Tamper-evident logging, meets ISO 17020 requirements | Good |
| Runtime CRON_SECRET validation | Simpler implementation, acceptable for MVP | Revisit |

---
*Last updated: 2026-01-29 after v1.0 milestone*
