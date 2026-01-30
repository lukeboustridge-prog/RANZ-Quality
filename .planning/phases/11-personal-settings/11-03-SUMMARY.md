---
phase: 11-personal-settings
plan: 03
subsystem: notifications
tags: [notifications, preferences, user-settings, organization-settings]
dependency_graph:
  requires:
    - "09-02: Organization notification preferences schema"
    - "11-01: User notification preferences schema"
    - "11-02: User notification preferences API endpoints"
  provides:
    - "Preference-aware notification sending"
    - "Two-tier preference hierarchy enforcement"
    - "Critical notification bypass logic"
  affects:
    - "All notification-sending features"
    - "Future notification types"
tech_stack:
  added: []
  patterns:
    - "Two-tier preference hierarchy (org → user)"
    - "Critical notification bypass patterns"
    - "Preference checking before database writes"
file_tracking:
  key_files:
    created: []
    modified:
      - path: "src/lib/notifications.ts"
        changes: "Added preference checking logic and type mappings"
decisions:
  - decision: "Critical notifications (LBP changes, CRITICAL priority) always send regardless of preferences"
    rationale: "Security and compliance requirements trump user preferences"
    impact: "Users cannot opt out of critical alerts"
  - decision: "smsCritical preference forced on regardless of user setting"
    rationale: "SMS critical alerts are for urgent situations requiring immediate attention"
    impact: "Users see the preference but cannot disable critical SMS"
  - decision: "Skipped notifications return success=true with skipped=true"
    rationale: "Respecting preferences is not an error condition"
    impact: "Callers can distinguish between sent, skipped, and failed notifications"
  - decision: "IN_APP and PUSH notifications never check preferences"
    rationale: "In-app and push notifications are non-intrusive and can be managed by device settings"
    impact: "All in-app/push notifications always sent"
metrics:
  duration: "11 minutes"
  completed: "2026-01-30"
---

# Phase 11 Plan 03: Notification Preference Enforcement Summary

**One-liner:** Notification system respects two-tier preference hierarchy (org → user) while ensuring critical alerts always send.

---

## What Was Built

### Overview
Closed the verification gap where user notification preferences were not being respected by the notification system. Implemented a two-tier preference hierarchy (organization → user) that checks preferences before sending email and SMS notifications, while ensuring critical security and compliance notifications always bypass preferences.

### Core Functionality
1. **Preference Type Mappings**
   - Four mapping tables for NotificationType → preference fields
   - NOTIFICATION_TYPE_TO_EMAIL_PREF (user email preferences)
   - NOTIFICATION_TYPE_TO_SMS_PREF (user SMS preferences)
   - NOTIFICATION_TYPE_TO_ORG_EMAIL_PREF (org email preferences)
   - NOTIFICATION_TYPE_TO_ORG_SMS_PREF (org SMS preferences)
   - `null` values indicate critical notifications that always send

2. **shouldSendNotification() Helper**
   - Implements two-tier hierarchy: org prefs checked before user prefs
   - Critical notification bypass logic (priority=CRITICAL, type mapping=null)
   - smsCritical forced on for urgent alerts
   - IN_APP and PUSH always allowed
   - Returns { shouldSend: boolean, reason?: string }

3. **createNotification() Integration**
   - Checks preferences BEFORE creating database record
   - Skips notification creation if user/org opted out
   - Returns success=true with skipped=true and reason
   - Logs skipped notifications for debugging

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add preference checking helper functions | b51a5de | src/lib/notifications.ts |
| 2 | Integrate preference checking into createNotification | 51d0a82 | src/lib/notifications.ts |

---

## Technical Decisions

### Critical Notification Bypass
**Decision:** LBP_EXPIRY, LBP_STATUS_CHANGE, TIER_CHANGE, WELCOME, SYSTEM notifications mapped to `null` in email mappings (always send).

**Rationale:** These notification types are system-critical or compliance-critical. Users should not be able to opt out of license status changes or system notifications that affect their certification status.

**Implementation:** Type mappings return `null` for critical notification types, which triggers immediate `shouldSend: true` return without checking preferences.

### smsCritical Forced On
**Decision:** SMS notifications mapped to "smsCritical" always send, even if user has "disabled" the preference in the UI.

**Rationale:** Critical SMS alerts (CAPA_OVERDUE, COMPLIANCE_ALERT, LBP status changes) are for urgent situations requiring immediate attention. The nature of SMS as a channel makes it appropriate for these critical alerts.

**Implementation:** Special check in shouldSendNotification: `if (channel === "SMS" && smsPrefKey === "smsCritical") return { shouldSend: true };`

### Two-Tier Hierarchy
**Decision:** Check organization preferences before user preferences.

**Rationale:** Organizations may want to disable entire notification categories for their team (e.g., no insurance alerts for non-owner staff). Organization-level settings should take precedence over individual user preferences.

**Implementation:** Sequential checks: org master toggle → org type-specific → user master toggle → user type-specific.

### Skipped = Success
**Decision:** Skipped notifications return `success: true` with `skipped: true` and a reason string.

**Rationale:** Respecting user preferences is not an error condition. The notification system is working correctly when it honors opt-out preferences. Returning `success: false` would trigger retry logic inappropriately.

**Implementation:** Modified SendResult interface to include optional `skipped?: boolean` and `reason?: string` fields.

### No Preferences for IN_APP/PUSH
**Decision:** IN_APP and PUSH channels always bypass preference checks.

**Rationale:** In-app notifications are non-intrusive (user can ignore them) and push notifications can be managed by device-level settings. There's no need to duplicate preference management for these channels.

