# Member Guide

Complete guide for member business users of the RANZ Quality Program portal.

---

## Getting Started

### Roles and Permissions

Each member of your organization has one of three roles:

| Capability | Owner | Admin | Staff |
|-----------|-------|-------|-------|
| View dashboard and compliance score | Yes | Yes | Yes |
| Manage insurance policies | Yes | Yes | No |
| Add and edit staff | Yes | Yes | No |
| Upload and manage documents | Yes | Yes | Yes |
| Manage suppliers | Yes | Yes | Yes |
| Create and manage projects | Yes | Yes | Yes |
| View audits | Yes | Yes | Yes |
| Manage CAPA records | Yes | Yes | No |
| Organization settings | Yes | Yes | No |
| Invite new members | Yes | Yes | No |
| Transfer ownership | Yes | No | No |

The **Owner** is the primary account holder. There is one Owner per organization. **Admin** users can manage most settings and data. **Staff** users have read access plus document and project management.

### Navigation

The sidebar provides access to all portal sections:

| Menu Item | Route | Purpose |
|-----------|-------|---------|
| Dashboard | `/dashboard` | Home — compliance overview, stats, action items |
| Insurance | `/insurance` | Manage insurance policies |
| Staff | `/staff` | Manage team members and LBP credentials |
| Documents | `/documents` | Upload and manage quality documents |
| Suppliers | `/suppliers` | Approved supplier register |
| Projects | `/projects` | Project evidence repository |
| Audits | `/audits` | View audit schedule and results |
| CAPA | `/capa` | Corrective and preventive actions |
| Settings | `/settings` | Organization and personal settings |

---

## Dashboard

The **Dashboard** (`/dashboard`) is your home page after signing in. It provides an at-a-glance view of your compliance status.

### Stats Cards

Four summary cards across the top:

| Card | What It Shows |
|------|---------------|
| Insurance | Number of active insurance policies |
| Staff | Number of team members |
| Documents | Number of uploaded documents |
| Compliance | Overall compliance score percentage |

### Compliance Score

Your **compliance score** is calculated across 4 dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Documentation | 50% | Coverage across 19 ISO elements, approved documents |
| Insurance | 25% | Required policies, coverage amounts, expiry status |
| Personnel | 15% | Owner assigned, LBP verification, minimum staff |
| Audit | 10% | Last audit rating, overdue CAPAs |

The score determines your **certification tier**:

| Tier | Requirements |
|------|-------------|
| **Accredited** | Default tier for all members |
| **Certified** | 70%+ overall score, no critical issues |
| **Master Roofer** | 90%+ overall score, no critical issues, 2+ verified LBP holders |

### Dimension Indicators

Below the stats cards, you will see your individual scores for each of the 4 compliance dimensions. Each indicator shows the dimension score as a percentage.

### Expiring Insurance Widget

Policies expiring within 90 days appear here with:
- Policy type name
- Expiry date
- Days remaining
- Direct link to the policy

### Action Items

Issues identified by the compliance engine are listed with severity and a link to the relevant section. Critical issues (red) should be addressed first — they block tier promotion.

---

## Insurance

Navigate to **Insurance** (`/insurance`) from the sidebar.

### Insurance Overview

The insurance page lists all your active and expired policies. Each policy card shows the policy type, insurer, coverage amount, and expiry date with a colour-coded status badge.

### Adding a Policy

Click **Add Policy** (or navigate to `/insurance/new`). Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Policy Type | Yes | Public Liability, Professional Indemnity, Statutory Liability, Employers Liability, Motor Vehicle, or Contract Works |
| Policy Number | Yes | Your policy reference number |
| Insurer | Yes | Insurance company name |
| Broker Name | No | Insurance broker if applicable |
| Coverage Amount | Yes | Total coverage in NZD |
| Excess Amount | No | Policy excess in NZD |
| Effective Date | Yes | Policy start date |
| Expiry Date | Yes | Policy end date |
| Certificate | No | Upload a PDF or image of your certificate of currency |

Click **Save Policy** to create the record.

### Required Policies and Coverage Minimums

Three insurance types are **required** for compliance scoring. The minimum coverage amounts depend on your certification tier:

| Policy Type | Accredited | Certified | Master Roofer |
|-------------|-----------|-----------|---------------|
| Public Liability | $1,000,000 | $2,000,000 | $5,000,000 |
| Professional Indemnity | $500,000 | $1,000,000 | $2,000,000 |
| Statutory Liability | $500,000 | $1,000,000 | $1,000,000 |

