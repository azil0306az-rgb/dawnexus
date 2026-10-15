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
    CREATE TABLE IF NOT EXISTS calculator_pricing_config (
      id INT PRIMARY KEY DEFAULT 1,
      config_json JSONB NOT NULL,
      version INT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE calculator_pricing_config ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow public read access' AND tablename = 'calculator_pricing_config'
      ) THEN
        CREATE POLICY "Allow public read access" ON calculator_pricing_config FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow service role all' AND tablename = 'calculator_pricing_config'
      ) THEN
        CREATE POLICY "Allow service role all" ON calculator_pricing_config FOR ALL USING (true);
      END IF;
    END $$;
  `);

  console.log('calculator_pricing_config table created successfully in Supabase!');
  await client.end();
}

setup().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});