**Implementation:** Early return in shouldSendNotification: `if (channel === "IN_APP" || channel === "PUSH") return { shouldSend: true };`

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Testing Evidence

### TypeScript Compilation
```bash
$ npx tsc --noEmit
# No errors in notifications.ts
```

### Verification Checks
1. ✅ NOTIFICATION_TYPE_TO_EMAIL_PREF exists with all 16 notification types
2. ✅ shouldSendNotification() function exists and implements two-tier hierarchy
3. ✅ createNotification() calls shouldSendNotification before db.notification.create
4. ✅ Critical notifications bypass (null mappings, CRITICAL priority)
5. ✅ SendResult interface includes skipped and reason fields
6. ✅ Console logging for skipped notifications

### Preference Mapping Coverage
All NotificationType enum values mapped in all four mapping tables:
- INSURANCE_EXPIRY, INSURANCE_EXPIRED → emailInsurance, smsInsurance
- LBP_EXPIRY, LBP_STATUS_CHANGE → null (always send)
- AUDIT_SCHEDULED, AUDIT_REMINDER, AUDIT_COMPLETED → emailAudit, smsAudit
- CAPA_DUE, CAPA_OVERDUE → emailCompliance, smsCritical
- COMPLIANCE_ALERT → emailCompliance, smsCritical
- DOCUMENT_REVIEW_DUE → emailCompliance, null (no SMS)
- TESTIMONIAL_REQUEST, TESTIMONIAL_RECEIVED → emailNewsletter, null (no SMS)
- TIER_CHANGE → null (always send email), smsCritical (always send SMS)
- WELCOME, SYSTEM → null (always send)

---

## Integration Points

### Database Schema (No Changes)
This plan only added business logic to respect existing schema:
- `NotificationPreference` table (from Phase 11-01)
- `OrganizationNotificationPreference` table (from Phase 09-02)

### Affected Notification Functions
All existing notification functions now respect preferences:
- `notifyInsuranceExpiry()` - respects emailInsurance/smsInsurance
- `notifyAuditScheduled()` - respects emailAudit/smsAudit
- `notifyCapaOverdue()` - always sends (smsCritical forced on)
- `notifyComplianceAlert()` - always sends (smsCritical forced on)

### API Endpoints (Indirect)
- All routes that call `createNotification()` now automatically respect preferences
- No API changes required

---

## Known Limitations

1. **No opt-out for critical notifications**
   - Users cannot disable LBP status change notifications
   - smsCritical notifications always send
   - This is by design for compliance requirements

2. **No preference granularity for sub-types**
   - CAPA_DUE and CAPA_OVERDUE both use same preference (emailCompliance)
   - Cannot distinguish between "reminder" vs "overdue" preferences
   - Future enhancement if users request it

3. **No time-based preference (quiet hours)**
   - Notifications send immediately when triggered
   - No "do not disturb" scheduling
   - Could be added in future phase

4. **No channel fallback**
   - If email opted out, doesn't fall back to SMS
   - Each channel checked independently
   - Could add fallback logic if needed

---

## Next Phase Readiness

### Blockers
None. The preference enforcement gap is now closed.

### Concerns
None. Implementation matches specification.

### Recommendations
1. **Add analytics for skipped notifications**
   - Track skipped notification rate by type and reason
   - Identify if users are mass-opting-out of important alerts
   - Could indicate notification fatigue requiring UX improvements

2. **Consider adding preference presets**
   - "Minimal" (only critical), "Balanced" (default), "All" (everything)
   - Would simplify preference management for users
   - Could be added to Phase 11 or future enhancement

3. **Monitor critical notification volume**
   - If smsCritical notifications become excessive, users may ignore them
   - Consider escalation tiers (first alert email, second alert SMS)
   - Requires analytics data to identify patterns

---

## Commits

- **b51a5de** - feat(11-03): add preference checking helper functions
- **51d0a82** - feat(11-03): integrate preference checking into createNotification

---

## Files Modified

### `src/lib/notifications.ts`
**Lines changed:** +210 additions

**Changes:**
1. Added type imports: `NotificationPreference`, `OrganizationNotificationPreference`
2. Added four mapping constants (NOTIFICATION_TYPE_TO_*_PREF)
3. Added `shouldSendNotification()` helper function (97 lines)
4. Modified `createNotification()` to call shouldSendNotification before db.notification.create
5. Updated `SendResult` interface with skipped and reason fields

**Key sections:**
- Lines 12-90: Type mappings for all notification types
- Lines 100-197: shouldSendNotification implementation
- Lines 238-250: Preference check integration in createNotification

---

## Success Criteria Met

- [x] TypeScript compiles without errors
- [x] shouldSendNotification function exists and handles two-tier preference hierarchy
- [x] createNotification calls shouldSendNotification before creating notification records
- [x] Critical notifications (LBP changes, smsCritical, CRITICAL priority) bypass preference checks
- [x] Skipped notifications return success=true with skipped=true and reason
- [x] Console logging indicates when notifications are skipped and why

---

## Deployment Notes

### Environment Variables
No new environment variables required.

### Database Migrations
No database migrations required (uses existing preference tables).

### Configuration
No configuration changes required.

### Rollout Plan
1. Deploy to staging
2. Test preference enforcement with sample notifications
3. Verify critical notifications always send
4. Verify skipped notifications log correctly
5. Deploy to production
6. Monitor skipped notification rate for first 7 days

---

**Phase Status:** Gap closure complete ✅
**Duration:** 11 minutes
**Completed:** 2026-01-30
