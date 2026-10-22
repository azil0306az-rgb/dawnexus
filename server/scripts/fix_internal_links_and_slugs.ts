import fs from 'node:fs';
import path from 'node:path';
import { getDb, getBlogById, addBlogRedirect, getAllBlogRedirects } from '../db.js';
import { supabase, pushBlogToSupabase } from '../supabase.js';

async function main() {
  console.log('=== DAWNEXUS V8.2.0: DATABASE INTERNAL LINKS & REDIRECTS MIGRATION ===');
  const db = getDb();

  // 1. Fetch all blogs
  const allBlogs = db.prepare('SELECT * FROM blogs ORDER BY id ASC').all() as any[];
  console.log(`Found ${allBlogs.length} total blogs in database.`);

  // 2. Create backup of all blogs
  const backupDir = path.join(process.cwd(), 'server', 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, 'blogs-backup-pre-v820.json');
  fs.writeFileSync(backupPath, JSON.stringify(allBlogs, null, 2), 'utf-8');
  console.log(`[Backup] Successfully exported ${allBlogs.length} blogs to: ${backupPath}`);

  // 3. Process replacements for non-www URLs
  // Notice: replace 'https://dawnexus.in' with 'https://www.dawnexus.in'
  // and 'http://dawnexus.in' with 'https://www.dawnexus.in'
  // but DO NOT touch email addresses (e.g. '@dawnexus.in')
  let updatedCount = 0;

  for (const b of allBlogs) {
    let hasChanges = false;
    let newContent = b.content || '';
    let newCanonical = b.canonical_url || '';
    let newAdminNotes = b.admin_notes || '';

    // Regex matching http(s)://dawnexus.in (with word boundary / path after, not email)
    const nonWwwRegex = /https?:\/\/dawnexus\.in(\/[^\s\)\"\'>\]]*)?/g;

    if (nonWwwRegex.test(newContent)) {
      newContent = newContent.replace(nonWwwRegex, (match: string) => {
        return match.replace(/^https?:\/\/dawnexus\.in/, 'https://www.dawnexus.in');
      });
      hasChanges = true;
    }

    if (newCanonical && nonWwwRegex.test(newCanonical)) {
      newCanonical = newCanonical.replace(nonWwwRegex, (match: string) => {
        return match.replace(/^https?:\/\/dawnexus\.in/, 'https://www.dawnexus.in');
      });
      hasChanges = true;
    }

    if (newAdminNotes && nonWwwRegex.test(newAdminNotes)) {
      newAdminNotes = newAdminNotes.replace(nonWwwRegex, (match: string) => {
        return match.replace(/^https?:\/\/dawnexus\.in/, 'https://www.dawnexus.in');
      });
      hasChanges = true;
    }

    if (hasChanges) {
      db.prepare(`
        UPDATE blogs SET
          content = ?,
          canonical_url = ?,
          admin_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newContent, newCanonical, newAdminNotes, new Date().toISOString(), b.id);

      const refreshed = getBlogById(b.id);
      if (refreshed && supabase) {
        try {
          await pushBlogToSupabase(refreshed);
          console.log(`[Supabase Synced] Blog #${b.id}: "${b.title}"`);
        } catch (err: any) {
          console.warn(`[Supabase Sync Warning] Blog #${b.id}:`, err?.message || err);
        }
      }
      updatedCount++;
    }
  }

  console.log(`[Database Migration] Successfully updated ${updatedCount} blogs with canonical www links.`);

  // 4. Configure slug 301 redirect
  addBlogRedirect(
    '/blog/local-seo-google-maps-playbook',
    'https://www.dawnexus.in/blog/local-seo-playbook-small-businesses',
    301,
    'GSC audit: redirected former slug to active published blog post #384'
  );
  console.log('[Redirect Configured] /blog/local-seo-google-maps-playbook -> https://www.dawnexus.in/blog/local-seo-playbook-small-businesses');

  const redirects = getAllBlogRedirects();
  console.log('All Blog Redirects in DB:', JSON.stringify(redirects, null, 2));

  // 5. Verification: Check for any remaining non-www links in blogs
  const checkBlogs = db.prepare('SELECT id, title, slug, content, canonical_url FROM blogs').all() as any[];
  const remainingIssues = checkBlogs.filter(b => 
    (b.content && b.content.includes('https://dawnexus.in')) ||
    (b.content && b.content.includes('http://dawnexus.in')) ||
    (b.canonical_url && b.canonical_url.includes('https://dawnexus.in')) ||
    (b.canonical_url && b.canonical_url.includes('http://dawnexus.in'))
  );

  console.log(`Verification: Blogs with remaining non-www links: ${remainingIssues.length}`);
  if (remainingIssues.length > 0) {
    console.error('Remaining non-www blogs:', remainingIssues.map(b => ({ id: b.id, slug: b.slug })));
    process.exit(1);
  } else {
    console.log('SUCCESS: All blog internal links and canonicals are now using https://www.dawnexus.in');
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
