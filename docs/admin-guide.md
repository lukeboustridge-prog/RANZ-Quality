# Admin Guide

Guide for RANZ staff with `ranz:admin` or `ranz:auditor` access to the Quality Program portal.

---

## Role Requirements

Access to the admin panel requires a RANZ system-level role, separate from the organization-level roles (Owner/Admin/Staff):

| Capability | ranz:auditor | ranz:admin |
|-----------|-------------|------------|
| View admin dashboard | Yes | Yes |
| View all member businesses | Yes | Yes |
| View compliance breakdowns | Yes | Yes |
| Conduct audits | Yes | Yes |
| Create/manage CAPA records | Yes | Yes |
| Manage users (create, edit, disable) | No | **Yes** |
| Import users from CSV | No | **Yes** |
| Generate and download reports | No | **Yes** |
| View audit logs | No | **Yes** |
| View activity dashboard | No | **Yes** |
| View SMS delivery logs | No | **Yes** |
| Organization audit trail | Yes | Yes |

---

## Admin Dashboard

Navigate to **Admin** (`/admin`) from the admin navigation. The dashboard provides a platform-wide overview of all RANZ member businesses.

### Stats Cards

Four summary cards across the top:

| Card | What It Shows |
|------|---------------|
| **Total Members** | Total registered organizations, with Master Roofer count |
| **Avg Compliance** | Average compliance score across all members, with percentage fully compliant |
| **Open CAPAs** | Total open corrective actions, with overdue count highlighted in red |
| **Upcoming Audits** | Audits scheduled in the next 30 days |

### Compliance Status Panel

Shows the distribution of members across compliance levels:
- **Compliant (90%+)** — Members meeting all requirements
- **At Risk (70-89%)** — Members needing attention
- **Critical (<70%)** — Members requiring immediate action

Click **View Critical Members** to filter the members list to critical-status organizations.

### Alerts & Actions Panel

Active alerts appear here:
- **Expiring Insurance** — Number of policies expiring in the next 30 days
- **Overdue CAPAs** — Corrective actions past their due date
- **Unverified LBP** — Staff with unverified LBP credentials

If no alerts are active, a green "All Systems Healthy" message is displayed.

### Certification Tier Distribution

A visual breakdown showing how many members are at each tier:
- **Accredited** — Entry level
- **Certified** — 70%+ compliance
- **Master Roofer** — 90%+ compliance with verified LBP holders

---

## Member Management

Navigate to **Members** (`/admin/members`) from the admin sidebar.

### Viewing All Members

The members page lists all registered organizations with:
- Business name
- Certification tier badge
- Compliance score
- Compliance status (Compliant / At Risk / Critical)
- Dimension scores (Documentation, Insurance, Personnel, Audit)

### Filtering and Sorting

Use the filters to narrow the list:
- **Tier filter** — Show only Accredited, Certified, or Master Roofer members
- **Status filter** — Show only Compliant, At Risk, or Critical members (e.g., `/admin/members?status=critical`)

### Organization Audit Trail

Click on any member to view their detail page. Navigate to the **Audit** tab (`/admin/organizations/[id]/audit`) to view:
- Complete audit history for the organization
- Compliance assessment records
- CAPA records linked to audits

### CSV Export

Export the member list as a CSV file for reporting. The export includes business name, tier, compliance score, dimension scores, and contact details.

---

## User Management

Navigate to **Users** (`/admin/users`) from the admin sidebar.

### Viewing All Users

The users page lists all registered users across all organizations:
- Name and email
- Organization name
- Role (organization-level and system-level)
- Account status
- Last login date

### Creating a User

Click **Create User** (or navigate to `/admin/users/create`) to add a new user:

| Field | Required | Notes |
|-------|----------|-------|
| Email | Yes | User's email address |
| First Name | Yes | |
| Last Name | Yes | |
| Phone | No | Contact number |
| User Type | Yes | Member Company Admin, Member Company User, RANZ Admin, RANZ Staff, RANZ Inspector, or External Inspector |
| Company | No | Associate with an existing organization (for member users) |
| Status | Yes | Pending Activation, Active, Suspended, or Deactivated |

### Importing Users from CSV

Navigate to **Import Users** (`/admin/users/import`) to bulk-create users from a CSV file. The CSV should include columns for email, first name, last name, phone, user type, and company association.

### Editing a User

Click on any user or navigate to `/admin/users/[id]` to view and edit:
- Personal details (name, email, phone)
- User type and role
- Account status
- Organization association
- Login history (last login, failed attempts)
- Account security (locked status)

### Enabling and Disabling Users

On the user detail page, change the account status:

| Status | Effect |
|--------|--------|
| **Pending Activation** | User has been created but has not yet logged in |
| **Active** | Normal active account |
| **Suspended** | Temporarily blocked from logging in |
| **Deactivated** | Permanently disabled |

### Unlocking Accounts

