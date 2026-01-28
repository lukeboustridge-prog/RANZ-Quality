# Phase 1: Compliance Engine Consolidation - Research

**Researched:** 2026-01-28
**Domain:** TypeScript code consolidation, API migration, compliance scoring architecture
**Confidence:** HIGH

## Summary

This research examines best practices for consolidating duplicate compliance scoring implementations in a Next.js 16 TypeScript application. The codebase currently has two compliance engines (`compliance.ts` legacy and `compliance-v2.ts` enhanced) with hardcoded thresholds scattered across components and API routes, creating inconsistencies in compliance calculations.

The standard approach for this type of consolidation is:
1. **Incremental migration** - Replace imports module-by-module with comprehensive testing
2. **Central constants** - Define threshold values in a single source of truth
3. **Type-safe contracts** - Use TypeScript interfaces to ensure API consistency
4. **Breaking change detection** - Leverage TypeScript compiler to identify all affected code

**Primary recommendation:** Migrate all consumers to `compliance-v2.ts` using TypeScript's type system to detect breaking changes, centralize thresholds in `src/types/index.ts`, and implement snapshot testing to ensure behavioral consistency.

## Standard Stack

The established tools and patterns for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe migration | Compiler catches breaking changes automatically |
| Next.js | 16 | App Router framework | Current project stack, stable API route patterns |
| Vitest | Latest | Testing framework | 10-20× faster than Jest for ESM projects, ideal for refactoring validation |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| ts-node | Latest | Run TypeScript directly | Validation scripts during migration |
| ts-morph | Latest | AST manipulation | Automated refactoring of import statements (optional) |
| TypeScript ESLint | 8.x | Static analysis | Detect unused imports, enforce consistent patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest more mature but slower; acceptable if already in use |
| Manual migration | ts-morph automation | Manual safer for small codebases (< 50 files) |
| Snapshot tests | Integration tests | Integration tests slower but more realistic |

**Installation:**
```bash
# Testing dependencies (if not already present)
pnpm add -D vitest @vitest/ui
pnpm add -D @testing-library/react @testing-library/jest-dom

# Optional: AST manipulation for automated refactoring
pnpm add -D ts-morph
```

## Architecture Patterns

### Recommended Migration Structure
```
src/
├── lib/
│   ├── compliance-v2.ts        # Single source of truth (keep)
│   ├── compliance.ts           # Legacy (REMOVE after migration)
│   └── __tests__/
│       └── compliance-migration.test.ts  # Behavioral equivalence tests
├── types/
│   └── index.ts                # Central constants (COMPLIANCE_THRESHOLDS)
└── app/
    └── api/                    # Update all route handlers
```

### Pattern 1: Central Constants Definition
**What:** Single source of truth for all threshold values
**When to use:** Always for values used in multiple locations
**Example:**
```typescript
// Source: Centralized configuration best practice
// src/types/index.ts

export const COMPLIANCE_THRESHOLDS = {
  COMPLIANT: 90,
  AT_RISK: 70,
  CRITICAL: 0,
} as const;

export const COMPLIANCE_STATUS_MAP = {
  compliant: { min: COMPLIANCE_THRESHOLDS.COMPLIANT, label: 'Compliant', color: 'green' },
  'at-risk': { min: COMPLIANCE_THRESHOLDS.AT_RISK, label: 'At Risk', color: 'yellow' },
  critical: { min: COMPLIANCE_THRESHOLDS.CRITICAL, label: 'Critical', color: 'red' },
} as const;

export type ComplianceStatusLevel = keyof typeof COMPLIANCE_STATUS_MAP;
```

### Pattern 2: Incremental Import Migration
**What:** Replace imports one module at a time with verification
**When to use:** Any time removing legacy code that's widely used
**Example:**
```typescript
// BEFORE (legacy)
import { calculateComplianceScore } from '@/lib/compliance';

// AFTER (v2)
import { calculateComplianceScore } from '@/lib/compliance-v2';

// Migration checklist per file:
// 1. Update import
// 2. Fix type errors (v2 requires organizationId, not data object)
// 3. Update consumers to use breakdown.documentation/insurance/personnel/audit
// 4. Test in isolation
// 5. Commit
```

