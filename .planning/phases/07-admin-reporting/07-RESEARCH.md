# Phase 7: Admin Reporting - Research

**Research Question**: What do I need to know to PLAN this phase well?

**Date**: 2026-01-28
**Researcher**: Claude (Opus 4.5)

---

## Executive Summary

Phase 7 requires implementing comprehensive admin reporting with three distinct outputs:
1. **Single-org PDF reports** with RANZ branding showing compliance breakdown
2. **CSV exports** of all members for external consumption (insurers/partners)
3. **Admin dashboard** with drill-down compliance visualization

The codebase already has robust JSON report generation (`src/lib/reports.ts`) but lacks PDF generation and CSV export capabilities. The compliance scoring engine (`compliance-v2.ts`) provides the four-dimension breakdown needed for detailed reports.

**Key Finding**: Next.js 16 + React PDF is compatible and production-ready for server-side PDF generation. Puppeteer is a viable alternative if HTML-based templates are preferred.

---

## 1. Current State Analysis

### Existing Infrastructure

**Report Generation System** (`src/lib/reports.ts`):
- ✅ 9 report types already implemented (COMPLIANCE_SUMMARY, MEMBER_DIRECTORY, AUDIT_SUMMARY, etc.)
- ✅ JSON output fully functional
- ✅ Database queries optimized for aggregation
- ⚠️ PDF/CSV/XLSX generation marked as TODO
- ⚠️ No storage mechanism for generated reports (storageKey in schema unused)

**Report API** (`src/app/api/admin/reports/route.ts`):
- ✅ RANZ admin authorization check (`isRanzStaff()`)
- ✅ JSON reports return synchronously
- ⚠️ PDF/CSV/XLSX return 202 status with "Report generation queued" (not implemented)
- ⚠️ No background job queue configured

**Admin Dashboard** (`src/app/(admin)/admin/reports/page.tsx`):
- ✅ Report type selection UI
- ✅ JSON visualization for COMPLIANCE_SUMMARY, TIER_ANALYSIS, AUDIT_SUMMARY
- ✅ Download button (JSON only)
- ⚠️ No single-organization report generation
- ⚠️ No drill-down compliance breakdown view

**Member List View** (`src/app/(admin)/admin/members/page.tsx`):
- ✅ Table view with compliance score, tier, insurance status
- ✅ Basic CSV export (client-side generation)
- ✅ Filtering by tier and compliance status
- ⚠️ CSV export limited to visible columns (missing NZBN, audit history, dimension breakdown)

**Compliance Engine** (`src/lib/compliance-v2.ts`):
- ✅ Four-dimension breakdown: Documentation (50%), Insurance (25%), Personnel (15%), Audit (10%)
- ✅ `ComplianceResult` type includes detailed breakdown with element scores, policy scores, personnel details
- ✅ Issue tracking with severity levels (critical, warning, info)
- ✅ Tier eligibility calculation

### Database Schema

**Report Model** (Prisma schema, lines 838-870):
```prisma
model Report {
  reportType      ReportType
  storageKey      String?         // Currently unused - for R2 storage
  format          ReportFormat    // PDF, CSV, XLSX, JSON
  status          ReportStatus    // PENDING, GENERATING, COMPLETED, FAILED
  parameters      Json?           // Generation parameters
  organizationId  String?         // Null for admin reports
}
```

**Organization Model** (includes all data needed for reports):
- Compliance score, tier, certification dates
- Relations: members, insurancePolicies, audits, assessments, documents

---

## 2. Technical Requirements Analysis

### Requirement Breakdown

#### ADMIN-01: PDF Compliance Reports for Single Organization

**What it needs:**
- Input: organizationId
- Output: Branded PDF with:
  - RANZ logo and header
  - Organization name, tier, overall compliance score
  - Four-dimension breakdown (Documentation, Insurance, Personnel, Audit) with visual indicators
  - Expiring items list (insurance policies, LBP licenses, document reviews)
  - Audit history table (last 3 audits with dates, ratings, findings)
  - Footer with generation date and report ID

