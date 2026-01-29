# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Status:** Not yet implemented

**Runner:**
- No testing framework currently installed
- Jest, Vitest, or similar can be added
- Config file: Not present (to be created when testing is implemented)

**Assertion Library:**
- Not installed
- Common choices: `@testing-library/react`, `vitest`, `jest`

**Run Commands (Future Implementation):**
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:cov     # Coverage report
```

## Test File Organization

**Recommended Location (when testing is added):**
- Co-located pattern preferred: `*.test.ts` and `*.test.tsx` next to source files
- Example structure:
  ```
  src/
  ├── lib/
  │   ├── compliance.ts
  │   ├── compliance.test.ts
  │   └── db.ts
  ├── components/
  │   ├── dashboard/
  │   │   ├── compliance-score.tsx
  │   │   └── compliance-score.test.tsx
  ```

**Naming:**
- Pattern: `[filename].test.ts` or `[filename].test.tsx`
- API route tests: `src/app/api/[route]/route.test.ts`
- Utility tests: `src/lib/[utility].test.ts`
- Component tests: `src/components/[feature]/[component].test.tsx`

## Test Structure (Recommended Patterns)

**Unit Test Suite Organization:**
```typescript
// Example pattern for src/lib/compliance.test.ts
describe("calculateComplianceScore", () => {
  describe("insurance compliance scoring", () => {
    it("should award 50 points for PUBLIC_LIABILITY policy", () => {
      // Arrange
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [mockPolicy("PUBLIC_LIABILITY")],
        members: [],
        documents: [],
      };

      // Act
      const result = calculateComplianceScore(data);

      // Assert
      expect(result.breakdown.insurance).toBe(50);
    });

    it("should deduct points if required insurance is missing", () => {
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [],
        members: [],
        documents: [],
      };

      const result = calculateComplianceScore(data);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          category: "insurance",
          severity: "critical",
        })
      );
    });

    it("should flag policies expiring within 30 days", () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);

      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [mockPolicy("PUBLIC_LIABILITY", expiryDate)],
        members: [],
        documents: [],
      };

      const result = calculateComplianceScore(data);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining("expires in 15 days"),
        })
      );
    });
  });

  describe("personnel compliance scoring", () => {
    it("should award 50 points if organization has owner", () => {
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [],
        members: [mockMember({ role: "OWNER" })],
        documents: [],
      };

      const result = calculateComplianceScore(data);

      expect(result.breakdown.personnel).toBe(50);
    });

    it("should award 50 points if staff has LBP credentials", () => {
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [],
        members: [mockMember({ lbpNumber: "BP123456" })],
        documents: [],
      };

      const result = calculateComplianceScore(data);

      expect(result.breakdown.personnel).toContain(50);
    });
  });

  describe("documentation compliance scoring", () => {
    it("should award 50 points for QUALITY_POLICY document", () => {
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [],
        members: [],
        documents: [mockDocument({ isoElement: "QUALITY_POLICY" })],
      };

      const result = calculateComplianceScore(data);

      expect(result.breakdown.documentation).toContain(50);
    });
  });

  describe("overall score calculation", () => {
    it("should calculate weighted score: 40% insurance + 30% personnel + 30% documentation", () => {
      const data: ComplianceData = {
        organization: mockOrganization(),
        insurancePolicies: [mockPolicy("PUBLIC_LIABILITY")],
        members: [mockMember({ role: "OWNER" })],
        documents: [mockDocument({ isoElement: "QUALITY_POLICY" })],
      };

      const result = calculateComplianceScore(data);

      // 50 * 0.4 (insurance) + 50 * 0.3 (personnel) + 50 * 0.3 (docs) = 50
      expect(result.score).toBe(50);
    });
  });
});
```

**Patterns:**
- Arrange-Act-Assert (AAA) pattern throughout
- Descriptive test names starting with "should"
- Organized into nested `describe` blocks by feature
- Mock factories for test data: `mockOrganization()`, `mockPolicy()`, `mockMember()`

## Mocking

**Framework:** (To be determined - vitest or Jest recommended)

**Patterns (Recommended):**

**Database mocking with Prisma:**
```typescript
// src/__mocks__/prisma.ts
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  db: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
```

**Mocking Next.js `auth()`:**
```typescript
// src/__mocks__/clerk.ts
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(() => ({
    userId: "test-user-123",
    orgId: "test-org-456",
    sessionClaims: {
      metadata: {
        role: "org:admin",
      },
    },
  })),
}));
```

**Mocking API responses:**
```typescript
// src/lib/lbp-api.test.ts
jest.mock("@/lib/lbp-api", () => ({
  verifyLBPLicense: jest.fn(async (lbpNumber: string) => ({
    valid: true,
    lbpNumber,
    name: "Test Person",
    licenseClass: ["ROOFING"],
    status: "CURRENT",
    expiryDate: "2027-12-31",
  })),
}));
```

**What to Mock:**
- Database queries: Mock Prisma client entirely
- External API calls: Mock LBP Board API, Clerk auth, Resend email
- Date/time: Use `jest.useFakeTimers()` for consistent expiry date tests
- Environment variables: Mock via `process.env` assignments

**What NOT to Mock:**
- Utility functions: Test actual implementation (`formatCurrency`, `daysUntil`, etc.)
- Pure calculation functions: Test logic directly (`calculateComplianceScore`)
- React components (for integration tests): Render actual component with mocked props
- Middleware helpers: Test actual Clerk auth flow behavior

## Fixtures and Factories

**Test Data Pattern (Recommended):**
```typescript
// src/__fixtures__/compliance.fixtures.ts
import type { Organization, InsurancePolicy, OrganizationMember, Document } from "@prisma/client";
import type { ComplianceData } from "@/lib/compliance";