### Pattern 3: Type-Safe Threshold Usage
**What:** Import constants instead of hardcoding values
**When to use:** Any component or API that checks compliance thresholds
**Example:**
```typescript
// Source: TypeScript constants best practice
// BEFORE (hardcoded)
const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";  // ❌ Magic number
  if (score >= 70) return "text-yellow-600"; // ❌ Magic number
  return "text-red-600";
};

// AFTER (centralized)
import { COMPLIANCE_THRESHOLDS } from '@/types';

const getScoreColor = (score: number) => {
  if (score >= COMPLIANCE_THRESHOLDS.COMPLIANT) return "text-green-600";
  if (score >= COMPLIANCE_THRESHOLDS.AT_RISK) return "text-yellow-600";
  return "text-red-600";
};
```

### Pattern 4: API Signature Compatibility Check
**What:** Use TypeScript types to detect breaking API changes
**When to use:** When replacing a widely-used function
**Example:**
```typescript
// Test compatibility before full migration
// src/lib/__tests__/compliance-compatibility.test.ts

import { calculateComplianceScore as legacyCalc } from '@/lib/compliance';
import { calculateComplianceScore as v2Calc } from '@/lib/compliance-v2';

// Compile-time check: Do both functions accept the same input?
type LegacyInput = Parameters<typeof legacyCalc>[0];
type V2Input = Parameters<typeof v2Calc>[0];

// This will cause TypeScript error if signatures incompatible
const testCompatibility = (input: LegacyInput) => {
  // @ts-expect-error - Expected: v2 requires different input shape
  v2Calc(input);
};
```

### Anti-Patterns to Avoid
- **Aliasing instead of removing**: Don't create `compliance.ts` that re-exports `compliance-v2.ts` - this leaves duplicate code paths
- **Big bang migration**: Don't attempt to update all imports in a single commit - increases merge conflict risk
- **Skipping tests**: Don't assume "same logic" means "same behavior" - validate with tests
- **Leaving dead code**: Don't keep `compliance.ts` "just in case" after migration completes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Find all import references | Manual grep/search | TypeScript compiler API or ts-morph | Handles renamed imports, type-only imports, dynamic imports |
| Detect unused exports | Manual code review | TypeScript ESLint `no-unused-vars` | Catches exports that are no longer imported |
| Test behavioral equivalence | Manual testing | Vitest snapshot tests | Automated regression detection |
| Validate API consistency | Runtime checks | TypeScript type checking | Compile-time safety, zero runtime cost |

**Key insight:** TypeScript's compiler is the most reliable tool for finding breaking changes during consolidation. Attempting manual search/replace or runtime validation misses edge cases and lacks compile-time guarantees.

## Common Pitfalls

### Pitfall 1: Assuming Same Logic = Same Behavior
**What goes wrong:** Legacy `compliance.ts` uses simple weighted average; `compliance-v2.ts` has 4-dimension breakdown with different weights. Direct replacement changes scores.
**Why it happens:** Code consolidation focuses on "removing duplication" without validating behavioral equivalence.
**How to avoid:** Write snapshot tests comparing legacy vs v2 output for representative test cases BEFORE migration.
**Warning signs:** Dashboard shows different scores after deployment; users report compliance status changed.

### Pitfall 2: Missing Hardcoded Thresholds in Components
**What goes wrong:** Developer updates API routes to use central constants, but dashboard components still have `score >= 90` hardcoded. UI doesn't match API.
**Why it happens:** Grep searches for "90" miss variations like `>= 90`, `score > 89`, or logic split across multiple lines.
**How to avoid:**
1. Search for numeric literals: `\b(90|70)\b` regex pattern
2. Check component files separately from API routes
3. Use TypeScript ESLint to enforce "no magic numbers" rule
**Warning signs:** API returns "at-risk" but dashboard shows green indicator.

