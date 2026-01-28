# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Next.js full-stack application using server-side rendering (App Router) with clear separation between:
- **Frontend layer:** React Server Components (RSC) and Client Components
- **API layer:** RESTful routes with Zod validation
- **Data layer:** Prisma ORM with PostgreSQL (Neon)
- **Authentication:** Clerk with organization-based multi-tenancy
- **File storage:** Cloudflare R2 (AWS S3-compatible)

**Key Characteristics:**
- Server-first architecture with minimal client-side state management
- Multi-tenancy through Clerk Organizations mapped to Portal Organizations
- Role-based access control (RBAC) enforced at middleware and API levels
- Event sourcing pattern for immutable audit trails
- Primary/Satellite SSO architecture shared with Roofing Reports application

## Layers

**Authentication & Authorization Layer:**
- Purpose: Protect routes, enforce role-based access, manage organization context
- Location: `src/middleware.ts`, Clerk configuration
- Contains: Middleware route matchers, session claims validation, role checks
- Depends on: Clerk API for session and role metadata
- Used by: All protected pages and API routes

**API Layer (Routes):**
- Purpose: Handle all CRUD operations, business logic, external integrations
- Location: `src/app/api/`
- Contains: API route handlers organized by resource type (organizations, documents, audits, insurance, etc.)
- Depends on: Database layer, external services (R2, LBP API, email/SMS providers), validation schemas
- Used by: Frontend pages, cron jobs, webhooks, public endpoints

**Service/Business Logic Layer:**
- Purpose: Encapsulate domain logic, calculations, workflows
- Location: `src/lib/` (compliance-v2.ts, notifications.ts, badges.ts, audit-templates.ts, etc.)
- Contains: Compliance scoring engine, notification orchestration, document versioning, LBP verification, badge generation
- Depends on: Database layer, external service clients
- Used by: API routes and page components

**Data Access Layer:**
- Purpose: Type-safe database queries with automatic schema validation
- Location: `src/lib/db.ts` (Prisma client wrapper)
- Contains: Prisma client singleton with PostgreSQL Neon adapter
- Depends on: DATABASE_URL environment variable
- Used by: All API routes and services

**Presentation Layer:**
- Purpose: Render UI components and pages with real-time data
- Location: `src/app/`, `src/components/`
- Contains: Page components (Server Components), reusable UI components, layouts
- Depends on: Service layer for data fetching, UI component library (Radix UI)
- Used by: Browser requests

**External Integration Layer:**
- Purpose: Abstract third-party service calls
- Location: `src/lib/` (r2.ts, email.ts, sms.ts, lbp-api.ts)
- Contains: Service clients for Cloudflare R2, Resend (email), Twilio (SMS), MBIE LBP API
- Depends on: External API credentials in environment
- Used by: Service layer and API routes

## Data Flow

**Organization Onboarding Flow:**

1. User signs up via Clerk
2. Clerk webhook triggers organization creation (if needed)
3. `/api/organizations` POST creates Portal Organization record linked to clerkOrgId
4. Middleware assigns org context to user sessions
5. User redirected to dashboard with org context
6. Compliance score initialized (default 0)

**Insurance Policy Tracking Flow:**

1. Member uploads COI to `/api/insurance` POST
2. File uploaded to Cloudflare R2 via `uploadToR2()`
3. Insurance record created with policy type, coverage amount, expiry date
4. Expiry alert flags initialized (alert90Sent, alert60Sent, alert30Sent = false)
5. Cron job `/api/cron/notifications` runs daily, checks expiry dates
6. Email/SMS notifications triggered 90/60/30 days before expiry
7. Compliance score recalculated when insurance status changes

**Document Management Flow:**

1. Member uploads document to `/api/documents` POST
2. Zod validates document type, ISO element classification
3. File stored in R2 with unique key: `documents/{orgId}/{documentNumber}/v{version}`
4. Document record created with status DRAFT, approval workflow
5. Auto-generated documentNumber (e.g., QP-001-v1.0)
6. On approval, status changes to APPROVED, compliance assessment updated
7. Document version history preserved (DocumentVersion table)
8. Soft deletion (deletedAt flag) maintains audit trail

