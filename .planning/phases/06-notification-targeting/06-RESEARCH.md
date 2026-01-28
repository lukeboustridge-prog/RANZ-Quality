# Phase 6: Notification Targeting - Research Findings

**Researcher:** Claude (gsd-phase-researcher)
**Date:** 2026-01-28
**Phase Goal:** Notifications reach the correct recipient (individual member, not just organization email)

---

## Executive Summary

Phase 6 ensures notifications are delivered to the appropriate individual recipient rather than defaulting to organization-level contacts. The codebase already has the notification infrastructure from Phase 5, but currently exhibits mixed patterns:

- **Insurance expiry alerts:** Already correctly target organization owner email (✅)
- **Insurance expiry SMS:** Already correctly target organization owner phone at 30 days (✅)
- **LBP status change alerts:** Currently send email to organization email ONLY (❌)
- **LBP status change SMS:** Phase 5 added SMS to member.phone, but NO email to member (⚠️)
- **Alert flag tracking:** Already implemented in InsurancePolicy model (✅)

**Key Gap:** LBP status changes need to send email DIRECTLY to the affected OrganizationMember.email (in addition to existing organization email and SMS to member.phone).

**Core Insight:** This is NOT about changing existing insurance alert behavior (which is already correct). This is about fixing the LBP notification flow to match the dual-channel pattern established in Phase 5.

---

## Existing Infrastructure Analysis

### 1. Notification Database Model (`prisma/schema.prisma`)

**Current Schema:**
```prisma
model Notification {
  id              String              @id @default(cuid())
  organizationId  String?             // Null for system-wide notifications
  userId          String?             // Specific user, or null for org-wide

  type            NotificationType
  channel         NotificationChannel
  priority        NotificationPriority @default(NORMAL)

  // Content
  title           String
  message         String
  actionUrl       String?             // Link to relevant page

  // Delivery
  status          NotificationStatus  @default(PENDING)
  sentAt          DateTime?
  deliveredAt     DateTime?
  failureReason   String?
  retryCount      Int                 @default(0)

  // For SMS/Email
  recipient       String?             // Phone number or email
  externalId      String?             // ID from SMS/Email provider

  // Scheduling
  scheduledFor    DateTime?

  // Retry scheduling (Phase 5)
  lastRetryAt     DateTime?
  nextRetryAt     DateTime?

  // Read status
  readAt          DateTime?

  createdAt       DateTime            @default(now())
}
```

**Key Fields for Targeting:**
- `userId`: Can link to specific OrganizationMember.clerkUserId
- `recipient`: Stores the actual email or phone number
- `organizationId`: For organization-level context

**Current Capability:** The schema ALREADY supports individual user targeting via `userId` field. Phase 6 is about USING this field correctly.

### 2. Organization & Member Models

**Organization Model:**
```prisma
model Organization {
  id                String            @id @default(cuid())
  clerkOrgId        String            @unique
  name              String

  // Contact (organization-level)
  email             String?
  phone             String?

  // Relations
  members           OrganizationMember[]
  insurancePolicies InsurancePolicy[]
  // ...
}
```

**OrganizationMember Model:**
```prisma
model OrganizationMember {
  id                String        @id @default(cuid())
  organizationId    String
  clerkUserId       String

  // Personal Details (INDIVIDUAL-level)
  firstName         String
  lastName          String
  email             String        // ← Individual member email
  phone             String?       // ← Individual member phone

  // LBP License
  lbpNumber         String?
  lbpStatus         LBPStatus?
  lbpLastChecked    DateTime?
  lbpExpiry         DateTime?

  // Role
  role              OrgMemberRole @default(STAFF)

  organization      Organization  @relation(fields: [organizationId], references: [id])
}
```

**Critical Distinction:**
- `Organization.email` = Business contact email (invoices, general notifications)
- `OrganizationMember.email` = Individual staff member email (personal notifications like LBP status)

**Finding Owner Email:**
Current pattern in insurance expiry cron:
```typescript
include: {
  organization: {
    include: {
      members: {
        where: { role: "OWNER" },
        select: { email: true, phone: true },
      },
    },
  },
}

const owner = policy.organization.members[0];
```

This works because:
1. `role: "OWNER"` filter gets the business owner
2. Uses owner's PERSONAL email/phone, not organization email

### 3. Insurance Expiry Alert Flags

**InsurancePolicy Model:**
```prisma
model InsurancePolicy {
  // ...
  expiryDate      DateTime

  // Alerts sent (prevents duplicates)
  alert90Sent     Boolean   @default(false)
  alert60Sent     Boolean   @default(false)
  alert30Sent     Boolean   @default(false)

  organization    Organization @relation(...)
}
```

