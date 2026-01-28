# Phase 5: SMS Notification System - Research Findings

**Researcher:** Claude (gsd-phase-researcher)
**Date:** 2026-01-28
**Phase Goal:** Critical alerts (insurance expiry, LBP status changes) reach members via SMS within minutes

---

## Executive Summary

Phase 5 implements SMS notifications for critical compliance events. The codebase already has substantial notification infrastructure in place:

- **Twilio SDK installed** (`twilio@5.12.0` in package.json)
- **SMS module exists** (`src/lib/sms.ts`) with basic send functionality
- **Notification system exists** (`src/lib/notifications.ts`) with channel routing
- **Database schema ready** (Notification model with SMS channel support)
- **Existing retry logic** (basic 3-retry system in notifications.ts)

**Key Gap:** No exponential backoff implementation exists. Current retry is simple iteration without delay calculation.

---

## Existing Infrastructure Analysis

### 1. Twilio Integration (`src/lib/sms.ts`)

**What's Already Built:**
```typescript
// Lazy initialization pattern
function getTwilioClient(): Twilio | null
async function sendSMS(to: string, message: string): Promise<SMSResult>
function formatNZPhoneNumber(phone: string): string

// SMS Templates
SMS_TEMPLATES = {
  insuranceExpiry90,
  insuranceExpiry30,
  insuranceExpired,
  lbpStatusChange,
  auditScheduled,
  capaOverdue,
  complianceAlert
}
```

**Key Features:**
- NZ phone number formatting (handles 0 prefix, adds +64)
- Mock mode when credentials missing (logs to console)
- Returns `messageId` (Twilio SID) on success
- Template library with pre-formatted messages

**Missing:**
- No retry logic in `sendSMS()` itself
- No exponential backoff calculation
- No delivery status tracking beyond initial send
- No rate limiting (has 100ms delay in `sendBulkSMS`)

### 2. Notification System (`src/lib/notifications.ts`)

**What's Already Built:**
```typescript
async function createNotification(params): Promise<SendResult>
async function sendNotification(notificationId: string): Promise<SendResult>
async function retryFailedNotifications(): Promise<number>

// Channel routing
switch (notification.channel) {
  case "SMS": sendSMSNotification()
  // ...
}
```

**Key Features:**
- Database-backed notification tracking
- Status progression: PENDING → QUEUED → SENT → FAILED
- Retry counter (`retryCount` field)
- External ID storage (`externalId` for Twilio SID)
- Helper functions: `notifyInsuranceExpiry()`, `notifyCapaOverdue()`, etc.

**Current Retry Implementation:**
```typescript
// From retryFailedNotifications()
const failedNotifications = await db.notification.findMany({
  where: {
    status: "FAILED",
    retryCount: { lt: 3 }, // Max 3 retries
  },
  take: 50,
});

for (const notification of failedNotifications) {
  await sendNotification(notification.id); // Simple retry, no backoff
}
```

**Missing:**
- No exponential backoff delay calculation
- No last-retry-timestamp tracking
- Fixed 3-retry limit (not configurable)
- No distinction between retryable vs non-retryable errors

### 3. Database Schema (`prisma/schema.prisma`)

**Notification Model:**
```prisma
model Notification {
  id              String
  type            NotificationType
  channel         NotificationChannel  // Includes SMS
  priority        NotificationPriority
  status          NotificationStatus   // PENDING/SENT/FAILED
  sentAt          DateTime?
  failureReason   String?
  retryCount      Int @default(0)
  recipient       String?              // Phone number for SMS
  externalId      String?              // Twilio message SID
  scheduledFor    DateTime?
}
```

**Missing Fields for Exponential Backoff:**
- No `lastRetryAt` timestamp
- No `nextRetryAt` scheduled time
- No `failureType` classification

**Recommendation:** Add migration to support backoff scheduling.

### 4. Cron Jobs (`src/app/api/cron/notifications/route.ts`)

