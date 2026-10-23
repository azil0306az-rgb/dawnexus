# Known Issues, Gaps & Feature Verification Register

**Document Version:** 8.3.0 Baseline Draft  
**Inspected Commit:** `e51b0240be6b8a00e491909013475be062c92f5b`  
**Evaluation Standard:** Direct Code Inspection & Test Execution Evidence

---

## 1. Feature Verification Register

| Feature / Subsystem | Status Classification | Inspected Code Evidence | Test Verification Status | Observed Operational Characteristics & Gaps |
| :--- | :--- | :--- | :--- | :--- |
| **Public Website & SPA** | **Verified Working** | `src/App.tsx`, `index.html` | Passed in `npm test` & Live Verified | Returns HTTP 200; sub-second client load; zero layout shift. |
| **SSR Crawl Injection** | **Verified Working** | `server/ssrRenderer.ts` | Verified via `server/test/seo_crawler_regression.test.ts` | Injects valid Schema.org, single `<h1>`, and crawlable internal fallback links. |
| **Robots.txt & Sitemap**| **Verified Working** | `public/robots.txt`, `server/index.ts:103` | Verified via `seo_crawler_regression.test.ts` | Live verified against `https://www.dawnexus.in/sitemap.xml` (29 canonical URLs). |
| **AI Discovery (llms.txt)**| **Verified Working** | `public/llms.txt`, `public/llms-full.txt` | Verified via `seo_crawler_regression.test.ts` | Returns clean Markdown with `text/markdown; charset=utf-8`. |
| **Blog CMS (CRUD & Schedule)**| **Verified Working**| `server/routes/admin.ts:126`, `server/db.ts` | Verified via `server/test/v830_chatgpt_access.test.ts` | Articles create, edit, schedule, and auto-publish via cron reliably. |
| **Conventional SEO Scorer**| **Verified Working** | `server/seoScorer.ts` | Verified via `server/test/seo_scheduling_reliability.test.ts` | Single automated publication requirement ($\ge 90/100$, 0 mandatory errors). |
| **Information Gain Audit**| **Verified Working** | `server/seoQualityService.ts` | Verified via `server/test/v830_seo_quality.test.ts` | Evaluates 6 criteria; operates informatively without gating publication. |
| **MCP Server (78 Tools)**| **Verified Working** | `server/mcpServer.ts`, `server/mcpService.ts`| Verified via `server/test/mcp.test.ts`, `v830_seo_quality.test.ts` | All 78 tools registered, authenticated, and gated by human approval. |
| **Article #698 Retrieval**| **Verified Working** | `server/db.ts:getBlogById`, `server/mcpService.ts` | Verified via `v830_chatgpt_access.test.ts` & Live | Live verified on `/blog/website-visitors-few-enquiries-conversion-audit`. |
| **Web Content Manager** | **Verified Working** | `server/websiteContent.ts`, `server/routes/admin.ts` | Verified via `server/test/v613_complete.test.ts` | Instant in-memory cache invalidation; historical version rollback. |
| **Enquiry Pipeline** | **Verified Working** | `server/routes/api.ts:233`, `server/db.ts` | Verified via `server/test/api.test.ts` | Enforces Indian phone validation; honeypot trap; idempotency deduplication. |
| **Dual DB Sync (Supabase)**| **Verified Working** | `server/supabase.ts`, `server/db.ts` | Verified via startup and migration test suites | Syncs 27 tables on boot; WAL mode enabled for local SQLite. |
| **Google Search Console** | **Implemented, Credential Dependent** | `server/gscService.ts`, `server/routes/seoResearch.ts` | Verified with simulated token tests | Requires valid `GOOGLE_CLIENT_ID` and user authorization. |
| **Google Analytics 4** | **Implemented, Credential Dependent** | `server/ga4Service.ts`, `server/routes/analytics.ts` | Verified with unit & regression tests | Enforces `totalUsers >= activeUsers`; requires Google OAuth consent. |
| **Gemini AI Auto-Writing**| **Partially Implemented** | `server/geminiService.ts` | Unit tested with mock token fallback | Requires production `GEMINI_API_KEY` to generate real AI text. |

---

## 2. Documented Issues & Operational Gaps

### 2.1 Admin Panel Blogs Subview & Route Normalization Bug
- **Observed Behavior:** If an administrator enters a URL such as `/admin/blogs` or `/admin/admin/blogs` directly instead of `/admin?tab=blogs`, historical routing logic in `src/components/admin/AdminDashboard.tsx:parseAdminRoute()` filters path segments and normalizes the route. However, if a user reloads the browser while editing a draft, the component relies on query parameter `?tab=blogs&id=XXX`. If `id` is stripped or mismatched, the view may default to the Blog List instead of reopening the active editor.
- **Root Cause:** Dual routing mechanism (`window.location.pathname` segments vs. URL query parameters `?tab=`).
- **Operational Recommendation:** Always navigate using the sidebar tabs or standard links. Maintainers should standardize on either path-based routing or query-based routing, avoiding dual resolution.

### 2.2 Google OAuth State Expiration (10-Minute Window)
- **Observed Behavior:** Administrators initiating a Google Search Console or Google Analytics 4 connection who take more than 10 minutes on the Google consent screen will receive an `oauth_state_invalid` error upon returning to Dawnexus.
- **Root Cause:** Security defense in `server/db.ts:validateOAuthState()` strictly expires OAuth challenge states after 10 minutes (`EXPIRES_AT = now + 10 * 60 * 1000`) to prevent replay and CSRF attacks.
- **Operational Recommendation:** Complete the Google authorization flow promptly. If expired, simply click **"Connect Google Account"** again to issue a fresh challenge.

### 2.3 Transactional Email Delivery Dependency
- **Observed Behavior:** If `RESEND_API_KEY` and `SMTP_*` environment variables are not configured in Vercel production, enquiries are saved successfully to SQLite and Supabase, but email notifications are skipped with a warning logged to stdout.
- **Operational Recommendation:** Configure a verified `RESEND_API_KEY` in Vercel environment variables to ensure real-time notification delivery to agency staff.

### 2.4 Separation of Information Gain Scoring from Automated Gating
- **Architectural Policy Note:** Early iterations of Version 8.3.0 attempted to enforce Information Gain and E-E-A-T scores as an automated prerequisite for publishing. This caused false rejections on short announcements and case study summaries. In the current production baseline, **Conventional Technical SEO ($\ge 90/100$) is the sole automated publication gate.** Information Gain analysis is maintained purely as an informational audit tool. Future developers must not reintroduce Information Gain gating without an explicit business directive.