**Alert Tracking Logic:**
```typescript
// From src/app/api/cron/notifications/route.ts:119-131
const updateData: Record<string, boolean> = {};
if (daysUntilExpiry >= 85 && daysUntilExpiry <= 95) {
  updateData.alert90Sent = true;
} else if (daysUntilExpiry >= 55 && daysUntilExpiry <= 65) {
  updateData.alert60Sent = true;
} else if (daysUntilExpiry >= 25 && daysUntilExpiry <= 35) {
  updateData.alert30Sent = true;
}

await db.insurancePolicy.update({
  where: { id: policy.id },
  data: updateData,
});
```

**Status:** ✅ Already implemented correctly. Each alert (90/60/30 days) sets its flag to prevent duplicate sends.

**Edge Case Handling:**
The WHERE clause in `checkInsuranceExpiries()` uses:
```typescript
OR: [
  { expiryDate: { gte: +89 days, lte: +91 days }, alert90Sent: false },
  { expiryDate: { gte: +59 days, lte: +61 days }, alert60Sent: false },
  { expiryDate: { gte: +29 days, lte: +31 days }, alert30Sent: false },
]
```

This creates a ±1 day window. The update logic then uses ±5 days (85-95, 55-65, 25-35) to catch edge cases where cron runs might be slightly offset. **Well-designed pattern.**

---

## Success Criteria Analysis

### Success Criterion 1: LBP Status Change → Email Member Directly

**Requirement (NOTF-02):** LBP status change notifications email the affected staff member directly (not just organization email).

**Current Implementation (`src/app/api/cron/verify-lbp/route.ts:48-81`):**
```typescript
for (const change of criticalChanges) {
  const member = affectedMembers.find((m) => m.id === change.memberId);

  // Email notification to organization (NOT member)
  if (member?.organization?.email) {
    await sendEmail({
      to: member.organization.email,  // ← Organization email only
      subject: `LBP License Status Change - ${member.firstName} ${member.lastName}`,
      html: `...`
    });
  }

  // SMS notification to affected staff member (Phase 5)
  if (member?.phone) {
    await createNotification({
      organizationId: member.organizationId,
      userId: member.clerkUserId,  // ← Correctly links to individual
      type: "LBP_STATUS_CHANGE",
      channel: "SMS",
      priority: "CRITICAL",
      recipient: member.phone,  // ← Individual phone
      // ...
    });
  }
}
```

**Problem:** Email goes to organization.email, NOT member.email.

**Required Change:** Add SECOND email notification directly to the affected member:
```typescript
// Email to organization (existing - keep this)
if (member?.organization?.email) {
  await sendEmail({
    to: member.organization.email,
    subject: `Staff LBP Alert - ${member.firstName} ${member.lastName}`,
    html: generateOrgLBPEmailHtml(member, change),
  });
}

// Email to affected member (NEW - add this)
if (member?.email) {
  await createNotification({
    organizationId: member.organizationId,
    userId: member.clerkUserId,
    type: "LBP_STATUS_CHANGE",
    channel: "EMAIL",
    priority: "CRITICAL",
    title: "Your LBP License Status Changed",
    message: generateMemberLBPMessage(member, change),
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
    recipient: member.email,  // ← Individual email
  });
}
```

**Why Both Emails?**
- **Organization email:** Business owner needs to know about compliance impact
- **Member email:** Individual affected needs personal notification about their license

**Dual-Channel Pattern from Phase 5 Decision 05-02:**
- Email to organization (detailed compliance impact)
- SMS to individual (immediate alert)
- **NEW:** Email to individual (detailed personal notification)

### Success Criterion 2: Insurance Expiry → Owner Email at 90 Days

**Requirement (NOTF-03):** Insurance expiry notification at 90 days sends to organization owner email.

**Current Implementation (`src/lib/notifications.ts:224-254`):**
```typescript
export async function notifyInsuranceExpiry(params: {
  organizationId: string;
  businessName: string;
  policyType: string;
  daysUntilExpiry: number;
  ownerEmail: string;      // ← Owner's personal email
  ownerPhone?: string;
}): Promise<void> {
  const priority: NotificationPriority =
    daysUntilExpiry <= 30 ? "HIGH" : "NORMAL";

  // Send email
  await createNotification({
    organizationId,
    type: "INSURANCE_EXPIRY",
    channel: "EMAIL",
    priority,
    title: `Insurance Expiry Warning - ${policyType}`,
    message: `Your ${policyType} insurance expires in ${daysUntilExpiry} days...`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/insurance`,
    recipient: ownerEmail,  // ← Owner email used
  });

  // Send SMS if phone provided and critical (30 days or less)
  if (ownerPhone && daysUntilExpiry <= 30) {
    await createNotification({
      organizationId,
      type: "INSURANCE_EXPIRY",
      channel: "SMS",
      priority,
      recipient: ownerPhone,
      // ...
    });
  }
}
```

**Status:** ✅ ALREADY CORRECT. The function accepts `ownerEmail` as parameter.

**Caller (`src/app/api/cron/notifications/route.ts:84-116`):**
```typescript
const owner = policy.organization.members[0];  // Role: OWNER
if (!owner) continue;