export function mockOrganization(overrides?: Partial<Organization>): Organization {
  return {
    id: "org_test_123",
    clerkOrgId: "clerk_org_123",
    name: "Test Roofing Ltd",
    tradingName: "TR Ltd",
    nzbn: "9429041234567",
    certificationTier: "CERTIFIED",
    certifiedSince: new Date("2024-01-01"),
    tierPromotedAt: null,
    complianceScore: 85,
    lastAuditDate: new Date("2025-01-15"),
    nextAuditDue: new Date("2026-01-15"),
    email: "info@test-roofing.co.nz",
    phone: "09 123 4567",
    address: "123 Main St",
    city: "Auckland",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2025-01-28"),
    ...overrides,
  };
}

export function mockPolicy(
  type: InsurancePolicyType = "PUBLIC_LIABILITY",
  expiryDate?: Date
): InsurancePolicy {
  return {
    id: "policy_test_123",
    organizationId: "org_test_123",
    policyType: type,
    policyNumber: "PL-2025-123456",
    insurer: "Vero Insurance",
    brokerName: "ABC Insurance Brokers",
    coverageAmount: new Decimal("2000000"),
    excessAmount: new Decimal("5000"),
    effectiveDate: new Date("2025-01-01"),
    expiryDate: expiryDate || new Date("2026-12-31"),
    certificateKey: "s3://bucket/cert.pdf",
    verified: true,
    verifiedAt: new Date("2025-01-15"),
    verifiedBy: "admin@ranz.org.nz",
    alert90Sent: false,
    alert60Sent: false,
    alert30Sent: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-28"),
  };
}

export function mockMember(overrides?: Partial<OrganizationMember>): OrganizationMember {
  return {
    id: "member_test_123",
    organizationId: "org_test_123",
    clerkUserId: "clerk_user_123",
    firstName: "John",
    lastName: "Smith",
    email: "john@test-roofing.co.nz",
    phone: "021 234 5678",
    lbpNumber: "BP123456",
    lbpClass: "ROOFING",
    lbpVerified: true,
    lbpVerifiedAt: new Date("2025-01-15"),
    lbpVerificationId: "verify_123",
    lbpStatus: "CURRENT",
    lbpLastChecked: new Date("2025-01-15"),
    lbpExpiry: new Date("2027-06-30"),
    role: "ADMIN",
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2025-01-28"),
    ...overrides,
  };
}

export function mockDocument(overrides?: Partial<Document>): Document {
  return {
    id: "doc_test_123",
    organizationId: "org_test_123",
    documentNumber: "QP-2025-001",
    title: "Quality Policy",
    isoElement: "QUALITY_POLICY",
    documentType: "POLICY",
    currentVersion: 1,
    status: "APPROVED",
    storageKey: "s3://bucket/quality-policy.pdf",
    fileHash: "sha256_hash_here",
    reviewDueDate: new Date("2026-01-01"),
    approvedBy: "audit@ranz.org.nz",
    approvedAt: new Date("2025-01-15"),
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-15"),
    ...overrides,
  };
}

