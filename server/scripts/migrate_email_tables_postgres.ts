import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

export async function ensurePostgresEmailTables(): Promise<void> {
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
    console.log('[Postgres Migration] Connected to PostgreSQL. Verifying/creating Email AI tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS connected_email_accounts (
        id SERIAL PRIMARY KEY,
        admin_user TEXT NOT NULL DEFAULT 'admin',
        google_email TEXT NOT NULL,
        display_name TEXT DEFAULT NULL,
        encrypted_tokens TEXT NOT NULL,
        scopes TEXT NOT NULL,
        connection_status TEXT NOT NULL DEFAULT 'Connected',
        last_sync_at TIMESTAMPTZ DEFAULT NULL,
        last_attempt_at TIMESTAMPTZ DEFAULT NULL,
        last_error TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_connected_email_admin UNIQUE (admin_user, google_email)
      );

      CREATE INDEX IF NOT EXISTS idx_pg_connected_email_admin ON connected_email_accounts(admin_user);
      CREATE INDEX IF NOT EXISTS idx_pg_connected_email_status ON connected_email_accounts(connection_status);

      CREATE TABLE IF NOT EXISTS email_reply_drafts (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        admin_user TEXT NOT NULL DEFAULT 'admin',
        thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT DEFAULT NULL,
        subject TEXT NOT NULL,
        proposed_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Proposed',
        gmail_draft_id TEXT DEFAULT NULL,
        idempotency_key TEXT DEFAULT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        workflow_id TEXT DEFAULT 'ai_chat_draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_pg_email_drafts_account ON email_reply_drafts(account_id);
      CREATE INDEX IF NOT EXISTS idx_pg_email_drafts_thread ON email_reply_drafts(thread_id);
      CREATE INDEX IF NOT EXISTS idx_pg_email_drafts_status ON email_reply_drafts(status);
    `);

    // Grant public access to service role / anon if needed
    try {
      await client.query(`
        GRANT ALL ON connected_email_accounts TO anon, authenticated, service_role;
        GRANT ALL ON email_reply_drafts TO anon, authenticated, service_role;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      `);
    } catch {
      // Non-fatal if roles don't exist
    }

    console.log('[Postgres Migration] Successfully ensured connected_email_accounts and email_reply_drafts tables in PostgreSQL.');
  } catch (err) {
    console.error('[Postgres Migration Error]:', err);
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

// Direct execution
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  ensurePostgresEmailTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
