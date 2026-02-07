# Public APIs & Verification

## Business Verification
`GET /api/public/verify/[businessId]`
- Returns: verified status, business name, tier, compliance score, insurance validity
- No authentication required

`GET /api/public/verify` (POST with query)
- Search by business name or NZBN

## Public Search ("Check a Roofer")
`GET /api/public/search?q=...&tier=...`
- Full-text business search
- Filter by certification tier
- Returns: business name, tier, region, verification URL

## Open Badges 3.0
`GET /api/public/badge/[businessId]`
- Returns: W3C Verifiable Credential JSON-LD

`GET /api/public/badge/[businessId]/image`
- Returns: SVG badge with tier, business name, compliance score

## Embeddable Widget
Members embed on their websites:
```html
<script src="https://portal.ranz.org.nz/badge/embed.js"></script>
<div class="ranz-badge" data-business-id="org_xxx" data-style="full"></div>
```
Widget fetches verification status in real-time.

## Testimonial Submission
`POST /api/public/testimonial`
- Public form for clients to submit testimonials
- Email verification token flow

## Public Pages
- `/verify/[businessId]` - Business verification page
- `/search` - "Check a Roofer" search interface
- `/testimonial/submit` - Client testimonial form