**Data Sources:**
- `calculateComplianceScore(organizationId)` → Full breakdown
- `Organization` with includes: insurancePolicies, members, audits, assessments
- `ComplianceResult.breakdown` → Dimension scores
- `ComplianceResult.issues` → Expiring items

**Technical Approach:**
Two viable options:

1. **@react-pdf/renderer** (Recommended)
   - Pros: React components, lightweight, no browser required, fast
   - Cons: Limited CSS support (no flexbox grid), custom layout logic
   - Use case: Structured reports with tables and simple layouts

2. **Puppeteer + Chromium**
   - Pros: Full HTML/CSS support, pixel-perfect rendering, can reuse existing UI components
   - Cons: Heavier (requires Chromium), slower, more memory
   - Use case: Complex layouts, charts, or needing exact web page replica

**Recommendation**: Start with **@react-pdf/renderer** for Phase 7 MVP. It's faster, simpler, and sufficient for structured compliance reports. Consider Puppeteer in Phase 4+ if visual complexity increases.

#### ADMIN-02: CSV Export of Member Directory

**What it needs:**
- Input: Optional tier filter
- Output: CSV with columns:
  - Basic: name, tradingName, nzbn, tier, complianceScore, certifiedSince
  - Contacts: email, phone, city
  - Compliance: lastAuditDate, nextAuditDue, insuranceStatus (boolean)
  - Metadata: memberCount, documentCount
  - Dimensions: docScore, insScore, persScore, auditScore (NEW)

**Data Sources:**
- `generateMemberDirectory()` (existing) → Basic member data
- Enhancement needed: Calculate dimension scores for each org
- Option: Pre-compute and cache dimension scores in Organization table