Employers Liability, Motor Vehicle, and Contract Works are optional but recommended.

### Editing a Policy

Click on any policy card or navigate to `/insurance/[id]` to view and edit the policy details. You can update any field and re-upload the certificate.

### Deleting a Policy

On the policy detail page, click **Delete Policy**. You will be asked to confirm before the policy is removed.

### Expiry Tracking

The system automatically tracks policy expiry dates and sends alerts:

| Alert | When |
|-------|------|
| 90-day warning | 90 days before expiry |
| 60-day warning | 60 days before expiry |
| 30-day warning | 30 days before expiry |

Alerts are sent via email by default. SMS alerts can be enabled in **Settings**.

### Certificate Upload

Upload your certificate of currency as a PDF or image file (max 50 MB). The certificate is stored securely in encrypted cloud storage (Cloudflare R2).

---

## Staff

Navigate to **Staff** (`/staff`) from the sidebar.

### Staff Overview

The staff page lists all members of your organization. Each staff card shows the member's name, role, email, LBP number (if entered), and LBP verification status.

### Adding a Team Member

Click **Add Staff** (or navigate to `/staff/new`). Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| First Name | Yes | |
| Last Name | Yes | |
| Email | Yes | Must be unique within your organization |
| Phone | No | Contact number |
| Role | Yes | Owner, Admin, or Staff |
| LBP Number | No | Licensed Building Practitioner number |
| LBP Class | No | Carpentry, Roofing, Design 1-3, or Site 1-3 |

Click **Save** to create the team member record.

### LBP Verification

If an LBP number is entered, you can verify it against the MBIE LBP Register:

1. Click the **Verify LBP** button on the staff member's card or detail page
2. The system calls the MBIE API to check the licence status
3. The verification result is recorded with a timestamp

Possible LBP statuses returned:

| Status | Meaning |
|--------|---------|
| **Current** | Licence is valid and active |
| **Suspended** | Licence is temporarily suspended |
| **Cancelled** | Licence has been cancelled |
| **Expired** | Licence has expired |
| **Not Found** | No matching licence found in the MBIE register |

An expired or invalid LBP incurs a penalty on your Personnel compliance score.

### Editing a Team Member

Click on any staff card or navigate to `/staff/[id]` to view and edit the member's details.

### Qualifications

On the staff detail page, you can add qualifications for each team member:

| Field | Required | Notes |
|-------|----------|-------|
| Type | Yes | NZQA, Manufacturer Certification, Safety, First Aid, Site Safe, or Other |
| Title | Yes | Qualification name |
| Issuing Body | Yes | Organization that issued the qualification |
| Issue Date | Yes | Date the qualification was issued |
| Expiry Date | No | Date the qualification expires (if applicable) |
| Certificate | No | Upload a PDF or image of the certificate (max 50 MB) |

Certificates are stored securely in encrypted cloud storage (Cloudflare R2). A "Certificate" badge appears on qualifications that have an uploaded file.

#### Editing a Qualification

Click the **pencil icon** on any qualification card to edit it. The form pre-fills with the existing data. You can update any field and optionally upload a new certificate (which replaces the existing one).

#### Deleting a Qualification

Click the **trash icon** on any qualification card. You will be asked to confirm before the record is permanently deleted. If a certificate file was attached, it is also removed from storage.

### Training Records

Track continuing professional development (CPD) for each staff member:

| Field | Required | Notes |
|-------|----------|-------|
| Course Name | Yes | Name of the training course |
| Provider | Yes | Training provider name |
| Completed At | Yes | Date the training was completed |
| CPD Points | Yes | Number of CPD points earned |
| CPD Category | Yes | Technical, Peer Review, Industry Event, Self Study, or Other |
| Certificate | No | Upload a PDF or image of the training certificate (max 50 MB) |
| Notes | No | Additional information |

#### Editing a Training Record

Click the **pencil icon** on any training record card to edit it. You can update any field and optionally upload a new certificate.

#### Deleting a Training Record

Click the **trash icon** on any training record card. Confirm the deletion when prompted. The record and any attached certificate are permanently removed.

### Personnel Compliance Scoring

Your Personnel dimension score (15% of overall) is based on:
- Owner assigned: 30 points
- All LBP licences verified: 50 points (partial credit for some verified)
- Minimum 2 staff members: 20 points
- Expired LBP: -10 penalty

---

## Documents

Navigate to **Documents** (`/documents`) from the sidebar.

### Document Overview