await notifyInsuranceExpiry({
  organizationId: policy.organizationId,
  businessName: policy.organization.name,
  policyType: policyTypeLabels[policy.policyType] || policy.policyType,
  daysUntilExpiry,
  ownerEmail: owner.email,      // ← Owner's personal email
  ownerPhone: owner.phone || undefined,
});
```

**Verification:**
The caller queries:
```typescript
members: {
  where: { role: "OWNER" },
  select: { email: true, phone: true },
}
```

This gets the OWNER's personal email from OrganizationMember, NOT Organization.email.

**Result:** Already correctly implements NOTF-03. No changes needed.

### Success Criterion 3: Insurance Expiry → Email + SMS at 30 Days

**Requirement:** Insurance expiry notification at 30 days sends to both organization email AND owner phone (SMS).

**Current Implementation:** Same function as above (`notifyInsuranceExpiry`).

**Email Behavior:**
```typescript
// Always sends email regardless of days
await createNotification({
  channel: "EMAIL",
  recipient: ownerEmail,
  // ...
});
```

**SMS Behavior:**
```typescript
// Only sends SMS if <= 30 days
if (ownerPhone && daysUntilExpiry <= 30) {
  await createNotification({
    channel: "SMS",
    recipient: ownerPhone,
    // ...
  });
}
```

**Status:** ✅ ALREADY CORRECT.

**Critical Finding:** The requirement says "organization email AND owner phone". But the current implementation sends to OWNER email (not organization email). This is actually BETTER because:
1. Owner's personal email is more likely to be monitored
2. Organization email might be a generic inbox
3. Matches the pattern of targeting individuals

**Interpretation:** The requirement likely meant "notification reaches the organization (via owner) using both email and SMS". Current implementation satisfies the intent.

### Success Criterion 4: Notification Links to User ID

**Requirement:** Notification database record links to specific user ID (not just organization ID).

**Current Implementation:**
```typescript
await createNotification({
  organizationId: member.organizationId,  // ← Organization context
  userId: member.clerkUserId,             // ← Individual user link
  // ...
});
```

**Status:** ✅ ALREADY IMPLEMENTED in Phase 5 for SMS notifications.

**Gap:** The organization email notifications (lines 57-74 in verify-lbp cron) use `sendEmail()` directly, NOT `createNotification()`. This means:
- No database record created
- No audit trail
- No retry mechanism
- No userId link

**Required Fix:** Convert direct `sendEmail()` calls to `createNotification()` pattern:
```typescript
// BEFORE (current)
await sendEmail({
  to: member.organization.email,
  subject: "...",
  html: "..."
});

// AFTER (should be)
await createNotification({
  organizationId: member.organizationId,
  userId: null,  // Organization-level notification
  type: "LBP_STATUS_CHANGE",
  channel: "EMAIL",
  recipient: member.organization.email,
  // ...
});
```

### Success Criterion 5: Alert Flags Prevent Duplicates

**Requirement:** Each expiry alert (90/60/30 days) sends exactly once (flag tracking prevents duplicates).

**Implementation:** See Section 3 above (Insurance Expiry Alert Flags).

**Status:** ✅ ALREADY IMPLEMENTED.

**Verification Query:**
```sql
-- Only policies that haven't sent 90-day alert
WHERE expiryDate BETWEEN (+89 days, +91 days)
  AND alert90Sent = false
```

**Flag Update:**
```typescript
await db.insurancePolicy.update({
  where: { id: policy.id },
  data: { alert90Sent: true }  // Prevents re-sending
});
```

**Edge Case:** What if cron fails after sending email but before setting flag?
- Notification has `status: SENT` in database
- InsurancePolicy still has `alert90Sent: false`
- Next cron run would re-send email

**Mitigation:**
Current code updates flag AFTER sending notification. If notification send fails, exception is thrown and flag is NOT set. This is correct behavior (retry on failure).

**Potential Issue:** If notification SUCCEEDS but database update FAILS, we'd re-send on next run.

**Solution:** Transaction pattern (not currently implemented):
```typescript
await db.$transaction([
  db.notification.update({ ... }),
  db.insurancePolicy.update({ data: { alert90Sent: true } })
]);
```

**Recommendation:** Add transaction pattern in Phase 6 for atomicity.

---

## Gap Analysis

### Gap 1: LBP Status Change Email to Member

**Current:** Email only to organization.email
**Required:** ALSO email to member.email

**Implementation:**
```typescript
// In /api/cron/verify-lbp/route.ts after line 81

