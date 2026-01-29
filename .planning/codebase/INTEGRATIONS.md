# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**MBIE Licensed Building Practitioners (LBP) Register:**
- Service: Government LBP license verification
- What it's used for: Automated verification of building practitioner licenses against official MBIE register
- SDK/Client: HTTP fetch with Bearer token
- Auth: `LBP_API_KEY` environment variable
- Base URL: `https://portal.api.business.govt.nz/api/lbp` (configurable via `LBP_API_BASE_URL`)
- Endpoint: `GET /practitioners/{lbpNumber}`
- Verification scope: License class, status (CURRENT/SUSPENDED/CANCELLED/EXPIRED), expiry date
- Batch mode: Processes in batches of 10 with rate limiting (100ms between batches)
- Mock fallback: Falls back to deterministic mock verification if API key not configured (80% pass rate)
- Integration file: `src/lib/lbp-api.ts`

**Webhook Integration - Clerk Organizations:**
- Service: Clerk user management and multi-tenancy
- What it's used for: User authentication, organization management, role-based access control
- SDK/Client: `@clerk/nextjs` with webhook handler
- Auth: Webhook signature verification via `CLERK_WEBHOOK_SECRET`
- Webhook endpoint: `POST /api/webhooks/clerk`
- Events handled:
  - `organization.created` - Logs creation for setup
  - `organization.updated` - Syncs org name to portal database
  - `organization.deleted` - Cascades delete to Prisma models
  - `organizationMembership.created` - Creates OrganizationMember record
  - `organizationMembership.deleted` - Removes member from organization
- Integration files: `src/app/api/webhooks/clerk/route.ts`, `src/middleware.ts`
- Verification library: Svix (`svix` package) for HMAC signature verification

## Data Storage

**Databases:**
- PostgreSQL (Neon serverless)
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM with `@prisma/adapter-pg` and native `pg` driver
  - Features: Immutable audit logging, document versioning, compliance scoring
  - Retention: 15+ years via partitioned tables
  - Features: Full-text search via PostgreSQL tsvector, JSON columns for flexible metadata

**File Storage:**
- Cloudflare R2 (S3-compatible object storage)
  - Access: AWS SDK v3 (`@aws-sdk/client-s3` and `s3-request-presigner`)
  - Auth: Access key credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
  - Bucket: `R2_BUCKET_NAME` (typically `ranz-portal`)
  - Public CDN: `R2_PUBLIC_URL` (custom domain or r2.dev endpoint)
  - Prefix: All portal files stored under `portal/` key
  - Operations:
    - PutObjectCommand - Upload documents, photos, certificates
    - GetObjectCommand - Retrieve files
    - DeleteObjectCommand - Remove files
    - Presigned URLs - Temporary upload/download links (1 hour TTL by default)
  - Files stored:
    - QMS documents (policies, procedures, forms)
    - Insurance certificates (COI PDFs/images)
    - Project photos (before/during/after with EXIF)
    - Audit evidence (documents, findings)
    - Report PDFs
    - Digital signatures
  - Encryption: AES-256 at rest (R2 default)
  - Integration file: `src/lib/r2.ts`

**Caching:**
- Not explicitly implemented; PostgreSQL query caching via Neon
- Future enhancement: Redis/Upstash for session and rate limit caching

## Authentication & Identity

**Auth Provider:**
- Clerk (multi-tenant SaaS)
  - Primary domain: `portal.ranz.org.nz`
  - Satellite domain: `reports.ranz.org.nz` (Roofing Reports app reads auth state from primary)
  - Features:
    - User sign-in/sign-up
    - Organization management (Clerk Orgs = certified businesses)
    - Role-based access control (org:owner, org:admin, org:member, ranz:admin, ranz:auditor, public:verifier)
    - Custom session claims for certification tier, compliance score, insurance status
  - Configuration:
    - Public key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - Secret key: `CLERK_SECRET_KEY`
    - Webhook secret: `CLERK_WEBHOOK_SECRET` for organization/membership events
    - Satellite mode: `NEXT_PUBLIC_CLERK_IS_SATELLITE` (false for primary, true for satellite)
  - Implementation: `@clerk/nextjs` middleware in `src/middleware.ts`
  - Protected routes: All except `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/api/public`, `/verify`
  - Admin routes: Require `ranz:admin` or `ranz:auditor` role via session claims

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry/Rollbar integration in current code
- Recommendation: Add error tracking for production monitoring

**Logs:**
- Console logging via Node.js `console.*` methods
- Logged to stdout (standard for Node.js hosting platforms)
- Audit trail: Immutable `AuditLog` table with SHA-256 hash chain for tamper evidence
  - Captures: Action (CREATE/READ/UPDATE/DELETE/APPROVE/VERIFY/LBP_VERIFY/AUDIT_START/AUDIT_COMPLETE)
  - Captured data: Actor ID/email/role, IP address, user agent, resource type/ID
  - State snapshots: previousState and newState JSON for all changes
  - Retention: Configured for 15+ year retention

