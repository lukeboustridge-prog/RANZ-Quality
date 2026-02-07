# Notifications & Alert System

## Channels
- **Email:** Resend integration, HTML templates
- **SMS:** Twilio integration, NZ number formatting
- **In-App:** Database-stored, read/unread tracking
- **Push:** Enum defined but not yet implemented

## Preference Hierarchy (Two-Tier)
1. Organization-level preferences (master enable/disable per channel)
2. User-level preferences (per notification type)
3. Critical notifications (LBP status, security) bypass preferences

## Notification Types
Insurance: INSURANCE_EXPIRY, INSURANCE_EXPIRED
Personnel: LBP_EXPIRY, LBP_STATUS_CHANGE
Audit: AUDIT_SCHEDULED, AUDIT_REMINDER, AUDIT_COMPLETED
CAPA: CAPA_DUE, CAPA_OVERDUE
Compliance: COMPLIANCE_ALERT, DOCUMENT_REVIEW_DUE
Testimonials: TESTIMONIAL_REQUEST, TESTIMONIAL_RECEIVED
System: TIER_CHANGE, WELCOME, SYSTEM

## Delivery Features
- Scheduled notifications (future send)
- Retry with exponential backoff (max 3 retries)
- Delivery tracking (PENDING → QUEUED → SENT → DELIVERED/FAILED)
- External ID tracking (Resend/Twilio message IDs)

## Cron Jobs
- `/api/cron/notifications` - Process scheduled + retry failed
- `/api/cron/verify-lbp` - Daily LBP re-verification batch

## SMS Templates
Pre-built templates for: insurance expiry (90/60/30 day), audit scheduled, CAPA overdue, compliance alert, LBP status change

## Convenience Functions
- `notifyInsuranceExpiry()` - Email + SMS for expiring policies
- `notifyAuditScheduled()` - Email + SMS for upcoming audits
- `notifyCapaOverdue()` - Email + SMS for overdue CAPAs
- `notifyComplianceAlert()` - Email + SMS for score drops
- `generateMemberLBPMessage()` / `generateOrgLBPMessage()` - LBP status change emails
