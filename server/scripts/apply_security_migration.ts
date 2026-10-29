import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is missing in environment.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL database. Reading migration SQL...');

  const migrationPath = path.join(process.cwd(), 'server', 'migrations', '20261030_full_supabase_security_remediation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration 20261030_full_supabase_security_remediation.sql...');
  const start = Date.now();

  try {
    await client.query(sql);
    console.log(`Migration successfully applied in ${Date.now() - start}ms.`);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    if (err.position) console.error('Error position:', err.position);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error applying migration:', err);
  process.exit(1);
});
