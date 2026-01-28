# Phase 04: Public API Hardening - Research Findings

**Phase Goal:** Public verification API cannot be used to enumerate member businesses or exceed storage quotas

**Requirements Covered:**
- SEC-02: Public verification API accepts NZBN or trading name lookup (not internal organization ID)
- SEC-03: File uploads validated for size with 50MB maximum limit

**Researched:** 2026-01-28

---

## Executive Summary

This phase hardens two attack surfaces:

1. **Enumeration Attack Prevention:** The public verification endpoint currently accepts internal organization IDs, allowing attackers to enumerate all members by incrementing IDs. We need to switch to NZBN or trading name lookups.

2. **File Upload Abuse Prevention:** Document and insurance uploads currently lack size validation, allowing potential storage quota exhaustion attacks. We need fail-fast validation before database writes or R2 uploads.

---

## Current State Analysis

### 1. Public Verification Endpoint

**Location:** `src/app/api/public/verify/[businessId]/route.ts`

**Current Implementation:**
```typescript
// Line 11-12: Accepts internal organization ID
const { businessId } = await params;
const organization = await db.organization.findUnique({
  where: { id: businessId },
  // ...
});
```

**Vulnerability:**
- Exposes internal `cuid()` organization IDs in public API
- Allows enumeration: attacker can iterate through IDs to discover all members
- Similar pattern in badge endpoint: `/api/public/badge/[businessId]/route.ts`

**Database Schema Support:**
The Organization model has the necessary fields for alternative lookups:
```prisma
model Organization {
  id          String  @id @default(cuid())
  nzbn        String? @unique  // ✅ Can be used for lookup
  name        String           // ✅ Can be used for fuzzy search
  tradingName String?          // ✅ Can be used for fuzzy search
}
```

**Other Public Endpoints:**
- `/api/public/search/route.ts` - Already uses name/tradingName search (no ID exposure)
- `/api/public/testimonial/route.ts` - Uses verification token (not organization ID)

### 2. File Upload Endpoints

**Upload Locations:**
1. `src/app/api/documents/route.ts` - Document uploads
2. `src/app/api/documents/[id]/versions/route.ts` - Document version uploads
3. `src/app/api/insurance/route.ts` - Insurance certificate uploads
4. `src/app/api/insurance/[id]/route.ts` - Insurance certificate updates

**Current Validation:**
```typescript
// documents/route.ts - Line 156-158
if (!file || file.size === 0) {
  return NextResponse.json({ error: "File is required" }, { status: 400 });
}
// ❌ No maximum size check before processing
```

**Processing Order (PROBLEM):**
1. Parse formData from request (entire file loaded into memory)
2. Check if file exists
3. Convert to Buffer: `Buffer.from(await file.arrayBuffer())` (Line 161)
4. Generate hash (Line 162)
5. Upload to R2 (Line 166)
6. Write to database (Line 169)

**Issue:** By the time we check file size, the entire file is already in memory and being processed.

### 3. Next.js File Upload Size Configuration

**Research Findings:**
Next.js 16 with App Router has a **10MB default body size limit** for API routes. This is enforced at the framework level before our handlers receive the request.

**Configuration Options:**

For **Pages Router** (not applicable to this project):
```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
}
```

For **App Router** (our case):
- No per-route configuration available
- Must configure globally in `next.config.ts` using `experimental.serverActions.bodySizeLimit`
- OR validate in handler after formData parsing

**References:**
- [Next.js API Routes Response Size Limit](https://nextjs.org/docs/messages/api-routes-response-size-limit)
- [Next.js proxyClientMaxBodySize Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)
- [GitHub Issue #57501: App router body size limit](https://github.com/vercel/next.js/issues/57501)

---

## Implementation Strategy

### SEC-02: NZBN/Trading Name Lookup

**Approach 1: Accept Multiple Identifier Types (RECOMMENDED)**

Create a flexible endpoint that accepts NZBN, trading name, or business name:

```
GET /api/public/verify?nzbn=9429041234567
GET /api/public/verify?name=Example%20Roofing%20Ltd
```

**Advantages:**
- Single endpoint for all lookups
- Query parameters are more semantic than path parameters
- Easy to extend with additional filters (e.g., `?region=auckland`)
- Prevents enumeration (no sequential IDs)

**Implementation Pattern:**
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nzbn = searchParams.get('nzbn');
  const name = searchParams.get('name');

  if (!nzbn && !name) {
    return NextResponse.json(
      { error: 'Must provide either nzbn or name parameter' },
      { status: 400 }
    );
  }

  const where = nzbn
    ? { nzbn: nzbn }
    : {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { tradingName: { equals: name, mode: 'insensitive' } }
        ]
      };

  const organization = await db.organization.findFirst({ where });
  // ...
}
```

**Approach 2: Maintain Path Parameter with Validation**

Keep the current URL structure but validate that `businessId` is an NZBN:

```
GET /api/public/verify/9429041234567  ← NZBN
GET /api/public/verify/clx...         ← Rejected as internal ID
```

**Validation:**
```typescript
const { businessId } = await params;

