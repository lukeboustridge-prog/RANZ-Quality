# FAQ & Troubleshooting

Common questions and solutions for the RANZ Quality Program portal.

---

## Account & Access

### How do I reset my password?

Your account is managed through **Clerk**. To reset your password:

1. Go to **portal.ranz.org.nz**
2. Click **Sign In**, then **Forgot Password**
3. Follow the email instructions to set a new password

Your new password applies to the Quality Program portal and any connected RANZ applications (e.g., reports.ranz.org.nz) via SSO.

### Why does reports.ranz.org.nz use my portal login?

The Roofing Report app operates as a **satellite domain** of the Quality Program portal. Authentication is handled by the primary portal (portal.ranz.org.nz). Once signed in to the portal, you are automatically authenticated on reports.ranz.org.nz.

### How do I switch between organizations?

If you are a member of multiple organizations, use the **organization switcher** in the header. Select the organization you want to view, and the dashboard and all data will update to reflect that organization.

### What are the different roles and what can they do?

There are two levels of roles:

**Organization roles** (for member businesses):

| Role | Access |
|------|--------|
| **Owner** | Full access, can transfer ownership |
| **Admin** | Full access except ownership transfer |
| **Staff** | View dashboard, manage documents and projects |

**System roles** (for RANZ staff):

| Role | Access |
|------|--------|
| **ranz:auditor** | View all members, conduct audits, manage CAPAs |
| **ranz:admin** | Full admin access including user management, reports, and audit logs |

---

## Insurance

### What insurance types are required?

Three policies are **required** for compliance scoring:
- **Public Liability**
- **Professional Indemnity**
- **Statutory Liability**

Three additional types are optional but recommended:
- Employers Liability
- Motor Vehicle
- Contract Works

### What are the minimum coverage amounts?

Coverage minimums depend on your certification tier:

| Policy Type | Accredited | Certified | Master Roofer |
|-------------|-----------|-----------|---------------|
| Public Liability | $1,000,000 | $2,000,000 | $5,000,000 |
| Professional Indemnity | $500,000 | $1,000,000 | $2,000,000 |
| Statutory Liability | $500,000 | $1,000,000 | $1,000,000 |

If your coverage is below the minimum for your current tier, you receive partial credit (50 points instead of 100).

### What file formats can I upload for insurance certificates?

You can upload any common file format including PDF, JPEG, PNG, and other image formats. The maximum file size is **50 MB**.

### When do I get expiry notifications?

The system sends automatic alerts at three intervals:
- **90 days** before expiry
- **60 days** before expiry
- **30 days** before expiry

Alerts are sent via email by default. Enable SMS alerts in **Settings** (`/settings`) to receive text messages as well.

### What happens when a policy expires?

An expired policy scores 0 points for that insurance type and generates a **critical** compliance issue. Your Insurance dimension score drops, which affects your overall compliance score and may impact your certification tier.

---

## Staff & LBP

### How does LBP verification work?

When you enter an LBP number for a staff member and click **Verify LBP**, the system calls the MBIE Licensed Building Practitioners Register API to check the licence status. The result (Current, Suspended, Cancelled, Expired, or Not Found) is recorded with a timestamp.

### How often should I re-verify LBP licences?

LBP statuses can change at any time. We recommend verifying at least **quarterly**, or whenever you receive notification of a status change from MBIE.

### What qualifications can I record?

Six qualification types are supported:
- **NZQA** — New Zealand Qualifications Authority qualifications
- **Manufacturer Certification** — Product-specific training from manufacturers
- **Safety** — Health and safety certifications
- **First Aid** — First aid certificates
- **Site Safe** — Site Safe NZ certifications
- **Other** — Any other relevant qualification

You can also upload a certificate file (PDF or image, max 50 MB) when adding or editing a qualification.

### Can I edit or delete qualifications and training records?

Yes. Each qualification and training record card has **edit** (pencil icon) and **delete** (trash icon) buttons. Editing opens the form pre-filled with existing data. Deleting asks for confirmation and permanently removes the record and any attached certificate.

### What CPD categories are available?

Training records can be classified under five CPD categories:
- **Technical** — Technical skills and product knowledge
- **Peer Review** — Peer review and mentoring activities
- **Industry Event** — Conferences, trade shows, workshops
- **Self Study** — Independent learning and research
- **Other** — Any other professional development

### How does the Personnel score work?

Your Personnel dimension (15% of overall compliance) is scored as follows:
- Owner role assigned: 30 points
- All LBP licences verified: 50 points (partial credit for some verified)
- Minimum 2 staff members: 20 points
- Expired LBP licence: -10 penalty per expired licence

---

## Documents

### What file types can I upload?

Any file type is accepted. Common formats include PDF, Word (.docx), Excel (.xlsx), images (JPEG, PNG), and text files. The maximum file size is **50 MB**.

### Can I download document templates?

Yes. Navigate to **Documents > Templates** (`/documents/templates`) and click **Download Template** on any ISO element. A structured Markdown file downloads with pre-built headings, placeholder sections, and auditor checklist references. Open it in Word, Google Docs, or any text editor, fill in the placeholders, and upload the completed document.

### What are the 19 ISO elements?

