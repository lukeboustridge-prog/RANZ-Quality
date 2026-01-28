# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
ranz-quality-program/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (admin)/                  # Admin routes (RANZ staff only)
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Admin dashboard
│   │   │   │   ├── members/page.tsx  # Member directory
│   │   │   │   └── reports/page.tsx  # Admin reports
│   │   │   └── layout.tsx            # Admin layout with role guard
│   │   │
│   │   ├── (auth)/                   # Public auth routes
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   └── layout.tsx            # Auth layout
│   │   │
│   │   ├── (dashboard)/              # Protected member routes
│   │   │   ├── dashboard/page.tsx    # Main dashboard
│   │   │   ├── documents/            # Document management
│   │   │   │   ├── page.tsx
│   │   │   │   └── upload/page.tsx
│   │   │   ├── insurance/            # Insurance policy tracking
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── staff/                # Personnel management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── audits/page.tsx       # Audit history
│   │   │   ├── capa/page.tsx         # CAPA tracking
│   │   │   ├── projects/page.tsx     # Project portfolio
│   │   │   └── layout.tsx            # Dashboard layout
│   │   │
│   │   ├── api/                      # RESTful API routes
│   │   │   ├── admin/
│   │   │   │   ├── members/route.ts
│   │   │   │   ├── reports/route.ts
│   │   │   │   ├── stats/route.ts
│   │   │   │   └── bulk/route.ts
│   │   │   ├── audits/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── [id]/checklist/route.ts
│   │   │   │   └── [id]/complete/route.ts
│   │   │   ├── capa/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── [id]/approve/route.ts
│   │   │   │   ├── [id]/download/route.ts
│   │   │   │   └── [id]/versions/route.ts
│   │   │   ├── insurance/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── organizations/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── notifications/
│   │   │   │   ├── route.ts
│   │   │   │   └── preferences/route.ts
│   │   │   ├── cron/
│   │   │   │   ├── notifications/route.ts  # Daily expiry alerts
│   │   │   │   └── verify-lbp/route.ts     # Daily LBP verification
│   │   │   ├── alerts/
│   │   │   │   └── send/route.ts
│   │   │   ├── public/
│   │   │   │   ├── badge/[businessId]/
│   │   │   │   │   ├── route.ts            # Badge JSON
│   │   │   │   │   └── image/route.ts      # Badge SVG
│   │   │   │   ├── verify/[businessId]/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   └── testimonial/route.ts
│   │   │   ├── webhooks/               # External service webhooks
│   │   │   └── onboarding/route.ts
│   │   │
│   │   ├── onboarding/page.tsx        # Onboarding flow
│   │   ├── search/page.tsx            # Public search (unauth)
│   │   ├── testimonial/page.tsx       # Submit testimonial (unauth)
│   │   ├── verify/page.tsx            # Verify business (unauth)
│   │   │
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Home page
│   │   ├── globals.css                # Global styles
│   │
│   ├── components/                    # Reusable UI components
│   │   ├── ui/                        # Primitive UI (from Radix UI)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/                 # Dashboard-specific components
│   │   │   ├── compliance-score.tsx
│   │   │   ├── action-items.tsx
│   │   │   ├── expiring-items.tsx
│   │   │   └── stats-cards.tsx
│   │   │
│   │   ├── documents/                 # Document management components
│   │   │   ├── document-list.tsx
│   │   │   ├── document-upload.tsx
│   │   │   └── document-approval.tsx
│   │   │
│   │   ├── insurance/                 # Insurance components
│   │   │   ├── policy-form.tsx
│   │   │   ├── policy-list.tsx
│   │   │   └── coi-upload.tsx
│   │   │
│   │   ├── staff/                     # Personnel components
│   │   │   ├── staff-form.tsx
│   │   │   ├── staff-list.tsx
│   │   │   └── lbp-verification.tsx
│   │   │
│   │   ├── layout/                    # Layout components
│   │   │   ├── navbar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   │
│   │   └── admin/                     # Admin-specific components
│   │       ├── member-grid.tsx
│   │       ├── compliance-heatmap.tsx
│   │       └── audit-scheduler.tsx
│   │
│   ├── lib/                           # Utility functions & services
│   │   ├── db.ts                      # Prisma client singleton
│   │   ├── env.ts                     # Environment validation (Zod)
│   │   ├── utils.ts                   # Date/string utilities
│   │   │
│   │   ├── compliance-v2.ts           # Compliance scoring engine (core business logic)
│   │   ├── compliance.ts              # Legacy compliance (being phased out)
│   │   │
│   │   ├── document-versioning.ts     # Document version control logic
│   │   ├── audit-templates.ts         # Audit checklist templates
│   │   │
│   │   ├── badges.ts                  # Badge generation (Open Badges 3.0)
│   │   ├── reports.ts                 # Report generation
│   │   │
│   │   ├── lbp-api.ts                 # MBIE LBP Board API integration
│   │   ├── notifications.ts           # Notification orchestration
│   │   ├── email.ts                   # Email templates & Resend client
│   │   ├── sms.ts                     # SMS templates & Twilio client
│   │   │
│   │   ├── r2.ts                      # Cloudflare R2 file storage
│   │   ├── projects.ts                # Project evidence logic
│   │
│   ├── types/
│   │   └── index.ts                   # Exported type definitions
│   │
│   └── middleware.ts                  # Clerk authentication & routing
│
├── prisma/
│   ├── schema.prisma                  # Database schema (19 ISO elements, audit logs, etc.)
│   └── prisma.config.ts               # Prisma configuration
│
├── public/
│   ├── badge/                         # Static badge assets
│   ├── icons/                         # SVG icons
│   └── images/                        # Brand images
│
├── .planning/
│   └── codebase/                      # GSD documentation
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       └── CONCERNS.md
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

