# Architecture and End-to-End Data Flow

**Document Version:** 8.3.0 Baseline Draft  
**Inspected Commit:** `e51b0240be6b8a00e491909013475be062c92f5b`  
**Authoritative Entry Points:** `server/index.ts`, `api/index.ts`, `src/App.tsx`

---

## 1. Request Lifecycle & Routing Architecture

Dawnexus uses a unified routing and rendering pipeline designed for both search crawler indexability and single-page application interactivity:

```mermaid
flowchart LR
    Request([Incoming HTTP Request]) --> VercelRouting{Vercel Edge Rewrites}
    VercelRouting -->|Static Asset in dist/| StaticCDN[Direct CDN Response]
    VercelRouting -->|API, Admin, MCP, SSR Routes| ExpressServer[Node.js Express Server]
    ExpressServer -->|Path starts with /api| ExpressRouters[Express API Routers]
    ExpressServer -->|Path starts with /mcp| MCPRouter[MCP Streamable / JSON-RPC]
    ExpressServer -->|Frontend Routes: /, /services/*, /blog/*| SSRHandler[SSR Meta & Body Injector]
    SSRHandler --> RenderedHTML[HTML Response with JSON-LD & Fallback Body]
    RenderedHTML --> ReactMount[Browser React createRoot Mount]
```

### 1.1 Vercel Edge Rewrites (`vercel.json`)
- Static assets located in `dist/assets/`, `dist/brand/`, or root static files (`robots.txt`, `llms.txt`, `site.webmanifest`) are served directly from the edge cache with immutable `Cache-Control: public, max-age=31536000, immutable` headers.
- Route prefixes `/.well-known/*`, `/sitemap.xml`, `/api/*`, `/mcp`, `/mcp/*`, `/oauth/*`, `/services/*`, `/blog`, `/blog/*`, and `/website-cost-calculator` are rewritten to `/api/index.ts` (the Node.js Serverless Function).
- Catch-all fallback rewrites unmatched paths to `/index.html`.

### 1.2 SSR Metadata & Fallback HTML Injection (`server/ssrRenderer.ts`)
When a request reaches `handlePageHtmlRequest` in `server/index.ts`:
1. The server loads the base HTML template (`dist/index.html` or `index.html`).
2. `resolvePageMetadata(pathname)` resolves route-specific metadata:
   - Homepage (`/`): Organization & WebSite schema, descriptive title, meta description.
   - Service landing pages (`/services/:slug`): Service title, description, single `<h1>`, breadcrumbs, and `Service` JSON-LD schema with `Organization` provider.
   - Cost Calculator (`/website-cost-calculator`): SoftwareApplication schema, single `<h1>`, estimation copy.
   - Blog hub (`/blog`): Blog schema, single `<h1>`, list of latest published articles.
   - Blog post (`/blog/:slug`): Author, published dates, reading time, excerpt, sanitized article body, and Schema.org `BlogPosting` JSON-LD.
3. `injectPageMetadata(html, meta)`:
   - Replaces `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph, and Twitter tags.
   - Replaces `<script id="page-json-ld">` cleanly without duplicate tags.
   - Injects the semantic fallback HTML into `<div id="root">...</div>`.
4. The server returns HTTP 200 (or HTTP 404 for unknown blog slugs) with `Cache-Control: public, max-age=0, must-revalidate`.

### 1.3 Client-Side React Hydration (`src/main.tsx` & `src/App.tsx`)
1. The browser parses the initial HTML response, displaying the fallback layout immediately with zero layout shift.
2. `src/main.tsx` executes:
   ```typescript
   ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
   ```
3. `createRoot` clears the children of `#root` and renders the dynamic React component tree.
4. `src/utils/navigation.ts` dispatches custom navigation events, updating the URL via `window.history.pushState` and dynamically switching views without full-page reloads.

---

## 2. Core End-to-End Sequence Diagrams

