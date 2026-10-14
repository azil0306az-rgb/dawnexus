import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const defaultDbPath = process.env.VERCEL
  ? path.join('/tmp', 'dawnexus.sqlite')
  : './server/data/dawnexus.sqlite';
const dbPath = process.env.DB_PATH || defaultDbPath;

export interface HealthCheckRecord {
  id: number;
  status: 'Healthy' | 'Degraded' | 'Unavailable' | 'Unknown';
  response_time_ms: number;
  source: 'scheduled' | 'manual' | 'startup';
  check_type: string;
  error_category: string | null;
  error_message: string | null;
  details?: any;
  checked_at: string;
}

export interface HealthStats {
  currentStatus: 'Healthy' | 'Degraded' | 'Unavailable' | 'Unknown';
  lastCheck: HealthCheckRecord | null;
  lastSuccessfulCheck: HealthCheckRecord | null;
  consecutiveFailures: number;
  recentHistory: HealthCheckRecord[];
  failedHistory: HealthCheckRecord[];
  supabaseConfigured: boolean;
  maskedConnectionString: string;
  timezone: string;
  scheduleDescription: string;
}

function getSqliteDb(): DatabaseSync {
  const resolvedDbDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(resolvedDbDir)) {
    fs.mkdirSync(resolvedDbDir, { recursive: true });
  }
  return new DatabaseSync(path.resolve(dbPath));
}

/**
 * Executes a minimal, safe, genuine server-side health check against Supabase PostgreSQL.
 */
export async function performDatabaseHealthCheck(
  source: 'scheduled' | 'manual' | 'startup' = 'scheduled'
): Promise<HealthCheckRecord> {
  const startTime = Date.now();
  let status: 'Healthy' | 'Degraded' | 'Unavailable' = 'Healthy';
  let errorCategory: string | null = null;
  let errorMessage: string | null = null;
  let durationMs = 0;
  const nowIso = new Date().toISOString();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl && !databaseUrl) {
    status = 'Unavailable';
    errorCategory = 'CONFIGURATION_MISSING';
    errorMessage = 'Neither SUPABASE_URL nor DATABASE_URL environment variables are configured.';
    durationMs = Date.now() - startTime;
  } else {
    try {
      // 1. Preferred minimal check: direct PostgreSQL ping via Connection Pooler
      if (databaseUrl) {
        const client = new pg.Client({
          connectionString: databaseUrl,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 7000
        });

        await client.connect();
        const queryRes = await client.query('SELECT NOW() as now_time, current_database() as db_name');
        await client.end();

        durationMs = Date.now() - startTime;
        if (!queryRes || !queryRes.rows || queryRes.rows.length === 0) {
          status = 'Degraded';
          errorCategory = 'QUERY_UNEXPECTED_RESULT';
          errorMessage = 'PostgreSQL SELECT NOW() query returned empty rows.';
        } else if (durationMs >= 2000) {
          status = 'Degraded';
          errorCategory = 'HIGH_LATENCY';
          errorMessage = `Database response latency (${durationMs}ms) exceeded acceptable threshold (2000ms).`;
        } else {
          status = 'Healthy';
        }
      } else if (supabaseUrl && supabaseKey) {
        // Fallback check: PostgREST ping via Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase REST check timed out after 7000ms')), 7000)
        );

        const checkPromise = supabase
          .from('database_health_checks')
          .select('id')
          .limit(1);

        const { error } = (await Promise.race([checkPromise, timeoutPromise])) as any;
        durationMs = Date.now() - startTime;

        if (error) {
          status = 'Unavailable';
          errorCategory = 'POSTGREST_ERROR';
          errorMessage = error.message || 'Supabase REST query failed.';
        } else if (durationMs >= 2000) {
          status = 'Degraded';
          errorCategory = 'HIGH_LATENCY';
          errorMessage = `Supabase query latency (${durationMs}ms) exceeded threshold.`;
        } else {
          status = 'Healthy';
        }
      }
    } catch (err: any) {
      durationMs = Date.now() - startTime;
      status = 'Unavailable';
      const rawMsg = err?.message || String(err);

      if (rawMsg.includes('timed out') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ECONNRESET')) {
        errorCategory = 'TIMEOUT_CONNECTIVITY';
        errorMessage = 'Connection to Supabase timed out or connection was reset by peer.';
      } else if (rawMsg.includes('password authentication failed') || rawMsg.includes('auth')) {
        errorCategory = 'AUTHENTICATION_FAILURE';
        errorMessage = 'Database authentication failed. Verify credentials in environment variables.';
      } else if (rawMsg.includes('ENOTFOUND') || rawMsg.includes('EAI_AGAIN')) {
        errorCategory = 'DNS_UNREACHABLE';
        errorMessage = 'Database host could not be resolved by DNS.';
      } else {
        errorCategory = 'EXECUTION_ERROR';
        // Strip sensitive database credentials if any leaked in the error string
        errorMessage = rawMsg.replace(/:\/\/.*@/, '://[PROTECTED]@');
      }
    }
  }

  const record: HealthCheckRecord = {
    id: 0,
    status,
    response_time_ms: durationMs,
    source,
    check_type: 'postgres_pooler_ping',
    error_category: errorCategory,
    error_message: errorMessage,
    checked_at: nowIso
  };

  // Persist record to Supabase and SQLite
  await persistHealthCheckRecord(record);

  return record;
}

