import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function setup() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment');
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase Postgres.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS database_health_checks (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      source TEXT NOT NULL,
      check_type TEXT NOT NULL DEFAULT 'postgres_query',
      error_category TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON database_health_checks(checked_at DESC);
    ALTER TABLE database_health_checks ENABLE ROW LEVEL SECURITY;
  `);

  console.log('database_health_checks table created successfully in Supabase!');
  await client.end();
}

setup().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});

