---
phase: 02-dashboard-real-time-updates
plan: 03
subsystem: dashboard-ui
tags: [loading-states, ux, react-transitions, spinner]
requires: ["02-01", "02-02"]
provides: ["loading-button-component", "insurance-form-loading", "document-approval-loading", "lbp-verification-loading"]
affects: ["future-form-components"]
tech-stack:
  added: []
  patterns: ["useTransition", "loading-button-pattern"]
key-files:
  created:
    - src/components/ui/loading-button.tsx
    - src/components/staff/verify-lbp-button.tsx
  modified:
    - src/app/(dashboard)/insurance/new/page.tsx
    - src/app/(dashboard)/insurance/[id]/page.tsx
    - src/components/insurance/policy-form.tsx
    - src/components/documents/approval-dialog.tsx
    - src/components/staff/member-card.tsx
decisions:
  - decision: "Use React's useTransition instead of manual loading states"
    rationale: "Built-in React primitive for handling async transitions with automatic pending state"
    alternatives: ["useState with setIsLoading", "react-query isPending", "SWR isValidating"]
    chosen: "useTransition"
  - decision: "Create reusable LoadingButton component"
    rationale: "DRY principle - avoid repeating spinner logic across all buttons"
    alternatives: ["Inline Loader2 in each button", "Custom hook for loading state"]
    chosen: "LoadingButton component"
  - decision: "Add VerifyLBPButton to MemberCard"
    rationale: "Enable immediate verification without waiting for nightly cron job"
    alternatives: ["Only show status", "Verification on edit page only"]
    chosen: "Button on card for quick access"
metrics:
  duration: "9 minutes"
  completed: "2026-01-28"
---

# Phase 02 Plan 03: Form Loading States Summary

**One-liner:** Added React useTransition loading states to insurance, document approval, and LBP verification forms with reusable LoadingButton component

## What Was Built

### Core Deliverables

1. **LoadingButton Component** (`src/components/ui/loading-button.tsx`)
   - Extends existing Button with `loading` and `loadingText` props
   - Shows Loader2 spinner when loading
   - Automatically disables during loading state
   - Uses forwardRef for form compatibility

2. **Insurance Form Loading States**
   - New policy form: Shows "Saving..." during submission
   - Edit policy form: Shows "Saving..." during update
   - Replaced manual useState with useTransition
   - LoadingButton used for submit actions

3. **Document Approval Loading States**
   - ApprovalDialog: Shows "Approving..." or "Rejecting..." during action
   - SubmitApprovalDialog: Shows "Submitting..." during submission
   - Both dialogs use useTransition pattern

4. **LBP Verification Loading States**
   - Created VerifyLBPButton component
   - Shows "Verifying..." during MBIE API call
   - Added to MemberCard for quick access
   - Calls `/api/staff/[id]/verify-lbp` endpoint

### Technical Implementation

**useTransition Pattern Applied:**
```typescript
const [isPending, startTransition] = useTransition();

const handleSubmit = async () => {
  startTransition(async () => {
    // async operation
    await fetch('/api/endpoint', { method: 'POST' });
    router.refresh();
  });
};
```

**LoadingButton Usage:**
```typescript
<LoadingButton
  type="submit"
  loading={isPending}
  loadingText="Saving..."
>
  Save Policy
</LoadingButton>
```

## Deviations from Plan

**None** - Plan executed exactly as written.

All specified forms received loading states:
- ✅ Insurance form (new and edit)
- ✅ Document approval actions
- ✅ LBP verification button

## Decisions Made

### 1. useTransition Over useState

**Decision:** Use React's built-in `useTransition` hook instead of manual `useState` loading management.

**Rationale:**
- Native React primitive for async state transitions
- Automatic pending state management
- Better integration with React 18+ concurrent features
- Cleaner code (no manual setLoading true/false)

**Impact:** All new form components should follow this pattern. Previous manual loading states can be refactored gradually.

### 2. Reusable LoadingButton Component

**Decision:** Create centralized LoadingButton component rather than inline spinner logic.

**Rationale:**
- DRY principle - avoid repeating Loader2 + conditional rendering
- Consistent UX across all loading buttons
- Easier to update spinner style globally
- Type-safe props with LoadingButtonProps interface

**Impact:** Future form buttons should use LoadingButton. Existing buttons can be migrated incrementally.

### 3. VerifyLBPButton in MemberCard

**Decision:** Add manual verification button to member card rather than only showing status.

**Rationale:**
- Users need immediate verification option (not wait for nightly cron)
- Quick access from staff list view
- Manual trigger useful for new member onboarding
- Complements automated daily verification

**Impact:** LBP verification can happen on-demand. Cron job still runs for automated re-verification.

## Testing Notes

### Manual Verification Steps

1. **Insurance Form Loading:**
   - Navigate to `/insurance/new`
   - Fill form and submit
   - Should see "Saving..." spinner
   - Button disabled during submission

2. **Document Approval Loading:**
   - Open document requiring approval
   - Click "Approve" or "Reject"
   - Should see "Approving..." or "Rejecting..." spinner
   - Dialog buttons disabled during action

3. **LBP Verification Loading:**
   - Navigate to `/staff`
   - Find member with unverified LBP
   - Click "Verify LBP" button
   - Should see "Verifying..." spinner
   - Button disabled during API call

### Edge Cases Handled

- **No LBP number:** VerifyLBPButton renders null (no button shown)
- **Already verified:** Button shows "Verified" and is disabled
- **Multiple rapid clicks:** useTransition prevents double submission
- **API failure:** Error logged to console, user sees no change (no optimistic update)

## Next Phase Readiness

### For Phase 03 (Cron Security)

**Ready:** Loading states don't affect cron security implementation.

**Dependencies:** None. Loading states are purely UI layer.

### For Phase 04 (Public API)

**Ready:** LoadingButton pattern can be used for public search form.

**Note:** VerifyLBPButton should NOT be exposed in public API (requires authentication).

### For Future Form Development

**Pattern Established:**
1. Import `useTransition` from React
2. Add `const [isPending, startTransition] = useTransition();`
3. Wrap async action in `startTransition`
4. Use `<LoadingButton loading={isPending} loadingText="...">` for submit

**Consistency:** All mutation forms should follow this pattern going forward.

## Performance Metrics

**Execution Time:** 9 minutes

**Commits:**
- fff1ba5: Create LoadingButton component (2 min)
- 19fd59a: Add useTransition to insurance forms (4 min)
- 067d628: Add useTransition to document approval and LBP verification (3 min)

**Files Modified:** 8 files (2 created, 6 modified)

**Lines Changed:** ~150 insertions, ~50 deletions (net +100 LOC)

## Success Criteria Met

✅ LoadingButton component created and exported
✅ Insurance form uses useTransition with isPending state
✅ Document approval uses useTransition with isPending state
✅ LBP verification uses useTransition with isPending state
✅ All mutation buttons show spinner and are disabled during pending

**Phase 02 Success Criteria #5:** "Member sees spinner/loading state during recalculation (not stale data)" - **COMPLETE**

## Technical Debt

**None introduced.** This plan reduced technical debt by:
- Standardizing loading state management across forms
- Replacing manual setState patterns with React primitives
- Creating reusable component for future use

## Related Plans

- **02-01:** Dimension indicators show scores updated by these forms
- **02-02:** revalidatePath('/dashboard') ensures loading states trigger fresh data
- **Future:** LoadingButton pattern should be applied to other forms (projects, audits, CAPA)

---

*Plan completed 2026-01-28 in 9 minutes*