**Technical Approach:**
- Server-side CSV generation using Node.js `stream` + `csv-stringify` (no external library needed)
- For large datasets (>1000 members), use streaming to avoid memory issues
- Return CSV via Next.js Response with proper headers:
  ```typescript
  return new Response(csvStream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="ranz-members-${date}.csv"`
    }
  });
  ```

#### ADMIN-03: Admin Dashboard with Compliance Drill-Down

**What it needs:**
- View: Table showing all members with high-level compliance score
- Action: Click member → Modal or slide-out panel showing:
  - Four dimension scores with visual breakdown (radial gauge or bar chart)
  - Issue list (critical, warning, info)
  - Expiring items countdown
  - Actions: "Generate PDF Report", "View Full Profile"

**Data Sources:**
- `/api/admin/members` (existing) → List view data
- `/api/admin/compliance/:orgId` (NEW) → Drill-down detail
- `calculateComplianceScore(orgId)` → Full breakdown

**Technical Approach:**
- Reuse existing `DimensionIndicators` component from member dashboard
- Create new `ComplianceBreakdownModal` component
- Fetch drill-down data on-demand (lazy load) to avoid heavy initial payload
- Consider caching compliance breakdowns in Organization table for instant load

---

## 3. PDF Generation Technology Assessment

### Library Comparison

| Feature | @react-pdf/renderer | Puppeteer + Chromium | PDFKit |
|---------|---------------------|----------------------|--------|
| **Rendering** | React components | HTML/CSS (Chromium) | Programmatic API |
| **CSS Support** | Limited (no grid) | Full (modern CSS) | None (manual positioning) |
| **Performance** | Fast (~200ms) | Slow (~2s per PDF) | Very fast (~50ms) |
| **Memory** | Low (~50MB) | High (~500MB per instance) | Low (~20MB) |
| **Complexity** | Medium (React) | High (browser management) | High (manual layout) |
| **Vercel Compatible** | Yes | Yes (with @sparticuz/chromium-min) | Yes |
| **Charts/Graphics** | Limited | Excellent | Excellent (manual) |

### Recommendation Matrix

| Use Case | Recommended Library | Rationale |
|----------|---------------------|-----------|
| **Phase 7 MVP** | @react-pdf/renderer | Structured data, fast, lightweight, sufficient for tables/text |
| **Complex Reports** | Puppeteer | If charts, graphs, or complex layouts needed in future |
| **High Volume** | PDFKit | If generating 100+ PDFs/minute, custom layout acceptable |

### Deployment Considerations

**Vercel/Serverless**:
- @react-pdf/renderer: No special configuration needed
- Puppeteer: Requires `@sparticuz/chromium-min` package and `puppeteer-core` (adds ~50MB to deployment)
- Memory limit: Vercel Pro allows 1GB (sufficient for Puppeteer with pooling)

**Self-Hosted/Railway**:
- All options viable
- Puppeteer recommended if self-hosted (can maintain persistent browser instance)

---

## 4. Data Architecture Decisions

### Should Dimension Scores Be Pre-Computed?

**Current State**: Compliance scores calculated on-demand via `calculateComplianceScore(orgId)`

**Options**:

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **On-demand calculation** | Always accurate, no storage overhead | Slow for bulk exports (250 orgs × 500ms = 2+ minutes) | ❌ Not viable for CSV export |
| **Cache in Organization table** | Fast reads, simple implementation | Stale data risk, requires update triggers | ✅ **Recommended for Phase 7** |
| **Dedicated ComplianceSnapshot table** | Historical tracking, time-series analysis | Complex schema, more storage | 🔄 Consider for Phase 4+ |

**Recommended Approach**:
Add four new columns to Organization table:
```prisma
model Organization {
  // ... existing fields ...
  complianceScore         Float  @default(0)  // Existing
  complianceDocScore      Float  @default(0)  // NEW
  complianceInsScore      Float  @default(0)  // NEW
  compliancePersScore     Float  @default(0)  // NEW
  complianceAuditScore    Float  @default(0)  // NEW
  complianceLastCalc      DateTime?           // NEW - for cache invalidation
}
```

**Update Strategy**:
- After document approval → Recalc doc score
- After insurance policy update → Recalc ins score
- After LBP verification → Recalc personnel score
- After audit completion → Recalc audit score
- Store in database via `updateOrganizationComplianceScore()` (already exists)

**Migration Path**:
1. Phase 7.1: Add columns, backfill with one-time calculation script
2. Phase 7.2: Update `updateOrganizationComplianceScore()` to store dimension scores
3. Phase 7.3: Wire up automatic recalculation triggers (separate from Phase 7)

---

## 5. RANZ Branding Requirements

### Brand Assets Needed for PDF Reports

From CLAUDE.md technical design (Part 8):
- RANZ logo (SVG or PNG, high-res)
- Color palette:
  - Primary: RANZ blue
  - Tier badges: Accredited (slate), Certified (blue), Master Roofer (gold)
  - Status indicators: Green (compliant), Yellow (at-risk), Red (critical)
- Typography: Professional sans-serif (Arial/Helvetica fallback safe)

### PDF Report Layout Specification

**Header Section**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  [RANZ LOGO]                    Compliance Report                   │
│                                                                     │
│  Example Roofing Ltd (MASTER ROOFER 🏆)                            │
│  NZBN: 9429041234567                                               │
│  Generated: 28 January 2026                                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Overall Compliance Section**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  OVERALL COMPLIANCE SCORE                                           │
│                                                                     │
│       ┌─────────┐                                                  │
│       │   92%   │    Status: COMPLIANT ✓                           │
│       │   ████  │    Last Audit: 15 Nov 2025                       │
│       └─────────┘    Next Audit: 15 Nov 2026                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Dimension Breakdown Section**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  COMPLIANCE BREAKDOWN                                               │
│                                                                     │
│  Documentation (50% weight)                     95%  ████████████░  │
│  ├─ 18/19 ISO elements compliant                                   │
│  └─ Quality Policy requires review (due 15 Feb)                    │
│                                                                     │
│  Insurance (25% weight)                         100% █████████████  │
│  ├─ All policies current                                           │
│  └─ Next expiry: Public Liability (210 days)                       │
│                                                                     │
│  Personnel (15% weight)                         85%  ███████████░░  │
│  ├─ 4/5 staff with verified LBP                                    │
│  └─ John Smith LBP expires in 89 days                              │
│                                                                     │
│  Audit (10% weight)                             90%  ████████████░  │
│  └─ Last audit: PASS WITH OBSERVATIONS                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Expiring Items Section** (if any):
```
┌─────────────────────────────────────────────────────────────────────┐
│  ITEMS REQUIRING ATTENTION                                          │
│                                                                     │
│  ⚠️ John Smith LBP License               Expires in 89 days        │
│  ℹ️ Quality Policy Document              Review due in 18 days     │
└─────────────────────────────────────────────────────────────────────┘
```

**Audit History Section**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  AUDIT HISTORY (Last 3 Audits)                                      │
│                                                                     │
│  Date         Type            Rating               Findings        │
│  ─────────────────────────────────────────────────────────────────  │
│  15 Nov 2025  Surveillance    Pass w/ Observations  0 major, 2 minor│
│  10 May 2025  Surveillance    Pass                 0 major, 1 minor│
│  05 Dec 2024  Initial Cert    Conditional Pass    1 major, 3 minor│
└─────────────────────────────────────────────────────────────────────┘
```