**Compliance Scoring Calculation:**

1. Real-time recalculation triggered by: document approval, insurance status, LBP verification, audit completion
2. Calculation engine in `compliance-v2.ts` evaluates 4 dimensions:
   - **Documentation:** Score based on ISO element coverage and approval status
   - **Insurance:** Score based on valid policies and coverage amounts for tier
   - **Personnel:** Score based on LBP verification status for staff
   - **Audit:** Score based on audit findings and CAPA resolution
3. Each dimension weighted (default 1.0, adjustable per tier)
4. Overall score = weighted average of dimension scores
5. Score persists to `Organization.complianceScore`
6. Issues array identifies critical gaps for UI alerts

**Audit Management Flow:**

1. RANZ admin schedules audit via admin dashboard
2. Audit record created with status SCHEDULED, assigned auditor
3. Audit checklist generated from audit-templates based on audit type (INITIAL_CERTIFICATION, SURVEILLANCE, RECERTIFICATION)
4. AuditChecklist questions pre-populated for all 19 ISO elements
5. Auditor completes checklist: marks questions CONFORMING, MINOR_NONCONFORMITY, MAJOR_NONCONFORMITY, OBSERVATION
6. Evidence collected (photos, documents) stored in R2
7. On submission, audit status changes to PENDING_REVIEW
8. Admin reviews findings, creates CAPA records for non-conformities
9. Audit status set to COMPLETED, compliance score recalculated
10. Organization notified of results

**State Management:**

- **Server state:** Prisma database is source of truth
- **Session state:** Clerk auth context containing userId, orgId, roles
- **Cache:** Minimal; edge cases use request-level memoization
- **Client state:** Minimal; forms use HTML form state or React state for UI-only concerns
- **Real-time updates:** Cron jobs poll for expiries, notifications, status changes (no WebSockets)

## Key Abstractions

**Organization (Multi-tenant Root):**
- Purpose: Isolate all data and configuration for certified businesses
- Examples: `src/lib/compliance-v2.ts`, `src/app/api/organizations/route.ts`
- Pattern: All queries filter by `organizationId`, linked to `clerkOrgId` for auth

**ComplianceResult (Scoring Output):**
- Purpose: Encapsulate compliance assessment results with breakdown and issues
- Examples: `src/lib/compliance-v2.ts` (types ComplianceBreakdown, ComplianceIssue, TierEligibility)
- Pattern: Immutable calculation result returned by `calculateCompliance()` function

**Document Versioning (Workflow State Machine):**
- Purpose: Track document evolution with approval gates
- Examples: Document model with status (DRAFT→PENDING_APPROVAL→APPROVED) and DocumentVersion for each iteration
- Pattern: currentVersion pointer + version history, immutable superseded documents

**Audit Checklist (Template + Response):**
- Purpose: Standardized assessment questions with auditor responses
- Examples: `src/lib/audit-templates.ts` generates AuditChecklist items
- Pattern: Pre-built questions populated from templates, responses captured with evidence references

**NotificationWorkflow (Event-Driven Alerts):**
- Purpose: Multi-channel notification orchestration (email, SMS, in-app)
- Examples: `src/lib/notifications.ts` (createNotification, sendNotification)
- Pattern: Create Notification record → determine channel → invoke provider (Resend, Twilio)

**LBPVerification (External API Integration):**
- Purpose: Auto-verify staff licenses against MBIE Licensed Building Practitioners registry
- Examples: `src/lib/lbp-api.ts` (verifyLBPLicense)
- Pattern: Async verification call → cache result with timestamp → batch re-verification daily

**BadgeGeneration (Digital Credentials):**
- Purpose: Generate verifiable Open Badges 3.0 credentials
- Examples: `src/lib/badges.ts`, `/api/public/badge/[businessId]/route.ts`
- Pattern: Template-based SVG/JSON generation, embeddable on external sites

