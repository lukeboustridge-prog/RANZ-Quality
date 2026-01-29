# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.x - Type-safe client and server code
- JavaScript/JSX - React components and server utilities

**Secondary:**
- SQL - PostgreSQL queries via Prisma

## Runtime

**Environment:**
- Node.js (version unspecified in repo, check .nvmrc or GitHub actions)
- Next.js 16.1.5 with turbopack bundler

**Package Manager:**
- pnpm - Specified in package.json with `onlyBuiltDependencies` for `@prisma/engines` and `prisma`
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.1.5 - App Router, RSC support, API routes, middleware
- React 19.2.3 - UI component framework with hooks

**UI Components:**
- Radix UI (multiple packages) - Headless accessible component primitives
  - `@radix-ui/react-dialog` - Modal/dialog component
  - `@radix-ui/react-dropdown-menu` - Dropdown menus
  - `@radix-ui/react-label` - Form labels
  - `@radix-ui/react-select` - Select dropdowns
  - `@radix-ui/react-separator` - Visual separators
  - `@radix-ui/react-slot` - Slot composition
  - `@radix-ui/react-tabs` - Tabbed interfaces
  - `@radix-ui/react-toast` - Toast notifications

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS - CSS transformation pipeline via `@tailwindcss/postcss`
- `class-variance-authority` - Type-safe className variants
- `clsx` - Conditional className merging
- `tailwind-merge` - Intelligent Tailwind class merging

**Date/Time:**
- `date-fns` 4.1.0 - Date manipulation and formatting

**Icons:**
- `lucide-react` 0.563.0 - Icon library with React components

## Key Dependencies

**Critical Infrastructure:**
- `@prisma/client` 7.3.0 - Database ORM and client
- `@prisma/adapter-pg` 7.3.0 - PostgreSQL adapter for Prisma
- `pg` 8.17.2 - Node.js PostgreSQL driver (used directly or via Prisma)

**Authentication:**
- `@clerk/nextjs` 6.36.10 - Clerk authentication and user management
- `svix` 1.84.1 - Webhook verification library (used for Clerk webhooks)

**File Storage:**
- `@aws-sdk/client-s3` 3.975.0 - AWS S3 SDK for object storage
- `@aws-sdk/s3-request-presigner` 3.975.0 - S3 presigned URLs

**Email:**
- `resend` 6.8.0 - Transactional email API

**SMS:**
- `twilio` 5.12.0 - SMS and voice API

**Validation:**
- `zod` 4.3.6 - TypeScript-first schema validation library

**Dev Tools:**
- ESLint 9 - Code linting with Next.js config
- TypeScript 5.x - Static type checking

## Configuration

**Environment:**
- `.env.example` defines all required variables (present)
- Configuration via environment variables (standard Node.js pattern)

**Key Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Webhook signature verification
- `NEXT_PUBLIC_CLERK_IS_SATELLITE` - Satellite domain flag for Roofing Reports app
- `NEXT_PUBLIC_CLERK_DOMAIN` - Satellite domain hostname
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` - Cloudflare R2 credentials
- `R2_BUCKET_NAME` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public endpoint
- `RESEND_API_KEY` - Email API key
- `EMAIL_FROM` - Sender email address
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `CRON_SECRET` - Scheduled task authentication
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS credentials (optional)
- `LBP_API_KEY` - MBIE Licensed Building Practitioners API key (optional)
- `LBP_API_BASE_URL` - LBP API endpoint

**Build:**
- `next.config.ts` - Next.js configuration (currently minimal)
- `tsconfig.json` - TypeScript configuration with path alias `@/*` → `src/*`
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration

## Database

**Primary Database:**
- PostgreSQL via Neon (serverless)
- Connection via `@prisma/adapter-pg`

**Schema Location:** `prisma/schema.prisma`

**Key Models:**
- Organization - Certified businesses with tier and compliance score
- OrganizationMember - Staff with LBP verification
- InsurancePolicy - Coverage tracking with expiry alerts
- Document - Version-controlled QMS documents (19 ISO elements)
- DocumentVersion - Full document versioning with approval workflow
- ComplianceAssessment - ISO element scoring
- Audit - Audit records with checklist and findings
- AuditLog - Immutable event sourcing (15+ year retention)
- CAPARecord - Corrective and preventive actions
- Project - Completed work with evidence
- ProjectPhoto - Photo evidence with EXIF/GPS metadata
- Testimonial - Client testimonials with verification
- Notification - Email/SMS/in-app alert system
- Report - Generated reports (PDF, CSV, JSON)

**Retention:** 15+ year capability via partitioned PostgreSQL tables

## File Storage

- Cloudflare R2 (S3-compatible)
- Bucket prefix: `portal/`
- Content types: Documents, insurance certificates, project photos, signatures, thumbnails
- Encrypted at rest (AES-256)
- Signed URLs for secure download/upload access (1 hour TTL default)

## Platform Requirements

**Development:**
- Node.js runtime
- pnpm package manager
- TypeScript 5.x
- Git

**Production:**
- Node.js runtime
- PostgreSQL 12+ (Neon serverless)
- Environment variables configured (see Configuration section)
- Cloudflare R2 account with bucket and API credentials

**Deployment Target:**
- Vercel (primary - Next.js native)
- Alternative: Any Node.js hosting (Railway, AWS EC2, etc.)

## Build & Start Commands

```bash
# Development
pnpm dev                  # Start with turbopack hot reload

# Build
pnpm build               # Runs: prisma generate && next build
pnpm db:generate        # Regenerate Prisma client

# Database
pnpm db:push            # Push schema changes to database
pnpm db:studio          # Open Prisma Studio GUI

# Type & Lint
pnpm typecheck          # Run TypeScript without emit
pnpm lint               # Run ESLint

# Production
pnpm start              # Start production server
```

## API Routes Architecture

- All API routes use Next.js App Router at `src/app/api/**`
- Middleware-based authentication via `@clerk/nextjs`
- Webhook verification using Svix for Clerk events
- Signed URLs for file uploads/downloads to R2
- Cron routes protected via `CRON_SECRET` header

---

*Stack analysis: 2026-01-28*