**Footer**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Roofing Association of New Zealand                                │
│  Report ID: RPT-2026-00142                                         │
│  Generated: 28 January 2026 14:35 NZDT                             │
│  This report is valid only at the time of generation.              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Dependencies

### External Dependencies to Add

```json
{
  "dependencies": {
    "@react-pdf/renderer": "^4.1.3",  // PDF generation (React components)
    // OR
    "puppeteer-core": "^23.x",        // Alternative: HTML to PDF
    "@sparticuz/chromium-min": "^131" // If using Puppeteer on Vercel
  }
}
```

**If using Puppeteer**, also need:
- Environment variable for Chromium path
- Configuration for serverless deployment
- Browser instance pooling (to avoid cold start penalty)

### Internal Dependencies

**Must exist before Phase 7 implementation**:
- ✅ Phase 1: `compliance-v2.ts` (canonical scoring engine) — COMPLETE
- ✅ Prisma schema with Report model — EXISTS
- ✅ RANZ admin authentication (`isRanzStaff()`) — EXISTS
- ✅ Basic report generation functions — EXISTS

**Recommended before Phase 7**:
- 🔄 Phase 3: Audit trail logging (log PDF generation events)
- 🔄 Phase 4: API rate limiting (prevent PDF generation abuse)
- 🔄 Cloudflare R2 integration (store generated PDFs for retrieval)

**Can be added during Phase 7**:
- Background job queue (Inngest or Trigger.dev) — for async PDF generation
- RANZ logo assets in `public/` folder
- PDF template components (`/src/components/reports/`)

---

## 7. API Design Specification

### New Endpoint: Generate Single Organization PDF

```typescript
POST /api/admin/reports/organization/:orgId
Authorization: RANZ admin only

Request Body:
{
  "format": "PDF",  // Required for this endpoint
  "includeAuditHistory": true,  // Optional, default true
  "includeDimensionBreakdown": true  // Optional, default true
}

Response (202 Accepted - Async):
{
  "reportId": "rpt_xxx",
  "status": "GENERATING",
  "estimatedCompletionSeconds": 5
}

Response (200 OK - Sync for MVP):
Content-Type: application/pdf
Content-Disposition: attachment; filename="compliance-report-example-roofing-2026-01-28.pdf"
[Binary PDF data]
```

### Enhanced Endpoint: CSV Export with Dimension Scores

```typescript
GET /api/admin/reports/members/export?format=CSV&tier=MASTER_ROOFER

Response:
Content-Type: text/csv
Content-Disposition: attachment; filename="ranz-members-2026-01-28.csv"

CSV Structure:
name,tradingName,nzbn,tier,complianceScore,docScore,insScore,persScore,auditScore,lastAuditDate,insuranceStatus,memberCount,city,email,phone
```

### New Endpoint: Compliance Drill-Down

```typescript
GET /api/admin/compliance/:orgId
Authorization: RANZ admin only

Response (200 OK):
{
  "organizationId": "org_xxx",
  "organizationName": "Example Roofing Ltd",
  "overallScore": 92,
  "breakdown": {
    "documentation": { "score": 95, "weight": 0.5, "elements": [...] },
    "insurance": { "score": 100, "weight": 0.25, "policies": [...] },
    "personnel": { "score": 85, "weight": 0.15, "details": {...} },
    "audit": { "score": 90, "weight": 0.1, "details": {...} }
  },
  "issues": [
    {
      "category": "personnel",
      "severity": "warning",
      "message": "John Smith LBP expires in 89 days"
    }
  ],
  "tierEligibility": {
    "currentTier": "MASTER_ROOFER",
    "eligibleForUpgrade": false,
    "blockers": []
  }
}
```