## Directory Purposes

**src/app/(admin):**
- Purpose: RANZ administrative interfaces (auditor, compliance monitoring, member management)
- Contains: Admin dashboard, member directory, audit management, reporting
- Key files: `admin/page.tsx`, `admin/members/page.tsx`, `admin/reports/page.tsx`
- Access: Protected by `ranz:admin` and `ranz:auditor` roles

**src/app/(auth):**
- Purpose: User authentication flows (sign-in, sign-up)
- Contains: Clerk-hosted auth pages
- Key files: `sign-in/[[...sign-in]]/page.tsx`, `sign-up/[[...sign-up]]/page.tsx`
- Access: Public (unauthenticated users)

**src/app/(dashboard):**
- Purpose: Main member portal with compliance, document, insurance, and staff management
- Contains: Dashboard, document management, insurance tracking, staff roster, audits, CAPA, projects
- Key files: `dashboard/page.tsx`, `documents/`, `insurance/`, `staff/`
- Access: Protected (authenticated org members)

**src/app/api:**
- Purpose: RESTful API endpoints for frontend and external integrations
- Contains: CRUD operations, business logic, webhooks, cron jobs
- Subfolders organized by resource type with [id] dynamic routes for detail operations
- Access: Mixed (some authenticated, some public, some cron-gated)

**src/app/api/public:**
- Purpose: Unauthenticated endpoints for public verification and consumer-facing features
- Contains: Badge generation, business verification, public search, testimonial submission
- Key files: `badge/[businessId]/route.ts`, `verify/[businessId]/route.ts`, `search/route.ts`
- Access: Public (no auth required)

**src/app/api/cron:**
- Purpose: Scheduled jobs triggered by external cron service
- Contains: Daily expiry alerts, LBP re-verification batch jobs
- Key files: `notifications/route.ts`, `verify-lbp/route.ts`
- Security: Protected by CRON_SECRET header validation

**src/components:**
- Purpose: Reusable React components (Server Components and Client Components)
- Structure: Organized by domain (dashboard, documents, insurance, staff, admin)
- Base: `ui/` folder contains primitive components from Radix UI + Tailwind
- Usage: Imported by page components for rendering

**src/lib:**
- Purpose: Business logic, service integrations, utilities
- Core services: Compliance engine, document versioning, audit templates, notifications
- External integrations: R2 (file storage), LBP API, Resend (email), Twilio (SMS)
- Utilities: Database client, environment validation, date/string helpers

**src/types/index.ts:**
- Purpose: Centralized type definitions for enums and union types
- Contains: CertificationTier, OrgMemberRole, ISOElement, InsurancePolicyType, etc.
- Import pattern: `import { ISOElement, type ComplianceStatus } from "@/types"`

**src/middleware.ts:**
- Purpose: Request-level authentication and authorization enforcement
- Logic: Route matchers for public/protected/admin/cron routes, Clerk session validation, role checks

**prisma/schema.prisma:**
- Purpose: Database schema definition
- Contains: 14 main models (Organization, Document, InsurancePolicy, Audit, CAPA, etc.), 40+ enums
- Structure: Organized into sections (Core Models, Compliance Assessment, Audit, CAPA, Event Sourcing, Phase 3)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with Clerk provider
- `src/app/page.tsx`: Home page
- `src/middleware.ts`: Authentication middleware
- `src/app/(dashboard)/dashboard/page.tsx`: Main dashboard for members

**Configuration:**
- `.env.example`: Template for environment variables
- `package.json`: Dependencies and npm scripts
- `tsconfig.json`: TypeScript configuration
- `next.config.ts`: Next.js configuration
- `prisma/schema.prisma`: Database schema

