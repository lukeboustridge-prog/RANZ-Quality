# RANZ Certified Business Programme Portal

## What This Is

A compliance management portal for RANZ member roofing businesses that transforms certification from administrative burden to competitive advantage. Members track insurance, staff credentials, and QMS documentation while RANZ monitors compliance across the membership. Public verification allows consumers to check roofer credentials.

## Core Value

**Certified businesses become verifiable, insurable, and defensible in both market and legal contexts.**

If everything else fails, members must be able to prove their certification status to insurers and consumers.

## Requirements

### Validated

Core infrastructure is built and functional:

- Member authentication via Clerk organizations (multi-tenancy)
- Organization dashboard with compliance score display
- Insurance policy upload and tracking with R2 storage
- Expiry alert system (90/60/30 days) via email
- Staff roster with LBP number entry
- LBP verification against MBIE API (when configured)
- Document upload with 19 ISO element classification
- Document versioning with approval workflow
- Audit management with checklist generation
- CAPA record tracking
- Notification system (email via Resend, DB storage)
- Badge generation (Open Badges 3.0 structure)
- Admin dashboard with member list
- Compliance scoring engine (v2 with 4 dimensions)

### Active

MVP gaps that block pilot launch (from CONCERNS.md audit):

- [ ] Fix dashboard compliance indicators (currently hardcoded to overall score)
- [ ] Consolidate compliance scoring (remove legacy compliance.ts)
- [ ] Implement real-time score recalculation on document/insurance changes
- [ ] Secure cron endpoints (require CRON_SECRET, no fallback)
- [ ] Fix public verification API (use NZBN, not internal ID)
- [ ] Implement audit trail logging (AuditLog model exists but unused)
- [ ] Add file upload size validation (50MB limit)
- [ ] Implement SMS notifications (Twilio configured but not called)
- [ ] Implement report generation (PDF/CSV export for admins)
- [ ] Fix LBP status change notifications (email member, not just org)
- [ ] Wire SSO with Roofing Reports app (satellite domain config)

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

**Current State Issues (from codebase audit):**
- Duplicate compliance scoring implementations cause inconsistencies
- Dashboard shows false positive compliance indicators
- Public API exposes internal organization IDs (enumeration risk)
- SMS notifications configured but not implemented
- Report generation stubbed but not functional
- Audit trail model exists but never called

## Constraints

- **Stack:** Next.js 16, TypeScript, PostgreSQL/Neon, Prisma, Clerk, Cloudflare R2 (already deployed)
- **Auth:** Clerk Organizations with satellite domain support for Roofing Reports SSO
- **Hosting:** Vercel (primary), must support Neon serverless PostgreSQL
- **No AI in production:** Built with AI assistance but deploys as conventional web app
- **Data residency:** AU/NZ regions only for personal information (Neon + R2 support this)
- **Timeline:** MVP ready for 10 pilot members by Q2 2026

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk Organizations for multi-tenancy | Built-in RBAC, SSO support, reduces auth complexity | Pending |
| PostgreSQL/Neon over Supabase | Prisma compatibility, serverless scaling, shared with Roofing Reports | Pending |
| Cloudflare R2 over AWS S3 | Zero egress fees, S3-compatible API, AES-256 encryption | Pending |
| compliance-v2.ts as canonical | Four-dimension scoring with detailed breakdown, issue tracking | Pending |
| Open Badges 3.0 for credentials | W3C standard, verifiable, embeddable on member websites | Pending |

---
*Last updated: 2026-01-28 after initialization*
