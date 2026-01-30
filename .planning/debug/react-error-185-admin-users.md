---
status: verifying
trigger: "react-error-185-admin-users"
created: 2026-01-30T09:30:00Z
updated: 2026-01-30T09:55:00Z
---

## Current Focus

hypothesis: Missing defensive rendering for company.name in SelectItem components
test: Applied String() wrappers with null coalescing to company.name in SelectItem children
expecting: This will prevent any objects or null values from being rendered as React children
next_action: Verify fix works by testing page load

## Symptoms

expected: The /admin/users page should load and display a list of users with filters, pagination, and batch actions
actual: Page crashes with "Application error: a client-side exception has occurred" - React error #185 (minified)
errors: React error #185 - typically means hydration mismatch, objects rendered as React children, or invalid JSX structure
reproduction: Navigate to /admin/users on ranz-quality.vercel.app while logged in as admin
started: Issue persists despite multiple fix attempts including AUTH_MODE hydration fix, Select component empty string fixes, data-state attribute fixes

## Prior Context

Prior fixes attempted:
1. Admin layout: Changed AUTH_MODE to only use NEXT_PUBLIC_AUTH_MODE, added mounted state to defer auth UI rendering
2. user-filters.tsx: Changed status/userType options to use "all" instead of empty string for Select values
3. data-table.tsx: Changed data-state from `&& "selected"` to ternary `? "selected" : undefined`
4. user-table.tsx: Changed company column to use accessorFn, added String() wrappers, try/catch for dates
5. Badge components: Added null/undefined handling for invalid status/userType values

## Eliminated

- hypothesis: batch-actions.tsx SelectItem for AUTH_USER_TYPES causing the issue
  evidence: Object.values(AUTH_USER_TYPES) correctly returns string array, and .replace() is called on strings
  timestamp: 2026-01-30T09:35:00Z

- hypothesis: Badge components rendering invalid values
  evidence: Both UserTypeBadge and UserStatusBadge have defensive null checks with String() fallbacks
  timestamp: 2026-01-30T09:36:00Z

## Evidence

- timestamp: 2026-01-30T09:35:00Z
  checked: batch-actions.tsx lines 260-264
  found: Object.values(AUTH_USER_TYPES) returns string array, .replace() called on strings
  implication: This code is correct

- timestamp: 2026-01-30T09:38:00Z
  checked: API route /api/admin/companies
  found: Returns companies with structure { id, name, tradingName, organizationId, status, createdAt, updatedAt, userCount }
  implication: company.name is guaranteed to be a string per schema

- timestamp: 2026-01-30T09:40:00Z
  checked: page.tsx companies state vs API response
  found: |
    CompanyOption typed as { id: string; name: string }
    But API returns full company object with extra fields including Date objects
    TypeScript allows this but extra fields are present at runtime
  implication: The extra fields shouldn't cause issues unless being rendered directly

- timestamp: 2026-01-30T09:50:00Z
  checked: All SelectItem usage in user-filters.tsx and user-form.tsx
  found: |
    user-filters.tsx line 196-199:
    {companies.map((company) => (
      <SelectItem key={company.id} value={company.id}>
        {company.name}
      </SelectItem>
    ))}

    user-form.tsx line 301-305:
    {companies.map((company) => (
      <SelectItem key={company.id} value={company.id}>
        {company.name}
      </SelectItem>
    ))}

    If company.name is ever null/undefined/object, this would cause React error #185
  implication: Need defensive String() wrapper around company.name

- timestamp: 2026-01-30T09:55:00Z
  checked: Applied fixes
  found: |
    Changed both files to:
    {String(company.name ?? 'Unknown Company')}

    This ensures:
    1. Null/undefined values are replaced with 'Unknown Company'
    2. Any non-string value is coerced to string
    3. Objects cannot be rendered as React children
  implication: Fix applied, ready for verification

## Resolution

root_cause: Missing defensive rendering for company.name in SelectItem - if API returns malformed data or null values, objects could be rendered as React children causing React error #185
fix: Wrapped company.name in String() with null coalescing operator (??) to ensure always a valid string is rendered
verification: Pending - need to test /admin/users page load after deployment
files_changed:
  - src/components/admin/users/user-filters.tsx (line 198)
  - src/components/admin/users/user-form.tsx (line 303)