**What's Already Built:**
```typescript
export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req); // CRON_SECRET validation

  const results = {
    scheduledSent: await processScheduledNotifications(),
    retriesSent: await retryFailedNotifications(), // ← Retries here
    insuranceAlerts: await checkInsuranceExpiries(),
    capaAlerts: await checkOverdueCAPAs(),
  };
}
```

**Current Execution:**
- Runs on schedule (Vercel Cron or manual trigger)
- Processes all failed notifications with `retryCount < 3`
- No delay enforcement — retries immediately

**Missing:**
- No backoff delay check before retry
- No batch size control for retries
- No priority-based retry ordering

---

## Success Criteria Analysis

### Success Criterion 1: Insurance Expiry SMS Trigger

**Requirement:** Policy expiring in 30 days triggers SMS to organization owner phone number.

**Current State:**
✅ Trigger exists in `checkInsuranceExpiries()` (notifications cron)
✅ SMS sending via `notifyInsuranceExpiry()` (uses `SMS_TEMPLATES.insuranceExpiry30`)
✅ Owner phone lookup from database

**Code Path:**
```
Cron /api/cron/notifications
  → checkInsuranceExpiries()
    → notifyInsuranceExpiry({ ownerPhone })
      → createNotification({ channel: "SMS" })
        → sendNotification()
          → sendSMSNotification()
            → sendSMS(to, message)
              → twilioClient.messages.create()
```

**Gap:** None. Already functional.

### Success Criterion 2: LBP Status Change SMS Trigger

**Requirement:** LBP status changing to SUSPENDED triggers SMS to affected staff member.

**Current State:**
⚠️ Partial implementation
- LBP verification cron exists (`/api/cron/verify-lbp`)
- Status changes detected via `verifyAllLBPNumbers()` (lbp-api.ts)
- Email notification sent to organization email
- **NO SMS notification to individual staff member**

**Code Path (Current):**
```
Cron /api/cron/verify-lbp
  → verifyAllLBPNumbers()
    → statusChanges: Array<{ memberId, newStatus }>
  → sendEmail(organization.email) // ← Only email, no SMS
```

**Gap:** Must add SMS notification to staff member's phone (from `OrganizationMember.phone`).

**Implementation Need:**
```typescript
// After detecting critical LBP status change
if (change.newStatus === "SUSPENDED" || change.newStatus === "CANCELLED") {
  const member = await db.organizationMember.findUnique({
    where: { id: change.memberId },
    select: { phone: true, firstName: true, lastName: true }
  });

  if (member?.phone) {
    await createNotification({
      type: "LBP_STATUS_CHANGE",
      channel: "SMS",
      priority: "CRITICAL",
      message: SMS_TEMPLATES.lbpStatusChange(
        `${member.firstName} ${member.lastName}`,
        change.newStatus
      ),
      recipient: member.phone,
    });
  }
}
```

### Success Criterion 3: Exponential Backoff Retry

**Requirement:** SMS delivery failures retry up to 3 times with exponential backoff.

**Current State:**
❌ No exponential backoff
- Retries exist (max 3)
- No delay calculation
- Retries execute immediately when cron runs

**Required Implementation:**

**Backoff Strategy:**
```
Retry 1: Immediate (0 seconds)
Retry 2: 60 seconds after failure
Retry 3: 300 seconds after retry 1 (5 minutes)
Retry 4: 900 seconds after retry 2 (15 minutes)
```

**Algorithm:**
```typescript
function calculateNextRetryTime(retryCount: number, failedAt: Date): Date {
  const backoffSeconds = Math.pow(2, retryCount) * 30; // 30s, 60s, 120s, 240s
  const maxBackoff = 900; // Cap at 15 minutes
  const delay = Math.min(backoffSeconds, maxBackoff);

  return new Date(failedAt.getTime() + delay * 1000);
}
```

**Database Changes Needed:**
```prisma
model Notification {
  // ... existing fields
  lastRetryAt   DateTime?  // Timestamp of last retry attempt
  nextRetryAt   DateTime?  // When next retry should occur
}
```