## Entry Points

**Web Application Entry:**
- Location: `src/app/layout.tsx` (Root Layout)
- Triggers: Browser request to `https://portal.ranz.org.nz/`
- Responsibilities: Wrap application with ClerkProvider, configure satellite domain whitelist, set up global styles

**Authentication Entry:**
- Location: `src/middleware.ts`
- Triggers: Every HTTP request matching configured patterns
- Responsibilities: Verify Clerk session, enforce authentication on protected routes, redirect unauthenticated users, check admin roles

**Admin Routes:**
- Location: `src/app/(admin)/admin/` directory
- Triggers: Admin user navigation or direct URL access
- Responsibilities: Limit to `ranz:admin` and `ranz:auditor` roles, provide member/audit/report management

**Member Dashboard:**
- Location: `src/app/(dashboard)/dashboard/page.tsx`
- Triggers: Authenticated org user requesting `/dashboard`
- Responsibilities: Fetch organization context, render compliance score, expiring items, action items

**API Endpoints:**
- Location: `src/app/api/*/route.ts` files
- Triggers: HTTP requests to `/api/*` paths
- Responsibilities: Validate input (Zod), check authorization, execute business logic, return JSON responses

**Cron Jobs:**
- Location: `src/app/api/cron/*/route.ts`
- Triggers: External cron service (e.g., Vercel, Railway)
- Responsibilities: Verify CRON_SECRET header, execute scheduled tasks (expiry alerts, LBP re-verification)

**Public Endpoints:**
- Location: `src/app/api/public/*` routes
- Triggers: Unauthenticated requests from public Internet
- Responsibilities: No auth required, verify via API key or signature, serve public data (badge images, verification status)

**Webhook Endpoints:**
- Location: `src/app/api/webhooks/*` routes
- Triggers: External services (Clerk, Resend, Twilio, LBP API)
- Responsibilities: Verify webhook signature, process event, update database

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages and server-side logging.

**Patterns:**

- **API Routes:** Try-catch wrapping with Zod validation, NextResponse.json errors with HTTP status codes (400, 401, 403, 404, 500)
- **Middleware:** Redirect unauthenticated users to sign-in, unauthorized users to dashboard
- **Database:** Prisma errors bubble up with context; specific checks for unique constraint violations
- **File Upload:** R2 failures logged but don't block organization creation; re-upload attempt available
- **External APIs:** LBP verification failures set lbpVerified=false, retry daily; Twilio/Resend failures logged with retry count
- **Compliance Calculation:** Handles missing data gracefully (null/undefined → default scores)

## Cross-Cutting Concerns

**Logging:**
- Server-side: Prisma query logging in development (`"query", "error", "warn"`), errors only in production
- Application: `console.error()` for exceptions with error context
- Audit trail: Immutable `AuditLog` table with hash chain (SHA-256)

**Validation:**
- Input validation: Zod schemas on all API routes
- Database validation: Prisma schema constraints (unique, required fields)
- Business logic: Compliance thresholds, tier requirements enforced in `compliance-v2.ts`

**Authentication:**
- Session management: Clerk handles session persistence, role claims stored in JWT
- Organization context: Clerk `orgId` lookup in middleware, verified in all routes
- SSO: Satellite domain configuration in layout.tsx allows cross-domain sessions

**Notifications:**
- Orchestration: `createNotification()` abstraction routes to appropriate channel
- Scheduling: Database-backed scheduler for future notifications (scheduledFor)
- Retries: Failed sends tracked in notification.retryCount, max 3 retries before failure

**File Storage:**
- Encryption: Cloudflare R2 default AES-256 encryption
- Access control: R2 signed URLs with 1-hour expiry, regenerated per request
- Integrity: SHA-256 hashes stored for documents and photos

---

*Architecture analysis: 2026-01-28*