---

## 8. Security & Privacy Considerations

### Data Protection

**Sensitive Data in PDFs**:
- Organization names, contact details → Reasonable for RANZ admin use
- LBP numbers, staff names → Privacy Act 2020 applies
- NZBN → Public information (safe)
- Compliance scores → Internal RANZ data (not publicly disclosed without consent)

**Access Control**:
- PDF generation must be admin-only (existing `isRanzStaff()` check)
- Generated PDFs should NOT be stored with public-accessible URLs
- If stored in R2, use signed URLs with 1-hour expiry
- Audit log all PDF generation events (who, when, which org)

**GDPR/Privacy Act Compliance**:
- PDFs containing personal information are subject to Privacy Act 2020
- RANZ has legitimate interest as certification body
- Retention policy: Store generated PDFs for 7 years (matches audit retention)
- Right to access: Members can request their own compliance reports

### Audit Logging Requirements

Log the following events to `AuditLog` table:
```typescript
{
  action: "EXPORT",
  resourceType: "COMPLIANCE_REPORT",
  resourceId: organizationId,
  actorId: userId,
  metadata: {
    format: "PDF",
    reportId: "rpt_xxx"
  }
}
```

---

## 9. Performance & Scalability Considerations

### PDF Generation Performance

**Benchmarks** (estimated based on library documentation):

| Library | Generation Time | Memory Usage | Concurrent Limit |
|---------|----------------|--------------|------------------|
| @react-pdf/renderer | 200-500ms | ~50MB | 20-30 concurrent |
| Puppeteer | 1-3 seconds | ~200-500MB | 5-10 concurrent |
| PDFKit | 50-200ms | ~20MB | 50+ concurrent |

**For RANZ Scale** (250 members):
- Expected load: 10-20 PDF generations per day (admin use only)
- Peak load: 50 PDFs during annual audit season
- **Recommendation**: Synchronous generation acceptable for MVP (no queue needed yet)

### CSV Export Performance

**Current Member List Export**: Client-side generation (browser memory limit ~100MB)
- Works for up to ~1,000 members
- RANZ has 250 members → Safe

**Enhanced Export with Dimension Scores**:
- If calculating on-demand: 250 orgs × 500ms = 2+ minutes → ❌ Unacceptable
- If reading from cache: 250 orgs × 10ms = 2.5 seconds → ✅ Acceptable

**Recommendation**: Pre-compute dimension scores (see Section 4)

### Caching Strategy

**Report Data**:
- Compliance scores cached in Organization table → Fast reads
- Audit history, insurance policies → Direct DB query (fast joins)
- No additional caching layer needed for Phase 7 MVP

**Generated PDFs** (future enhancement):
- Store in Cloudflare R2 with 24-hour cache
- Key format: `reports/{orgId}/compliance-{date}.pdf`
- Regenerate only if data changed (track `complianceLastCalc` timestamp)

---

## 10. Testing Strategy

### Unit Tests

**Compliance Calculation**:
- ✅ Already tested (Phase 1)
- Verify dimension scores match expected weights

**PDF Generation**:
- Test PDF structure (header, sections, footer present)
- Test RANZ logo embedding
- Test data rendering (mock ComplianceResult)
- Test edge cases (no audits, expired insurance, 0% compliance)

**CSV Generation**:
- Test column headers match specification
- Test NZBN formatting (13 digits)
- Test date formatting (ISO 8601)
- Test special characters (commas in names, quotes)

### Integration Tests

**API Endpoints**:
- Test `/api/admin/reports/organization/:orgId` returns PDF
- Test authorization (non-admin rejected)
- Test invalid organization ID (404)
- Test CSV export matches database query

### Manual UAT Scenarios