**Retry Logic Update:**
```typescript
// In retryFailedNotifications()
const now = new Date();
const failedNotifications = await db.notification.findMany({
  where: {
    status: "FAILED",
    retryCount: { lt: 3 },
    OR: [
      { nextRetryAt: null },        // Never retried
      { nextRetryAt: { lte: now } } // Retry time reached
    ]
  },
  take: 50,
});

for (const notification of failedNotifications) {
  // Update lastRetryAt before attempt
  await db.notification.update({
    where: { id: notification.id },
    data: { lastRetryAt: now }
  });

  const result = await sendNotification(notification.id);

  if (!result.success && notification.retryCount < 3) {
    // Calculate next retry time with exponential backoff
    const nextRetry = calculateNextRetryTime(notification.retryCount, now);
    await db.notification.update({
      where: { id: notification.id },
      data: { nextRetryAt: nextRetry }
    });
  }
}
```

### Success Criterion 4: SMS Status Storage

**Requirement:** Notification record shows SMS status (PENDING/SENT/FAILED) and Twilio message SID.

**Current State:**
✅ Fully implemented
- `status` field: NotificationStatus enum
- `externalId` field: Stores Twilio SID
- `failureReason` field: Error messages

**Code Evidence:**
```typescript
// From sendSMSNotification()
const result = await sendSMS(notification.recipient, notification.message);

await db.notification.update({
  where: { id: notificationId },
  data: {
    status: "SENT",
    sentAt: new Date(),
    externalId: result.messageId, // Twilio SID stored here
  },
});
```

**Gap:** None. Already functional.

### Success Criterion 5: Admin SMS Delivery Logs

**Requirement:** Admin can view SMS delivery logs showing timestamp, recipient, content, status.

**Current State:**
❌ No admin UI for SMS logs
- Database has all required data
- No read endpoint or UI component

**Data Available:**
```sql
SELECT
  id,
  createdAt AS timestamp,
  recipient,
  message AS content,
  status,
  externalId AS twilioSid,
  sentAt,
  failureReason,
  retryCount
FROM Notification
WHERE channel = 'SMS'
ORDER BY createdAt DESC;
```

**Implementation Need:**
1. Admin API endpoint: `GET /api/admin/notifications/sms`
2. Admin UI page: `/admin/notifications/sms`
3. Filters: Date range, status, recipient search
4. Pagination (100 per page)

---

## Environment Variables

### Required (New)

None — Twilio variables already exist in `.env.example`:

```env
# SMS (Twilio) - Already documented
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+64..."  # NZ number in E.164 format
```

### Configuration Recommendations

**Add to `.env.example`:**
```env
# SMS Retry Configuration
SMS_MAX_RETRIES=3                    # Maximum retry attempts
SMS_INITIAL_BACKOFF_SECONDS=30       # First retry delay
SMS_MAX_BACKOFF_SECONDS=900          # 15 minutes maximum
```

**Add to `src/lib/env.ts` validation:**
```typescript
export const env = z.object({
  // ... existing
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  SMS_MAX_RETRIES: z.coerce.number().default(3),
  SMS_INITIAL_BACKOFF_SECONDS: z.coerce.number().default(30),
  SMS_MAX_BACKOFF_SECONDS: z.coerce.number().default(900),
}).parse(process.env);
```

---

## Technical Decisions from Prior Phases

### Decision 03-03: Audit Logging After Mutations

**Impact on Phase 5:**
SMS notifications should be audit-logged AFTER successful send, not before.

**Pattern to Follow:**
```typescript
// 1. Send SMS
const result = await sendSMS(phone, message);

// 2. Update database
await db.notification.update({ ... });

// 3. Audit log (failures logged but don't block)
await createAuditLog({
  action: "CREATE",
  resourceType: "Notification",
  resourceId: notification.id,
  metadata: { channel: "SMS", externalId: result.messageId }
}).catch(err => console.error("Audit log failed:", err));
```

### Decision 03-01: CRON_SECRET Validation

**Impact on Phase 5:**
The existing cron endpoint `/api/cron/notifications` already enforces `verifyCronRequest()`. No changes needed for SMS-specific triggers.

