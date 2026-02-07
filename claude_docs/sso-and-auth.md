# SSO & Authentication

## Primary Auth: Clerk
- Clerk handles sign-in/sign-up at `portal.ranz.org.nz` (primary domain)
- Roofing Reports at `reports.ranz.org.nz` will be satellite domain
- Clerk Organizations map to member businesses (multi-tenancy)
- Custom session claims embed: certification_tier, compliance_score, insurance_valid

## Custom Auth System (Migration Path)
The codebase includes a complete custom JWT auth system for future Clerk independence:
- `AUTH_MODE` env var: `clerk` (default) or `custom`
- Dual-auth middleware: custom auth primary with Clerk fallback
- JWT token management with session revocation
- Password hashing (bcrypt-ts-edge), reset flows, account activation
- Device fingerprinting + geo-location for suspicious login detection
- Auth migration tools: export from Clerk, import to custom, gradual rollout, rollback

## Roles
| Role | Scope | Description |
|------|-------|-------------|
| `org:owner` (OWNER) | Business | Full access, billing |
| `org:admin` (ADMIN) | Business | Manage documents, personnel |
| `org:member` (STAFF) | Business | Upload documents, basic access |
| `ranz:admin` | RANZ | Full portal administration |
| `ranz:auditor` | RANZ | Read-only access to businesses |

## Auth Permissions (Custom Auth)
Granular per-app permissions defined in `AuthPermission` enum:
- Quality Program: QP_VIEW_DASHBOARD, QP_MANAGE_DOCUMENTS, QP_MANAGE_INSURANCE, QP_MANAGE_PERSONNEL, QP_VIEW_AUDITS, QP_MANAGE_PROJECTS, QP_ADMIN_*
- Roofing Report: RR_CREATE_REPORTS, RR_VIEW_OWN_REPORTS, RR_VIEW_ALL_REPORTS, RR_MANAGE_INSPECTORS, RR_ADMIN
- Mobile: MOBILE_PHOTO_CAPTURE, MOBILE_SYNC

## Satellite Domain Setup
See `docs/sso-satellite-setup.md` for Clerk satellite configuration details.

## Email Templates
- `emails/welcome-email.tsx` - New user welcome
- `emails/password-reset-email.tsx` - Password reset
- `emails/password-changed-email.tsx` - Confirmation
- `emails/suspicious-login-email.tsx` - Security alert
