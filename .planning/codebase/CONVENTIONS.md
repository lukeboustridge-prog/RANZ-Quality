# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Page components: `page.tsx` (Next.js App Router convention) at `src/app/(route)/[segment]/page.tsx`
- Route handlers: `route.ts` at `src/app/api/[route]/route.ts`
- Components: Kebab-case filenames: `compliance-score.tsx`, `action-items.tsx`, `policy-card.tsx`
- Library/utility files: Kebab-case: `audit-templates.ts`, `document-versioning.ts`, `lbp-api.ts`
- Type definitions: `index.ts` in `src/types/` directory
- Prisma schema: `schema.prisma` in `prisma/` directory

**Functions:**
- Async page components: `export default async function [PageName]()`
- Client components: `"use client"` directive at top, `export function ComponentName()`
- API handlers: `export async function GET()`, `export async function POST()` following HTTP verbs
- Utility functions: camelCase: `calculateComplianceScore()`, `generateCAPANumber()`, `formatCurrency()`, `daysUntil()`
- Helper functions within components: camelCase: `getScoreColor()`, `getTierBadgeColor()`, `getStatusBadge()`

**Variables:**
- Constants (non-exported): camelCase: `circumference`, `isExpired`, `hasClerkKey`, `now`
- Exported constants: UPPERCASE: `CERTIFICATION_TIER_LABELS`, `INSURANCE_POLICY_TYPE_LABELS`, `ISO_ELEMENT_WEIGHTS`
- Component props interfaces: PascalCase with `Props` suffix: `ComplianceScoreProps`, `PolicyCardProps`, `StatusItemProps`
- Enum-like objects use UPPERCASE_SNAKE_CASE keys: `ACCREDITED`, `CERTIFIED`, `MASTER_ROOFER`

**Types:**
- Type definitions: PascalCase: `CertificationTier`, `OrgMemberRole`, `InsurancePolicyType`, `ComplianceStatus`
- Interface definitions for component props: PascalCase with `Props` suffix
- Union types for status/enums: Exported as `type` using string literals: `type CertificationTier = "ACCREDITED" | "CERTIFIED" | "MASTER_ROOFER"`
- Database model interfaces imported from Prisma: Direct import without prefix

## Code Style

**Formatting:**
- Indentation: 2 spaces (configured in Next.js default)
- Line length: No hard limit enforced, but keep readable
- Semicolons: Required throughout codebase
- String quotes: Double quotes for strings, backticks for template literals
- Object formatting: Multiline for readability when needed

**Linting:**
- Tool: ESLint 9 with `eslint-config-next` (includes Next.js and TypeScript rules)
- Config file: `eslint.config.mjs` in project root
- Rules: Next.js Core Web Vitals + TypeScript type checking
- Ignored files: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. External packages (React, Next.js): `import { redirect } from "next/navigation"; import { auth } from "@clerk/nextjs/server";`
2. Internal absolute imports using `@/` alias: `import { db } from "@/lib/db"; import { ComplianceScore } from "@/components/dashboard/compliance-score";`
3. Type imports: `import type { Metadata } from "next"; import type { CertificationTier } from "@/types";`

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- All imports from `src/` directory use `@/` prefix
- Example: `@/lib/utils`, `@/components/dashboard/compliance-score`, `@/types`, `@/app/api/admin/members`

**Barrel files:**
- `src/types/index.ts` exports all type definitions and constant mappings
- No barrel files in components directory; components are imported with full paths

## Error Handling

**Patterns:**