### 2.1 Workflow 1: Create and Publish a Blog Post

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Editor as BlogEditor (React)
    participant AdminAPI as Admin Router (/api/admin/blogs)
    participant Scorer as Technical SEO Scorer (seoScorer.ts)
    participant SQLite as Local SQLite (db.ts)
    participant Supabase as Remote Supabase PG
    participant Sitemap as Dynamic Sitemap (/sitemap.xml)

    Admin->>Editor: Enter Title, Slug, Content, SEO fields
    Admin->>Editor: Click "Run SEO Quality Check"
    Editor->>Scorer: calculateSeoScore(inputData)
    Scorer-->>Editor: Return Score (e.g. 94/100) & Recommendations
    Admin->>Editor: Select Status: "Published" & Click "Publish Now"
    Editor->>AdminAPI: POST /api/admin/blogs { ...input, status: 'Published' }
    AdminAPI->>AdminAPI: Validate Session Cookie (dawnexus_session)
    AdminAPI->>Scorer: calculateSeoScore(input) (Server Verification)
    alt Score < 90 or Mandatory Failure
        AdminAPI-->>Editor: HTTP 400 { error: 'Conventional Technical SEO score must be >= 90' }
    else Score >= 90 & Valid
        AdminAPI->>SQLite: INSERT/UPDATE blogs table
        AdminAPI->>Supabase: Upsert into remote Supabase blogs table
        AdminAPI-->>Editor: HTTP 200 { success: true, blog: { ... } }
        Admin->>Sitemap: GET /sitemap.xml
        Sitemap->>SQLite: getPublishedBlogsForSitemap()
        SQLite-->>Sitemap: Return published blog records
        Sitemap-->>Admin: Return updated XML sitemap with new article URL
    end
```

---

### 2.2 Workflow 2: Update a Service Page via Web Content Manager

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant CMS as ContentEditor (React)
    participant AdminAPI as Admin Router (/api/admin/content)
    participant ContentService as websiteContent.ts
    participant SQLite as Local SQLite
    participant Supabase as Remote Supabase PG
    participant Visitor as Public Website Visitor

    Admin->>CMS: Select Service (e.g. 'website-design')
    CMS->>AdminAPI: GET /api/admin/content/pages/website-design
    AdminAPI->>ContentService: getServicePageContent('website-design')
    ContentService->>SQLite: Query website_pages table
    SQLite-->>ContentService: Return active page record
    ContentService-->>CMS: Return JSON content (hero, process, packages)
    Admin->>CMS: Modify pricing package & headline
    Admin->>CMS: Click "Publish Changes"
    CMS->>AdminAPI: POST /api/admin/content/pages/website-design/publish { changes }
    AdminAPI->>ContentService: publishPageContent('website-design', changes)
    ContentService->>SQLite: Record version in website_content_versions
    ContentService->>SQLite: Update active record in website_pages
    ContentService->>Supabase: Persist version & page to Supabase
    ContentService->>ContentService: Invalidate in-memory cache
    AdminAPI-->>CMS: HTTP 200 { success: true, versionId: 4 }
    Visitor->>AdminAPI: GET /services/website-design
    AdminAPI->>ContentService: getServicePageContent('website-design')
    ContentService-->>Visitor: Serve updated live content immediately
```

---

### 2.3 Workflow 3: Retrieve Google Search Console Performance Data

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant GscUI as GscDashboard (React)
    participant GscRouter as /api/admin/seo-research
    participant GscService as gscService.ts
    participant SQLite as Local SQLite Cache
    participant GoogleAPI as Google Search Console API

    Admin->>GscUI: Open GSC Performance Tab
    GscUI->>GscRouter: GET /api/admin/seo-research/timeline?days=30
    GscRouter->>GscService: getSearchAnalyticsTimeline(days)
    GscService->>SQLite: Query gsc_search_analytics_cache
    alt Cache is Fresh (< 6 hours)
        SQLite-->>GscService: Return cached query/page metrics
    else Cache Expired or Empty
        GscService->>SQLite: Get encrypted refresh token from seo_research_connections
        GscService->>GscService: Decrypt token via AES-256-GCM
        GscService->>GoogleAPI: Refresh access token via OAuth endpoint
        GscService->>GoogleAPI: POST searchAnalytics.query { startDate, endDate, dimensions: ['date'] }
        GoogleAPI-->>GscService: Return { rows: [{ date, clicks, impressions, ctr, position }] }
        GscService->>SQLite: Insert fresh rows into gsc_search_analytics_cache
    end
    GscService-->>GscRouter: Aggregated daily metrics
    GscRouter-->>GscUI: HTTP 200 { metrics, summary }
    GscUI-->>Admin: Render interactive clicks, impressions & position chart
