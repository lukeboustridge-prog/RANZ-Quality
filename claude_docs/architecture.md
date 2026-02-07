# Architecture

## Stack
- **Framework:** Next.js 16.1.5 (App Router, Turbopack dev)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Neon) via Prisma 6.19
- **Auth:** Clerk (primary) + Custom JWT auth (dual-mode, migration path)
- **File Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Resend + React Email templates
- **SMS:** Twilio
- **Rate Limiting:** Upstash Redis
- **PDF:** @react-pdf/renderer
- **Charts:** Recharts
- **Tables:** @tanstack/react-table
- **Validation:** Zod 4.x
- **Testing:** Jest + Playwright (E2E)

## Route Groups
```
src/app/
├── (auth)/           # Sign-in, sign-up (Clerk components)
├── (dashboard)/      # Member portal (protected)
│   ├── dashboard/    # Main compliance dashboard
│   ├── documents/    # QMS document management + upload
│   ├── insurance/    # Policy management (list, new, detail)
│   ├── staff/        # Personnel roster (list, new, detail)
│   ├── audits/       # Audit history
│   ├── capa/         # Corrective actions
│   ├── projects/     # Project evidence repository
│   └── settings/     # Org profile, notifications, security
├── (admin)/          # RANZ admin portal (ranz:admin role)
│   └── admin/
│       ├── members/       # Member compliance grid
│       ├── users/         # User CRUD, import, export
│       ├── organizations/ # Org audit drill-down
│       ├── reports/       # Report generation
│       ├── activity/      # Activity charts
│       ├── audit-logs/    # Immutable audit log viewer
│       └── notifications/ # SMS log viewer
├── onboarding/       # First-time org setup
├── verify/           # Public business verification
├── search/           # Public "Check a Roofer"
└── testimonial/      # Public testimonial submission
```

## API Routes
```
src/app/api/
├── admin/          # Admin-only endpoints
│   ├── activity/   # Activity feed
│   ├── audit-logs/ # Audit log queries
│   ├── bulk/       # Bulk operations
│   ├── companies/  # Company CRUD
│   ├── compliance/ # Recalculate compliance
│   ├── members/    # Member listing
│   ├── migration/  # Auth migration (export/import/migrate/rollback/status)
│   ├── notifications/ # SMS management
│   ├── reports/    # Report generation + export
│   ├── stats/      # Dashboard statistics
│   └── users/      # User management (CRUD, batch, import/export)
├── alerts/         # Send alert emails
├── audits/         # Audit CRUD + checklist + completion
├── auth/           # Custom auth (login/logout/password/activate/session)
├── capa/           # CAPA CRUD
├── cron/           # Scheduled jobs (notifications, LBP verification)
├── documents/      # Document CRUD + versions + download + approval
├── insurance/      # Insurance policy CRUD
├── internal/       # Internal cross-app API
├── notifications/  # Notification preferences + listing
├── organizations/  # Current org management (profile, logo, notifications)
├── projects/       # Project CRUD
├── public/         # Unauthenticated endpoints
│   ├── badge/      # Open Badge credential + SVG image
│   ├── search/     # Public business search
│   ├── testimonial/ # Testimonial submission
│   └── verify/     # Business verification
├── staff/          # Staff management + LBP verification + invitations
├── testimonials/   # Testimonial management
└── webhooks/       # Clerk webhook handler
```

## Middleware
- Dual auth mode: `AUTH_MODE=clerk` (default) or `AUTH_MODE=custom`
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Admin route protection: checks `ranz:admin` or `ranz:auditor` role
- Cron route bypass: verified in route handlers

## Key Libraries
| File | Purpose |
|------|---------|
| `lib/compliance-v2.ts` | 4-dimension weighted compliance scoring engine |
| `lib/notifications.ts` | Multi-channel notifications (Email/SMS/In-App) with preference hierarchy |
| `lib/badges.ts` | Open Badges 3.0 credentials + SVG generation + embed widget |
| `lib/lbp-api.ts` | MBIE LBP Board API integration |
| `lib/document-versioning.ts` | Document version control with approval workflows |
| `lib/audit-log.ts` | Immutable audit log with SHA-256 hash chain |
| `lib/audit-templates.ts` | Audit checklist templates per ISO element |
| `lib/r2.ts` | Cloudflare R2 file storage operations |
| `lib/sms.ts` | Twilio SMS integration with templates |
| `lib/email.ts` | Resend email integration |
| `lib/reports.ts` | Report generation (PDF, CSV, XLSX, JSON) |
| `lib/projects.ts` | Project evidence management |
| `lib/clerk-sync.ts` | Sync compliance data to Clerk org metadata |
| `lib/cron-auth.ts` | Cron job authentication |
| `lib/auth/` | Complete custom auth system (JWT, sessions, passwords, migration) |