**API Route Error Handling:**
```typescript
// Zod validation errors
try {
  const data = createCAPASchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid data", details: error.issues },
      { status: 400 }
    );
  }
}

// Generic server errors
catch (error) {
  console.error("Failed to fetch members:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

// Async errors
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Component Error Handling:**
- No try/catch in server components (errors propagate naturally)
- Async operations use await pattern for cleaner flow
- Redirects used for unauthorized access: `redirect("/sign-in")`

**Resend Email Error Handling:**
```typescript
const { data, error } = await resend.emails.send({...});
if (error) {
  console.error("Failed to send email:", error);
  throw new Error(`Failed to send email: ${error.message}`);
}
```

## Logging

**Framework:** `console` (Node.js built-in)

**Patterns:**
- Error logging: `console.error("Failed to fetch members:", error)`
- Development logging: Set via Prisma client: `log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]`
- No info/debug logging implemented; errors logged on failure

## Comments

**When to Comment:**
- Not heavily commented; code is self-documenting
- Complex algorithms get explanatory comments: `// Calculate the stroke dash for the circular progress`
- Prisma schema uses section headers: `// ============================================================================ // Core Models // ============================================================================`
- Workflow comments for multi-step processes: `// Apply status filter after query`, `// Build action items`

**JSDoc/TSDoc:**
- Minimal use in codebase
- Interface/type definitions use type annotations instead of JSDoc
- Function signatures are self-explanatory via TypeScript

## Function Design

**Size:**
- Utility functions: 5-30 lines typical (e.g., `formatCurrency`, `daysUntil`, `getComplianceStatus`)
- API handlers: 30-80 lines for GET/POST with error handling
- Page components: 30-100 lines (layout + data fetching + JSX)
- Component files: 100-180 lines typical

**Parameters:**
- Use destructuring for props: `function ComplianceScore({ score, tier }: ComplianceScoreProps)`
- Request objects: `(req: NextRequest)` for API routes
- Auth from middleware: `const { userId, orgId, sessionClaims } = await auth()`
- Multiple related params grouped in interface: `SendEmailParams` with `{ to, subject, html, text }`

**Return Values:**
- Functions return typed values: `NextResponse.json(data, { status: 200 })`
- Utility functions return primitives or typed objects: `string`, `number`, `{ status: "compliant" | "at-risk" | "critical"; label: string; color: string }`
- Component functions return JSX: `JSX.Element` (implicit via React)

## Module Design

**Exports:**
- Named exports for utilities: `export function formatCurrency()`, `export function calculateComplianceScore()`
- Default exports for page components: `export default async function DashboardPage()`
- Default exports for client components: `export function PolicyCard(props)`
- Type exports: `export type CertificationTier = ...`

**Organization:**
- Utility functions grouped by domain: `src/lib/compliance.ts` contains score calculation + status determination
- Component organization by feature: `src/components/dashboard/`, `src/components/insurance/`, `src/components/documents/`
- API routes organized by domain: `src/app/api/admin/`, `src/app/api/audits/`, `src/app/api/capa/`
- Page routes grouped by layout: `src/app/(dashboard)/dashboard/`, `src/app/(auth)/sign-in/`

## TypeScript Configuration

**Strict Mode:** Enabled (`"strict": true` in `tsconfig.json`)
- Requires type annotations on all function parameters and return types
- No implicit `any` allowed
- Null/undefined checks enforced
- strict module imports

**Target & Lib:**
- Target: ES2017 (supports async/await, modern JavaScript)
- Lib: dom, dom.iterable, esnext
- JSX: react-jsx (automatic runtime)

## Tailwind CSS Patterns

**Utility Classes:**
- Consistent use of Tailwind v4 utilities
- Responsive breakpoints: `grid-cols-1 lg:grid-cols-2` for mobile-first layout
- Color coding for status: green (compliant), yellow (at-risk), red (critical)
- Spacing: Standard 4px grid (`p-6`, `gap-4`, `mb-4`, `mt-24`)
- Border radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for smaller elements

**Custom Utilities:**
- `cn()` utility function from `clsx` + `tailwind-merge`: Used for conditional class merging
- Example: `cn("h-2 w-2 rounded-full", status === "good" && "bg-green-500")`

---

*Convention analysis: 2026-01-28*
