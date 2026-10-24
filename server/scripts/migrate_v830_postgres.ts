import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

export async function ensurePostgresV830Schema(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[Postgres Migration] DATABASE_URL not configured. Skipping remote Postgres table migration.');
    return;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('[Postgres Migration] Connected to PostgreSQL. Verifying/migrating v8.3.0 tables and columns...');

    // 1. Add v8.3.0 columns to blogs table
    await client.query(`
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS firsthand_observations TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS project_examples TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS case_studies TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS original_research_data TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS implementation_process TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS external_sources TEXT DEFAULT '[]';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS limitations_lessons TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'Technical Architect & SEO Strategist';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_bio TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_credentials TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS reviewer_name TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS editorial_notes TEXT DEFAULT '';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS citation_answer_blocks TEXT DEFAULT '[]';
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS review_cycle_days INTEGER DEFAULT 90;
      ALTER TABLE blogs ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ DEFAULT NULL;
    `);

    // 2. Create ai_citation_observations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_citation_observations (
        id SERIAL PRIMARY KEY,
        article_slug TEXT NOT NULL,
        source_ai TEXT NOT NULL,
        query_prompt TEXT NOT NULL,
        observed_date DATE NOT NULL,
        citation_url TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        recorded_by TEXT DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pg_ai_citations_slug ON ai_citation_observations(article_slug);
    `);

    // 3. Create contextual_cta_configs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contextual_cta_configs (
        id SERIAL PRIMARY KEY,
        service_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        headline TEXT NOT NULL,
        description TEXT NOT NULL,
        button_text TEXT NOT NULL,
        target_url TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        scroll_threshold INTEGER NOT NULL DEFAULT 50,
        dwell_time_seconds INTEGER NOT NULL DEFAULT 20,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Create showcases table for Version 8.4.0 Dynamic Products & Showcases CMS
    await client.query(`
      CREATE TABLE IF NOT EXISTS showcases (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        card_heading TEXT DEFAULT '',
        full_heading TEXT DEFAULT '',
        short_description TEXT NOT NULL DEFAULT '',
        detailed_description TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Automation & Operations',
        tagline TEXT DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'In Development',
        launch_date TEXT DEFAULT '',
        project_url TEXT DEFAULT '',
        link_label TEXT DEFAULT 'Explore Live Demo',
        is_link_enabled INTEGER NOT NULL DEFAULT 1,
        open_in_new_tab INTEGER NOT NULL DEFAULT 1,
        inquiry_service TEXT DEFAULT 'Website Design & Development',
        screenshot_url TEXT NOT NULL DEFAULT '',
        screenshot_source_url TEXT DEFAULT '',
        screenshot_captured_at TIMESTAMPTZ DEFAULT NULL,
        screenshot_alt TEXT DEFAULT '',
        features TEXT DEFAULT '[]',
        workflow_steps TEXT DEFAULT '[]',
        capabilities TEXT DEFAULT '[]',
        benefits TEXT DEFAULT '[]',
        tech_stack TEXT DEFAULT '[]',
        intended_audience TEXT DEFAULT '',
        use_cases TEXT DEFAULT '[]',
        project_challenges TEXT DEFAULT '',
        implementation_approach TEXT DEFAULT '',
        outcome_results TEXT DEFAULT '',
        gallery_images TEXT DEFAULT '[]',
        faq_items TEXT DEFAULT '[]',
        publication_status TEXT NOT NULL DEFAULT 'Published',
        published_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pg_showcases_slug ON showcases(slug);
      CREATE INDEX IF NOT EXISTS idx_pg_showcases_status ON showcases(status);
      CREATE INDEX IF NOT EXISTS idx_pg_showcases_order ON showcases(display_order);
    `);

    // 5. Create contact_settings table for dynamic contact and social channels (v8.4.0)
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        phone TEXT NOT NULL DEFAULT '+91 95669 88995',
        email TEXT NOT NULL DEFAULT 'contact@dawnexus.in',
        instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/dawnexus',
        facebook_url TEXT NOT NULL DEFAULT 'https://www.facebook.com/dawnexus',
        linkedin_url TEXT NOT NULL DEFAULT 'https://www.linkedin.com/company/dawnexus',
        address TEXT DEFAULT 'Coimbatore, Tamil Nadu, India',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO contact_settings (id, phone, email, instagram_url, facebook_url, linkedin_url, address, created_at, updated_at)
      VALUES (
        1,
        '+91 95669 88995',
        'contact@dawnexus.in',
        'https://www.instagram.com/dawnexus',
        'https://www.facebook.com/dawnexus',
        'https://www.linkedin.com/company/dawnexus',
        'Coimbatore, Tamil Nadu, India',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;

      -- Reload PostgREST schema cache so Supabase JS client immediately detects the new table
      NOTIFY pgrst, 'reload schema';
    `);

    console.log('[Postgres Migration] v8.3.0 & v8.4.0 schema and columns successfully verified on remote PostgreSQL.');
  } catch (err: any) {
    console.warn('[Postgres Migration Notice]:', err?.message || err);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

// Allow direct CLI execution: npx tsx server/scripts/migrate_v830_postgres.ts
if (process.argv[1]?.includes('migrate_v830_postgres')) {
  ensurePostgresV830Schema()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration script failed:', err);
      process.exit(1);
    });
}