**Verified:** `src/app/api/cron/notifications/route.ts:12`

### Decision 02-02: revalidatePath After Mutations

**Impact on Phase 5:**
SMS notifications don't directly mutate UI-visible data (unlike compliance scores). No `revalidatePath()` calls needed unless adding admin SMS log UI.

**Exception:** If building admin SMS log page, add:
```typescript
// After sending SMS notification
revalidatePath('/admin/notifications');
```

---

## Integration Points

### 1. Insurance Expiry Cron (`/api/cron/notifications`)

**Current Flow:**
```
checkInsuranceExpiries()
  → Find policies expiring in 30 days
  → notifyInsuranceExpiry({ ownerPhone })
    → createNotification({ channel: "SMS" })
```

**Status:** ✅ Already functional. No changes needed.

**Test Coverage Needed:**
- Mock Twilio client in test
- Verify SMS sent when `daysUntilExpiry <= 30` and `ownerPhone` exists
- Verify no SMS sent when `ownerPhone` is null

### 2. LBP Verification Cron (`/api/cron/verify-lbp`)

**Current Flow:**
```
verifyAllLBPNumbers()
  → statusChanges: Array<{ memberId, newStatus }>
  → sendEmail(organization.email) only
```

**Required Change:**
Add SMS notification to individual staff member.

**Implementation:**
```typescript
// In /api/cron/verify-lbp/route.ts after email send
for (const change of criticalChanges) {
  const member = await db.organizationMember.findUnique({
    where: { id: change.memberId },
    select: { phone: true, firstName: true, lastName: true }
  });

  if (member?.phone) {
    await createNotification({
      type: "LBP_STATUS_CHANGE",
      channel: "SMS",
      priority: "CRITICAL",
      recipient: member.phone,
      title: "LBP License Status Changed",
      message: SMS_TEMPLATES.lbpStatusChange(
        `${member.firstName} ${member.lastName}`,
        change.newStatus
      ),
    });
  }
}
```

### 3. Notification Retry System

**Current Implementation:**
```typescript
// src/lib/notifications.ts:419
export async function retryFailedNotifications(): Promise<number> {
  const failedNotifications = await db.notification.findMany({
    where: { status: "FAILED", retryCount: { lt: 3 } },
    take: 50,
  });

  for (const notification of failedNotifications) {
    await sendNotification(notification.id); // No backoff
  }
}
```

**Required Enhancement:**
Add exponential backoff scheduling (see Success Criterion 3 above).

---

## Testing Strategy

### Unit Tests Needed

**1. Exponential Backoff Calculation**
```typescript
describe('calculateNextRetryTime', () => {
  it('returns 30s delay for retry 1', () => {
    const failedAt = new Date('2026-01-28T10:00:00Z');
    const nextRetry = calculateNextRetryTime(1, failedAt);
    expect(nextRetry).toEqual(new Date('2026-01-28T10:00:30Z'));
  });

  it('caps delay at 15 minutes', () => {
    const failedAt = new Date('2026-01-28T10:00:00Z');
    const nextRetry = calculateNextRetryTime(10, failedAt); // Very high retry
    const maxDelay = 900 * 1000; // 15 minutes
    expect(nextRetry.getTime() - failedAt.getTime()).toBe(maxDelay);
  });
});
```

**2. NZ Phone Number Formatting**
```typescript
describe('formatNZPhoneNumber', () => {
  it('converts 021 to +6421', () => {
    expect(formatNZPhoneNumber('021234567')).toBe('+6421234567');
  });

  it('preserves +64 prefix', () => {
    expect(formatNZPhoneNumber('+6421234567')).toBe('+6421234567');
  });
});
```

**3. SMS Template Rendering**
```typescript
describe('SMS_TEMPLATES', () => {
  it('renders insurance expiry with 30 days', () => {
    const message = SMS_TEMPLATES.insuranceExpiry30(
      'Example Roofing Ltd',
      'Public Liability',
      30
    );
    expect(message).toContain('URGENT');
    expect(message).toContain('30 days');
  });
});
```

