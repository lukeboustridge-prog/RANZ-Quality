# Compliance Engine

## Overview
File: `src/lib/compliance-v2.ts`

The compliance engine calculates a weighted score across 4 dimensions for each organization.

## Dimensions & Weights

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Documentation | 50% | 19 ISO element coverage, approved docs |
| Insurance | 25% | Required policies, coverage amounts, expiry |
| Personnel | 15% | Owner assigned, LBP verified, staff count |
| Audit | 10% | Last audit rating, overdue CAPAs |

## Documentation Scoring (50%)
- Each ISO element has a configurable weight (defined in `src/types/index.ts`)
- Assessed elements use their assessment score (0-100)
- No assessment but approved docs = 75 points
- No assessment but any docs = 25 points
- No docs = 0 points (generates issue)
- Final score = weighted average across all 19 elements

## Insurance Scoring (25%)
- Per-tier minimum coverage requirements (configurable in `src/types/index.ts`)
- Required policies: PUBLIC_LIABILITY, PROFESSIONAL_INDEMNITY, STATUTORY_LIABILITY
- Valid + meets minimum = 100
- Expiring within 60 days = 85, within 30 days = 70
- Below minimum coverage = 50
- Missing required policy = 0 (CRITICAL issue)

## Personnel Scoring (15%)
- Owner assigned: 30 points
- All LBP verified: 50 points (partial credit for some verified)
- Minimum 2 staff: 20 points
- Expired LBP: -10 penalty

## Audit Scoring (10%)
- PASS: 100, PASS_WITH_OBSERVATIONS: 85, CONDITIONAL_PASS: 60, FAIL: 30
- No completed audits: 50
- Overdue audit (>365 days): -20
- Overdue CAPAs: -10 each

## Tier Eligibility
- CERTIFIED requires: 70%+ overall, no critical issues
- MASTER_ROOFER requires: 90%+ overall, no critical issues, 2+ verified LBP holders

## Status Thresholds
- Compliant (green): 90-100%
- At Risk (yellow): 70-89%
- Critical (red): <70%

## Integration
- Scores cached on Organization model (complianceDocScore, complianceInsScore, etc.)
- Synced to Clerk org metadata for JWT session claims
- Recalculated on-demand via admin API or after data changes