1. **PDF Report Generation**:
   - Generate report for high-scoring member (95%+) → Verify "Compliant" status
   - Generate report for low-scoring member (<50%) → Verify critical issues highlighted
   - Generate report for new member with no audits → Verify graceful handling

2. **CSV Export**:
   - Export all members → Verify NZBN column populated
   - Export filtered by tier → Verify only correct tier included
   - Open CSV in Excel → Verify no formatting issues

3. **Drill-Down Dashboard**:
   - Click member in admin dashboard → Verify modal opens
   - View dimension breakdown → Verify scores add up to overall score
   - Generate PDF from modal → Verify same data as API endpoint

---

## 11. Rollout Plan

### Phase 7.1: PDF Generation Foundation (Week 1)

**Deliverables**:
- Install `@react-pdf/renderer`
- Create PDF template components in `/src/components/reports/pdf/`
- Implement `/api/admin/reports/organization/:orgId` endpoint (synchronous)
- Basic PDF with header, overall score, dimension breakdown
- Unit tests for PDF structure

**Success Criteria**:
- PDF generates in <2 seconds
- RANZ branding visible (logo, colors)
- Dimension scores displayed correctly

### Phase 7.2: CSV Export Enhancement (Week 1-2)

**Deliverables**:
- Add dimension score columns to Organization table (migration)
- Backfill existing organizations with calculated scores
- Enhance CSV export endpoint to include new columns
- Update `/api/admin/members` to return dimension scores

**Success Criteria**:
- CSV includes all specified columns (name, NZBN, dimension scores)
- Export completes in <5 seconds for 250 members
- Data matches database records

### Phase 7.3: Admin Dashboard Drill-Down (Week 2)

**Deliverables**:
- Create `/api/admin/compliance/:orgId` endpoint
- Build `ComplianceBreakdownModal` component
- Wire up modal trigger from member list
- Add "Generate PDF" button in modal

**Success Criteria**:
- Modal opens in <500ms (lazy-loaded data)
- Dimension indicators match PDF output
- PDF generation accessible from modal

### Phase 7.4: Polish & Documentation (Week 3)

**Deliverables**:
- Add expiring items section to PDF
- Add audit history table to PDF
- Audit logging for PDF generation
- Admin user documentation (how to generate reports)
- Code documentation for future PDF customization

**Success Criteria**:
- All ADMIN-01, ADMIN-02, ADMIN-03 requirements met
- UAT passed by RANZ admin (Luke or designated tester)
- PDF reports suitable for member distribution

---

## 12. Future Enhancements (Post-Phase 7)

### Phase 4+ Considerations

1. **Async PDF Generation with Queue**:
   - Implement Inngest or Trigger.dev background jobs
   - Store PDFs in Cloudflare R2
   - Email PDF download link when ready
   - Use case: Batch report generation for all 250 members

2. **Advanced PDF Features**:
   - Charts/graphs for compliance trends over time
   - Comparison to industry average
   - QR code linking to public verification page
   - Digital signature for authenticity

3. **Member Self-Service Reports**:
   - Allow members to generate their own compliance reports
   - Restrict to own organization only
   - Watermark "FOR MEMBER USE ONLY"

4. **Scheduled Reports**:
   - Monthly email to RANZ directors with compliance summary
   - Quarterly reports for board meetings
   - Annual reports for members (showing progress over time)

5. **Report Templates**:
   - Different templates for different audiences (member vs auditor vs insurer)
   - Customizable branding (white-label for partner organizations)

---

## 13. Open Questions for Planning Session

1. **PDF Generation Approach**:
   - ✅ Decision: Use @react-pdf/renderer for Phase 7 MVP
   - Rationale: Fast, lightweight, sufficient for structured reports

2. **Dimension Score Storage**:
   - ✅ Decision: Add four columns to Organization table for cached scores
   - Rationale: CSV export requires fast bulk reads

3. **Async vs Sync PDF Generation**:
   - ✅ Decision: Synchronous for MVP (admin-only, low volume)
   - Rationale: Simpler implementation, meets current scale

4. **PDF Storage Strategy**:
   - ⏭️ Defer to Phase 4+: Store in Cloudflare R2 only if batch generation needed
   - Rationale: Current use case is on-demand generation