The documents page lists all uploaded quality documents, grouped by ISO element. Each document card shows the title, document number (auto-generated, e.g., `QP-001-v1.0`), ISO element, document type, status, and upload date.

### The 19 ISO Elements

Documents are classified against 19 ISO 9000 quality management elements:

| # | Element | Typical Documents |
|---|---------|-------------------|
| 1 | Quality Policy | Statement of quality commitment |
| 2 | Quality Objectives | Measurable quality goals |
| 3 | Organizational Structure | Org chart, responsibility matrix |
| 4 | Process Management | Process maps, procedures |
| 5 | Documentation | Document control procedures |
| 6 | Training & Competence | Training records, competency matrices |
| 7 | Contract Review | Contract review procedures |
| 8 | Document Control | Version control, distribution lists |
| 9 | Purchasing | Approved supplier lists, PO procedures |
| 10 | Customer Product | Customer material handling procedures |
| 11 | Traceability | Product/material tracking procedures |
| 12 | Process Control | Work instructions, inspection plans |
| 13 | Inspection & Testing | Inspection checklists, test records |
| 14 | Nonconforming Product | NCR procedures, disposition records |
| 15 | Corrective Action | CAR procedures, root cause analysis |
| 16 | Handling & Storage | Material handling, storage procedures |
| 17 | Quality Records | Records retention, indexing |
| 18 | Internal Audits | Audit schedules, checklists, reports |
| 19 | Servicing | Warranty procedures, service records |

### Uploading a Document

Click **Upload Document** (or navigate to `/documents/upload`). Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Descriptive document title |
| ISO Element | Yes | Select from the 19 elements above |
| Document Type | Yes | Policy, Procedure, Form, Record, Certificate, or Other |
| File | Yes | Upload the document file (max 50 MB) |

The system automatically:
- Assigns a document number (e.g., `QP-001-v1.0`)
- Computes a SHA-256 hash for file integrity
- Stores the file in encrypted cloud storage
- Sets the status to **Draft**

### Document Templates

Navigate to **Templates** (`/documents/templates`) for guidance and downloadable starter templates for each of the 19 ISO elements.

Each element card shows:
- **Example documents** you should upload for that element
- **What auditors look for** during certification audits
- **RANZ guidance** on how to approach the element

Click **Download Template** to download a structured Markdown (.md) file for any element. The template includes:
- Pre-built section headings matching the required document types
- Placeholder text you replace with your business-specific content
- Role/responsibility tables, checklists, and sign-off blocks
- An auditor checklist reference so you can verify your document addresses all audit questions

Markdown files can be opened in Microsoft Word, Google Docs, or any text editor. Fill in the placeholders, save as PDF or Word, and upload using the **Upload** button.

### Document Types

| Type | Purpose |
|------|---------|
| **Policy** | High-level quality policies and commitments |
| **Procedure** | Step-by-step operational procedures |
| **Form** | Blank forms and checklists for daily use |
| **Record** | Completed forms, inspection records, evidence |
| **Certificate** | Certifications, accreditations, licences |
| **Other** | Any document that doesn't fit the above |

### Document Status Lifecycle

```
Draft → Pending Approval → Approved → Superseded
                                    → Archived
```

| Status | Meaning |
|--------|---------|
| **Draft** | Document uploaded, not yet submitted for approval |
| **Pending Approval** | Submitted for review |
| **Approved** | Reviewed and approved — counts towards compliance |
| **Superseded** | Replaced by a newer version |
| **Archived** | No longer active |

### Version Tracking

Each document maintains a version history. When you upload a new version:
- The version number increments (e.g., v1.0 → v2.0)
- The previous version is marked as **Superseded**
- The new version starts as **Draft**
- Change notes can be recorded for each version

### Document Compliance Scoring

Your Documentation dimension (50% of overall) is scored per element:
- Assessed element with score: uses the assessment score (0-100)
- No assessment but approved documents: 75 points
- No assessment but any documents uploaded: 25 points
- No documents at all: 0 points (generates a compliance issue)

Each element has a **weight** that affects its contribution to the overall Documentation score. Higher-weighted elements (e.g., Quality Policy at 1.5, Training & Competence at 1.4) have more impact than lower-weighted ones (e.g., Handling & Storage at 0.7).

---

## Suppliers

Navigate to **Suppliers** (`/suppliers`) from the sidebar.

### Supplier Overview

The approved supplier register lists all suppliers your business has evaluated and approved. Each supplier card shows the name, categories, status, rating, and next review date.

### Adding a Supplier