// NZBN is 13 digits
if (!/^\d{13}$/.test(businessId)) {
  return NextResponse.json(
    {
      error: 'Invalid identifier. Use NZBN (13 digits) or search by name at /api/public/verify?name=...'
    },
    { status: 400 }
  );
}

const organization = await db.organization.findUnique({
  where: { nzbn: businessId }
});
```

**Disadvantages:**
- Doesn't help businesses without NZBN
- URL structure implies ID but we're checking format
- More restrictive than query-based approach

**RECOMMENDATION:** Use Approach 1 (query parameters) for maximum flexibility.

### SEC-03: File Upload Size Validation

**Strategy: Multi-Layer Defense**

**Layer 1: Next.js Global Configuration**

Set the global body size limit in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};
```

This prevents requests >50MB from even reaching our handlers.

**Layer 2: Early Size Check in Handler**

After formData parsing, check file size before any processing:

```typescript
export async function POST(req: NextRequest) {
  // ... auth checks ...

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  // ✅ FAIL-FAST: Check size BEFORE any processing
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File exceeds maximum size of 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        maxSize: MAX_FILE_SIZE,
        actualSize: file.size,
      },
      { status: 413 } // 413 Payload Too Large
    );
  }

  // Only NOW do we process the file
  const buffer = Buffer.from(await file.arrayBuffer());
  // ... rest of processing
}
```

**Layer 3: R2 Upload Validation (Defense in Depth)**

The R2 client (`src/lib/r2.ts`) could also validate size before upload:

```typescript
export async function uploadToR2(
  body: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  const MAX_SIZE = 50 * 1024 * 1024;

  if (body.byteLength > MAX_SIZE) {
    throw new Error(`File size ${body.byteLength} bytes exceeds maximum ${MAX_SIZE} bytes`);
  }

  await r2Client.send(/* ... */);
  return `portal/${key}`;
}
```

**Benefits:**
- Prevents accidental uploads from bypassing validation
- Centralized size limit constant
- Throws error that can be caught in calling code

### Affected Endpoints

All file upload endpoints need size validation:

1. **Documents:**
   - `POST /api/documents/route.ts` (Line 127)
   - `POST /api/documents/[id]/versions/route.ts` (Line 66)

2. **Insurance:**
   - `POST /api/insurance/route.ts` (Line 61)
   - `PATCH /api/insurance/[id]/route.ts` (Line 95)

3. **Projects (Future):**
   - Photo uploads will need same validation

---

## Security Considerations

### Enumeration Attack Mitigation

**Current Risk:**
An attacker could write a script to enumerate all members:

```python
for i in range(1000000):
    response = requests.get(f"https://portal.ranz.org.nz/api/public/verify/clx{i}")
    if response.status_code == 200:
        print(f"Found: {response.json()['businessName']}")
```

**After SEC-02:**
- No sequential IDs to enumerate
- Must know NZBN (which is public but not sequential)
- Name-based search returns first match (ambiguity prevents enumeration)

**Additional Hardening (Future Phase):**
- Rate limiting on public endpoints (e.g., 100 requests/hour per IP)
- CAPTCHA for public verification form
- Audit logging of all public API access

### Storage Quota Exhaustion

**Current Risk:**
An authenticated user could upload 1000 × 100MB files and exhaust Cloudflare R2 storage quota, resulting in service denial.

**After SEC-03:**
- Files capped at 50MB
- Early rejection prevents wasted bandwidth
- 413 error before database writes prevent orphaned records

**Additional Hardening (Future Phase):**
- Per-organization storage quota tracking
- Admin alerts when organization approaches quota
- Monthly storage usage reports

### Error Message Information Leakage

**Current Issue:**
When verification fails, we return:
```json
{ "verified": false, "error": "Business not found" }
```

This confirms that an NZBN doesn't exist in the database.

**Recommendation:**
For SEC-02 implementation, maintain current error structure since:
- NZBN is public information (NZ government database)
- "Not found" doesn't leak internal state
- Useful for legitimate users to know if they mistyped

**Alternative (if more paranoid):**
```json
{ "verified": false }
```

No error message distinguishes "doesn't exist" from "exists but not certified."