**Health Checks:**
- Not detected - No dedicated health check endpoint

## CI/CD & Deployment

**Hosting:**
- Deployment platform: Vercel (primary) or Railway/similar Node.js hosts
- Environment: Node.js 18+ with pnpm

**CI Pipeline:**
- Not detected in provided files
- Likely: GitHub Actions (standard for Vercel deployment)

**Build Process:**
- Script: `pnpm build` runs `prisma generate && next build`
- Deployment: `pnpm start` for production

## Email Notifications

**Email Service:**
- Resend API (`resend` package v6.8.0)
- Auth: API key (`RESEND_API_KEY`)
- Sender: Configured via `EMAIL_FROM` (default: `RANZ Portal <portal@ranz.org.nz>`)
- Integration file: `src/lib/email.ts`
- Email types:
  - Insurance expiry alerts (90/60/30 day warnings)
  - Templated HTML with fallback text
  - Color-coded urgency (red <30d, orange 30-60d, blue >60d)
- Delivery: Asynchronous via notification queue system
- Error handling: Throws on failure, logged to console

## SMS Notifications

**SMS Service:**
- Twilio API (`twilio` package v5.12.0)
- Auth: Account SID and auth token (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
- Sender: Phone number (`TWILIO_PHONE_NUMBER`)
- Integration file: `src/lib/sms.ts`
- Features:
  - NZ phone number formatting (0→+64 conversion)
  - Rate limiting: 100ms between messages for bulk sends
  - Mock mode: Logs to console if credentials not configured
- Message templates for:
  - Insurance expiry (90/30 day, expired)
  - LBP status changes
  - Audit scheduling and reminders
  - CAPA due/overdue
  - Compliance alerts
- Optional: Can be disabled if credentials not provided

## Webhooks & Callbacks

**Incoming:**
- Clerk webhooks: `POST /api/webhooks/clerk` for org/membership events
  - Verified using Svix library with `CLERK_WEBHOOK_SECRET`
  - Handles: organization.created, organization.updated, organization.deleted, organizationMembership.created, organizationMembership.deleted

**Outgoing (Planned - Not yet implemented):**
- Compliance status webhooks to insurance partners (configured in CLAUDE.md spec)
- Project evidence sync to Roofing Reports app
- Event notifications on tier changes, audit completions

## Public APIs

**Verification API:**
- Endpoint: `GET /api/public/verify/[businessId]`
- Purpose: "Check a Roofer" tool - public verification of business certification
- Authentication: API key (to be implemented)
- Returns: Certification tier, compliance score, insurance status, badge URL, last verified timestamp

**Search API:**
- Endpoint: `GET /api/public/search`
- Purpose: Consumer lookup of certified businesses
- Query params: `q` (search term), `tier` (filter by MASTER_ROOFER/CERTIFIED/ACCREDITED)
- Returns: Business name, tier, region, verification URL

**Badge API:**
- Endpoint: `GET /api/public/badge/[businessId]` - JSON badge metadata
- Endpoint: `GET /api/public/badge/[businessId]/image` - SVG badge image
- Purpose: Embeddable certification badges for member websites
- Returns: Open Badges 3.0 format with verifiable credential

**Testimonial API:**
- Public endpoint: `POST /api/public/testimonial` - Client submission form
- Purpose: Collect client testimonials for certified business
- Requires: Verification token (sent via email)

## Cron Jobs & Scheduled Tasks

**Execution:**
- Vercel Cron or external cron service
- Protected via `CRON_SECRET` header verification

**Scheduled Tasks:**
- `POST /api/cron/verify-lbp` - Daily batch re-verification of all LBP licenses
- `POST /api/cron/notifications` - Hourly notification queue processor for alerts

## Data Integrations (Planned)

**APEX Certified Products Database:**
- Purpose: Validate products used on projects against approved list
- Integration: To be implemented (read-only API)
- Data: Product name, manufacturer, certification status, specifications

**Vertical Horizonz Training:**
- Purpose: Auto-sync CPD points from course completions
- Integration: To be implemented (OAuth2 or API key)
- Data: CPD points, course completion certificates

**Roofing Reports App:**
- Bi-directional: Query certification status, sync inspection findings
- Shared database: Same PostgreSQL instance (schema partitioned by app)
- SSO: Shared Clerk org context via satellite domain

## Environment Configuration

**Required env vars:**
- Database: `DATABASE_URL`
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- Clerk routing: `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- App: `NEXT_PUBLIC_APP_URL` (for email links)
- Cron: `CRON_SECRET`

**Optional env vars:**
- LBP API: `LBP_API_KEY`, `LBP_API_BASE_URL` (falls back to mock if not set)
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (SMS disabled if not set)
- Clerk satellite: `NEXT_PUBLIC_CLERK_IS_SATELLITE`, `NEXT_PUBLIC_CLERK_DOMAIN`

**Secrets location:**
- Production: Vercel environment variables or deployment platform secrets manager
- Development: `.env.local` (not committed)

---

*Integration audit: 2026-01-28*