Click **Add Supplier** (or navigate to `/suppliers/new`). Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | Supplier business name |
| Contact Person | No | Primary contact at the supplier |
| Email | No | Supplier contact email |
| Phone | No | Supplier contact phone |
| Address | No | Supplier business address |
| Categories | No | Product/service categories (e.g., "Long-run steel", "Membranes") |
| APEX Certified | No | Whether the supplier holds APEX Group certification |
| APEX Cert ID | No | APEX certification reference number (if applicable) |
| Status | Yes | Approved, Conditional, Suspended, or Removed |
| Rating | No | 1-5 star rating |
| Evaluation Date | No | Date of last supplier evaluation |
| Next Review Date | No | When the supplier should next be reviewed |
| Evaluation Notes | No | Notes from the evaluation |

Click **Save** to add the supplier to your register.

### Supplier Statuses

| Status | Meaning |
|--------|---------|
| **Approved** | Supplier is fully approved for use |
| **Conditional** | Approved with conditions (e.g., limited scope, pending documentation) |
| **Suspended** | Temporarily suspended — do not use until reviewed |
| **Removed** | Removed from the approved supplier list |

### APEX Certification

APEX (Australian Product Excellence) certification indicates that a supplier's products meet industry quality standards. If a supplier is APEX certified, record their certification ID for traceability.

### Editing and Deleting Suppliers

Click on any supplier card or navigate to `/suppliers/[id]` to view and edit details. You can update all fields including status and rating. To remove a supplier, change their status to **Removed** or delete the record.

### Review Schedule

Set a **Next Review Date** for each supplier to prompt periodic re-evaluation. Keeping your supplier register current contributes to ISO Element 9 (Purchasing) compliance.

---

## Projects

Navigate to **Projects** (`/projects`) from the sidebar.

### Project Overview

The project evidence repository stores records of your completed and in-progress roofing projects. Each project card shows the project number (auto-generated, e.g., `PRJ-2026-001`), client name, site address, project type, and status.

### Creating a Project

Click **New Project** on the projects page. Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Client Name | Yes | Client's full name or company |
| Client Email | No | For testimonial requests |
| Client Phone | No | Contact number |
| Site Address | Yes | Project site street address |
| City | No | City or town |
| Region | No | Select from 16 NZ regions |
| Consent Number | No | Building consent reference |
| Start Date | Yes | Project start date |
| Completion Date | No | Project completion date |
| Project Type | Yes | New Build, Re-roof, Repair, Maintenance, Inspection, Warranty Claim, or Other |
| Roofing System | No | Description of roofing system used |
| Description | No | General project description |
| Zero Leaks | No | Zero leak guarantee (default: yes) |
| Warranty Years | No | Warranty period offered |

### Project Status Lifecycle

```
Draft → In Progress → Completed
                    → On Hold
                    → Cancelled
```

| Status | Meaning |
|--------|---------|
| **Draft** | Project created, not yet started |
| **In Progress** | Work is underway |
| **Completed** | Project finished |
| **On Hold** | Temporarily paused |
| **Cancelled** | Project cancelled |

### Project Photos

Upload photos to document the project at each stage:

| Category | Purpose |
|----------|---------|
| **Before** | Site conditions before work begins |
| **During** | Work in progress |
| **After** | Completed work |
| **Materials** | Materials and products used |
| **Safety** | Safety measures and PPE |
| **Issue** | Problems encountered |
| **Detail** | Close-up details |
| **Testimonial** | Client-facing photos |

Photos capture GPS coordinates and EXIF metadata when available.

### Project Documents

Attach supporting documents to each project:

| Document Type | Examples |
|---------------|---------|
| Quote | Project quote or estimate |
| Contract | Signed contract |
| Consent | Building consent |
| Specification | Project specification |
| Warranty | Warranty documentation |
| Sign-off | Client sign-off form |
| Invoice | Project invoice |
| Record of Work | Record of work for MBIE |
| Other | Any other document |

### Certified Products

Record the products used on each project for traceability (ISO Element 11):

| Field | Required | Notes |
|-------|----------|-------|
| Product Name | Yes | Name of the product |
| Manufacturer | Yes | Product manufacturer |
| Product Code | No | Manufacturer's product code |
| Batch Number | No | Batch/lot number for traceability |
| APEX Certified | No | Whether the product is APEX certified |
| APEX Cert ID | No | APEX certification ID if applicable |
| Justification | No | Required if the product is not APEX certified |
| Quantity | No | Amount used (e.g., "50 m²", "100 sheets") |