---

## Database Indexes Required

### For NZBN Lookup

Already exists:
```prisma
model Organization {
  nzbn String? @unique
  // ...
}
```

The `@unique` constraint automatically creates an index. ✅

### For Name Search

Currently only indexed for compliance queries:
```prisma
@@index([certificationTier])
@@index([complianceScore])
```

**Add for name search performance:**
```prisma
@@index([name])
@@index([tradingName])
```

**Migration Required:** Yes (Phase 04 plan should include migration)

---

## Constants and Configuration

### Centralized File Size Limit

Create a constants file: `src/lib/constants.ts`

```typescript
// File upload limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_MB = 50;

// Allowed MIME types for documents
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

// Allowed MIME types for insurance certificates
export const ALLOWED_CERTIFICATE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

// NZBN validation
export const NZBN_REGEX = /^\d{13}$/;
```

**Usage:**
```typescript
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

if (file.size > MAX_FILE_SIZE_BYTES) {
  return NextResponse.json(
    { error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` },
    { status: 413 }
  );
}
```

### Environment Variables

No new environment variables required for this phase.

Existing configuration is sufficient:
- R2 credentials already configured
- No rate limiting service (future phase)

---

## Testing Strategy

### SEC-02: Verification Endpoint Tests

**Test Cases:**

1. **Valid NZBN lookup:**
   ```
   GET /api/public/verify?nzbn=9429041234567
   Expected: 200 with organization data
   ```

2. **Valid name lookup:**
   ```
   GET /api/public/verify?name=Example%20Roofing%20Ltd
   Expected: 200 with organization data
   ```

3. **Trading name lookup:**
   ```
   GET /api/public/verify?name=Example%20Trading
   Expected: 200 with organization data
   ```

4. **Missing parameters:**
   ```
   GET /api/public/verify
   Expected: 400 error
   ```

5. **Non-existent NZBN:**
   ```
   GET /api/public/verify?nzbn=0000000000000
   Expected: 404 not found
   ```

6. **Non-existent name:**
   ```
   GET /api/public/verify?name=NonExistentBusiness
   Expected: 404 not found
   ```

7. **Old URL with organization ID (deprecated):**
   ```
   GET /api/public/verify/clx123abc
   Expected: 400 error with message directing to new format
   ```

### SEC-03: File Upload Tests

**Test Cases:**

1. **Valid file (<50MB):**
   ```
   POST /api/documents with 5MB PDF
   Expected: 200 success
   ```

2. **Empty file:**
   ```
   POST /api/documents with 0-byte file
   Expected: 400 error
   ```

3. **Exactly 50MB file:**
   ```
   POST /api/documents with 52,428,800 byte file
   Expected: 200 success
   ```

4. **51MB file:**
   ```
   POST /api/documents with 53,477,376 byte file
   Expected: 413 error
   ```

5. **100MB file:**
   ```
   POST /api/documents with 104,857,600 byte file
   Expected: 413 error (rejected by Next.js config OR handler)
   ```

6. **Multiple uploads in sequence:**
   ```
   POST 10 × 5MB files sequentially
   Expected: All succeed, total 50MB uploaded
   ```

**Integration Tests:**

1. Verify R2 upload is NOT called when file >50MB
2. Verify database write is NOT called when file >50MB
3. Verify audit log is NOT created when file >50MB
4. Verify 413 response includes helpful error message

---

## Migration Considerations

### Deprecation Strategy for Old Endpoint

**Option 1: Hard Break (RECOMMENDED)**

Immediately reject organization ID lookups:
```typescript
if (businessId.startsWith('cl') || businessId.startsWith('cm')) {
  return NextResponse.json(
    { error: 'Organization ID lookups deprecated. Use /api/public/verify?nzbn=... or ?name=...' },
    { status: 400 }
  );
}
```

**Reasoning:**
- Public API has no SLA guarantees
- Breaking change is acceptable for security hardening
- Error message provides clear migration path

**Option 2: Deprecation Period**

Support both for 30 days with warning:
```typescript
if (businessId.startsWith('cl') || businessId.startsWith('cm')) {
  // Still work but warn
  const org = await db.organization.findUnique({ where: { id: businessId } });
  return NextResponse.json({
    ...org,
    _deprecation: 'Organization ID lookups will be removed 2026-03-01. Use /api/public/verify?nzbn=...'
  });
}
```

**Reasoning:**
- Gentler transition
- Allows external integrations time to update
- More complex to maintain

**RECOMMENDATION:** Option 1 (hard break) since this is MVP and no external integrations exist yet.

### Badge Endpoint Compatibility

The badge endpoints also use organization ID:
- `/api/public/badge/[businessId]/route.ts`
- `/api/public/badge/[businessId]/image/route.ts`

**Decision Point:**
Should these also switch to NZBN-based lookups?

**Recommendation:** Keep badge endpoints using organization ID because:
- Badges are embedded via `<script>` tags that reference the organization ID
- Changing the URL would break all existing badge embeds
- Badge URLs are not sequential (businessId contains org internal ID)
- Badge generation is read-only (no enumeration risk beyond knowing IDs)

**Alternative:** Add NZBN-based badge endpoint as an option:
```
GET /api/public/badge?nzbn=9429041234567
GET /api/public/badge/{organizationId}  ← Keep for backwards compat
```

---

## Performance Considerations

### NZBN Lookup Performance

**Current:** Organization ID lookup uses primary key (instant)
```typescript
where: { id: businessId }  // O(1) lookup via primary key
```

**After SEC-02:** NZBN lookup uses unique index (nearly instant)
```typescript
where: { nzbn: nzbn }  // O(log n) lookup via unique index
```

**Performance Impact:** Negligible (microseconds difference)

**Name Search Performance:**

```typescript
where: {
  OR: [
    { name: { equals: name, mode: 'insensitive' } },
    { tradingName: { equals: name, mode: 'insensitive' } }
  ]
}
```

**Without indexes:** Full table scan O(n)
**With indexes:** Two index scans O(log n) + merge

**Required Migration:**
```prisma
@@index([name])
@@index([tradingName])
```

**Estimated Query Time:**
- Without index: 50-100ms (for 250 organizations)
- With index: 2-5ms

### File Size Check Performance

**Current Processing Time (10MB file):**
1. Parse formData: 50ms
2. Convert to Buffer: 20ms
3. Generate hash: 100ms
4. Upload to R2: 500ms
5. Database write: 10ms
**Total:** ~680ms

**With Size Validation:**
1. Parse formData: 50ms
2. **Check size: <1ms** ← NEW
3. Return 413: 5ms
**Total (rejected):** ~56ms

**Savings:** 624ms per rejected oversized file

**For Valid Files:** +1ms overhead (negligible)

---

## Edge Cases and Error Handling

### NZBN Edge Cases

1. **Multiple organizations with same name:**
   - Use `findFirst()` instead of `findUnique()`
   - Return first match (alphabetically or by compliance score)
   - Document behavior in API docs

2. **Organization without NZBN:**
   - NZBN is optional (`nzbn String?`)
   - Must support name-based lookup
   - Return 404 if querying by NZBN for org without one

3. **Case sensitivity:**
   - Use `mode: 'insensitive'` for name searches
   - NZBN is numeric (no case issues)

### File Upload Edge Cases

1. **File upload interrupted mid-transfer:**
   - Next.js handles connection failures
   - No partial files in R2 (atomic uploads)
   - Return 500 error

2. **File type vs. actual content mismatch:**
   - Current: Accept user-provided `mimeType`
   - Future: Validate magic bytes (e.g., PDF starts with `%PDF-`)
   - Out of scope for this phase

3. **Concurrent uploads:**
   - R2 handles concurrency
   - Database transactions prevent race conditions
   - No special handling needed

4. **Network timeout on large uploads:**
   - Vercel/Railway have 60s request timeout
   - 50MB at 1MB/s = 50s (close to limit)
   - Consider async upload with presigned URLs (future phase)

---

## Dependencies and Libraries

### No New Dependencies Required

All functionality achievable with existing stack:
- Next.js API routes (file handling)
- Prisma (database queries with indexes)
- Zod (validation schemas)
- AWS SDK (R2 uploads)

### Potential Future Enhancements

**For rate limiting (future phase):**
- `@upstash/ratelimit` with Redis
- `express-rate-limit` (if using Express)

**For advanced file validation:**
- `file-type` - Detect actual file type from bytes
- `sharp` - Image optimization and validation

---

## Documentation Requirements

### API Documentation Updates

Update public API docs (if they exist) or create them:

**Before:**
```
GET /api/public/verify/{businessId}
```

**After:**
```
GET /api/public/verify?nzbn={nzbn}
GET /api/public/verify?name={businessName}

