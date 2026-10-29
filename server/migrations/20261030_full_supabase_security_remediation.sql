-- ==============================================================================
-- DAWNEXUS DATABASE-WIDE RLS & SECURITY ADVISOR REMEDIATION
-- Migration: 20261030_full_supabase_security_remediation.sql
-- Description: Enables RLS on all 40 public tables, defines least-privilege
--              policies for public, internal, and multi-tenant social tables,
--              secures storage.objects, adds indexes for foreign keys, and
--              hardens anon/authenticated grants.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FOREIGN KEY INDEXES (Eliminates unindexed_foreign_keys warnings)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_social_workspaces_created_by 
  ON public.social_workspaces(created_by);

CREATE INDEX IF NOT EXISTS idx_social_connected_accounts_ws 
  ON public.social_connected_accounts(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_ws 
  ON public.social_oauth_states(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_media_assets_ws 
  ON public.social_media_assets(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_content_approvals_post 
  ON public.social_content_approvals(post_id);

CREATE INDEX IF NOT EXISTS idx_social_content_approvals_ws 
  ON public.social_content_approvals(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_scheduled_jobs_post 
  ON public.social_scheduled_jobs(post_id);

CREATE INDEX IF NOT EXISTS idx_social_scheduled_jobs_ws 
  ON public.social_scheduled_jobs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_publishing_attempts_job 
  ON public.social_publishing_attempts(job_id);

CREATE INDEX IF NOT EXISTS idx_social_publishing_attempts_post 
  ON public.social_publishing_attempts(post_id);

CREATE INDEX IF NOT EXISTS idx_social_ai_generations_ws 
  ON public.social_ai_generations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_mcp_credentials_ws 
  ON public.social_mcp_credentials(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_mcp_audit_logs_cred 
  ON public.social_mcp_audit_logs(credential_id);

CREATE INDEX IF NOT EXISTS idx_social_mcp_audit_logs_ws 
  ON public.social_mcp_audit_logs(workspace_id);

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS FOR USER AUTH & WORKSPACE TENANCY (Avoids RLS Recursion)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sub_claim text;
BEGIN
  -- 1. Try raw sub claim from request.jwt.claim.sub
  BEGIN
    sub_claim := current_setting('request.jwt.claim.sub', true);
    IF sub_claim IS NOT NULL AND sub_claim <> '' THEN
      RETURN sub_claim;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Try JSON sub claim from request.jwt.claims
  BEGIN
    sub_claim := (auth.jwt() ->> 'sub');
    IF sub_claim IS NOT NULL AND sub_claim <> '' THEN
      RETURN sub_claim;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 3. Fallback to auth.uid()::text if UUID
  BEGIN
    RETURN (auth.uid())::text;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_social_workspace_member(ws_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.social_workspace_members 
    WHERE workspace_id = ws_id 
      AND user_id = public.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_social_workspace_role(ws_id text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role 
  FROM public.social_workspace_members 
  WHERE workspace_id = ws_id 
    AND user_id = public.current_user_id()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.is_social_workspace_member(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_social_workspace_member(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_social_workspace_role(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_social_workspace_role(text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY ON ALL 40 PUBLIC TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_citation_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_optimization_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_replay_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contextual_cta_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_search_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_research_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_mcp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_mcp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publishing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. CLEAN UP PRE-EXISTING POLICIES (Idempotency)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND NOT (tablename = 'calculator_pricing_config' AND policyname IN ('Allow public read access', 'Allow service role all'))
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 5. POLICIES: PUBLIC MARKETING & WEBSITE CONTENT
-- ------------------------------------------------------------------------------

-- 5.1 Blogs: Public can only view published posts; drafts/scheduled stay private
CREATE POLICY "Public read published blogs" ON public.blogs
  FOR SELECT TO anon, authenticated
  USING (status = 'Published');

CREATE POLICY "Service role full access on blogs" ON public.blogs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.2 Showcases: Public can only view visible showcases
CREATE POLICY "Public read visible showcases" ON public.showcases
  FOR SELECT TO anon, authenticated
  USING (is_visible = 1 OR publication_status = 'published');

CREATE POLICY "Service role full access on showcases" ON public.showcases
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.3 Clients: Public can view active/published client endorsements
CREATE POLICY "Public read active clients" ON public.clients
  FOR SELECT TO anon, authenticated
  USING (status IN ('Active', 'Published'));

CREATE POLICY "Service role full access on clients" ON public.clients
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.4 Website Pages: Public can view published site pages
CREATE POLICY "Public read published website pages" ON public.website_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Service role full access on website pages" ON public.website_pages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.5 Contact Settings: Public can view company contact info
CREATE POLICY "Public read contact settings" ON public.contact_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on contact settings" ON public.contact_settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.6 Contextual CTA Configs: Public can view active CTA cards
CREATE POLICY "Public read active contextual ctas" ON public.contextual_cta_configs
  FOR SELECT TO anon, authenticated
  USING (is_active = 1);

CREATE POLICY "Service role full access on contextual ctas" ON public.contextual_cta_configs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5.7 Calculator Pricing Config: (ensure service role and public read policies)
DROP POLICY IF EXISTS "Allow public read access" ON public.calculator_pricing_config;
DROP POLICY IF EXISTS "Allow service role all" ON public.calculator_pricing_config;

CREATE POLICY "Public read calculator pricing config" ON public.calculator_pricing_config
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on calculator pricing config" ON public.calculator_pricing_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. POLICIES: PRIVATE SYSTEM, ADMIN, SECURITY & TELEMETRY TABLES
-- ------------------------------------------------------------------------------

-- Enquiries (private inbound customer leads)
CREATE POLICY "Service role full access on enquiries" ON public.enquiries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin Sessions (private session authentication)
CREATE POLICY "Service role full access on admin_sessions" ON public.admin_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin Audit Logs (administrative action trail)
CREATE POLICY "Service role full access on admin_audit_logs" ON public.admin_audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notification Settings (alert preferences and notification targets)
CREATE POLICY "Service role full access on notification_settings" ON public.notification_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notification OTP Challenges (2FA OTP tokens and verification nonces)
CREATE POLICY "Service role full access on notification_otp_challenges" ON public.notification_otp_challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Database Health Checks (system health audit benchmarks)
CREATE POLICY "Service role full access on database_health_checks" ON public.database_health_checks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SEO Research Connections (Google OAuth secrets, refresh tokens)
CREATE POLICY "Service role full access on seo_research_connections" ON public.seo_research_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SEO Research Jobs (background keyword analysis tasks)
CREATE POLICY "Service role full access on seo_research_jobs" ON public.seo_research_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- GSC Search Analytics Cache (cached search queries and metrics)
CREATE POLICY "Service role full access on gsc_search_analytics_cache" ON public.gsc_search_analytics_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI Citation Observations (internal LLM search citation audit data)
CREATE POLICY "Service role full access on ai_citation_observations" ON public.ai_citation_observations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI Optimization Proposals (generated on-page optimization diffs)
CREATE POLICY "Service role full access on ai_optimization_proposals" ON public.ai_optimization_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Optimization Experiments (A/B testing metadata)
CREATE POLICY "Service role full access on optimization_experiments" ON public.optimization_experiments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Website Content Versions (internal history of page content diffs)
CREATE POLICY "Service role full access on website_content_versions" ON public.website_content_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Analytics Telemetry: Events, Sessions, Aggregates, Replay Chunks
CREATE POLICY "Service role full access on analytics_events" ON public.analytics_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on analytics_sessions" ON public.analytics_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on analytics_aggregates" ON public.analytics_aggregates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on analytics_replay_chunks" ON public.analytics_replay_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. POLICIES: DAWNEXUS SOCIAL MULTI-TENANT WORKSPACE TABLES
-- ------------------------------------------------------------------------------

-- 7.1 Social Profiles (user profile ownership & workspace peer visibility)
CREATE POLICY "Social profiles read own or workspace peers" ON public.social_profiles
  FOR SELECT TO authenticated
  USING (
    id = public.current_user_id()
    OR EXISTS (
      SELECT 1 
      FROM public.social_workspace_members m1
      JOIN public.social_workspace_members m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.user_id = social_profiles.id 
        AND m2.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Social profiles insert self" ON public.social_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = public.current_user_id());

CREATE POLICY "Social profiles update self" ON public.social_profiles
  FOR UPDATE TO authenticated
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY "Service role full access on social_profiles" ON public.social_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.2 Social Workspaces (tenant boundary enforcement)
CREATE POLICY "Social workspaces select for members" ON public.social_workspaces
  FOR SELECT TO authenticated
  USING (
    public.is_social_workspace_member(id)
    OR created_by = public.current_user_id()
  );

CREATE POLICY "Social workspaces insert for creator" ON public.social_workspaces
  FOR INSERT TO authenticated
  WITH CHECK (created_by = public.current_user_id());

CREATE POLICY "Social workspaces update for owners and admins" ON public.social_workspaces
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.get_social_workspace_role(id) IN ('owner', 'admin'));

CREATE POLICY "Social workspaces delete for owners only" ON public.social_workspaces
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(id) = 'owner');

CREATE POLICY "Service role full access on social_workspaces" ON public.social_workspaces
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.3 Social Workspace Members (membership & role escalation protection)
CREATE POLICY "Social workspace members select for members" ON public.social_workspace_members
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social workspace members insert by owners and admins" ON public.social_workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social workspace members update by owners and admins" ON public.social_workspace_members
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social workspace members delete by admin or self leave" ON public.social_workspace_members
  FOR DELETE TO authenticated
  USING (
    public.get_social_workspace_role(workspace_id) IN ('owner', 'admin')
    OR user_id = public.current_user_id()
  );

CREATE POLICY "Service role full access on social_workspace_members" ON public.social_workspace_members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.4 Social Connected Accounts (OAuth token protection)
CREATE POLICY "Social connected accounts select for members" ON public.social_connected_accounts
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social connected accounts insert by owners and admins" ON public.social_connected_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social connected accounts update by owners and admins" ON public.social_connected_accounts
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social connected accounts delete by owners and admins" ON public.social_connected_accounts
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_connected_accounts" ON public.social_connected_accounts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.5 Social OAuth States (CSRF and state token isolation)
CREATE POLICY "Social oauth states select for members" ON public.social_oauth_states
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social oauth states insert for members" ON public.social_oauth_states
  FOR INSERT TO authenticated
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social oauth states delete for members" ON public.social_oauth_states
  FOR DELETE TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Service role full access on social_oauth_states" ON public.social_oauth_states
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.6 Social Posts
CREATE POLICY "Social posts select for members" ON public.social_posts
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social posts insert for members" ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social posts update for members" ON public.social_posts
  FOR UPDATE TO authenticated
  USING (public.is_social_workspace_member(workspace_id))
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social posts delete by owners and admins" ON public.social_posts
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_posts" ON public.social_posts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.7 Social Media Assets
CREATE POLICY "Social media assets select for members" ON public.social_media_assets
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social media assets insert for members" ON public.social_media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social media assets update for members" ON public.social_media_assets
  FOR UPDATE TO authenticated
  USING (public.is_social_workspace_member(workspace_id))
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social media assets delete by owners and admins" ON public.social_media_assets
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_media_assets" ON public.social_media_assets
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.8 Social Content Approvals
CREATE POLICY "Social content approvals select for members" ON public.social_content_approvals
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social content approvals insert by approvers and admins" ON public.social_content_approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin', 'approver'));

CREATE POLICY "Social content approvals update by approvers and admins" ON public.social_content_approvals
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin', 'approver'))
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin', 'approver'));

CREATE POLICY "Social content approvals delete by owners and admins" ON public.social_content_approvals
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_content_approvals" ON public.social_content_approvals
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.9 Social Scheduled Jobs
CREATE POLICY "Social scheduled jobs select for members" ON public.social_scheduled_jobs
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social scheduled jobs insert for members" ON public.social_scheduled_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social scheduled jobs update for members" ON public.social_scheduled_jobs
  FOR UPDATE TO authenticated
  USING (public.is_social_workspace_member(workspace_id))
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social scheduled jobs delete by owners and admins" ON public.social_scheduled_jobs
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_scheduled_jobs" ON public.social_scheduled_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.10 Social Publishing Attempts (isolated via linked post workspace)
CREATE POLICY "Social publishing attempts select for members" ON public.social_publishing_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.social_posts p 
      WHERE p.id = social_publishing_attempts.post_id 
        AND public.is_social_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "Service role full access on social_publishing_attempts" ON public.social_publishing_attempts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.11 Social AI Generations
CREATE POLICY "Social ai generations select for members" ON public.social_ai_generations
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social ai generations insert for members" ON public.social_ai_generations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Service role full access on social_ai_generations" ON public.social_ai_generations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.12 Social Campaigns
CREATE POLICY "Social campaigns select for members" ON public.social_campaigns
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Social campaigns insert by owners and admins" ON public.social_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social campaigns update by owners and admins" ON public.social_campaigns
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social campaigns delete by owners" ON public.social_campaigns
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) = 'owner');

CREATE POLICY "Service role full access on social_campaigns" ON public.social_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.13 Social Campaign Metrics (isolated via linked campaign workspace)
CREATE POLICY "Social campaign metrics select for members" ON public.social_campaign_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.social_campaigns c 
      WHERE c.id = social_campaign_metrics.campaign_id 
        AND public.is_social_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Service role full access on social_campaign_metrics" ON public.social_campaign_metrics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.14 Social MCP Credentials (owners and admins only)
CREATE POLICY "Social mcp credentials select by owners and admins" ON public.social_mcp_credentials
  FOR SELECT TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social mcp credentials insert by owners and admins" ON public.social_mcp_credentials
  FOR INSERT TO authenticated
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social mcp credentials update by owners and admins" ON public.social_mcp_credentials
  FOR UPDATE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Social mcp credentials delete by owners and admins" ON public.social_mcp_credentials
  FOR DELETE TO authenticated
  USING (public.get_social_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Service role full access on social_mcp_credentials" ON public.social_mcp_credentials
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.15 Social MCP Audit Logs
CREATE POLICY "Social mcp audit logs select for members" ON public.social_mcp_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Service role full access on social_mcp_audit_logs" ON public.social_mcp_audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7.16 Social Audit Logs
CREATE POLICY "Social audit logs select for members" ON public.social_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_social_workspace_member(workspace_id));

CREATE POLICY "Service role full access on social_audit_logs" ON public.social_audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET POLICIES (storage.objects)
-- ------------------------------------------------------------------------------
-- Clean up existing policies on storage.objects
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', r.policyname);
    END LOOP;
END $$;

-- 8.1 Public Read for Public Buckets ('blog-images', 'client-showcase')
CREATE POLICY "Public read website media assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('blog-images', 'client-showcase'));

-- 8.2 Authenticated Admin Uploads
CREATE POLICY "Authenticated users upload website media assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('blog-images', 'client-showcase'));

-- 8.3 Authenticated Admin Updates
CREATE POLICY "Authenticated users update website media assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('blog-images', 'client-showcase'))
  WITH CHECK (bucket_id IN ('blog-images', 'client-showcase'));

-- 8.4 Authenticated Admin Deletions
CREATE POLICY "Authenticated users delete website media assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('blog-images', 'client-showcase'));

-- 8.5 Service Role Full Access to Storage Objects
CREATE POLICY "Service role full access on storage objects" ON storage.objects
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. PRIVILEGE HARDENING & DEFAULT PRIVILEGES
-- ------------------------------------------------------------------------------
-- Revoke broad permissions from anon on public tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant selective SELECT only on public marketing tables to anon
GRANT SELECT ON TABLE public.blogs TO anon;
GRANT SELECT ON TABLE public.showcases TO anon;
GRANT SELECT ON TABLE public.clients TO anon;
GRANT SELECT ON TABLE public.website_pages TO anon;
GRANT SELECT ON TABLE public.contact_settings TO anon;
GRANT SELECT ON TABLE public.calculator_pricing_config TO anon;
GRANT SELECT ON TABLE public.contextual_cta_configs TO anon;

-- Revoke broad permissions from authenticated and grant strictly needed table privileges
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Public content read for authenticated users as well
GRANT SELECT ON TABLE public.blogs TO authenticated;
GRANT SELECT ON TABLE public.showcases TO authenticated;
GRANT SELECT ON TABLE public.clients TO authenticated;
GRANT SELECT ON TABLE public.website_pages TO authenticated;
GRANT SELECT ON TABLE public.contact_settings TO authenticated;
GRANT SELECT ON TABLE public.calculator_pricing_config TO authenticated;
GRANT SELECT ON TABLE public.contextual_cta_configs TO authenticated;

-- Social multi-tenant table CRUD for authenticated users (protected by workspace RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_connected_accounts TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.social_oauth_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_media_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_content_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_scheduled_jobs TO authenticated;
GRANT SELECT ON TABLE public.social_publishing_attempts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.social_ai_generations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_campaigns TO authenticated;
GRANT SELECT ON TABLE public.social_campaign_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_mcp_credentials TO authenticated;
GRANT SELECT ON TABLE public.social_mcp_audit_logs TO authenticated;
GRANT SELECT ON TABLE public.social_audit_logs TO authenticated;

-- Future table defaults: Do not automatically grant permissions to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

COMMIT;