### Testimonial Requests

For completed projects, you can request a testimonial from your client. The system sends an email to the client with a link to the public testimonial submission page (`/testimonial/submit`). Verified testimonials appear on your public profile.

---

## Audits

Navigate to **Audits** (`/audits`) from the sidebar.

### Audit Overview

The audits page lists all audits for your organization — scheduled, in progress, and completed. Each audit card shows the audit number (e.g., `AUD-2026-001`), type, status, scheduled date, and rating (if completed).

### Audit Types

| Type | When It Happens |
|------|----------------|
| **Initial Certification** | First audit when joining the programme |
| **Surveillance** | Periodic check between full audits |
| **Recertification** | Full audit for tier renewal |
| **Follow-up** | Verifies corrective actions from a previous audit |
| **Special** | Triggered by complaints, incidents, or significant changes |

### Audit Status Lifecycle

```
Scheduled → In Progress → Pending Review → Completed
                                         → Cancelled
```

| Status | Meaning |
|--------|---------|
| **Scheduled** | Audit date set, not yet started |
| **In Progress** | Auditor is conducting the audit |
| **Pending Review** | Audit completed, awaiting final review |
| **Completed** | Audit fully completed with rating |
| **Cancelled** | Audit cancelled |

### Audit Checklist

During an audit, the auditor works through a checklist covering the ISO elements in scope. For each checklist item, they record:

| Field | What It Captures |
|-------|------------------|
| ISO Element | Which quality element is being assessed |
| Question | The specific audit question |
| Response | Conforming, Minor Non-conformity, Major Non-conformity, Observation, or N/A |
| Finding | Description of the finding |
| Severity | Observation, Minor, Major, or Critical |
| Evidence | Photos or document references |
| Auditor Notes | Additional notes from the auditor |

### Audit Ratings

| Rating | Meaning |
|--------|---------|
| **Pass** | All elements conforming — 100 points towards Audit dimension |
| **Pass with Observations** | Conforming with minor observations — 85 points |
| **Conditional Pass** | Non-conformities found, corrective actions required — 60 points |
| **Fail** | Significant non-conformities — 30 points |

### Audit Frequency

The time between scheduled audits depends on your certification tier:

| Tier | Audit Frequency |
|------|----------------|
| **Accredited** | Every 24 months |
| **Certified** | Every 12 months |
| **Master Roofer** | Every 12 months |

When an audit is completed, the system automatically calculates your next audit due date based on your tier.

### Follow-Up Audits

If an audit results in a **Conditional Pass** or **Fail** rating, the system automatically schedules a **Follow-Up** audit:
- The follow-up is scheduled **90 days** after the latest CAPA due date (giving time for corrective actions)
- The scope is limited to the specific ISO elements where non-conformities were found
- The follow-up audit appears in your Audits list with type "Follow-up"

### Audit Compliance Scoring

Your Audit dimension (10% of overall) is based on:
- Most recent audit rating (see points above)
- No completed audits: 50 points (baseline)
- Overdue audit (>365 days since last): -20 penalty
- Overdue CAPAs: -10 each

---

## CAPA

Navigate to **CAPA** (`/capa`) from the sidebar.

### What is CAPA?

CAPA stands for **Corrective and Preventive Action**. CAPAs are formal records of non-conformities found during audits or other reviews, along with the actions taken to correct them and prevent recurrence.

### CAPA Overview

The CAPA page lists all corrective action records for your organization. Each card shows the CAPA number (e.g., `CAPA-2026-001`), title, severity, status, due date, and assigned person.

### Creating a CAPA

CAPAs can be created from:
- An audit finding (linked to the source audit)
- A customer complaint
- An internal review
- An incident
- Other sources

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Short description of the non-conformity |
| Description | Yes | Detailed description of the issue |
| Source Type | Yes | Audit, Customer Complaint, Internal Review, Incident, or Other |
| Source Audit | No | Link to the originating audit (if applicable) |
| ISO Element | No | Which quality element is affected |
| Severity | Yes | Observation, Minor, Major, or Critical |
| Due Date | Yes | Deadline for completion |
| Assigned To | No | Person responsible for resolution |
| Root Cause | No | Root cause analysis |
| Corrective Action | No | Immediate correction taken |
| Preventive Action | No | Action to prevent recurrence |

### Severity Levels

| Severity | Meaning |
|----------|---------|
| **Observation** | Opportunity for improvement, not a non-conformity |
| **Minor** | Isolated non-conformity that does not affect system effectiveness |
| **Major** | Systematic failure or significant non-conformity |
| **Critical** | Immediate risk to quality, safety, or compliance |

