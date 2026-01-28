# Project Milestones: RANZ Certified Business Programme Portal

## v1.0 MVP (Shipped: 2026-01-29)

**Delivered:** Complete compliance management portal ready for Q2 2026 pilot launch with 10-30 members.

**Phases completed:** 1-8 (29 plans total)

**Key accomplishments:**

- Consolidated compliance engine with canonical scoring (compliance-v2.ts) and centralized thresholds
- Real-time dashboard updates with dimension-specific indicators (Insurance, Personnel, Documents, Audits)
- Security foundations with cron endpoint authentication, audit trail logging with SHA-256 hash chain
- Public verification API using NZBN/trading name (prevents enumeration of internal IDs)
- SMS notifications via Twilio with exponential backoff retry and admin delivery logs
- Notification targeting with triple-channel pattern (org email, member email, member SMS)
- Admin reporting with PDF generation (@react-pdf/renderer) and CSV export with dimension scores
- SSO integration with Clerk metadata sync for satellite domain (Roofing Reports app)

**Stats:**

- 124 TypeScript/TSX files
- 21,192 lines of code
- 8 phases, 29 plans
- 1 day from milestone start to ship (2026-01-28 → 2026-01-29)

**Git range:** Initial milestone (codebase map → milestone audit)

**Tech debt accepted:**
- Phase 03: CRON_SECRET validated at runtime only, not build-time (medium severity)

**Manual configuration pending:**
- Clerk JWT template configuration in Dashboard
- DNS CNAME for production SSO (clerk.reports.ranz.org.nz)

**What's next:** Pilot launch with 10-30 members, gather feedback, plan v1.1 based on user insights.

---