### Pitfall 3: Breaking API Contracts Without Detection
**What goes wrong:** Legacy function accepts `ComplianceData` object; v2 accepts `organizationId` string. API routes updated but client-side fetches still send old format.
**Why it happens:** TypeScript type checking only validates server-side if using App Router server components. Client-side fetches are untyped JSON.
**How to avoid:**
1. Define explicit API response types in `src/types/api.ts`
2. Use TypeScript on both client and server sides
3. Consider tRPC or similar for end-to-end type safety (future enhancement)
**Warning signs:** 500 errors in API routes after deployment; "organizationId is undefined" errors.

### Pitfall 4: Incomplete Four-Dimension Migration
**What goes wrong:** Dashboard updated to call v2 API, but only displays `overallScore` instead of new `breakdown.insurance/personnel/documentation/audit` structure. Features regress.
**Why it happens:** Migration focuses on "making code work" without leveraging new capabilities.
**How to avoid:**
1. Document all fields in v2 response that don't exist in legacy
2. Create backlog tickets to enhance UI with new breakdowns
3. Mark old UI as "basic view" with TODO comments
**Warning signs:** Compliance indicators show only overall status, not which dimension is failing.

### Pitfall 5: Premature Deletion of Legacy Code
**What goes wrong:** Developer removes `compliance.ts` after updating "all" imports, but forgets about test files, Storybook stories, or commented-out code. Build breaks.
**Why it happens:** Developer searches in `src/app` and `src/lib` but misses `src/components/__tests__`.
**How to avoid:**
1. Use TypeScript compiler to verify: `tsc --noEmit` will fail if any import missing
2. Search entire codebase including tests: `rg "from.*compliance['\"]" --type ts`
3. Keep legacy file for 1-2 sprints marked as `@deprecated`
**Warning signs:** Tests fail in CI after merge; Storybook build fails.

## Code Examples

Verified patterns from official sources:

### Example 1: Constants File Structure
```typescript
// Source: TypeScript constants best practice
// src/types/compliance.ts (or add to existing src/types/index.ts)

/**
 * Compliance threshold values
 * These define the scoring boundaries for certification tiers
 *
 * @see CLAUDE.md - Part 2: Compliance scoring thresholds
 */
export const COMPLIANCE_THRESHOLDS = {
  /** Score >= 90% = Compliant (green) */
  COMPLIANT: 90,
  /** Score >= 70% = At Risk (yellow) */
  AT_RISK: 70,
  /** Score < 70% = Critical (red) */
  CRITICAL: 0,
} as const;

/**
 * Category weights for overall compliance calculation
 * Must sum to 1.0
 */
export const COMPLIANCE_CATEGORY_WEIGHTS = {
  documentation: 0.5,  // 50%
  insurance: 0.25,     // 25%
  personnel: 0.15,     // 15%
  audit: 0.1,          // 10%
} as const;

/**
 * Helper function to get compliance status from score
 * Replaces hardcoded logic in components
 */
export function getComplianceStatusLevel(score: number) {
  if (score >= COMPLIANCE_THRESHOLDS.COMPLIANT) return 'compliant' as const;
  if (score >= COMPLIANCE_THRESHOLDS.AT_RISK) return 'at-risk' as const;
  return 'critical' as const;
}

/**
 * Type-safe status metadata
 */
export const COMPLIANCE_STATUS_METADATA = {
  compliant: { label: 'Compliant', color: 'green', icon: '✓' },
  'at-risk': { label: 'At Risk', color: 'yellow', icon: '⚠' },
  critical: { label: 'Critical', color: 'red', icon: '✗' },
} as const;

export type ComplianceStatusLevel = keyof typeof COMPLIANCE_STATUS_METADATA;
```

