# Original Design Specification

The full original design spec is preserved in `claude.md.bak` (the original claude.md).

## Key Design Decisions

### Certification Tiers
- **Accredited:** Baseline, lower insurance minimums
- **Certified:** Full ISO compliance, moderate insurance
- **Master Roofer:** Elite tier, highest requirements, 2+ verified LBP holders

### SSO Architecture
- Primary domain: portal.ranz.org.nz (Quality Program)
- Satellite domain: reports.ranz.org.nz (Roofing Reports)
- Shared Clerk instance with Organizations for multi-tenancy

### Privacy Act 2020 Compliance
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- AU/NZ data residency (Neon + R2 region selection)
- 72-hour breach notification design
- IPP 9 retention: hot (0-2yr) → warm (2-7yr) → cold (7-15yr+)

### Immutable Audit Trail
- Event sourcing pattern with SHA-256 hash chains
- 15-year minimum retention
- Actor, action, resource, state change, IP, user agent

### Insurance Requirements by Tier
| Policy Type | Accredited | Certified | Master Roofer |
|-------------|------------|-----------|---------------|
| Public Liability | $1M | $2M | $5M |
| Professional Indemnity | $500K | $1M | $2M |
| Statutory Liability | $500K | $1M | $1M |

### Expiry Alert Sequence
| Days Before | Channel | Action |
|-------------|---------|--------|
| 90 | Email | Gentle reminder |
| 60 | Email + SMS | Urgent reminder |
| 30 | Email + SMS | Final warning, admin copied |
| 0 | System | Mark non-compliant, badge suspended |
| +7 | Email | Suspension notice to insurers |

## Implementation Roadmap (Original)
- **Phase 1 (Q2 2026):** MVP - SSO, dashboard, insurance, alerts, staff, basic docs
- **Phase 2 (Q3 2026):** Core - Full ISO docs, LBP API, audits, compliance scoring, badges
- **Phase 3 (Q4 2026):** Full rollout - SMS, projects, testimonials, CAPA, public tools, analytics
- **Phase 4 (2027):** Advanced - Mobile app, CPD auto-tracking, insurer feeds, COI OCR
- **Phase 5 (2028+):** Ecosystem - Council APIs, consumer app, cross-industry sharing
