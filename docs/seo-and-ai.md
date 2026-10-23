# Advanced SEO and AI Studio

**Document Version:** 8.3.0 Baseline Draft  
**Inspected Commit:** `e51b0240be6b8a00e491909013475be062c92f5b`  
**Authoritative Backend Files:** `server/seoQualityService.ts`, `server/seoScorer.ts`, `server/jsonLdService.ts`, `server/payloadAudit.ts`, `server/routes/admin.ts`  
**Authoritative Frontend Components:** `src/components/admin/AdvancedSeoDashboard.tsx`, `src/components/admin/SeoWritingAssistant.tsx`

---

## 1. Overview & Architecture

The Advanced SEO & AI Studio (`/admin?tab=advanced-seo`) provides audit, measurement, and maintenance tooling across the entire content inventory. It focuses on:
- Conventional Technical SEO optimization (title, meta, keywords, heading hierarchy, internal links).
- Information Gain & E-E-A-T analysis (firsthand observations, original data, answer blocks).
- Content freshness and 30/90-day review cycles.
- AI Search & Citation readiness (Google AI Overviews, Perplexity, ChatGPT Search tracking).
- HTML payload threshold monitoring (< 2 MB per route).
- Schema.org JSON-LD structured data validation (with zero fabricated reviews enforcement).
- Contextual CTA configuration for lead conversion.

---

## 2. Feature-by-Feature Implementation Breakdown

### 2.1 Article Selection & Real-Time Audit
- **Intended Behavior:** The administrator selects any published or draft blog from a dropdown/list. The system instantly loads its fields and evaluates both technical SEO and Information Gain metrics.
- **Trigger:** Selecting an article in the dropdown triggers `setSelectedBlogForAudit(blog)` in `AdvancedSeoDashboard.tsx` or calling `GET /api/admin/seo-quality/audit/:id`.
- **Backend Service:** `assessInformationGain(blog)` in `server/seoQualityService.ts`.
- **Calculation / Output:** Computes `overallScore` (0–100), criteria scores for 6 dimensions (firsthand observations, case studies, original research, answer blocks, source citations, visual evidence), and returns gap recommendations.
- **Persistence:** Results can be saved to the `seo_report` column of the `blogs` table.
- **Status:** **Verified Working**.

### 2.2 Content Freshness & 30/90-Day Review Cycle
- **Intended Behavior:** Flags articles whose factual content has not been reviewed within 30 days (for fast-moving AI topics) or 90 days (standard evergreen topics).
- **Trigger:** Switching to the **Freshness** tab in `AdvancedSeoDashboard.tsx` calls `GET /api/admin/seo-quality/freshness`.
- **Backend Service:** `getBlogsRequiringReview()` in `server/db.ts` / `server/seoQualityService.ts`.
- **Calculation:** Compares `last_reviewed_at || updated_at || published_at` against the current timestamp. Calculates `days_since_review` and marks `is_overdue = days_since_review > 90`.
- **Action:** Clicking **"Mark Reviewed Today"** sends `POST /api/admin/seo-quality/freshness/:id/review`, which updates `last_reviewed_at = CURRENT_TIMESTAMP`.
- **Status:** **Verified Working**.

### 2.3 AI Citation Tracking & Observation Log
- **Intended Behavior:** Allows marketing staff to record verified citations where Dawnexus articles were referenced in AI Search results (Google AI Overviews, Perplexity, ChatGPT Search, Claude).
- **Trigger:** Navigating to the **AI Citations** tab calls `GET /api/admin/seo-quality/citations`. Adding an entry sends `POST /api/admin/seo-quality/citations`.
- **Data Model:** Persisted in the `ai_citation_observations` SQLite and Supabase table:
  - `id`: Unique identifier.
  - `blog_id`: Associated blog foreign key.
  - `ai_platform`: Google AI Overview, Perplexity, ChatGPT Search, Claude.
  - `query`: Exact search prompt entered.
  - `citation_snippet`: Text cited by the AI model.
  - `observed_at`: Timestamp.
- **Status:** **Verified Working**.

