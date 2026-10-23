# Deployment, Operations & Production Runbook

**Document Version:** 8.3.0 Baseline Draft  
**Inspected Commit:** `e51b0240be6b8a00e491909013475be062c92f5b`  
**Configuration File:** `vercel.json`, `package.json`  
**Production Domain:** `https://www.dawnexus.in` (Aliased to Vercel production deployment)

---

## 1. Hosting Architecture & Infrastructure Topology

Dawnexus is deployed on the **Vercel Serverless Platform** in conjunction with an edge caching CDN and a persistent cloud database:

```mermaid
flowchart TD
    subgraph VercelInfrastructure["Vercel Global Edge & Compute"]
        EdgeRouter["Vercel Global Edge Network (CDN)"]
        EdgeCache["Static Assets Cache (dist/, brand/, public/)"]
        ServerlessFunc["Serverless Node.js 24 Function (api/index.ts)"]
        CronTrigger["Vercel Scheduled Cron Jobs"]
    end

    subgraph CloudDatabase["Cloud Database (Supabase)"]
        SupabasePostgres[("Supabase PostgreSQL (susdqywigvzcijsvlksb)")]
    end

    EdgeRouter -->|Static Files (.js, .css, .txt, .png)| EdgeCache
    EdgeRouter -->|API, Admin, MCP, SSR Routes| ServerlessFunc
    CronTrigger -->|HTTP GET /api/cron/...| ServerlessFunc
    ServerlessFunc <-->|Cold-start sync & write persistence| SupabasePostgres
```

---

## 2. Vercel Configuration (`vercel.json`)

### 2.1 Build & Serverless Configuration
- **`buildCommand`:** `vite build`
- **`outputDirectory`:** `dist`
- **`functions`:**
  ```json
  "functions": {
    "api/index.ts": {
      "includeFiles": "dist/**"
    }
  }
  ```
  *Note:* Bundles the static `dist/**` directory into the serverless function container so that `getIndexHtml()` in `server/index.ts` can read `dist/index.html` during SSR execution.

### 2.2 Scheduled Cron Jobs
Configured under the `crons` block:
1. **Automated Blog Publication:**
   - **Path:** `/api/cron/publish`
   - **Schedule:** `0 0 * * *` (Daily at 00:00 UTC / 05:30 IST)
   - **Function:** Publishes any scheduled blog posts whose `scheduled_at` timestamp has passed.
2. **Database Health Telemetry:**
   - **Path:** `/api/cron/db-health`
   - **Schedule:** `30 2 * * *` (Daily at 02:30 UTC / 08:00 IST)
   - **Function:** Executes read/write probes, verifies schema columns, and logs latency metrics.

### 2.3 301 Redirect Rules
- **Host Normalization:** All requests to the apex domain `dawnexus.in` are permanently 301-redirected to the canonical `https://www.dawnexus.in/$1`.
- **Legacy URL Mapping:** Historical URLs are permanently 301-redirected:
  - `/blog/local-seo-google-maps-playbook` $\to$ `https://www.dawnexus.in/blog/local-seo-playbook-small-businesses`

### 2.4 Caching Headers
- `/assets/(.*)`: `public, max-age=31536000, immutable` (fingerprinted JS/CSS chunks).
- `/robots.txt`: `text/plain; charset=utf-8`, `public, max-age=86400, stale-while-revalidate=604800`.
- `/llms(.*).txt`: `text/markdown; charset=utf-8`, `public, max-age=86400, stale-while-revalidate=604800`.
- Dynamic SSR HTML routes: `public, max-age=0, must-revalidate`.

---

## 3. Local Development vs. Production Execution

### 3.1 Local Development Workflow
Run both the Express backend API and the Vite frontend dev server concurrently:
```bash
npm run dev
```
- Frontend dev server: `http://localhost:3000` (with Vite HMR).
- Backend Express server: `http://localhost:3000` or port 5000 via proxy.
- SQLite database: Initialized locally at `server/data/dawnexus.sqlite`.
- Supabase synchronization: Hydrates from remote Supabase if credentials exist in `.env`.

### 3.2 Production Deployment Procedure
1. Verify all tests pass locally:
   ```bash
   npm test
   ```
2. Build the production client bundle:
   ```bash
   npm run build
   ```
3. Deploy directly to Vercel production:
   ```bash
   npx vercel --prod --yes
   ```
4. Verify deployment status using the live verification script or checking:
   ```
   https://www.dawnexus.in/api/health
   ```

---

## 4. Monitoring, Diagnostics & Operational Runbooks

### 4.1 System Health Probes
- **Public Health Endpoint:** `GET /api/health`
  Returns application status, version (`8.3.0`), and release descriptor.
- **Admin Diagnostics:** `GET /api/admin/diagnostics`
  Requires admin session. Returns complete system state:
  - SQLite database connectivity and latency.
  - Remote Supabase synchronization status.
  - Google Search Console OAuth connection and token status.
  - Google Analytics 4 OAuth connection and token status.
  - MCP server status and tool registry health.
  - Active notification settings.

### 4.2 Disaster Recovery & Database Restoration
1. If the local SQLite file is corrupted or deleted:
   - Restart the server container.
   - `syncFromSupabase(db)` will execute on startup, pulling all articles, enquiries, settings, and pages from remote Supabase PostgreSQL into a fresh SQLite file.
2. If remote Supabase needs restoration:
   - Use the Supabase cloud dashboard backup snapshots or restore from local SQLite using an export script (`SELECT *` exported to SQL dump).