### Example 2: Migration Test Suite
```typescript
// Source: Vitest snapshot testing pattern
// src/lib/__tests__/compliance-migration.test.ts

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { calculateComplianceScore as legacyCalc } from '@/lib/compliance';
import { calculateComplianceScore as v2Calc } from '@/lib/compliance-v2';

describe('Compliance Engine Migration', () => {
  it('produces equivalent scores for basic scenarios', async () => {
    // Test organization with minimal data
    const orgId = 'test_org_123';

    // Legacy calculation
    const legacyData = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        insurancePolicies: true,
        members: true,
        documents: true,
      },
    });
    const legacyResult = calculateComplianceScore(legacyData);

    // V2 calculation
    const v2Result = await v2Calc(orgId);

    // Should produce similar overall scores (within 5% tolerance)
    expect(Math.abs(legacyResult.score - v2Result.overallScore)).toBeLessThan(5);
  });

  it('v2 provides enhanced breakdown that legacy lacks', async () => {
    const v2Result = await v2Calc('test_org_123');

    // V2 specific features
    expect(v2Result.breakdown).toHaveProperty('documentation');
    expect(v2Result.breakdown).toHaveProperty('insurance');
    expect(v2Result.breakdown).toHaveProperty('personnel');
    expect(v2Result.breakdown).toHaveProperty('audit');

    // Each category should have detailed scores
    expect(v2Result.breakdown.insurance).toHaveProperty('policies');
    expect(Array.isArray(v2Result.breakdown.insurance.policies)).toBe(true);
  });
});
```

### Example 3: Component Migration
```typescript
// Source: React component refactoring pattern
// BEFORE: src/components/dashboard/compliance-score.tsx
import { COMPLIANCE_THRESHOLDS, getComplianceStatusLevel } from '@/types';

export function ComplianceScore({ score, tier }: ComplianceScoreProps) {
  // BEFORE: Hardcoded thresholds
  // const getScoreColor = (score: number) => {
  //   if (score >= 90) return "text-green-600";
  //   if (score >= 70) return "text-yellow-600";
  //   return "text-red-600";
  // };

  // AFTER: Uses central constants
  const getScoreColor = (score: number) => {
    const status = getComplianceStatusLevel(score);
    const colors = {
      compliant: "text-green-600",
      'at-risk': "text-yellow-600",
      critical: "text-red-600",
    };
    return colors[status];
  };

  // Rest of component remains the same...
}
```

### Example 4: API Route Migration
```typescript
// Source: Next.js App Router pattern
// src/app/api/documents/[id]/approve/route.ts

// BEFORE
// import { calculateComplianceScore } from '@/lib/compliance';
// await calculateComplianceScore(complianceData); // Returns { score, breakdown, issues }

// AFTER
import { updateOrganizationComplianceScore } from '@/lib/compliance-v2';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ... approval logic ...

  if (action === "approve") {
    await approveVersion(targetVersionId, userId);

    // V2 function fetches data internally and updates DB
    await updateOrganizationComplianceScore(document.organizationId);

    return NextResponse.json({ message: "Document approved" });
  }
}
```