### 2.4 HTML Payload Audit (< 2 MB Threshold)
- **Intended Behavior:** Scans all critical public routes (`/`, 4 service pages, `/website-cost-calculator`, `/blog`, sample blog posts) to verify they remain well below the 2 MB edge payload limit.
- **Trigger:** Navigating to the **Payload Audit** tab or calling `GET /api/admin/seo-quality/payload-audit`.
- **Backend Service:** `auditHtmlPayloads()` in `server/payloadAudit.ts`.
- **Execution:** Reads rendered HTML from `ssrRenderer.ts`, measures uncompressed byte size, simulates gzip compression, verifies `< 2 MB`, and flags oversized assets.
- **Status:** **Verified Working**.

### 2.5 Structured Data & Zero Fabricated Reviews Validator
- **Intended Behavior:** Validates all Schema.org structured data against Google Rich Results rules and strictly prohibits fabricated ratings or fake review counts.
- **Trigger:** Opening the **Schema Validator** tab or executing `executeMcpTool('seo_validate_structured_data')`.
- **Backend Service:** `validateJsonLdStructure()` in `server/jsonLdService.ts`.
- **Validation Rules:**
  - Validates `@context: "https://schema.org"`.
  - Supports both single `@type` and composite `@graph` structures.
  - Enforces required fields for `Organization`, `WebSite`, `Service`, `BlogPosting`, `WebApplication`.
  - Flags any `AggregateRating` or `Review` entity that claims ratings (e.g. 5.0) without visible, verified client author records (`hasFabricatedReviews: true`).
- **Status:** **Verified Working**.

### 2.6 Contextual CTAs Manager
- **Intended Behavior:** Configures dynamic in-content callouts embedded inside blog articles based on category or service intent.
- **Trigger:** Opening the **Contextual CTAs** tab calls `GET /api/admin/seo-quality/ctas`. Updating calls `PUT /api/admin/seo-quality/ctas`.
- **Data Model:** Stored in the `contextual_cta_configs` table (`service_key`, `headline`, `subtext`, `button_text`, `target_url`, `is_active`).
- **Status:** **Verified Working**.

### 2.7 Keyword Cannibalization & Content Overlap Detector
- **Backend Function:** `detectContentOverlap(newBlog, existingBlogs)` in `server/seoQualityService.ts`.
- **Logic:** Compares primary keywords, slugs, and secondary keyword sets across the 28-article inventory. Calculates Jaccard similarity and string containment.
- **Output:** Returns potential conflicts and overlap percentages.
- **Status:** **Implemented, Backend Verified**. Exposed in `SeoWritingAssistant.tsx` and MCP server.

---

## 3. Capability Classification Register

| Feature / Tool | Implementation Status | Evidence / Files | Notes |
| :--- | :--- | :--- | :--- |
| **Conventional SEO Scorer** | **Verified Working** | `server/seoScorer.ts` | Single automated gate for blog publishing ($\ge 90/100$). |
| **Information Gain Audit** | **Verified Working** | `server/seoQualityService.ts` | 6-dimension evaluation; informational only. |
| **Freshness Review Tracker** | **Verified Working** | `server/routes/admin.ts:1777` | 30/90 day cycle; updates `last_reviewed_at`. |
| **AI Citation Observations** | **Verified Working** | `server/routes/admin.ts:1825` | Persisted in `ai_citation_observations`. |
| **HTML Payload Audit** | **Verified Working** | `server/payloadAudit.ts` | Measures uncompressed & gzip bytes across 7+ routes. |
| **JSON-LD Schema Validator** | **Verified Working** | `server/jsonLdService.ts` | Validates Schema.org; rejects fabricated reviews. |
| **Contextual CTAs Config** | **Verified Working** | `server/routes/admin.ts:1862` | CRUD on `contextual_cta_configs`. |
| **Keyword Overlap Detection** | **Verified Working** | `server/seoQualityService.ts` | Jaccard similarity on keywords and content tokens. |
| **Direct AI Model Text Gen** | **Partially Implemented** | `server/geminiService.ts` | Gemini 2.5 Flash SDK helper; requires `GEMINI_API_KEY`. |
| **Search Intent Classifier** | **Implemented (Rule-Based)** | `src/utils/seoAnalyzer.ts` | Lexical classification (How/Why $\to$ Informational; Cost/Price $\to$ Commercial). |

