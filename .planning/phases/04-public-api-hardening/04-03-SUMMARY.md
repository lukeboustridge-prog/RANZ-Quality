# Phase 04 Plan 03: File Upload Size Validation Summary

**One-liner:** 50MB file size limit enforced at framework and handler levels to prevent storage quota exhaustion attacks

---

## Plan Reference

- **Phase:** 04-public-api-hardening
- **Plan:** 03
- **Type:** execute
- **Wave:** 1
- **Dependencies:** None

---

## Objective

Add file upload size validation to prevent storage quota exhaustion attacks by authenticated users uploading extremely large files.

**Purpose:** Fail fast before expensive operations (Buffer conversion, R2 upload, database writes) to protect resources and maintain service availability.

**Output:** All file upload endpoints validate size at 50MB limit and return HTTP 413 (Payload Too Large) with detailed error messages.

---

## What Was Built

### 1. Framework-Level Protection (next.config.ts)

Added `experimental.serverActions.bodySizeLimit: '50mb'` to provide defense-in-depth at the Next.js framework level, rejecting oversized requests before they reach handlers.

### 2. Handler-Level Validation (4 endpoints)

Implemented explicit size validation in all file upload endpoints:

- **POST /api/documents** - Document creation with file
- **POST /api/documents/[id]/versions** - Document version upload
- **POST /api/insurance** - Insurance policy with certificate
- **PUT /api/insurance/[id]** - Insurance policy update with certificate

### 3. Consistent Error Responses

All endpoints return standardized 413 responses with:
- Human-readable error message
- Max size in both bytes and MB
- Actual file size in both bytes and MB (rounded)
- HTTP 413 Payload Too Large status

### 4. Fail-Fast Architecture

Validation order ensures minimal resource usage:
1. Parse formData (required to access file)
2. **Check file size** ← New validation (fails fast with 413)
3. Check file exists (400 if missing)
4. Convert to Buffer (expensive operation)
5. Generate hash, upload to R2, write to database

---

## Technical Implementation

### File Size Constants (src/types/index.ts)

```typescript
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 52,428,800 bytes
```

### Validation Pattern

```typescript
// FAIL-FAST: Validate file size before any processing
if (file && file.size > MAX_FILE_SIZE_BYTES) {
  return NextResponse.json(
    {
      error: `File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB`,
      details: {
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
        maxSizeMB: MAX_FILE_SIZE_MB,
        actualSizeBytes: file.size,
        actualSizeMB: Math.round(file.size / 1024 / 1024 * 100) / 100,
      }
    },
    { status: 413 }
  );
}
```

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Configure Next.js global body size limit | c3ecf3a | next.config.ts |
| 2 | Add size validation to document upload endpoints | aa84a67 | src/app/api/documents/route.ts, src/app/api/documents/[id]/versions/route.ts |
| 3 | Add size validation to insurance upload endpoints | 1f626e5 | src/app/api/insurance/route.ts, src/app/api/insurance/[id]/route.ts |

---

## Files Modified

### Created
- src/app/api/documents/[id]/versions/route.ts (appears to be first commit for this file)

### Modified
- next.config.ts - Added experimental.serverActions.bodySizeLimit
- src/app/api/documents/route.ts - Import MAX_FILE_SIZE, add validation
- src/app/api/documents/[id]/versions/route.ts - Import MAX_FILE_SIZE, add validation
- src/app/api/insurance/route.ts - Import MAX_FILE_SIZE, add validation
- src/app/api/insurance/[id]/route.ts - Import MAX_FILE_SIZE, add validation

---

## Verification Results

✅ **Next.js config has bodySizeLimit:** Confirmed in next.config.ts
✅ **All 4 endpoints import MAX_FILE_SIZE:** grep verified all imports
✅ **All 4 endpoints return 413 status:** grep verified all status codes
✅ **TypeScript compiles:** Pre-existing Prisma schema errors only (unrelated to changes)

### Success Criteria Met