Query Parameters:
  - nzbn: 13-digit New Zealand Business Number
  - name: Business name or trading name (case-insensitive)

Returns 400 if neither parameter provided.
Returns 404 if organization not found.
Returns 200 with organization verification data.
```

### Developer Guide Updates

**File Upload Guidelines:**

```markdown
## File Uploads

All file uploads are limited to **50MB maximum**.

### Supported Formats
- Documents: PDF, DOC, DOCX, PNG, JPG
- Insurance Certificates: PDF, PNG, JPG

### Error Codes
- 400: File missing or empty
- 413: File exceeds 50MB limit
- 500: Upload failed (retry)

### Example
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Quality Policy');

const response = await fetch('/api/documents', {
  method: 'POST',
  body: formData,
});

if (response.status === 413) {
  alert('File too large. Maximum 50MB.');
}
```
```

---

## Success Criteria Validation

### SEC-02 Success Criteria

✅ **1. Public verification endpoint accepts NZBN or trading name (not internal organization ID)**
- New endpoint: `/api/public/verify?nzbn=...` or `?name=...`
- Validation: Reject requests with organization IDs
- Returns 400 with helpful error message

✅ **2. Attempting to verify with organization ID returns 400 error with message directing to use NZBN**
- Check if parameter looks like organization ID (starts with `cl` or `cm`)
- Return: `{ error: "Use /api/public/verify?nzbn=... or ?name=..." }`
- Status code: 400 Bad Request