The ISO 9000 quality management system is structured around 19 elements, each addressing a different aspect of quality management. See the [Member Guide — The 19 ISO Elements](./member-guide.md#the-19-iso-elements) for the complete list and descriptions.

### What's the difference between document types?

| Type | When to Use |
|------|-------------|
| **Policy** | High-level statements of intent (e.g., "Our quality policy is...") |
| **Procedure** | Step-by-step instructions for processes |
| **Form** | Blank templates for daily use (checklists, inspection forms) |
| **Record** | Completed forms — evidence of work done |
| **Certificate** | Formal certifications and accreditations |
| **Other** | Anything that doesn't fit the above categories |

### How does document approval work?

Documents follow this lifecycle:
1. **Draft** — Uploaded, editable
2. **Pending Approval** — Submitted for review
3. **Approved** — Accepted — earns 75 compliance points for its ISO element
4. **Superseded** — Replaced by a newer version
5. **Archived** — No longer active

### How are document numbers generated?

Document numbers are auto-generated in the format `QP-NNN-vX.Y` (e.g., `QP-001-v1.0`). The number is assigned when the document is first uploaded and the version increments with each update.

---

## Suppliers

### What should I track in the supplier register?

Record all suppliers whose products or services directly affect your roofing work quality. This typically includes:
- Material suppliers (steel, membranes, fasteners, sealants)
- Sub-contractors
- Equipment hire companies
- Specialist service providers

### What is APEX certification?

APEX (Australian Product Excellence) is a product certification programme. If a supplier's products are APEX certified, record the certification ID for traceability. Using APEX-certified products demonstrates commitment to quality under ISO Element 9 (Purchasing).

### How often should I review suppliers?

Set a **Next Review Date** for each supplier. Annual reviews are recommended as a minimum. Factors that may trigger an earlier review include:
- Quality issues with supplied products
- Changes to the supplier's certification status
- Significant changes to the supplier's business

---

## Compliance Score

### How is my compliance score calculated?

Your overall score is a weighted average of 4 dimensions:

| Dimension | Weight |
|-----------|--------|
| Documentation | 50% |
| Insurance | 25% |
| Personnel | 15% |
| Audit | 10% |

See the [Member Guide — Compliance Scoring](./member-guide.md#compliance-scoring) section for the full breakdown.

### Why did my score change?

Common reasons your score may have changed:
- An insurance policy expired or is approaching expiry
- An LBP licence expired or was re-verified with a different status
- A document was approved (score increase) or archived (score decrease)
- A CAPA became overdue
- An audit was completed with a new rating

The dashboard **Action Items** section highlights the specific issues affecting your score.

### How do I improve my score quickly?

The fastest ways to improve your compliance score:

1. **Upload missing insurance** — Each missing required policy costs you heavily on the Insurance dimension (25% weight)
2. **Verify LBP licences** — Unverified LBPs reduce your Personnel score
3. **Upload documents** against empty ISO elements — Even a draft document earns 25 points per element
4. **Close overdue CAPAs** — Each overdue CAPA costs -10 on your Audit dimension

### How do I get promoted to a higher tier?

| Tier | Requirements |
|------|-------------|
| **Certified** | 70%+ overall score, no critical compliance issues |
| **Master Roofer** | 90%+ overall score, no critical issues, 2+ verified LBP holders |

Tier promotion is assessed automatically when your compliance score is recalculated.

---

## Projects & Testimonials

### How do I request a testimonial from a client?

On a completed project, use the testimonial request feature. The system sends an email to the client with a link to the public testimonial submission page (`/testimonial/submit`). The client can:
- Rate your work (1-5 stars)
- Write a testimonial
- Verify their submission via email

### How are testimonials verified?

When a client submits a testimonial, a verification email is sent to their email address. Once they click the verification link, the testimonial is marked as verified. Verified testimonials can then be approved by the business owner and displayed on the public verification page.

---

## Troubleshooting

### Common Errors

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Failed to create organization" on onboarding | Session not propagated | Wait a moment and try again; ensure you are signed in |
| Dashboard shows "Redirect to /onboarding" | No organization linked to your account | Complete the onboarding process at `/onboarding` |
| Insurance upload fails | File too large | Reduce file size to under 50 MB |
| LBP verification returns "Not Found" | Incorrect LBP number | Double-check the LBP number against the MBIE register at lbp.govt.nz |
| Compliance score shows 0% | No data entered yet | Add insurance, staff, and documents to start building your score |
| Cannot access admin pages | Missing system role | Contact a RANZ administrator to assign `ranz:admin` or `ranz:auditor` role |
| SMS alerts not received | SMS not enabled or wrong number | Check notification preferences in Settings; verify phone number format |
| Document version not updating | Browser cache | Hard refresh the page (Ctrl+Shift+R) or clear browser cache |

### Browser Compatibility

The portal is built with modern web technologies and works best in:
- Google Chrome (latest)
- Microsoft Edge (latest)
- Mozilla Firefox (latest)
- Apple Safari (latest)

### File Upload Limits

- Maximum file size: **50 MB** per file
- Supported: All common file types (PDF, DOCX, XLSX, JPEG, PNG, etc.)
- Files are stored with AES-256 encryption in Cloudflare R2

---

## Need More Help?

- **Full Member Guide**: [member-guide.md](./member-guide.md)
- **Admin Guide**: [admin-guide.md](./admin-guide.md)
- **Quick Start**: [quick-start.md](./quick-start.md)
- **Platform support**: Contact your RANZ administrator or email support@ranz.org.nz