### Example 5: Find All References Script
```typescript
// Source: TypeScript AST manipulation
// scripts/find-compliance-imports.ts

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function findComplianceImports(dir: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes("from '@/lib/compliance'") || content.includes('from "@/lib/compliance"')) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

const references = findComplianceImports('./src');
console.log('Files importing legacy compliance.ts:');
references.forEach(f => console.log(`  - ${f}`));
console.log(`\nTotal: ${references.length} files to migrate`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual find/replace | TypeScript compiler errors | TypeScript 2.0+ (2016) | Automated breaking change detection |
| Single compliance.ts | Multi-module with v2 | This project (2026) | Enhanced 4-dimension scoring |
| Hardcoded thresholds | Central constants | TypeScript const assertions (TS 3.4, 2019) | Type-safe configuration |
| Jest for testing | Vitest for ESM | Vitest 1.0 (2023) | 10-20× faster test execution |
| Runtime validation | TypeScript contract testing | TypeScript 5.0+ (2023) | Compile-time API safety |

**Deprecated/outdated:**
- **Magic numbers in code**: TypeScript const assertions and centralized config eliminate need
- **Runtime type checking for internal APIs**: TypeScript provides compile-time guarantees
- **Monolithic scoring functions**: Modern approach uses category-based scoring with weights

## Open Questions

Things that couldn't be fully resolved:

1. **Current Dashboard Behavior with v2 Breakdown**
   - What we know: Dashboard component `compliance-score.tsx` has hardcoded status indicators based on overall score thresholds
   - What's unclear: Does dashboard currently use the new v2 breakdown structure (insurance/personnel/documentation/audit) or just overall score?
   - Recommendation: Inspect dashboard API calls. If only using `overallScore`, create enhancement ticket to visualize breakdown dimensions.

2. **Behavioral Equivalence Tolerance**
   - What we know: Legacy uses 3-category weights (insurance 40%, personnel 30%, documentation 30%); v2 uses 4 categories (documentation 50%, insurance 25%, personnel 15%, audit 10%)
   - What's unclear: Is exact score equivalence required, or acceptable to have different absolute scores as long as status (compliant/at-risk/critical) matches?
   - Recommendation: Stakeholder decision needed. Suggest: Status consistency required, absolute score can differ.

3. **Test Data Availability**
   - What we know: Need representative test cases to validate migration
   - What's unclear: Does codebase have seed data or test fixtures for organizations with various compliance scenarios?
   - Recommendation: If no test data exists, create fixtures in `prisma/seed.ts` covering: perfect compliance (100%), compliant (90-99%), at-risk (70-89%), critical (<70%).

## Sources

### Primary (HIGH confidence)
- Next.js Official Documentation - [Migrating App Router](https://nextjs.org/docs/app/guides/migrating/app-router-migration) - App Router migration patterns
- TypeScript Official - [Refactoring TypeScript](https://code.visualstudio.com/docs/typescript/typescript-refactoring) - VSCode refactoring tools
- LogRocket Blog - [Organize code in TypeScript using modules](https://blog.logrocket.com/organize-code-in-typescript-using-modules/) - Module organization best practices
- DEV Community - [Tips to Use Constants File in TypeScript](https://dev.to/amirfakour/tips-to-use-constants-file-in-typescript-27je) - Constants pattern
- Nucamp - [Testing in 2026: Jest, React Testing Library, and Full Stack Testing Strategies](https://www.nucamp.co/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies) - Modern testing approaches

### Secondary (MEDIUM confidence)
- Graphite - [Best practices and techniques for refactoring legacy code](https://graphite.dev/guides/refactoring-legacy-code-best-practices-techniques) - Incremental refactoring strategy
- Talent500 - [REST API Testing Guide 2026: Tools, Steps, and AI Trends](https://talent500.com/blog/rest-api-testing-guide-2026/) - API consistency validation
- Dev Newsletter - [State of TypeScript 2026](https://devnewsletter.com/p/state-of-typescript-2026) - TypeScript 7.0 breaking changes (future)
- Qodo.ai - [Refactoring Legacy JavaScript: Techniques for Modernizing Old Code](https://www.qodo.ai/blog/refactoring-legacy-javascript-techniques-for-modernizing-old-patterns-and-apis/) - Legacy code modernization

### Tertiary (LOW confidence - requires verification)
- GitHub - [labs42io/clean-code-typescript](https://github.com/labs42io/clean-code-typescript) - Community best practices (not official)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js 16, TypeScript 5.x, Vitest are current industry standards
- Architecture patterns: HIGH - Incremental migration, central constants verified in official docs
- Pitfalls: MEDIUM - Based on common refactoring mistakes, not project-specific testing

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days - TypeScript/Next.js stable, unlikely to change)

**Notes:**
- TypeScript 7.0 (mid-2026) will introduce breaking changes, but migration timeline (Q1 2026) completes before that
- Next.js 16 is current stable version; no major App Router changes expected in Q1-Q2 2026
- Vitest recommended over Jest for new projects, but Jest acceptable if already in use
