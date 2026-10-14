import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

async function backupAndReset() {
  console.log('=== Step 1: Querying existing blogs for independent backup ===');

  // Read from SQLite
  const sqlitePath = path.resolve('./server/data/dawnexus.sqlite');
  let sqliteBlogs: any[] = [];
  if (fs.existsSync(sqlitePath)) {
    const db = new DatabaseSync(sqlitePath);
    sqliteBlogs = db.prepare('SELECT * FROM blogs ORDER BY id ASC').all();
  }
  console.log(`Found ${sqliteBlogs.length} articles in local SQLite.`);

  // Read from Supabase
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: supabaseBlogs, error: sbErr } = await supabase
    .from('blogs')
    .select('*')
    .order('id', { ascending: true });

  if (sbErr) {
    throw new Error(`Failed to query Supabase blogs: ${sbErr.message}`);
  }
  console.log(`Found ${supabaseBlogs?.length || 0} articles in Supabase PostgreSQL.`);

  // Merge articles by slug into a comprehensive backup map
  const backupMap = new Map<string, any>();
  for (const b of sqliteBlogs) {
    backupMap.set(b.slug, b);
  }
  for (const b of (supabaseBlogs || [])) {
    backupMap.set(b.slug, { ...backupMap.get(b.slug), ...b });
  }

  const allArticles = Array.from(backupMap.values());
  console.log(`Consolidated ${allArticles.length} unique articles for independent backup.`);

  // Step 2: Create independent backup archive
  const backupDir = path.resolve('./server/data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `blog-backup-${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFilename);
  const primaryBackupPath = path.join(backupDir, 'blog-backup-latest.json');

  const backupData = {
    exported_at: new Date().toISOString(),
    total_articles: allArticles.length,
    status_summary: {
      published: allArticles.filter(a => a.status === 'Published').length,
      draft: allArticles.filter(a => a.status === 'Draft').length,
      scheduled: allArticles.filter(a => a.status === 'Scheduled').length,
      archived: allArticles.filter(a => a.status === 'Archived').length,
      failed: allArticles.filter(a => a.status === 'Failed').length
    },
    articles: allArticles
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  fs.writeFileSync(primaryBackupPath, JSON.stringify(backupData, null, 2), 'utf8');

  // Step 3 & 4: Verify backup can be read and is intact
  console.log('=== Step 2 & 3: Verifying backup archive ===');
  const readBack = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (readBack.total_articles !== allArticles.length || !readBack.articles || readBack.articles.length === 0) {
    throw new Error('Backup integrity verification failed! Aborting reset.');
  }

  console.log(`[Backup Verified]: Saved to ${backupPath}`);
  console.log(`Total Articles Backed Up: ${readBack.total_articles}`);
  console.log(`  - Published: ${readBack.status_summary.published}`);
  console.log(`  - Draft: ${readBack.status_summary.draft}`);
  console.log(`  - Scheduled: ${readBack.status_summary.scheduled}`);
  console.log(`  - Archived: ${readBack.status_summary.archived}`);

  // Step 5: Perform the approved content reset
  console.log('=== Step 4: Performing approved blog content reset ===');

  // 1. Delete all rows from Supabase blogs table
  const { error: delErr } = await supabase
    .from('blogs')
    .delete()
    .neq('id', -999999); // deletes all rows

  if (delErr) {
    throw new Error(`Failed to reset Supabase blogs: ${delErr.message}`);
  }
  console.log('Successfully cleared all blog records from Supabase PostgreSQL.');

  // 2. Delete all rows from local SQLite blogs table
  if (fs.existsSync(sqlitePath)) {
    const db = new DatabaseSync(sqlitePath);
    db.prepare('DELETE FROM blogs').run();
    console.log('Successfully cleared all blog records from local SQLite.');
  }

  // Step 6: Verify reset
  const { count: sbCount } = await supabase
    .from('blogs')
    .select('*', { count: 'exact', head: true });

  console.log(`Supabase blogs count after reset: ${sbCount}`);
  if (sbCount !== 0) {
    throw new Error('Supabase blogs count is not 0 after reset!');
  }

  if (fs.existsSync(sqlitePath)) {
    const db = new DatabaseSync(sqlitePath);
    const countRes = db.prepare('SELECT COUNT(*) as c FROM blogs').get() as { c: number };
    console.log(`SQLite blogs count after reset: ${countRes.c}`);
    if (countRes.c !== 0) {
      throw new Error('SQLite blogs count is not 0 after reset!');
    }
  }

  console.log('=== BLOG RESET COMPLETED SUCCESSFULLY! ===');
  console.log('The active blog dataset is now 100% clean and ready for new image-supported content.');
}

backupAndReset().catch(err => {
  console.error('Error in backupAndReset:', err);
  process.exit(1);
});