### CAPA Status Lifecycle

```
Open → In Progress → Pending Verification → Closed
                                           → Overdue
```

| Status | Meaning |
|--------|---------|
| **Open** | CAPA created, not yet started |
| **In Progress** | Corrective/preventive actions being implemented |
| **Pending Verification** | Actions completed, awaiting verification |
| **Closed** | Verified and closed — no further action |
| **Overdue** | Past the due date and not yet closed |

### Verification

Once corrective and preventive actions are implemented, a verifier (typically the auditor or an admin) reviews the evidence and records:
- Verified by (name)
- Verification date
- Verification notes

Overdue CAPAs incur a -10 penalty on your Audit compliance dimension for each overdue record.

---

## Settings

Navigate to **Settings** (`/settings`) from the sidebar.

### Organization Profile

Update your business information:
- Business name and trading name
- NZBN
- Email and phone
- Address and city
- Company description (displayed on public verification page)
- Company logo upload

### Notification Preferences

Configure how you receive alerts:

**Email Notifications**
- Insurance expiry alerts
- Audit scheduling alerts
- Compliance alerts
- Newsletter and updates

**SMS Notifications** (optional)
- Insurance expiry alerts
- Audit alerts
- Critical alerts only
- SMS phone number

### Personal Settings

Update your personal details:
- Name
- Email
- Phone

---

## Compliance Scoring

### How the Score Works

Your overall compliance score is a weighted average of 4 dimensions:

```
Overall = (Documentation × 50%) + (Insurance × 25%) + (Personnel × 15%) + (Audit × 10%)
```

### Documentation Dimension (50%)

Each of the 19 ISO elements has a weight (ranging from 0.7 to 1.5). The Documentation score is the weighted average of all element scores.

**Element scoring:**
- Element has an assessment with score: uses that score (0-100)
- No assessment but has approved documents: 75 points
- No assessment but has any documents: 25 points
- No documents at all: 0 points (generates a critical issue)

**Higher-weighted elements** (more impact on your score):
- Quality Policy (1.5), Training & Competence (1.4), Inspection & Testing (1.4)
- Process Management (1.3), Process Control (1.3), Internal Audits (1.3)

### Insurance Dimension (25%)

Each required policy type is scored individually:
- Valid policy meeting tier minimum: 100 points
- Valid but expiring within 60 days: 85 points
- Valid but expiring within 30 days: 70 points
- Valid but below tier minimum coverage: 50 points
- Missing required policy: 0 points (generates a critical issue)

### Personnel Dimension (15%)

| Criterion | Points |
|-----------|--------|
| Owner role assigned | 30 |
| All LBP licences verified | 50 (partial credit for some verified) |
| Minimum 2 staff members | 20 |
| Expired LBP licence | -10 penalty |

### Audit Dimension (10%)

| Criterion | Points |
|-----------|--------|
| Most recent audit: Pass | 100 |
| Most recent audit: Pass with Observations | 85 |
| Most recent audit: Conditional Pass | 60 |
| Most recent audit: Fail | 30 |
| No completed audits | 50 (baseline) |
| Overdue audit (>365 days) | -20 penalty |
| Overdue CAPA (each) | -10 penalty |

### Status Thresholds

| Score Range | Status | Colour |
|-------------|--------|--------|
| 90-100% | Compliant | Green |
| 70-89% | At Risk | Yellow |
| Below 70% | Critical | Red |

### Improving Your Score

1. **Upload documents** against all 19 ISO elements — even uploading a draft document earns 25 points per element
2. **Get documents approved** — approved documents earn 75 points per element
3. **Add all required insurance** policies with adequate coverage amounts
4. **Verify LBP licences** for all staff who hold them
5. **Ensure you have at least 2 staff** members registered
6. **Close overdue CAPAs** — each overdue CAPA costs 10 points on your Audit dimension
7. **Schedule and complete audits** — a recent Pass rating earns full Audit dimension points

---

## Public Verification

Your business can be verified by consumers and other businesses through:

- **Public verification page**: `/verify/[businessId]` — shows your business name, certification tier, compliance status, and verified testimonials
- **Public search**: `/search` — search for certified RANZ businesses by name or region

---

## Related Guides

- [Quick Start Guide](./quick-start.md) — Get started in 5 minutes
- [Admin Guide](./admin-guide.md) — For RANZ administrators
- [FAQ](./faq.md) — Common questions and troubleshooting