**Core Business Logic:**
- `src/lib/compliance-v2.ts`: Compliance scoring calculation engine (300+ lines)
- `src/lib/audit-templates.ts`: Audit checklist question templates
- `src/lib/notifications.ts`: Multi-channel notification orchestration
- `src/lib/document-versioning.ts`: Document version control workflow

**Database Access:**
- `src/lib/db.ts`: Prisma client singleton with PostgreSQL Neon adapter

**External Service Integration:**
- `src/lib/r2.ts`: Cloudflare R2 file storage (upload, download, delete)
- `src/lib/lbp-api.ts`: MBIE Licensed Building Practitioners Board API
- `src/lib/email.ts`: Resend email templates and client
- `src/lib/sms.ts`: Twilio SMS templates and client

**Testing:**
- Not detected in current codebase (see TESTING.md)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: `component-name.tsx` (kebab-case with .tsx extension)
- Utilities/Services: `service-name.ts` (kebab-case with .ts extension)
- Types: `index.ts` for centralized types, inline types in implementation files

**Directories:**
- Feature folders: `kebab-case` (e.g., `document-management`, `compliance-engine`)
- API resource folders: `resource-name` (e.g., `/api/documents`, `/api/audits`)
- Grouping folders (Route Groups): `(parentheses)` for auth, admin, dashboard grouping

**Functions:**
- Async API handlers: `async function POST/GET/PUT/DELETE()`
- Services: `camelCase` (e.g., `calculateCompliance()`, `verifyLBPLicense()`)
- React components: `PascalCase` (e.g., `ComplianceScore`, `DocumentUpload`)
- Utilities: `camelCase` (e.g., `daysUntil()`, `formatDate()`)

**Variables:**
- Constants: `UPPER_CASE` (e.g., `R2_BUCKET_NAME`, `INSURANCE_REQUIREMENTS`)
- Enums in Prisma: `PascalCase` (e.g., `CertificationTier`, `ISOElement`)
- Type exports: `PascalCase` (e.g., `type ComplianceBreakdown`, `type ComplianceIssue`)

**Types:**
- Prisma models: Auto-generated (e.g., `Organization`, `InsurancePolicy`)
- Service types: Prefixed with context (e.g., `ComplianceResult`, `NotificationRequest`)
- Request/response types: Suffixed with `Request`, `Response`, or inlined in route handlers

## Where to Add New Code

**New Member Feature (e.g., new dashboard widget):**
- Primary code: `src/app/(dashboard)/[feature]/page.tsx`
- API endpoint: `src/app/api/[resource]/route.ts`
- Service logic: `src/lib/[feature].ts`
- Component: `src/components/[feature]/component-name.tsx`
- Type: Add to `src/types/index.ts` if shared, otherwise inline

**New Admin Feature (e.g., admin report):**
- Primary code: `src/app/(admin)/admin/[feature]/page.tsx`
- API endpoint: `src/app/api/admin/[resource]/route.ts`
- Admin component: `src/components/admin/component-name.tsx`
- Service logic: Reuse existing `src/lib/reports.ts` or create `src/lib/[feature].ts`

**New External Integration (e.g., API to insurer system):**
- Client wrapper: `src/lib/insurer-api.ts` (follow pattern of `lbp-api.ts`)
- Environment variables: Add to `src/lib/env.ts` schema validation
- Endpoint: `src/app/api/integrations/[partner]/route.ts`
- Service call: Wire into appropriate business logic (`compliance.ts`, notifications, etc.)

**Utilities/Shared Helpers:**
- Simple utilities: `src/lib/utils.ts`
- Domain-specific helpers: Create new file `src/lib/[domain]-utils.ts`
- Component utilities: Colocate in component file or `src/components/[domain]/utils.ts`

**New Database Model:**
- Add to `prisma/schema.prisma` in appropriate section comment block
- Run `pnpm db:push` to deploy schema
- Regenerate client: `pnpm db:generate`
- Create API route: `src/app/api/[resource]/route.ts`
- Export types: Ensure exported from Prisma client or add to `src/types/index.ts`

## Special Directories

**public/:**
- Purpose: Static assets served directly by Next.js
- Generated: No
- Committed: Yes
- Contains: Badge templates, icons, images

**.planning/codebase/:**
- Purpose: GSD documentation files
- Generated: No
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (from pnpm install)
- Committed: No

**.next/:**
- Purpose: Next.js build cache and compiled output
- Generated: Yes (from next build)
- Committed: No

**prisma/migrations/ (future):**
- Purpose: Database migration history (when using prisma migrate)
- Generated: Yes
- Committed: Yes (recommended for reproducibility)

---

*Structure analysis: 2026-01-28*
