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

    console.log('[Postgres Migration] v8.3.0 schema and columns successfully verified on remote PostgreSQL.');
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