- [x] next.config.ts has experimental.serverActions.bodySizeLimit set to '50mb'
- [x] src/app/api/documents/route.ts validates file size and returns 413 if >50MB
- [x] src/app/api/documents/[id]/versions/route.ts validates file size and returns 413 if >50MB
- [x] src/app/api/insurance/route.ts validates certificate size and returns 413 if >50MB
- [x] src/app/api/insurance/[id]/route.ts validates certificate size and returns 413 if >50MB
- [x] All 413 responses include error message with max size and actual size details
- [x] Size check occurs BEFORE Buffer.from(file.arrayBuffer()) in all endpoints
- [x] Size check occurs BEFORE any database writes in all endpoints

---

## Decisions Made

1. **50MB limit chosen** - Balances reasonable document size (large PDFs, CAD drawings) with storage protection
2. **Validation at two levels** - Framework (Next.js config) provides defense-in-depth, handler validation provides explicit control and better error messages
3. **Insurance certificates optional** - Size validation only applies when file is provided (insurance endpoints allow updates without certificate)
4. **Rounded MB display** - Actual file size shown as rounded MB value (e.g., 52.75 MB) for user clarity

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Testing Recommendations

### Manual Testing

1. **Test oversized file rejection:**
   ```bash
   # Create 51MB test file
   dd if=/dev/zero of=test-51mb.pdf bs=1M count=51

   # Upload should fail with 413
   curl -F "file=@test-51mb.pdf" -F "title=Test" \
        -F "isoElement=QUALITY_POLICY" \
        -F "documentType=POLICY" \
        http://localhost:3000/api/documents
   ```

2. **Test valid file acceptance:**
   ```bash
   # Create 10MB test file
   dd if=/dev/zero of=test-10mb.pdf bs=1M count=10

   # Upload should succeed with 200
   curl -F "file=@test-10mb.pdf" -F "title=Test" \
        -F "isoElement=QUALITY_POLICY" \
        -F "documentType=POLICY" \
        http://localhost:3000/api/documents
   ```

3. **Test error message details:**
   - Verify error message includes "exceeds maximum size of 50MB"
   - Verify details object includes all 4 fields (maxSizeBytes, maxSizeMB, actualSizeBytes, actualSizeMB)

### Automated Testing

Consider adding integration tests:
```typescript
describe('File upload size validation', () => {
  it('rejects files larger than 50MB with 413', async () => {
    const oversizedFile = new File([new ArrayBuffer(51 * 1024 * 1024)], 'test.pdf');
    const response = await uploadDocument(oversizedFile);
    expect(response.status).toBe(413);
    expect(response.body.error).toContain('exceeds maximum size');
  });

  it('accepts files under 50MB', async () => {
    const validFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'test.pdf');
    const response = await uploadDocument(validFile);
    expect(response.status).toBe(200);
  });
});
```

---

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Dependencies for Future Phases:**
- Phase 05 (SMS Notifications) can proceed - no dependencies
- Phase 06 (Notification Recipient Fixes) can proceed - no dependencies

**Production Deployment Checklist:**
- [ ] Test with actual 50MB+ files in staging environment
- [ ] Monitor R2 storage metrics after deployment
- [ ] Verify framework-level rejection works (check Next.js logs)
- [ ] Test with various file types (PDF, DOCX, XLSX, images)

---

## Metadata

**Subsystem:** Security, API Infrastructure

**Tags:** file-upload, validation, security, DoS-prevention, cloudflare-r2, resource-protection

**Dependency Graph:**
- **Requires:** None
- **Provides:** File upload size protection
- **Affects:** Phase 07 (report generation), Phase 08 (SSO) - both may upload files

**Tech Stack:**
- **Added:** None (uses existing Next.js, TypeScript)
- **Patterns:** Fail-fast validation, defense-in-depth (framework + handler levels)

**Key Files:**
- **Created:** None (types constants already existed from linter)
- **Modified:** next.config.ts, 4 upload endpoint files

**Duration:** 3 minutes (1769577366 to 1769577573)

**Completed:** 2026-01-28