### Integration Tests Needed

**1. Insurance Expiry SMS Trigger**
```typescript
describe('Insurance Expiry Cron', () => {
  it('sends SMS when policy expires in 30 days and owner has phone', async () => {
    // Setup: Create policy expiring in 30 days with owner phone
    // Execute: Run cron
    // Assert: Notification created with channel=SMS, status=SENT
  });

  it('skips SMS when owner phone is null', async () => {
    // Assert: No SMS notification created
  });
});
```

**2. LBP Status Change SMS**
```typescript
describe('LBP Verification Cron', () => {
  it('sends SMS to staff member when status changes to SUSPENDED', async () => {
    // Setup: Mock LBP API to return SUSPENDED status
    // Execute: Run verify-lbp cron
    // Assert: Notification created for member.phone
  });
});
```

**3. Retry with Backoff**
```typescript
describe('Notification Retry', () => {
  it('waits for nextRetryAt before retrying', async () => {
    // Setup: Create failed notification with nextRetryAt = +10 minutes
    // Execute: Run retry now
    // Assert: Notification NOT retried
    // Execute: Run retry at +10 minutes
    // Assert: Notification retried
  });
});
```

### Manual Testing Checklist

- [ ] Test with real Twilio credentials (send to test NZ number)
- [ ] Verify Twilio SID stored in `externalId`
- [ ] Trigger insurance expiry at 30 days (check SMS received)
- [ ] Trigger LBP status change to SUSPENDED (check SMS received)
- [ ] Force SMS failure (invalid phone number), verify 3 retries with backoff
- [ ] Check admin UI shows SMS logs with all fields
- [ ] Verify no SMS sent when phone number is null/empty
- [ ] Test NZ phone formatting (0211234567 → +64211234567)

---

## Risks and Mitigations

### Risk 1: Twilio Costs

**Risk:** SMS volume could exceed budget if notifications sent excessively.

**Mitigation:**
- SMS only sent for `CRITICAL` and `HIGH` priority events
- Insurance expiry: 30-day threshold only (not 90/60 days)
- LBP status: SUSPENDED/CANCELLED only (not EXPIRED)
- Rate limiting: 100ms delay in `sendBulkSMS()`

**Cost Estimate:**
- 250 members × 3 insurance policies × 1 SMS/year = 750 SMS/year
- LBP status changes: ~10/year
- **Total: ~800 SMS/year × $0.10 NZD = ~$80 NZD/year**

### Risk 2: Retry Storm

**Risk:** Failed SMS retries could overwhelm Twilio API if many fail simultaneously.

**Mitigation:**
- Exponential backoff spreads retries over time
- Batch size limit (50 notifications per cron run)
- Max 3 retries prevents infinite loops
- Cron runs every 5 minutes (not every minute)

### Risk 3: Missing Phone Numbers

**Risk:** Members haven't entered phone numbers in database.

**Mitigation:**
- Phone number is optional in `Organization` and `OrganizationMember` models
- SMS skipped gracefully when `phone` is null
- Email fallback always sent
- Admin dashboard can show "SMS coverage %" metric

### Risk 4: International Numbers

**Risk:** Members might enter non-NZ phone numbers.

**Mitigation:**
- `formatNZPhoneNumber()` assumes NZ (+64) prefix
- Twilio will reject invalid international formats
- Error logged to `failureReason` field
- Consider adding phone validation regex in future:
  ```typescript
  const NZ_PHONE_REGEX = /^(\+64|0)[2-9]\d{7,9}$/;
  ```

---

## Dependencies

### External Services

1. **Twilio SMS API**
   - Account SID and Auth Token required
   - NZ phone number provisioned as sender
   - Pricing: ~$0.10 NZD per SMS to NZ numbers
   - Docs: https://www.twilio.com/docs/sms

### npm Packages

Already installed:
- `twilio@5.12.0` (Twilio Node SDK)

No new packages required.

### Database Migrations