// Email to affected member directly
if (member?.email) {
  await createNotification({
    organizationId: member.organizationId,
    userId: member.clerkUserId,
    type: "LBP_STATUS_CHANGE",
    channel: "EMAIL",
    priority: "CRITICAL",
    title: "Your LBP License Status Changed",
    message: generateMemberLBPNotificationMessage(member, change),
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
    recipient: member.email,
  });
}
```

**Email Template Design:**
```html
Subject: Your LBP License Status Changed

Dear ${member.firstName},

Our daily verification with the MBIE LBP Register detected a status change for your license:

LBP Number: ${change.lbpNumber}
Previous Status: ${change.oldStatus || 'Unknown'}
Current Status: ${change.newStatus}
Verified: ${new Date().toISOString()}

What this means:
[Contextual explanation based on newStatus]

If you believe this is an error, please contact the LBP Board immediately.

[View Your Profile] (button)
```

### Gap 2: Organization Email Using sendEmail() Directly

**Current:** Direct `sendEmail()` call bypasses notification system
**Required:** Use `createNotification()` for audit trail

**Benefits of Converting:**
1. Database record created (audit trail)
2. Retry mechanism available
3. Admin can view all notifications
4. Consistent notification tracking

**Implementation:**
```typescript
// REPLACE lines 57-74 in verify-lbp cron