```

---

### 2.4 Workflow 4: Retrieve Google Analytics 4 Performance Data

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Ga4UI as Ga4Dashboard (React)
    participant Ga4Router as /api/admin/analytics
    participant Ga4Service as ga4Service.ts
    participant SQLite as Local SQLite Cache
    participant GoogleAPI as GA4 Data API (v1beta)

    Admin->>Ga4UI: Open GA4 Overview Tab
    Ga4UI->>Ga4Router: GET /api/admin/analytics/overview?dateRange=last30days
    Ga4Router->>Ga4Service: getOverviewMetrics(dateRange)
    Ga4Service->>SQLite: Check ga4_analytics_cache
    alt Cache Hit
        SQLite-->>Ga4Service: Return cached metrics
    else Cache Miss
        GscService->>SQLite: Retrieve connection tokens
        Ga4Service->>GoogleAPI: POST /v1beta/properties/{propertyId}:runReport
        GoogleAPI-->>Ga4Service: Return activeUsers, sessions, engagementRate, conversions
        Ga4Service->>Ga4Service: Enforce Invariant: totalUsers >= activeUsers
        Ga4Service->>SQLite: Cache result in ga4_analytics_cache
    end
    Ga4Service-->>Ga4Router: Clean telemetry object
    Ga4Router-->>Ga4UI: HTTP 200 { overviewData }
    Ga4UI-->>Admin: Render user trends, channels & conversion tables
```

---

### 2.5 Workflow 5: Public Visitor Submits an Enquiry

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Website Visitor
    participant Form as ContactForm (React)
    participant RateLimiter as enquiryLimiter (Express)
    participant PublicAPI as /api/enquiries (api.ts)
    participant SQLite as Local SQLite
    participant Supabase as Remote Supabase PG
    participant Mailer as Notification Engine (email.ts)
    participant Admin as Agency Owner (Email/SMS)

    Visitor->>Form: Fill Name, Email, Mobile (+91), Services, Budget, Message
    Form->>Form: Validate Indian phone regex (/^(\+91)?[6-9]\d{9}$/)
    Visitor->>Form: Click "Submit Enquiry"
    Form->>PublicAPI: POST /api/enquiries { ...data, idempotency_key: 'idemp-123' }
    PublicAPI->>RateLimiter: Check IP submission rate (max 5 per 15 min)
    RateLimiter-->>PublicAPI: Allowed
    PublicAPI->>PublicAPI: Check Honeypot field (if filled, silently drop with fake 200)
    PublicAPI->>SQLite: Query enquiries by idempotency_key
    alt Idempotency Key Exists (Duplicate Request)
        SQLite-->>PublicAPI: Return existing enquiry record
        PublicAPI-->>Form: HTTP 200 { success: true, id: existingId, note: 'Duplicate request acknowledged' }
    else Fresh Submission
        PublicAPI->>SQLite: INSERT into enquiries (name, email, phone, services, budget, message, status='Unread')
        PublicAPI->>Supabase: Async persist into remote Supabase enquiries table
        PublicAPI->>Mailer: dispatchNotification(newEnquiry)
        Mailer->>SQLite: Check notification_settings (is_active, verified_email)
        alt Verified Recipient Active
            Mailer->>Admin: Send notification email (Resend API / SMTP)
        else No Configured Provider
            Mailer->>Mailer: Log notification skipped notice
        end
        PublicAPI-->>Form: HTTP 201 { success: true, id: newId, message: 'Enquiry received' }
        Form-->>Visitor: Display success banner with estimated response time
    end
