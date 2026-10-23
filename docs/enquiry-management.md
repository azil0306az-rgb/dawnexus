# Enquiry Management Pipeline

**Document Version:** 8.3.0 Baseline Draft  
**Inspected Commit:** `e51b0240be6b8a00e491909013475be062c92f5b`  
**Authoritative Backend Files:** `server/routes/api.ts`, `server/routes/admin.ts`, `server/email.ts`, `server/db.ts`  
**Authoritative Frontend Components:** `src/components/public/ContactForm.tsx`, `src/components/admin/EnquiryDetailModal.tsx`, `src/components/admin/AdminDashboard.tsx`

---

## 1. Overview & Visitor Funnel

The enquiry pipeline converts public website interest into qualified agency leads. It handles form submissions from the homepage contact section, the interactive Website Cost Calculator, the AI Chat Assistant, and authorized MCP operations.

```mermaid
flowchart TD
    Visitor([Website Visitor]) --> Form[ContactForm / Calculator]
    Form -->|POST /api/enquiries| Limiter[Rate Limiter (5 per 15m)]
    Limiter --> Honeypot{Honeypot Triggered?}
    Honeypot -->|Yes| BotDrop[Silent Fake 200 Drop]
    Honeypot -->|No| Validation{Field Validation}
    Validation -->|Invalid Phone / Budget| FailResponse[HTTP 400 Bad Request]
    Validation -->|Valid| Idempotency{Idempotency Key Exists?}
    Idempotency -->|Yes (Duplicate)| ReturnExisting[Return Existing Enquiry]
    Idempotency -->|No (Fresh)| InsertDB[Insert into enquiries Table]
    InsertDB --> SyncPG[Async Persist to Supabase PG]
    InsertDB --> NotificationCheck{Notification Active?}
    NotificationCheck -->|Yes| DispatchEmail[Send Email via Resend / SMTP]
    NotificationCheck -->|No| SkipNotification[Log Notice & Proceed]
    InsertDB --> ReturnSuccess[HTTP 201 Created]
```

---

## 2. Ingestion & Strict Validation Rules

### 2.1 Field Specifications (`POST /api/enquiries`)
1. **Full Name:** Required string, length between 2 and 100 characters.
2. **Email Address:** Valid RFC 5322 format.
3. **Mobile Phone Number (Indian Standard):**
   - Validated against strict regex: `/^(\+91)?[6-9]\d{9}$/`.
   - Foreign country codes (+1, +44, etc.) and invalid digit lengths are rejected.
   - Cleaned to standard format (`+91XXXXXXXXXX`).
4. **Budget (Indian Rupees ₹):**
   - Restricted to standard agency brackets:
     - `'Under ₹25,000'`
     - `'₹25,000 - ₹50,000'`
     - `'₹50,000 - ₹1,00,000'`
     - `'₹1,00,000 - ₹2,50,000'`
     - `'₹2,50,000+'`
5. **Services:** Selected array of core agency offerings.
6. **Project Description / Message:** Sanitized text, maximum 5,000 characters.

### 2.2 Bot Defense & Silent Honeypot
- The form includes a hidden honeypot input field (`website_hp`).
- Legitimate human visitors leave this field empty.
- Automated scrapers that populate this field trigger silent suppression: the server logs `[Spam Detection] Honeypot triggered` and returns an immediate HTTP 200 with zero database writes or email dispatches.

### 2.3 Idempotency & Duplicate Prevention
- Clients provide an `idempotency_key` or `estimate_ref_id` (e.g. `DNX-EST-XXXXX`).
- If a matching record already exists in the `enquiries` table, the server returns the existing record (`HTTP 200`) without creating duplicate records or sending repeated emails.

---

## 3. Database Schema (`enquiries` Table)

| Column Name | Data Type | Nullability | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique enquiry identifier. |
| `name` | `TEXT` | `NOT NULL` | Lead contact name. |
| `email` | `TEXT` | `NOT NULL` | Lead contact email. |
| `phone` | `TEXT` | `NULL` | Formatted Indian phone number. |
| `services` | `TEXT` | `NOT NULL` | Comma-separated or JSON list of requested services. |
| `budget` | `TEXT` | `NOT NULL` | Selected INR budget tier. |
| `message` | `TEXT` | `NOT NULL` | Project specifications and requirements. |
| `status` | `TEXT` | `'Unread'` | `'Unread'`, `'Contacted'`, `'Archived'`. |
| `admin_notes` | `TEXT` | `NULL` | Internal notes added by agency staff. |
| `idempotency_key`| `TEXT` | `NULL UNIQUE` | Client request deduplication token. |
| `estimate_ref_id`| `TEXT`| `NULL` | Quotation ID generated from the Cost Calculator. |
| `estimate_data` | `TEXT` | `NULL` | JSON snapshot of calculator line-item selections. |
| `created_at` | `TEXT` | `CURRENT_TIMESTAMP` | Submission timestamp. |
| `updated_at` | `TEXT` | `CURRENT_TIMESTAMP` | Last status update timestamp. |

---

## 4. Notification Engine (`server/email.ts`)

1. Upon successful persistence, the backend calls `sendEnquiryNotification(newEnquiry)`.
2. The service checks `notification_settings` in SQLite:
   - Must have `is_active = 1`.
   - Must have a verified recipient email confirmed via OTP verification challenge.
3. If an email provider is configured (`RESEND_API_KEY` or `SMTP_HOST`), a styled transactional HTML notification is delivered.
4. If no external mail provider is configured, the system logs a notice and continues without throwing an uncaught exception.

---

## 5. Administrative Controls (`/admin?tab=enquiries`)

Administrators have access to:
- **Search & Filtering:** Search by lead name, email, or phone; filter by status (`Unread`, `Contacted`, `Archived`).
- **Enquiry Detail Modal (`EnquiryDetailModal.tsx`):** View full project message, calculator line-item breakdowns, and update internal admin notes.
- **Status Updates:** One-click toggling between `Unread`, `Contacted`, and `Archived` via `PATCH /api/admin/enquiries/:id`.
- **CSV Export:** Download a complete, RFC 4180 compliant CSV export via `GET /api/admin/export`.
- **Permanent Deletion:** Secure deletion modal requiring explicit confirmation via `DELETE /api/admin/enquiries/:id`.

---

## 6. MCP Tools Integration

Connected AI models can interact with the enquiry pipeline using these 5 tools:
1. `enquiries_admin_list`: Fetches enquiries with status filters.
2. `list_authorized_enquiries`: Paginated query of authorized leads.
3. `get_authorized_enquiry`: Full details of an individual enquiry.
4. `create_enquiry`: Submits an enquiry on behalf of a user.
5. `get_enquiry_submission_status`: Verifies submission and delivery state.