**Required Migration:**
```prisma
model Notification {
  // ... existing fields
  lastRetryAt   DateTime?  @map("last_retry_at")
  nextRetryAt   DateTime?  @map("next_retry_at")

  @@index([nextRetryAt]) // For efficient retry queries
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_sms_retry_timestamps
```

---

## Open Questions

1. **Should SMS templates be editable by admins?**
   - Current: Hardcoded in `SMS_TEMPLATES` object
   - Alternative: Store in database with template variables
   - Recommendation: Keep hardcoded for MVP, defer to Phase 7 (Admin Features)

2. **Should we track SMS delivery confirmations from Twilio?**
   - Twilio supports delivery webhooks (StatusCallback)
   - Requires webhook endpoint: `POST /api/webhooks/twilio/status`
   - Updates `status` from SENT → DELIVERED
   - Recommendation: Defer to v2 (not critical for MVP)

3. **Should we allow users to opt-out of SMS notifications?**
   - Requires `NotificationPreference` model extension
   - Add `smsOptOut` boolean field
   - Recommendation: Implement in Phase 6 (User Notification Preferences)

4. **Should we implement SMS rate limiting per phone number?**
   - Prevent SMS spam if alerts trigger rapidly
   - Example: Max 3 SMS per phone per hour
   - Recommendation: Monitor in production first, add if needed

---

## Phase 5 Implementation Checklist

Based on this research, Phase 5 should deliver:

### Core SMS Functionality
- [ ] Add database migration for `lastRetryAt` and `nextRetryAt` fields
- [ ] Implement `calculateNextRetryTime()` exponential backoff function
- [ ] Update `retryFailedNotifications()` to check `nextRetryAt` before retry
- [ ] Add SMS notification to LBP verification cron (`/api/cron/verify-lbp`)
- [ ] Add environment variable validation for Twilio config

### Admin Features
- [ ] Create API endpoint: `GET /api/admin/notifications/sms`
- [ ] Create admin UI page: `/admin/notifications/sms`
- [ ] Add filters: date range, status, recipient search
- [ ] Add pagination (100 items per page)
- [ ] Display: timestamp, recipient, content, status, Twilio SID, retries

### Testing
- [ ] Unit tests for exponential backoff calculation
- [ ] Unit tests for NZ phone formatting
- [ ] Integration test: Insurance expiry SMS trigger
- [ ] Integration test: LBP status change SMS trigger
- [ ] Integration test: Retry with exponential backoff
- [ ] Manual test with real Twilio account

### Documentation
- [ ] Update CLAUDE.md with SMS notification architecture
- [ ] Document exponential backoff algorithm
- [ ] Update .env.example with SMS retry configuration
- [ ] Add SMS troubleshooting guide (common Twilio errors)

---

## Recommended Phase Breakdown

This research suggests splitting Phase 5 into 3 sequential waves:

**Wave 1: Exponential Backoff Foundation**
- Database migration (lastRetryAt, nextRetryAt)
- Backoff calculation function
- Update retry logic in notifications.ts
- Unit tests

**Wave 2: LBP SMS Integration**
- Add SMS notification to verify-lbp cron
- Update LBP status change email to include SMS
- Integration tests

**Wave 3: Admin SMS Logs UI**
- API endpoint for SMS logs
- Admin UI page with filters/pagination
- Manual testing with Twilio

---

## Conclusion

Phase 5 is well-positioned for rapid implementation. The core SMS infrastructure already exists—this phase primarily adds:

1. **Exponential backoff retry logic** (new algorithm)
2. **LBP status change SMS** (extend existing cron)
3. **Admin SMS logs UI** (new admin feature)

**Estimated Complexity:** Medium (3 days)
- Low risk: Twilio integration already proven
- Medium complexity: Exponential backoff requires careful testing
- High value: Critical alerts reach members reliably

**Blockers:** None identified. All dependencies satisfied.

**Next Steps:** Proceed to planning with 3-wave structure above.

---

*Research completed: 2026-01-28*
*Total implementation effort: ~3 days (1 day per wave)*
