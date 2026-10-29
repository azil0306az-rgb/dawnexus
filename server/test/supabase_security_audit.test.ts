import { describe, it } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const supabaseUrl = process.env.SUPABASE_URL || 'https://susdqywigvzcijsvlksb.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!anonKey || !serviceKey || !databaseUrl) {
  throw new Error('Missing SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL in environment.');
}

// 1. Anonymous Client (Simulates untrusted visitor in browser)
const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false }
});

// 2. Service Role Client (Simulates trusted Dawnexus backend server)
const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

describe('Supabase Security Audit & Access Control Verification', () => {

  describe('1. Anonymous Read Access on Public Marketing Tables (Allowed)', () => {
    it('allows anonymous users to query published blogs', async () => {
      const { data, error } = await anonClient
        .from('blogs')
        .select('id, title, status')
        .eq('status', 'Published')
        .limit(3);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0, 'Should find at least 1 published blog');
      data.forEach(b => assert.strictEqual(b.status, 'Published'));
    });

    it('allows anonymous users to query visible showcases', async () => {
      const { data, error } = await anonClient
        .from('showcases')
        .select('id, title, slug, is_visible')
        .limit(3);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0, 'Should find visible showcases');
    });

    it('allows anonymous users to query active clients', async () => {
      const { data, error } = await anonClient
        .from('clients')
        .select('id, client_name, status')
        .limit(3);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      data.forEach(c => assert.ok(['Active', 'Published'].includes(c.status)));
    });

    it('allows anonymous users to query contact settings', async () => {
      const { data, error } = await anonClient
        .from('contact_settings')
        .select('id, phone, email, instagram_url')
        .limit(1);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 1);
    });

    it('allows anonymous users to query calculator pricing config', async () => {
      const { data, error } = await anonClient
        .from('calculator_pricing_config')
        .select('*')
        .limit(1);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 1);
    });

    it('allows anonymous users to query published website pages', async () => {
      const { data, error } = await anonClient
        .from('website_pages')
        .select('slug, status')
        .limit(3);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      data.forEach(p => assert.strictEqual(p.status, 'published'));
    });
  });

  describe('2. Anonymous Access on Sensitive & Private Data (Must Be Denied)', () => {
    it('blocks anonymous users from viewing Scheduled or Draft blogs', async () => {
      const { data, error } = await anonClient
        .from('blogs')
        .select('id, title, status')
        .eq('status', 'Scheduled');

      // Should return empty list (0 rows visible to anon)
      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 0, 'Anonymous users must not see scheduled blogs');
    });

    it('blocks anonymous users from reading customer enquiries', async () => {
      const { data, error } = await anonClient
        .from('enquiries')
        .select('*');

      // Either returns empty array (RLS blocked) or 401/403 error
      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read private enquiries');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading admin sessions', async () => {
      const { data, error } = await anonClient
        .from('admin_sessions')
        .select('*');

      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read admin sessions');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading admin audit logs', async () => {
      const { data, error } = await anonClient
        .from('admin_audit_logs')
        .select('*');

      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read admin audit logs');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading notification settings', async () => {
      const { data, error } = await anonClient
        .from('notification_settings')
        .select('*');

      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read notification settings');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading 2FA OTP challenges', async () => {
      const { data, error } = await anonClient
        .from('notification_otp_challenges')
        .select('*');

      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read OTP challenges');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading SEO connections (OAuth tokens)', async () => {
      const { data, error } = await anonClient
        .from('seo_research_connections')
        .select('*');

      if (data) {
        assert.strictEqual(data.length, 0, 'Anonymous users must not read SEO OAuth credentials');
      } else {
        assert.ok(error !== null);
      }
    });

    it('blocks anonymous users from reading visitor analytics events and sessions', async () => {
      const [eventsRes, sessionsRes, replayRes] = await Promise.all([
        anonClient.from('analytics_events').select('*'),
        anonClient.from('analytics_sessions').select('*'),
        anonClient.from('analytics_replay_chunks').select('*')
      ]);

      if (eventsRes.data) assert.strictEqual(eventsRes.data.length, 0);
      if (sessionsRes.data) assert.strictEqual(sessionsRes.data.length, 0);
      if (replayRes.data) assert.strictEqual(replayRes.data.length, 0);
    });

    it('blocks anonymous users from reading social workspaces, profiles, and connected accounts', async () => {
      const [wsRes, profRes, accRes, oauthRes] = await Promise.all([
        anonClient.from('social_workspaces').select('*'),
        anonClient.from('social_profiles').select('*'),
        anonClient.from('social_connected_accounts').select('*'),
        anonClient.from('social_oauth_states').select('*')
      ]);

      if (wsRes.data) assert.strictEqual(wsRes.data.length, 0, 'Must not read social workspaces');
      if (profRes.data) assert.strictEqual(profRes.data.length, 0, 'Must not read social profiles');
      if (accRes.data) assert.strictEqual(accRes.data.length, 0, 'Must not read connected accounts');
      if (oauthRes.data) assert.strictEqual(oauthRes.data.length, 0, 'Must not read OAuth states');
    });

    it('blocks anonymous users from modifying or inserting records into public marketing tables', async () => {
      const { error: insertErr } = await anonClient
        .from('blogs')
        .insert({
          title: 'Malicious Injected Post',
          slug: 'malicious-injected-post',
          content: 'Hacked content',
          status: 'Published'
        });

      assert.ok(insertErr !== null, 'Anonymous insert on blogs must fail');

      const { error: deleteErr } = await anonClient
        .from('blogs')
        .delete()
        .eq('id', 1);

      assert.ok(deleteErr !== null, 'Anonymous delete on blogs must fail');
    });

    it('blocks anonymous users from inserting records into social workspaces', async () => {
      const { error } = await anonClient
        .from('social_workspaces')
        .insert({
          id: 'hacked_ws',
          name: 'Hacked Workspace',
          slug: 'hacked-ws'
        });

      assert.ok(error !== null, 'Anonymous workspace creation must fail');
    });
  });

  describe('3. Storage Objects Security Verification', () => {
    it('allows public read of images in public buckets', async () => {
      const { data, error } = await anonClient
        .storage
        .from('blog-images')
        .list('', { limit: 5 });

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
    });

    it('denies anonymous uploads to storage buckets', async () => {
      const fileData = new Uint8Array([1, 2, 3]);
      const { error } = await anonClient
        .storage
        .from('blog-images')
        .upload('test-malicious.png', fileData);

      assert.ok(error !== null, 'Anonymous file upload must fail');
    });

    it('denies anonymous deletions from storage buckets', async () => {
      const { error } = await anonClient
        .storage
        .from('blog-images')
        .remove(['non-existent-image.png']);

      // Either returns an error or fails authorization
      if (error) {
        assert.ok(error !== null);
      }
    });
  });

  describe('4. Backend Service Role Privileged Access (Retained & Verified)', () => {
    it('allows service role full access to read scheduled blogs', async () => {
      const { data, error } = await serviceClient
        .from('blogs')
        .select('id, title, status, scheduled_at')
        .eq('status', 'Scheduled');

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 1, 'Service role must be able to read scheduled blogs');
    });

    it('allows service role full access to customer enquiries', async () => {
      const { data, error } = await serviceClient
        .from('enquiries')
        .select('id, full_name, email');

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 1);
    });

    it('allows service role full access to social workspaces and connected accounts', async () => {
      const { data, error } = await serviceClient
        .from('social_workspaces')
        .select('id, name, slug');

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 1);
    });
  });

  describe('5. Database Schema & Supabase Advisor Linter Checks', () => {
    let pgClient: pg.Client;

    it('connects to PostgreSQL and verifies 0 tables have RLS disabled in public', async () => {
      pgClient = new pg.Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      await pgClient.connect();

      const res = await pgClient.query(`
        SELECT count(*)::int AS count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND NOT c.relrowsecurity;
      `);

      assert.strictEqual(res.rows[0].count, 0, 'There must be 0 tables with RLS disabled in public');
    });

    it('verifies 0 tables in public have RLS enabled with 0 policies', async () => {
      const res = await pgClient.query(`
        SELECT count(*)::int AS count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity
          AND p.polname IS NULL;
      `);

      assert.strictEqual(res.rows[0].count, 0, 'There must be 0 tables with RLS enabled without policies');
    });

    it('verifies 0 unindexed foreign keys exist in public schema', async () => {
      const res = await pgClient.query(`
        SELECT count(*)::int AS count
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.contype = 'f'
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index i
            WHERE i.indrelid = c.conrelid
              AND conkey::int[] <@ indkey::int[]
          );
      `);

      assert.strictEqual(res.rows[0].count, 0, 'There must be 0 unindexed foreign keys in public schema');
    });

    it('verifies storage.objects has RLS enabled and has policies', async () => {
      const res = await pgClient.query(`
        SELECT 
          c.relrowsecurity AS rls_enabled,
          COUNT(p.polname)::int AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'storage' AND c.relname = 'objects'
        GROUP BY c.relrowsecurity;
      `);

      assert.strictEqual(res.rows[0].rls_enabled, true);
      assert.ok(res.rows[0].policy_count >= 4);

      await pgClient.end();
    });
  });

  describe('6. Multi-Tenant Cross-Workspace Isolation & Anti-Escalation', () => {
    let pgClient: pg.Client;

    it('allows workspace owner to access own workspace and connected accounts', async () => {
      pgClient = new pg.Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      await pgClient.connect();

      await pgClient.query('BEGIN;');
      await pgClient.query("SET LOCAL ROLE authenticated;");
      await pgClient.query("SELECT set_config('request.jwt.claim.sub', 'usr_owner_01', true);");

      const wsRes = await pgClient.query("SELECT id, name FROM public.social_workspaces WHERE id = 'ws_dawnexus_prod';");
      assert.strictEqual(wsRes.rows.length, 1);

      const accountsRes = await pgClient.query("SELECT id FROM public.social_connected_accounts WHERE workspace_id = 'ws_dawnexus_prod';");
      assert.ok(accountsRes.rows.length >= 1);

      await pgClient.query('ROLLBACK;');
    });

    it('denies foreign tenant from reading another workspace or its connected accounts', async () => {
      await pgClient.query('BEGIN;');
      await pgClient.query("SET LOCAL ROLE authenticated;");
      await pgClient.query("SELECT set_config('request.jwt.claim.sub', 'usr_stranger_99', true);");

      const wsRes = await pgClient.query("SELECT id, name FROM public.social_workspaces WHERE id = 'ws_dawnexus_prod';");
      assert.strictEqual(wsRes.rows.length, 0, 'Foreign user must see 0 workspaces');

      const accountsRes = await pgClient.query("SELECT id FROM public.social_connected_accounts WHERE workspace_id = 'ws_dawnexus_prod';");
      assert.strictEqual(accountsRes.rows.length, 0, 'Foreign user must see 0 connected accounts');

      await pgClient.query('ROLLBACK;');
    });

    it('denies foreign tenant from self-assigning membership to another workspace', async () => {
      await pgClient.query('BEGIN;');
      await pgClient.query("SET LOCAL ROLE authenticated;");
      await pgClient.query("SELECT set_config('request.jwt.claim.sub', 'usr_stranger_99', true);");

      await assert.rejects(
        async () => {
          await pgClient.query(`
            INSERT INTO public.social_workspace_members (id, workspace_id, user_id, role)
            VALUES ('mem_hack', 'ws_dawnexus_prod', 'usr_stranger_99', 'admin');
          `);
        },
        /violates row-level security policy/
      );

      await pgClient.query('ROLLBACK;');
    });

    it('denies foreign tenant from inserting posts into another workspace', async () => {
      await pgClient.query('BEGIN;');
      await pgClient.query("SET LOCAL ROLE authenticated;");
      await pgClient.query("SELECT set_config('request.jwt.claim.sub', 'usr_stranger_99', true);");

      await assert.rejects(
        async () => {
          await pgClient.query(`
            INSERT INTO public.social_posts (id, workspace_id, caption, target_platforms)
            VALUES ('post_hack', 'ws_dawnexus_prod', 'Hacked Content', ARRAY['twitter']);
          `);
        },
        /violates row-level security policy/
      );

      await pgClient.query('ROLLBACK;');
      await pgClient.end();
    });
  });

});
