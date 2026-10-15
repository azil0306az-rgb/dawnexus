import 'dotenv/config';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the Supabase migration.');
}

async function migrate() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  console.log('Creating tables...');
  await client.query(`
    -- 1. Enquiries
    CREATE TABLE IF NOT EXISTS enquiries (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      business_name TEXT DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      requested_services TEXT NOT NULL,
      budget TEXT DEFAULT '',
      project_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      admin_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2. Admin Sessions
    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 3. Blogs CMS
    CREATE TABLE IF NOT EXISTS blogs (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      featured_image TEXT DEFAULT '',
      image_alt TEXT DEFAULT '',
      author TEXT DEFAULT 'Dawnexus Editorial',
      category TEXT DEFAULT 'Digital Strategy',
      tags TEXT DEFAULT '[]',
      primary_keyword TEXT DEFAULT '',
      secondary_keywords TEXT DEFAULT '[]',
      target_location TEXT DEFAULT '',
      search_intent TEXT DEFAULT 'Informational',
      target_audience TEXT DEFAULT '',
      target_questions TEXT DEFAULT '[]',
      seo_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      canonical_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      scheduled_at TIMESTAMPTZ DEFAULT NULL,
      published_at TIMESTAMPTZ DEFAULT NULL,
      publication_error TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. Admin Notification Settings
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INT PRIMARY KEY CHECK (id = 1),
      active_email TEXT DEFAULT NULL,
      is_verified INT DEFAULT 0,
      verified_at TIMESTAMPTZ DEFAULT NULL,
      pending_email TEXT DEFAULT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 5. Notification OTP Challenges
    CREATE TABLE IF NOT EXISTS notification_otp_challenges (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      attempts INT DEFAULT 0,
      max_attempts INT DEFAULT 5,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      used_at TIMESTAMPTZ DEFAULT NULL
    );

    -- 6. SEO Research Google Connections
    CREATE TABLE IF NOT EXISTS seo_research_connections (
      id INT PRIMARY KEY CHECK (id = 1),
      google_email TEXT DEFAULT NULL,
      encrypted_tokens TEXT DEFAULT NULL,
      selected_property TEXT DEFAULT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 7. Client Showcase (Our Work)
    CREATE TABLE IF NOT EXISTS clients (
      id BIGSERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      website_url TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      hero_preview_url TEXT NOT NULL DEFAULT '',
      service_category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      display_order INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
    CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
    CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_clients_order ON clients(display_order);

    -- The application accesses these tables only through authenticated server routes.
    -- Service-role requests bypass RLS; anonymous direct PostgREST access is denied.
    ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notification_otp_challenges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE seo_research_connections ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

    -- Ensure single row for notification_settings
    INSERT INTO notification_settings (id, active_email, is_verified, verified_at, pending_email, updated_at)
    VALUES (1, NULL, 0, NULL, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Ensure single row for seo_research_connections
    INSERT INTO seo_research_connections (id, google_email, encrypted_tokens, selected_property, updated_at)
    VALUES (1, NULL, NULL, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Schema created successfully in Supabase!');

  // Check if local sqlite exists to copy blogs and clients over
  const sqlitePath = path.resolve('./server/data/dawnexus.sqlite');
  if (fs.existsSync(sqlitePath)) {
    console.log('Migrating existing data from local SQLite...');
    const sqlite = new DatabaseSync(sqlitePath);

    // Migrate blogs
    try {
      const blogs = sqlite.prepare('SELECT * FROM blogs').all() as any[];
      for (const blog of blogs) {
        await client.query(`
          INSERT INTO blogs (
            id, title, slug, excerpt, content, featured_image, image_alt, author,
            category, tags, primary_keyword, secondary_keywords, target_location,
            search_intent, target_audience, target_questions, seo_title, meta_description,
            canonical_url, status, scheduled_at, published_at, publication_error,
            admin_notes, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23,
            $24, $25, $26
          )
          ON CONFLICT (slug) DO NOTHING;
        `, [
          blog.id, blog.title, blog.slug, blog.excerpt, blog.content, blog.featured_image, blog.image_alt, blog.author,
          blog.category, blog.tags, blog.primary_keyword, blog.secondary_keywords, blog.target_location,
          blog.search_intent, blog.target_audience, blog.target_questions, blog.seo_title, blog.meta_description,
          blog.canonical_url, blog.status, blog.scheduled_at || null, blog.published_at || null, blog.publication_error,
          blog.admin_notes, blog.created_at, blog.updated_at
        ]);
      }
      // Update blogs sequence
      await client.query(`SELECT setval('blogs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM blogs));`);
      console.log(`Migrated ${blogs.length} blogs to Supabase.`);
    } catch (err: any) {
      console.warn('Blog migration notice:', err.message);
    }

    // Migrate clients
    try {
      const clients = sqlite.prepare('SELECT * FROM clients').all() as any[];
      for (const c of clients) {
        await client.query(`
          INSERT INTO clients (
            id, client_name, website_url, logo_url, hero_preview_url,
            service_category, description, display_order, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING;
        `, [
          c.id, c.client_name, c.website_url, c.logo_url, c.hero_preview_url,
          c.service_category, c.description, c.display_order, c.status, c.created_at, c.updated_at
        ]);
      }
      await client.query(`SELECT setval('clients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM clients));`);
      console.log(`Migrated ${clients.length} clients to Supabase.`);
    } catch (err: any) {
      console.warn('Client migration notice:', err.message);
    }

    // Migrate notification settings if set
    try {
      const settings = sqlite.prepare('SELECT * FROM notification_settings WHERE id = 1').get() as any;
      if (settings && settings.active_email) {
        await client.query(`
          UPDATE notification_settings SET
            active_email = $1,
            is_verified = $2,
            verified_at = $3,
            pending_email = $4,
            updated_at = $5
          WHERE id = 1;
        `, [
          settings.active_email, settings.is_verified, settings.verified_at,
          settings.pending_email, settings.updated_at
        ]);
        console.log('Migrated notification settings to Supabase.');
      }
    } catch (err: any) {
      console.warn('Settings migration notice:', err.message);
    }
  }

  await client.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