5. **Branding Assets**:
   - ❓ Need clarification: Where to source RANZ logo (SVG/PNG)?
   - ❓ Need clarification: Exact color codes for RANZ blue, tier badges?
   - Action: Request from Luke/RANZ design team before implementation

6. **Report Distribution**:
   - ❓ Should PDF reports be emailable directly from portal?
   - ❓ Should members receive automated monthly compliance reports?
   - Action: Confirm with Luke whether this is Phase 7 or future enhancement

---

## 14. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **PDF generation timeout** | Low | Medium | Use synchronous generation (200-500ms safe for Next.js 10s timeout) |
| **Memory exhaustion** | Low | High | Limit concurrent PDF generation to 10 (middleware rate limit) |
| **Incorrect compliance data** | Low | High | Use canonical `compliance-v2.ts` engine (Phase 1), add unit tests |
| **CSV export performance** | Medium | Medium | Pre-compute dimension scores (avoid on-demand calculation) |
| **Missing RANZ branding** | Medium | Low | Request assets early, use placeholder logo if delayed |
| **Stale cached scores** | Medium | Medium | Implement automatic recalculation triggers (separate phase) |
| **Privacy breach** | Low | Critical | Admin-only access, audit logging, signed URLs for R2 storage |

---

## 15. Success Metrics

### Phase 7 Acceptance Criteria

**ADMIN-01: Single Organization PDF Report**:
- [ ] PDF generates in <3 seconds
- [ ] Contains all required sections (header, overall score, dimensions, expiring items, audit history)
- [ ] RANZ branding present (logo, colors)
- [ ] Dimension scores match `compliance-v2.ts` calculation
- [ ] Accessible only to RANZ admin users

**ADMIN-02: CSV Member Export**:
- [ ] Includes all specified columns (name, tradingName, nzbn, tier, complianceScore, dimension scores, lastAuditDate, insuranceStatus, city, email, phone)
- [ ] NZBN column populated for 90%+ of members
- [ ] Export completes in <5 seconds for 250 members
- [ ] File opens correctly in Excel/Google Sheets

**ADMIN-03: Admin Dashboard Drill-Down**:
- [ ] Member list displays compliance scores with color indicators
- [ ] Click member opens drill-down view (modal or slide-out)
- [ ] Drill-down shows four dimension scores with visual breakdown
- [ ] "Generate PDF Report" button functional from drill-down
- [ ] Drill-down loads in <500ms

### Performance Benchmarks

- PDF generation: <2 seconds (target), <3 seconds (max acceptable)
- CSV export: <3 seconds (target), <5 seconds (max acceptable)
- Drill-down load: <300ms (target), <500ms (max acceptable)

### Quality Benchmarks

- Unit test coverage: >80% for new code
- Integration tests: All 3 API endpoints covered
- UAT: Passed by RANZ admin with no critical issues
- PDF visual quality: Professional appearance suitable for external distribution

---

## 16. Key Learnings from Research

### What Went Well

1. **Existing Infrastructure**: The report generation system (`reports.ts`) is well-architected and extensible. Adding PDF/CSV output is straightforward.

2. **Compliance Engine**: Phase 1's `compliance-v2.ts` provides exactly the breakdown needed for detailed reports. No refactoring required.

3. **Technology Maturity**: @react-pdf/renderer is production-ready and compatible with Next.js 16. No experimental dependencies.

### What Requires Attention

1. **Dimension Score Caching**: CSV export will be too slow without pre-computed dimension scores. Must add database columns and backfill.

2. **RANZ Branding Assets**: Need to secure logo and color codes before PDF implementation. Could delay phase if not available.

3. **Audit Logging**: Currently no logging for report generation. Should add before Phase 7 to track admin actions (good practice for compliance system).

### Technical Debt Identified

1. **No Background Job Queue**: Current API returns 202 status for PDF/CSV/XLSX but doesn't actually queue jobs. Either implement queue or remove 202 response path.

2. **Unused Report.storageKey Field**: Database schema includes R2 storage key but never populated. Decide if Phase 7 needs this or defer to Phase 4+.

