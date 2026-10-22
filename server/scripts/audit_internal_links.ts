import { initDatabase, getBlogs, getBlogBySlug } from '../db.js';

initDatabase();

// 1. Check old slug
const oldPost = getBlogBySlug('local-seo-google-maps-playbook');
console.log('Old slug (local-seo-google-maps-playbook) exists?:', Boolean(oldPost));

const newPost = getBlogBySlug('local-seo-playbook-small-businesses');
console.log('New slug (local-seo-playbook-small-businesses) exists?:', Boolean(newPost), 'ID:', newPost?.id);

// 2. Scan all blogs for non-www
const allBlogs = getBlogs({ limit: 100 }).items;
console.log('Total blogs in DB:', allBlogs.length);

const nonWwwMatches: Array<{ id: number; title: string; slug: string; matches: string[] }> = [];

for (const b of allBlogs) {
  const cMatches = b.content.match(/https?:\/\/dawnexus\.in[^\s"'<>)]*/g) || [];
  const eMatches = (b.excerpt || '').match(/https?:\/\/dawnexus\.in[^\s"'<>)]*/g) || [];
  const canMatches = (b.canonical_url || '').match(/https?:\/\/dawnexus\.in[^\s"'<>)]*/g) || [];
  const combined = Array.from(new Set([...cMatches, ...eMatches, ...canMatches]));
  if (combined.length > 0) {
    nonWwwMatches.push({
      id: b.id,
      title: b.title,
      slug: b.slug,
      matches: combined
    });
  }
}

console.log('Blogs with non-www links count:', nonWwwMatches.length);
console.log(JSON.stringify(nonWwwMatches, null, 2));

// 3. Scan website_pages in DB
import { getDb, getSeoConnection } from '../db.js';
const pages = getDb().prepare('SELECT * FROM website_pages').all() as any[];
console.log('--- WEBSITE PAGES IN DB ---');
for (const p of pages) {
  const str = JSON.stringify(p);
  const matches = str.match(/https?:\/\/dawnexus\.in[^\s"'<>)]*/g) || [];
  console.log(p.slug, 'Matches:', Array.from(new Set(matches)));
}

// 4. Check SEO & GA4 connection
const conn = getSeoConnection();
console.log('--- SEO & GA4 CONNECTION IN DB ---');
console.log('Selected property:', conn?.selected_property);
console.log('GA4 property ID:', conn?.ga4_property_id);
console.log('Last sync at:', conn?.last_sync_at);
console.log('Connection status:', conn?.connection_status);
console.log('Last error:', conn?.last_error);