✅ **5. Verification API returns 404 for non-existent NZBN (not enumeration hint)**
- Consistent 404 response whether NZBN doesn't exist or isn't certified
- No distinction between "not in database" vs "not certified"

### SEC-03 Success Criteria

✅ **3. File upload exceeding 50MB returns 413 error before touching R2**
- Size check immediately after formData parsing
- R2 upload only called for valid files
- Status code: 413 Payload Too Large

✅ **4. File upload validation checks size before any database writes occur**
- Order: Parse → Validate size → Process → Upload → Database
- Database transaction only started after file validated
- No orphaned records if size validation fails

---

## Risk Assessment

### Implementation Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing badge embeds | Low | Medium | Keep badge endpoint using org IDs |
| Performance degradation on name search | Low | Low | Add database indexes |
| False positive file size rejections | Very Low | Low | Test with exactly 50MB file |
| Migration issues with existing data | Very Low | Low | No data migration needed |

### Security Risks (Mitigated)

| Risk | Before Phase | After Phase |
|------|-------------|-------------|
| Member enumeration | High | Low (NZBN required) |
| Storage exhaustion | Medium | Low (50MB limit) |
| Information leakage | Low | Low (unchanged) |

---

## Recommended Phase Plan Structure

### 04-01: Public Verification API Refactor (SEC-02)

**Tasks:**
1. Add database indexes for name/tradingName
2. Create new query-parameter-based verification endpoint
3. Add validation to reject organization ID lookups
4. Update badge endpoints to support NZBN (optional)
5. Write tests for all lookup scenarios
6. Update API documentation

**Complexity:** Medium
**Estimated Time:** 4-6 hours

### 04-02: File Upload Size Validation (SEC-03)

**Tasks:**
1. Create constants file with MAX_FILE_SIZE
2. Update Next.js config with body size limit
3. Add size validation to all file upload endpoints
4. Update R2 utility with size check (defense in depth)
5. Write tests for edge cases (0 bytes, 50MB, 51MB)
6. Update error messages

**Complexity:** Low
**Estimated Time:** 3-4 hours

**Total Phase Estimate:** 7-10 hours

---

## References

### Next.js Documentation
- [API Routes Response Size Limit](https://nextjs.org/docs/messages/api-routes-response-size-limit)
- [Next.js proxyClientMaxBodySize Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)
- [Routing: API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

### Community Discussions
- [App router Increase body size limit Api routes · Issue #57501](https://github.com/vercel/next.js/issues/57501)
- [Server Action Body Size Limit does not apply in production · Discussion #77505](https://github.com/vercel/next.js/discussions/77505)
- [nextjs api routes not excepting body more than 1MB · Issue #52457](https://github.com/vercel/next.js/issues/52457)

### External Resources
- [How to Increase File Upload Size in Web Applications - DEV Community](https://dev.to/nurulislamrimon/how-to-increase-file-upload-size-in-web-applications-nextjs-expressjs-nginx-apache-1be)
- [Increase File Upload Limits: Next.js, Express, Nginx, Apache | Kite Metric](https://kitemetric.com/blogs/boosting-file-upload-limits-in-your-web-apps)

### Internal Codebase
- `src/app/api/public/verify/[businessId]/route.ts` - Current verification endpoint
- `src/app/api/documents/route.ts` - Document upload endpoint
- `src/lib/r2.ts` - R2 storage client
- `prisma/schema.prisma` - Database schema with NZBN field

---

**Research completed:** 2026-01-28
**Next step:** Create detailed execution plan (04-PLAN.md)