3. **Client-Side CSV Generation**: Existing member list uses browser-side CSV export. Should migrate to server-side for consistency.

---

## 17. Resources & References

### Official Documentation

- [@react-pdf/renderer Documentation](https://react-pdf.org/compatibility) - React PDF rendering library
- [Next.js PDF Generation Guide](https://medium.com/@stanleyfok/pdf-generation-with-react-componenets-using-next-js-at-server-side-ee9c2dea06a7) - Server-side PDF in Next.js
- [Puppeteer PDF API](https://dev.to/jordykoppen/turning-react-apps-into-pdfs-with-nextjs-nodejs-and-puppeteer-mfi) - HTML to PDF with Puppeteer
- [Puppeteer Alternatives 2026](https://bugbug.io/blog/test-automation-tools/puppeteer-alternatives/) - Comparison of PDF generation tools

### Codebase References

- `src/lib/compliance-v2.ts` - Canonical compliance scoring engine (Phase 1)
- `src/lib/reports.ts` - JSON report generation (existing)
- `src/app/api/admin/reports/route.ts` - Report API endpoint
- `src/app/(admin)/admin/reports/page.tsx` - Admin reports UI
- `src/app/(admin)/admin/members/page.tsx` - Member list with CSV export
- `prisma/schema.prisma` - Report and Organization models

### Related Project Documentation

- `CLAUDE.md` (root) - Overall project specification
- `CLAUDE.md` Part 3 (Section: Admin Dashboard Design) - Compliance monitoring dashboard
- `CLAUDE.md` Part 6 (Section: Cost Estimates) - PDF generation infrastructure costs
- `.planning/phases/01-compliance-engine-consolidation/01-RESEARCH.md` - Compliance scoring architecture
- `.planning/phases/04-public-api-hardening/04-RESEARCH.md` - API security patterns

---

## Conclusion

Phase 7 is well-positioned for implementation with minimal dependencies. The existing codebase provides robust report generation and compliance scoring infrastructure. The primary technical challenge is choosing between @react-pdf/renderer (recommended) and Puppeteer for PDF generation.

**Critical Path Items**:
1. Add dimension score columns to Organization table (enables fast CSV export)
2. Secure RANZ branding assets (logo, color codes)
3. Implement PDF generation with @react-pdf/renderer
4. Enhance CSV export with dimension scores
5. Build admin dashboard drill-down UI

**Estimated Implementation Time**: 2-3 weeks (including testing and polish)

**Risk Level**: Low - straightforward implementation with established patterns and libraries.

---

**Sources**:
- [React-pdf Compatibility](https://react-pdf.org/compatibility)
- [Next.js PDF Generation with React](https://medium.com/@stanleyfok/pdf-generation-with-react-componenets-using-next-js-at-server-side-ee9c2dea06a7)
- [Building PDF Service with Next.js and React PDF](https://03balogun.medium.com/building-a-pdf-generation-service-using-nextjs-and-react-pdf-78d5931a13c7)
- [Next.js 14 and react-pdf Integration](https://benhur-martins.medium.com/nextjs-14-and-react-pdf-integration-ccd38b1fd515)
- [Puppeteer with Next.js](https://dev.to/jordykoppen/turning-react-apps-into-pdfs-with-nextjs-nodejs-and-puppeteer-mfi)
- [Puppeteer Alternatives 2026](https://bugbug.io/blog/test-automation-tools/puppeteer-alternatives/)
- [Puppeteer HTML to PDF](https://blog.risingstack.com/pdf-from-html-node-js-puppeteer/)
- [PDF Generation in Next.js with Puppeteer](https://medium.com/front-end-weekly/dynamic-html-to-pdf-generation-in-next-js-a-step-by-step-guide-with-puppeteer-dbcf276375d7)
- [Vercel-Compatible Puppeteer API](https://dev.to/harshvats2000/creating-a-nextjs-api-to-convert-html-to-pdf-with-puppeteer-vercel-compatible-16fc)
- [PDF Generation in Node.js: Puppeteer vs PDFKit](https://www.leadwithskills.com/blogs/pdf-generation-nodejs-puppeteer-pdfkit)