async function persistHealthCheckRecord(record: HealthCheckRecord): Promise<void> {
  // 1. Persist to local SQLite
  try {
    const db = getSqliteDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS database_health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        response_time_ms INTEGER NOT NULL,
        source TEXT NOT NULL,
        check_type TEXT NOT NULL DEFAULT 'postgres_query',
        error_category TEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        details TEXT DEFAULT '{}',
        checked_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON database_health_checks(checked_at DESC);
    `);

    const stmt = db.prepare(`
      INSERT INTO database_health_checks (
        status, response_time_ms, source, check_type, error_category, error_message, checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      record.status,
      record.response_time_ms,
      record.source,
      record.check_type,
      record.error_category,
      record.error_message,
      record.checked_at
    );

    record.id = Number(info.lastInsertRowid);

    // Retention policy: Keep the latest 200 checks in SQLite
    db.prepare(`
      DELETE FROM database_health_checks
      WHERE id NOT IN (
        SELECT id FROM database_health_checks ORDER BY id DESC LIMIT 200
      )
    `).run();
  } catch (err) {
    console.warn('[Health Check SQLite Save Notice]:', err);
  }

  // 2. Persist to Supabase PostgreSQL (durable cloud storage)
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      await supabase.from('database_health_checks').insert({
        status: record.status,
        response_time_ms: record.response_time_ms,
        source: record.source,
        check_type: record.check_type,
        error_category: record.error_category,
        error_message: record.error_message,
        checked_at: record.checked_at
      });
    }
  } catch (err) {
    console.warn('[Health Check Supabase Save Notice]:', err);
  }
}

/**
 * Retrieves compiled database health statistics and recent check history.
 */
export async function getDatabaseHealthStats(): Promise<HealthStats> {
  const db = getSqliteDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS database_health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      source TEXT NOT NULL,
      check_type TEXT NOT NULL DEFAULT 'postgres_query',
      error_category TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      details TEXT DEFAULT '{}',
      checked_at TEXT NOT NULL
    );
  `);

  const recentHistory = (
    db.prepare(`
      SELECT id, status, response_time_ms, source, check_type, error_category, error_message, checked_at
      FROM database_health_checks
      ORDER BY id DESC
      LIMIT 25
    `).all() as unknown as HealthCheckRecord[]
  ) || [];

  const failedHistory = (
    db.prepare(`
      SELECT id, status, response_time_ms, source, check_type, error_category, error_message, checked_at
      FROM database_health_checks
      WHERE status IN ('Unavailable', 'Degraded')
      ORDER BY id DESC
      LIMIT 25
    `).all() as unknown as HealthCheckRecord[]
  ) || [];

  const lastCheck = recentHistory[0] || null;

  const lastSuccessfulRow = db.prepare(`
    SELECT id, status, response_time_ms, source, check_type, error_category, error_message, checked_at
    FROM database_health_checks
    WHERE status = 'Healthy'
    ORDER BY id DESC
    LIMIT 1
  `).get() as unknown as HealthCheckRecord | undefined;

  // Calculate consecutive failures
  let consecutiveFailures = 0;
  for (const check of recentHistory) {
    if (check.status === 'Unavailable') {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const maskedConn = databaseUrl
    ? databaseUrl.replace(/:([^:@]+)@/, ':••••••••@')
    : 'Not configured';

  return {
    currentStatus: lastCheck ? lastCheck.status : 'Unknown',
    lastCheck,
    lastSuccessfulCheck: lastSuccessfulRow || null,
    consecutiveFailures,
    recentHistory,
    failedHistory,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
    maskedConnectionString: maskedConn,
    timezone: 'Asia/Kolkata (IST)',
    scheduleDescription: 'Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 IST)'
  };
}