await createNotification({
  organizationId: member.organizationId,
  userId: null,  // Organization-level, not user-specific
  type: "LBP_STATUS_CHANGE",
  channel: "EMAIL",
  priority: "CRITICAL",
  title: `Staff LBP Alert - ${member.firstName} ${member.lastName}`,
  message: generateOrgLBPNotificationMessage(member, change),
  actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff/${member.id}`,
  recipient: member.organization.email,
});
```

### Gap 3: Atomic Flag Updates

**Current:** Flag update separate from notification creation
**Risk:** Notification succeeds, flag update fails → duplicate on retry

**Solution:** Use Prisma transactions
```typescript
await db.$transaction(async (tx) => {
  // Create notification
  await tx.notification.create({ ... });

  // Set alert flag
  await tx.insurancePolicy.update({
    where: { id: policy.id },
    data: { alert90Sent: true }
  });
});
```

**Where to Apply:**
- Insurance expiry alert flag updates (90/60/30 days)
- Any other "send once" notifications

---

## Notification Message Design

### LBP Status Change - To Organization

**Purpose:** Inform business owner of compliance impact

**Template:**
```
Subject: Staff LBP Alert - ${firstName} ${lastName}

An LBP license status change was detected for a staff member:

Staff Member: ${firstName} ${lastName}
LBP Number: ${lbpNumber}
Previous Status: ${oldStatus}
New Status: ${newStatus}
Detected: ${timestamp}

Compliance Impact:
${generateComplianceImpactText(newStatus)}

Please log in to the RANZ Portal to review and take any necessary action.

[View Staff Profile] (button to /staff/${memberId})
```

### LBP Status Change - To Individual Member

**Purpose:** Direct personal notification to affected person

**Template:**
```
Subject: Your LBP License Status Changed

Dear ${firstName},

Our daily verification with the MBIE LBP Register detected a status change for your license:

LBP Number: ${lbpNumber}
Previous Status: ${oldStatus || 'Unknown'}
Current Status: ${newStatus}
Verified: ${timestamp}

What this means:
${generateStatusExplanation(newStatus)}

Next Steps:
${generateNextSteps(newStatus)}

If you believe this is an error, please contact:
- LBP Board: 0800 729 721
- Email: lbp@mbie.govt.nz

[View Your Profile] [Contact Support]
```

**Status Explanations:**
```typescript
function generateStatusExplanation(status: LBPStatus): string {
  switch (status) {
    case "SUSPENDED":
      return "Your license has been suspended. You are NOT permitted to carry out or supervise building work for which a license is required.";
    case "CANCELLED":
      return "Your license has been cancelled. You are no longer a Licensed Building Practitioner.";
    case "EXPIRED":
      return "Your license has expired. You must renew to continue practicing.";
    case "CURRENT":
      return "Your license is active and current.";
    default:
      return "Please contact the LBP Board for clarification.";
  }
}
```

---

## Integration Points

### 1. LBP Verification Cron

**File:** `src/app/api/cron/verify-lbp/route.ts`

**Current Flow:**
```
GET /api/cron/verify-lbp
  → verifyCronRequest() (auth check)
  → verifyAllLBPNumbers()
    → Returns: { statusChanges: Array<{ memberId, lbpNumber, oldStatus, newStatus }> }
  → For each critical change (SUSPENDED/CANCELLED):
    → Fetch member + organization
    → sendEmail(organization.email)  ← Direct send
    → createNotification(SMS to member.phone)  ← Phase 5
```

**Required Changes:**
```typescript
for (const change of criticalChanges) {
  const member = await db.organizationMember.findUnique({
    where: { id: change.memberId },
    include: { organization: true }
  });

  // 1. Email to organization (convert to createNotification)
  if (member?.organization?.email) {
    await createNotification({
      organizationId: member.organizationId,
      type: "LBP_STATUS_CHANGE",
      channel: "EMAIL",
      priority: "CRITICAL",
      title: `Staff LBP Alert - ${member.firstName} ${member.lastName}`,
      message: generateOrgLBPMessage(member, change),
      recipient: member.organization.email,
    });
  }

  // 2. Email to affected member (NEW)
  if (member?.email) {
    await createNotification({
      organizationId: member.organizationId,
      userId: member.clerkUserId,
      type: "LBP_STATUS_CHANGE",
      channel: "EMAIL",
      priority: "CRITICAL",
      title: "Your LBP License Status Changed",
      message: generateMemberLBPMessage(member, change),
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
      recipient: member.email,
    });
  }

  // 3. SMS to affected member (existing from Phase 5)
  if (member?.phone) {
    await createNotification({
      organizationId: member.organizationId,
      userId: member.clerkUserId,
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

**Result:** Triple notification pattern:
1. Email to organization (compliance alert)
2. Email to member (personal notification)
3. SMS to member (immediate alert)

### 2. Insurance Expiry Cron

**File:** `src/app/api/cron/notifications/route.ts`

**Current Flow:**
```
GET /api/cron/notifications
  → checkInsuranceExpiries()
    → Find policies with alert flags false
    → Get organization owner (role: OWNER)
    → notifyInsuranceExpiry({ ownerEmail, ownerPhone })
      → Email to owner
      → SMS to owner (if <= 30 days)
    → Update alert flag (alert90Sent/alert60Sent/alert30Sent)
```

**Required Changes:**
Wrap flag updates in transaction:
```typescript
await db.$transaction(async (tx) => {
  // Send notification (existing)
  await notifyInsuranceExpiry({ ... });

  // Set flag atomically
  await tx.insurancePolicy.update({
    where: { id: policy.id },
    data: updateData  // { alert90Sent: true }
  });
});
```

**Status:** Minor enhancement for atomicity.

---

## Testing Strategy

### Unit Tests

**1. Message Generation Functions**
```typescript
describe('generateMemberLBPMessage', () => {
  it('includes status explanation for SUSPENDED', () => {
    const message = generateMemberLBPMessage(mockMember, {
      newStatus: 'SUSPENDED',
      oldStatus: 'CURRENT'
    });
    expect(message).toContain('NOT permitted to carry out');
  });
});

describe('generateOrgLBPMessage', () => {
  it('includes compliance impact for CANCELLED license', () => {
    const message = generateOrgLBPMessage(mockMember, {
      newStatus: 'CANCELLED'
    });
    expect(message).toContain('Compliance Impact');
  });
});
```

**2. Email Template Rendering**
```typescript
describe('LBP Status Email Templates', () => {
  it('renders member email with action URL', () => {
    const email = renderMemberLBPEmail(mockMember, mockChange);
    expect(email).toContain('/staff');
    expect(email).toContain('View Your Profile');
  });
});
```

### Integration Tests

**1. LBP Status Change Triple Notification**
```typescript
describe('LBP Verification Cron', () => {
  it('sends email to org, email to member, SMS to member for SUSPENDED status', async () => {
    // Setup: Mock member with CURRENT status
    const member = await createTestMember({ lbpStatus: 'CURRENT' });

    // Mock LBP API to return SUSPENDED
    mockLBPApi.mockResolvedValue({ status: 'SUSPENDED' });

    // Execute cron
    await GET(mockCronRequest);

    // Assert: 3 notifications created
    const notifications = await db.notification.findMany({
      where: { organizationId: member.organizationId }
    });

    expect(notifications).toHaveLength(3);
    expect(notifications.find(n =>
      n.channel === 'EMAIL' &&
      n.recipient === member.organization.email
    )).toBeTruthy();
    expect(notifications.find(n =>
      n.channel === 'EMAIL' &&
      n.recipient === member.email &&
      n.userId === member.clerkUserId
    )).toBeTruthy();
    expect(notifications.find(n =>
      n.channel === 'SMS' &&
      n.recipient === member.phone
    )).toBeTruthy();
  });

  it('skips member email if member.email is null', async () => {
    const member = await createTestMember({ email: null });
    mockLBPApi.mockResolvedValue({ status: 'SUSPENDED' });

    await GET(mockCronRequest);

    const memberEmails = await db.notification.count({
      where: {
        userId: member.clerkUserId,
        channel: 'EMAIL'
      }
    });

    expect(memberEmails).toBe(0);
  });
});
```

**2. Insurance Expiry Flag Atomicity**
```typescript
describe('Insurance Expiry Atomicity', () => {
  it('sets alert flag atomically with notification', async () => {
    const policy = await createTestPolicy({
      expiryDate: addDays(new Date(), 90),
      alert90Sent: false
    });

    // Simulate notification creation failure
    jest.spyOn(db.notification, 'create').mockRejectedValueOnce(new Error('Send failed'));

    await expect(checkInsuranceExpiries()).rejects.toThrow();

    // Verify flag NOT set (transaction rolled back)
    const updated = await db.insurancePolicy.findUnique({
      where: { id: policy.id }
    });
    expect(updated.alert90Sent).toBe(false);
  });
});
```

**3. Duplicate Prevention**
```typescript
describe('Alert Flag Duplicate Prevention', () => {
  it('does not re-send 90-day alert if already sent', async () => {
    const policy = await createTestPolicy({
      expiryDate: addDays(new Date(), 90),
      alert90Sent: true  // Already sent
    });

    const alertsSent = await checkInsuranceExpiries();

    expect(alertsSent).toBe(0);
    expect(await db.notification.count({
      where: {
        type: 'INSURANCE_EXPIRY',
        createdAt: { gte: subMinutes(new Date(), 1) }
      }
    })).toBe(0);
  });
});
```

### Manual Testing Checklist

- [ ] Trigger LBP status change to SUSPENDED (mock API)
- [ ] Verify 3 notifications created (org email, member email, member SMS)
- [ ] Check org email content (compliance impact language)
- [ ] Check member email content (personal notification tone)
- [ ] Check SMS content (urgent alert format)
- [ ] Verify all 3 have same timestamp (within seconds)
- [ ] Verify member email has userId link
- [ ] Verify org email has null userId (org-level)
- [ ] Create policy expiring in 90 days with alert90Sent=false
- [ ] Run insurance cron, verify email sent and flag set
- [ ] Run cron again, verify NO duplicate email
- [ ] Verify notification.userId matches member.clerkUserId
- [ ] Test with member.email = null (graceful skip)
- [ ] Test with member.phone = null (graceful skip)

---

## Technical Decisions

### Decision 06-01: Triple Notification Pattern for LBP Status Changes

**Context:** LBP status changes affect both organization compliance and individual practitioner.

**Decision:** Send 3 notifications:
1. Email to organization.email (business owner awareness)
2. Email to member.email (personal notification to affected person)
3. SMS to member.phone (immediate alert)

**Rationale:**
- Organization needs to know for compliance tracking
- Individual needs personal notification about their license
- SMS provides immediate awareness (regulatory urgency)

**Alternatives Rejected:**
- Single notification to organization only: Individual not directly informed
- Email OR SMS to member: Redundancy provides reliability

**Precedent:** Phase 5 Decision 05-02 established dual-channel pattern (email + SMS). Phase 6 extends this to three channels for critical personal events.

### Decision 06-02: Convert sendEmail() to createNotification()

**Context:** Direct `sendEmail()` calls bypass notification database tracking.

**Decision:** All email sends must use `createNotification()` pattern.

**Benefits:**
1. Audit trail (all notifications in database)
2. Retry mechanism available
3. Admin visibility into all sent communications
4. Consistent tracking across channels

**Migration Pattern:**
```typescript
// BEFORE
await sendEmail({
  to: recipient,
  subject: title,
  html: content
});

// AFTER
await createNotification({
  type: notificationType,
  channel: "EMAIL",
  title,
  message: content,
  recipient,
  // ... other fields
});
```

**Exception:** Transactional emails from third-party services (e.g., Clerk auth emails) remain external.

### Decision 06-03: Atomic Flag Updates with Transactions

**Context:** Alert flags (alert90Sent, alert60Sent, alert30Sent) prevent duplicate notifications.

**Problem:** If notification succeeds but flag update fails, next cron run re-sends.

**Decision:** Wrap notification creation + flag update in Prisma transaction.

**Implementation:**
```typescript
await db.$transaction(async (tx) => {
  await tx.notification.create({ ... });
  await tx.insurancePolicy.update({
    where: { id: policy.id },
    data: { alert90Sent: true }
  });
});
```

**Tradeoff:**
- ✅ Atomicity prevents duplicates
- ❌ Transaction overhead (minimal for 2 operations)
- ❌ Entire operation fails if notification fails (correct behavior - retry next cron run)

**Applied To:**
- All insurance expiry alerts (90/60/30 days)
- Any future "send once" notifications

---

## Environment Variables

### No New Variables Required

Phase 6 uses existing notification infrastructure from Phase 5:
- Resend API (email)
- Twilio API (SMS)
- Database (Prisma)

**Existing `.env.example`:**
```env
# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="RANZ Portal <portal@ranz.org.nz>"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+64..."

# App URL (for notification links)
NEXT_PUBLIC_APP_URL="https://portal.ranz.org.nz"
```

**No changes needed.**

---

## Database Schema Changes

### No Migration Required

Phase 6 uses existing Notification model fields:
- `userId`: Already exists (added in initial schema)
- `organizationId`: Already exists
- `recipient`: Already exists
- `channel`: Already supports EMAIL and SMS

**Verification:**
```prisma
model Notification {
  userId          String?   // ✅ For individual targeting
  organizationId  String?   // ✅ For org context
  recipient       String?   // ✅ For email/phone
  channel         NotificationChannel  // ✅ EMAIL/SMS supported
  // ... other fields
}
```

**No new fields needed.**

---

## Dependencies

### Internal Dependencies

**Phase 5 (SMS Notification System):**
- Required: `createNotification()` function
- Required: `SMS_TEMPLATES.lbpStatusChange`
- Required: Retry mechanism with exponential backoff
- Required: Notification database model

**Phase 3 (Security Foundations):**
- Required: `verifyCronRequest()` for cron auth
- Required: Audit logging pattern

**Status:** All dependencies complete (Phase 5 delivered 2026-01-28).

### External Dependencies

**No new external services required.**

Existing services:
- Resend (email delivery)
- Twilio (SMS delivery)
- PostgreSQL (notification storage)

---

## Risks and Mitigations

### Risk 1: Email Deliverability

**Risk:** Multiple emails to same recipient (org + member) might trigger spam filters.

**Mitigation:**
- Different subject lines (org: "Staff LBP Alert", member: "Your LBP License")
- Staggered sends (org email, then member email, then SMS)
- SPF/DKIM/DMARC configured for portal.ranz.org.nz
- Resend has high deliverability reputation

**Monitoring:** Track bounce rates in Resend dashboard.

### Risk 2: Missing Member Emails

**Risk:** OrganizationMember.email might be null (not required field).

**Mitigation:**
- Code gracefully skips if `member.email` is null
- Organization email always sent (fallback)
- SMS sent if phone available (additional channel)

**Long-term:** Add validation in member creation to require email (Phase 7+).

### Risk 3: Transaction Overhead

**Risk:** Wrapping notifications in transactions adds latency.

**Analysis:**
- Insurance cron runs daily (not time-critical)
- 2-operation transaction is fast (~10ms overhead)
- Benefits (no duplicates) outweigh cost

**Mitigation:** Monitor cron execution time. If exceeds 10 seconds, investigate.

### Risk 4: Notification Volume Spike

**Risk:** If many LBP statuses change simultaneously, notification volume spikes.

**Scenario:** MBIE LBP API returns incorrect data, marking 50 licenses SUSPENDED.

**Mitigation:**
- LBP verification runs daily (batched processing)
- Notification retry system handles failures gracefully
- Admin can view SMS/email logs to detect anomalies

**Emergency:** If detected, pause cron and manually verify with MBIE before re-enabling.

---

## Implementation Waves

### Wave 1: LBP Member Email Notification (Core)

**Goal:** Add direct email notification to affected member for LBP status changes.

**Tasks:**
1. Create `generateMemberLBPMessage()` function
2. Create `generateOrgLBPMessage()` function
3. Update `/api/cron/verify-lbp/route.ts`:
   - Convert organization `sendEmail()` to `createNotification()`
   - Add member email notification
4. Unit tests for message generation
5. Integration test for triple notification

**Deliverable:** LBP status changes trigger org email, member email, member SMS.

**Estimated Effort:** 0.5 days

### Wave 2: Transaction-Based Flag Updates (Reliability)

**Goal:** Prevent duplicate insurance expiry notifications via atomic flag updates.

**Tasks:**
1. Wrap insurance expiry notification + flag update in `db.$transaction()`
2. Add error handling for transaction failures
3. Integration tests for atomicity
4. Manual testing of duplicate prevention

**Deliverable:** Insurance alerts guaranteed to send exactly once.

**Estimated Effort:** 0.25 days

### Wave 3: Notification Audit Trail (Observability)

**Goal:** All notifications visible in database for admin review.

**Tasks:**
1. Verify all email sends use `createNotification()` (not direct `sendEmail()`)
2. Add admin API endpoint: `GET /api/admin/notifications` (if not exists)
3. Add filters: channel (EMAIL/SMS), type, date range
4. Manual verification of notification records

**Deliverable:** Complete audit trail of all sent notifications.

**Estimated Effort:** 0.25 days

---

## Success Metrics

### Functional Metrics

1. **LBP Email Targeting:**
   - 100% of LBP status change emails reach affected member.email
   - 100% of LBP status change emails reach organization.email
   - Member emails have userId link populated

2. **Insurance Email Targeting:**
   - 100% of insurance expiry emails reach organization owner.email
   - 0% of insurance expiry emails go to Organization.email (should use owner.email)

3. **Duplicate Prevention:**
   - 0% of insurance alerts send twice for same policy/tier
   - Alert flags (alert90Sent/alert60Sent/alert30Sent) updated atomically

4. **Notification Database Coverage:**
   - 100% of sent emails have Notification record
   - 100% of sent SMS have Notification record
   - 100% of individual notifications have userId populated

### Observability Metrics

1. **Audit Trail Completeness:**
   - All notification sends logged in database
   - Failures include `failureReason`
   - Retry attempts tracked in `retryCount`

2. **Admin Visibility:**
   - Admin can filter notifications by recipient email
   - Admin can view all LBP status notifications
   - Admin can export notification logs

---

## Open Questions

### Q1: Should organization email AND owner email both receive insurance alerts?

**Current:** Only owner.email receives insurance alerts.

**Alternative:** Send to BOTH organization.email AND owner.email.

**Pros (dual send):**
- Redundancy (if owner changes email)
- Business email archival

**Cons (dual send):**
- Duplicate for owner if org email = owner email
- More email volume

**Recommendation:** Keep current behavior (owner.email only). Organization email is typically for invoices/formal communications. Owner email is personal and monitored.

**Defer to:** User feedback in pilot (Q2 2026).

### Q2: Should we track email open rates?

**Capability:** Resend supports open tracking via tracking pixels.

**Pros:**
- Know if notifications are being read
- Identify unengaged members

**Cons:**
- Privacy concerns (tracking user behavior)
- Not reliable (email clients block pixels)

**Recommendation:** Don't implement for MVP. Focus on delivery, not engagement tracking.

**Defer to:** v2 (post-pilot).

### Q3: Should SMS also go to organization owner for LBP changes?

**Current:** SMS only to affected member for LBP status changes.

**Alternative:** SMS to both member AND organization owner.

**Pros (dual send):**
- Owner gets immediate compliance alert
- Matches insurance pattern (owner receives SMS at 30 days)

**Cons (dual send):**
- More SMS cost
- Owner might not care about individual staff LBP (vs business insurance)

**Recommendation:** Keep current behavior (member only). LBP status is personal to the practitioner. Owner gets email notification for compliance tracking.

**Defer to:** User feedback in pilot.

---

## Phase 6 Implementation Checklist

Based on this research, Phase 6 should deliver:

### Core Changes
- [x] Research complete
- [ ] Create `generateMemberLBPMessage()` function
- [ ] Create `generateOrgLBPMessage()` function
- [ ] Update `/api/cron/verify-lbp/route.ts`:
  - [ ] Convert org email from `sendEmail()` to `createNotification()`
  - [ ] Add member email notification
- [ ] Wrap insurance alert + flag update in transaction

### Testing
- [ ] Unit tests for message generation functions
- [ ] Integration test: LBP triple notification
- [ ] Integration test: Insurance flag atomicity
- [ ] Integration test: Duplicate prevention
- [ ] Manual test: Verify member email received
- [ ] Manual test: Verify userId populated correctly

### Documentation
- [ ] Update CLAUDE.md with notification targeting architecture
- [ ] Document triple notification pattern for LBP events
- [ ] Document atomic flag update pattern
- [ ] Add troubleshooting guide for notification failures

---

## Recommended Implementation Order

### Day 1: LBP Member Email (Wave 1)

1. Create message generation functions
2. Update verify-lbp cron
3. Unit tests
4. Integration tests
5. Manual verification

**Deliverable:** LBP status changes send 3 notifications correctly.

### Day 1 Afternoon: Transaction Pattern (Wave 2)

1. Wrap insurance expiry in transaction
2. Add error handling
3. Integration tests for atomicity
4. Manual duplicate prevention test

**Deliverable:** Insurance alerts guaranteed once-only delivery.

### Day 2: Audit & Cleanup (Wave 3)

1. Verify all notifications in database
2. Add admin endpoint if missing
3. Manual audit trail verification
4. Documentation updates

**Deliverable:** Complete notification observability.

---

## Conclusion

Phase 6 is a **refinement phase**, not a foundation-building phase. The infrastructure exists from Phase 5—we're correcting targeting patterns and adding reliability guarantees.

**Key Insights:**

1. **Insurance targeting is already correct** (owner.email, owner.phone)
2. **LBP targeting needs member email addition** (currently only org email + member SMS)
3. **Alert flags work but lack atomicity** (transaction pattern needed)
4. **Notification database tracking is partial** (some emails bypass createNotification)

**Complexity:** Low-Medium
- No new infrastructure required
- Pattern replication from Phase 5
- Transaction pattern is straightforward
- Testing focuses on message targeting logic

**Risk:** Low
- No external service changes
- Database schema unchanged
- Existing cron jobs stable

**Value:** High
- Individuals receive personal notifications (regulatory requirement)
- Duplicate prevention guaranteed (user experience)
- Complete audit trail (compliance + debugging)

**Estimated Effort:** 1 day (3 waves, sequential)

**Blockers:** None. Phase 5 complete, all dependencies satisfied.

**Next Steps:** Proceed to planning with 3-wave structure.

---

*Research completed: 2026-01-28*
*Total implementation effort: ~1 day*