If a user's account is locked due to too many failed login attempts, you can unlock it from the user detail page by resetting the failed login counter and clearing the lock timestamp.

---

## Reports

Navigate to **Reports** (`/admin/reports`) from the admin sidebar.

### Report Types

Eight report types are available, each providing different insights:

| Report | Description |
|--------|-------------|
| **Compliance Summary** | Member compliance scores, distributions, and trends |
| **Member Directory** | Complete list of members with contact details and certification status |
| **Audit Summary** | Audit statistics, findings analysis, and pass rates |
| **Insurance Status** | Insurance policy status and expiry tracking |
| **LBP Status** | Licensed Building Practitioner verification status |
| **CAPA Summary** | Corrective action tracking and resolution metrics |
| **Project Portfolio** | Member project statistics and quality metrics |
| **Tier Analysis** | Comparison of metrics across certification tiers |

### Generating a Report

1. Optionally select a **tier filter** (All Tiers, Master Roofer, Certified, or Accredited)
2. Click on the report card you want to generate
3. The report data loads and is displayed in the panel below
4. Click **Download JSON** to save the report data

### Report Data Views

Some reports include structured visualisations:

**Compliance Summary** shows:
- Total members, average compliance, score distribution
- Breakdown by tier, insurance status, and LBP status
- Lowest scoring ISO elements across all members

**Tier Analysis** shows:
- Per-tier comparison of member count, average compliance, staff count, document count, and audit pass rate

**Audit Summary** shows:
- Total audits, average findings by severity
- Breakdown by status and rating

### Filters

All reports support tier filtering. Select a tier from the dropdown before generating to scope the report to a specific certification level.

---

## Audit Logs

Navigate to **Audit Logs** (`/admin/audit-logs`) from the admin sidebar.

### What Gets Logged

Every significant action in the portal is recorded in an immutable audit log with hash-chain integrity:

| Action | What Gets Recorded |
|--------|-------------------|
| **Create** | New records created (documents, insurance, staff, etc.) |
| **Update** | Field changes with previous and new values |
| **Delete** | Records removed, with the deleted state |
| **Approve** | Document or CAPA approvals |
| **Reject** | Document rejections with reason |
| **Verify** | LBP verification results |
| **Login/Logout** | Authentication events |
| **Export** | Data exports and report generation |
| **LBP Verify** | MBIE API verification calls |
| **Audit Start/Complete** | Audit lifecycle events |

### Log Entry Details

Each audit log entry includes:
- **Event ID** — Unique identifier
- **Actor** — User ID, email, and role of the person who performed the action
- **Action** — What was done (Create, Update, Delete, etc.)
- **Resource** — The type and ID of the affected record
- **State Change** — Previous and new state (JSON)
- **Metadata** — Additional context
- **IP Address** — Source IP of the request
- **User Agent** — Browser/client information
- **Timestamp** — When the action occurred
- **Hash** — SHA-256 hash for tamper detection
- **Previous Hash** — Link to the previous log entry (hash chain)

### Filtering

Filter audit logs by:
- Date range
- Actor (user)
- Action type
- Resource type
- Resource ID

### Tamper Detection

Each log entry contains a SHA-256 hash computed from its contents and a reference to the previous entry's hash. This creates an immutable hash chain — any modification to a historical entry would break the chain and be detectable.

---

## Activity Dashboard

Navigate to **Activity** (`/admin/activity`) from the admin sidebar.

### Login Trends

View login activity across the platform:
- Successful logins over time
- Failed login attempts
- Peak usage times

### Failed Attempts

Monitor for potential security concerns:
- Users with multiple failed login attempts
- Locked accounts
- Unusual login patterns

### Security Alerts

Active security alerts include:
- Accounts locked due to failed attempts
- Unusual login activity (new IP, new device)
- Deactivated accounts with recent login attempts

---

## Notifications

### SMS Delivery Logs

Navigate to **SMS Logs** (`/admin/notifications/sms`) from the admin sidebar.

View the delivery status of all SMS notifications sent through the platform:
- Recipient phone number
- Notification type (insurance expiry, audit reminder, etc.)
- Status (Pending, Queued, Sent, Delivered, Failed, Cancelled)
- Sent timestamp
- Delivery timestamp
- Failure reason (if applicable)

### Troubleshooting Failed Messages

Common SMS delivery failures:

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Status: Failed | Invalid phone number | Verify the phone number format (NZ mobile: 02X XXX XXXX) |
| Status: Failed | Carrier rejection | Contact the user to verify their number accepts SMS |
| Status: Queued (stuck) | Provider issue | Check Twilio service status; retry will occur automatically |
| Not sent at all | SMS disabled | Check the organization's notification preferences |
| Not sent at all | No phone number | Ensure the user or organization has a phone number configured |

---

## Related Guides

- [Quick Start Guide](./quick-start.md) — Get started in 5 minutes
- [Member Guide](./member-guide.md) — Full member business workflow
- [FAQ](./faq.md) — Common questions and troubleshooting