export function createComplianceTestData(overrides?: Partial<ComplianceData>): ComplianceData {
  return {
    organization: mockOrganization(),
    insurancePolicies: [mockPolicy()],
    members: [mockMember()],
    documents: [mockDocument()],
    ...overrides,
  };
}
```

**Location:**
- Fixtures: `src/__fixtures__/` directory
- One file per feature domain: `compliance.fixtures.ts`, `audit.fixtures.ts`, `document.fixtures.ts`

## Coverage

**Requirements:** Not yet enforced

**Target (Recommended):**
- Unit tests: 80% coverage target for utility functions
- Integration tests: 60% coverage for API routes
- E2E tests: Critical user flows only

**View Coverage (Future):**
```bash
npm run test:cov
# Generates coverage report in ./coverage directory
# View HTML report: open ./coverage/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Pure functions tested with input/output verification
- Examples: `calculateComplianceScore()`, `formatCurrency()`, `daysUntil()`, `getComplianceStatus()`
- Location: `src/lib/[utility].test.ts`
- Dependencies: Mocked (Prisma, external APIs)

**Integration Tests:**
- Scope: API routes with database + auth
- Approach: Mock Prisma + Clerk, test request/response flow
- Examples:
  - `POST /api/capa` - Create CAPA with Zod validation
  - `GET /api/admin/members` - Admin filtering + aggregation
  - `GET /api/audits/[id]/checklist` - Database queries with includes
- Location: `src/app/api/[route]/route.test.ts`
- Dependencies: Prisma mocked, Clerk mocked, real Zod validation

**Component Tests:**
- Scope: React components rendered with test props
- Approach: Render component, assert JSX output, test user interactions
- Examples:
  - `ComplianceScore` - Display score + badges based on props
  - `PolicyCard` - Format currency/date, show expiry status
  - `ActionItems` - Render list with correct priority classes
- Location: `src/components/[feature]/[component].test.tsx`
- Dependencies: Mocked utility functions, real Tailwind classes

**E2E Tests:**
- Status: Not yet implemented
- Recommended framework: Playwright or Cypress
- Scope: Full user workflows (sign-up, create organization, upload documents, etc.)
- When to add: After MVP stabilizes

## Common Patterns

**Async Testing:**
```typescript
// Test async function
describe("generateCAPANumber", () => {
  it("should generate sequential CAPA numbers for the same year", async () => {
    // First CAPA
    const firstNumber = await generateCAPANumber("org_test_123");
    expect(firstNumber).toBe("CAPA-2025-001");

    // Second CAPA
    const secondNumber = await generateCAPANumber("org_test_123");
    expect(secondNumber).toBe("CAPA-2025-002");
  });
});

// Test Zod validation (async parsing)
describe("createCAPASchema", () => {
  it("should parse valid CAPA data", async () => {
    const valid = {
      sourceType: "AUDIT",
      title: "Quality review finding",
      description: "Process not followed",
      severity: "MINOR",
      dueDate: "2025-02-28",
    };

    const result = await createCAPASchema.parseAsync(valid);
    expect(result.dueDate).toBeInstanceOf(Date);
  });
});
```

**Error Testing:**
```typescript
// Test Zod validation errors
describe("createCAPASchema", () => {
  it("should reject missing required fields", () => {
    const invalid = {
      sourceType: "AUDIT",
      title: "", // Empty - should fail
      description: "Test",
      severity: "MINOR",
      dueDate: "2025-02-28",
    };

    expect(() => createCAPASchema.parse(invalid)).toThrow();
  });

  it("should provide detailed error messages", () => {
    const invalid = { sourceType: "INVALID_TYPE" };

    try {
      createCAPASchema.parse(invalid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        expect(error.issues).toHaveLength(3); // Multiple missing fields
        expect(error.issues[0]).toHaveProperty("code", "invalid_enum_value");
      }
    }
  });
});

// Test authorization errors
describe("GET /api/admin/members", () => {
  it("should return 401 if user not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    const response = await GET(mockRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("should return 403 if user lacks admin role", async () => {
    authMock.mockResolvedValue({
      userId: "user_123",
      sessionClaims: { metadata: { role: "org:member" } },
    });

    const response = await GET(mockRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });
});
```

**Testing dates and expiry logic:**
```typescript
describe("daysUntil", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-28").getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return positive days for future dates", () => {
    const futureDate = new Date("2025-02-28");
    const days = daysUntil(futureDate);
    expect(days).toBe(31);
  });

  it("should return negative days for past dates", () => {
    const pastDate = new Date("2024-12-28");
    const days = daysUntil(pastDate);
    expect(days).toBe(-31);
  });

  it("should return 0 for today", () => {
    const today = new Date("2025-01-28");
    const days = daysUntil(today);
    expect(days).toBe(0);
  });
});
```

---

*Testing analysis: 2026-01-28*