```

---

### 2.6 Workflow 6: AI Client Executes an MCP Read-Only Tool

```mermaid
sequenceDiagram
    autonumber
    actor AI as Claude / ChatGPT Client
    participant Transport as MCP Transport (POST /mcp or POST /api/mcp/rpc)
    participant Auth as mcpAuthMiddleware
    participant Server as mcpServer.ts
    participant Service as mcpService.ts
    participant DB as Local Database (db.ts)

    AI->>Transport: Call tools/call { name: "get_blog_post", arguments: { id: 698 } }
    Transport->>Auth: Inspect Authorization: Bearer <token> or x-mcp-api-key
    Auth->>Auth: Validate against expected MCP API key or signed OAuth token
    alt Invalid Token
        Auth-->>AI: HTTP 401 Unauthorized { error: 'Missing or invalid MCP token' }
    else Authorized
        Auth->>Server: Forward request
        Server->>Service: executeMcpTool("get_blog_post", { id: 698 })
        Service->>DB: refreshFromPersistentStore()
        Service->>DB: getBlogById(698)
        DB-->>Service: Return complete article record (28+ fields)
        Service-->>Server: Return structured JSON payload (id, title, slug, content, seo_title, etc.)
        Server-->>Transport: Format MCP JSON-RPC result
        Transport-->>AI: HTTP 200 { jsonrpc: "2.0", result: { content: [{ type: "text", text: JSON_STRING }] } }
    end
```

---

### 2.7 Workflow 7: AI Client Executes an Authorized MCP Write Operation

```mermaid
sequenceDiagram
    autonumber
    actor AI as AI Assistant
    participant Transport as MCP Transport
    participant Auth as mcpAuthMiddleware
    participant Server as mcpServer.ts
    participant Service as mcpService.ts
    participant Scorer as Technical SEO Scorer
    participant DB as SQLite & Supabase
    participant Audit as Admin Audit Log

    AI->>Transport: Call tools/call { name: "schedule_blog_draft", arguments: { id: 790, scheduled_at: "...", approved: true } }
    Transport->>Auth: Verify Token
    Auth->>Server: Execute tool handler
    Server->>Server: Inspect approval flag
    alt approved !== true
        Server->>Audit: recordMcpAudit('REJECTED', 'Missing human approval')
        Server-->>AI: Error: Write rejected. Explicit human approval flag (approved=true) is required.
    else approved === true
        Server->>Service: scheduleBlogDraft(id, scheduledAt, approved)
        Service->>DB: getBlogById(id)
        alt Article is Published
            Service-->>AI: Error: Article is already Published. Cannot modify live articles.
        else Article is Draft
            Service->>Scorer: calculateSeoScore(article)
            alt Score < 90
                Service-->>AI: Error: Cannot schedule draft with Conventional SEO score < 90.
            else Score >= 90
                Service->>DB: Update status='Scheduled', scheduled_at=kolkataDate
                Service->>DB: Persist to Supabase
                Service->>Audit: recordMcpAudit('SUCCESS', 'Scheduled blog #790')
                Service-->>AI: HTTP 200 { success: true, id: 790, status: 'Scheduled' }
            end
        end
    end
```

---

### 2.8 Workflow 8: Database Health Check & Synchronization Cycle

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Cron Job (/api/cron/db-health)
    participant HealthService as dbHealthService.ts
    participant SQLite as Local SQLite (db.ts)
    participant Supabase as Remote Supabase PG
    participant Diagnostics as IntegrationDiagnostics

    Cron->>HealthService: Trigger performDatabaseHealthCheck('scheduled')
    HealthService->>SQLite: Execute read probe (SELECT count(*) FROM blogs)
    SQLite-->>HealthService: Read success, latency: 1.2ms
    HealthService->>Supabase: Query remote PostgreSQL table list
    Supabase-->>HealthService: Remote success, latency: 45ms
    HealthService->>HealthService: Verify required v8.3.0 columns across all 27 tables
    HealthService->>SQLite: Log telemetry event to db_health_checks
    HealthService-->>Cron: HTTP 200 { status: 'healthy', latencyMs: 1.2, remoteLatencyMs: 45 }
    Diagnostics->>HealthService: GET /api/admin/db-health
    HealthService-->>Diagnostics: Return connection stats, pool status, and recent health checks
```

