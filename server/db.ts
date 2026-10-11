import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Define the DB path
const defaultDbPath = process.env.VERCEL
  ? path.join('/tmp', 'dawnexus.sqlite')
  : './server/data/dawnexus.sqlite';
const dbPath = process.env.DB_PATH || defaultDbPath;
const resolvedDbDir = path.dirname(path.resolve(dbPath));

// Ensure storage directory exists
if (!fs.existsSync(resolvedDbDir)) {
  fs.mkdirSync(resolvedDbDir, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(path.resolve(dbPath));

// Initialize schema
export function initDatabase() {
  // Table for customer enquiries
  db.exec(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      business_name TEXT DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      requested_services TEXT NOT NULL,
      budget TEXT DEFAULT '',
      project_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Table for active admin sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_active TEXT NOT NULL
    );
  `);

  // Table for blogs
  db.exec(`
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      featured_image TEXT DEFAULT '',
      image_alt TEXT DEFAULT '',
      author TEXT DEFAULT 'Dawnexus Editorial',
      category TEXT DEFAULT 'Digital Strategy',
      tags TEXT DEFAULT '[]',
      primary_keyword TEXT DEFAULT '',
      secondary_keywords TEXT DEFAULT '[]',
      target_location TEXT DEFAULT '',
      search_intent TEXT DEFAULT 'Informational',
      target_audience TEXT DEFAULT '',
      target_questions TEXT DEFAULT '[]',
      seo_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      canonical_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      scheduled_at TEXT DEFAULT NULL,
      published_at TEXT DEFAULT NULL,
      publication_error TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create indexes for fast lookup and filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
    CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
    CREATE INDEX IF NOT EXISTS idx_blogs_scheduled_at ON blogs(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at);
  `);

  seedBlogsIfEmpty();

  console.log(`[Database] SQLite initialized successfully at: ${path.resolve(dbPath)}`);
}

export interface EnquiryRecord {
  id: number;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  requested_services: string; // JSON array of string
  budget: string;
  project_details: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Completed' | 'Archived';
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnquiryInput {
  full_name: string;
  business_name?: string;
  email: string;
  phone?: string;
  requested_services: string[];
  budget?: string;
  project_details: string;
}

// Queries
export function createEnquiry(input: CreateEnquiryInput): EnquiryRecord {
  const now = new Date().toISOString();
  const servicesJson = JSON.stringify(input.requested_services || []);
  
  const stmt = db.prepare(`
    INSERT INTO enquiries (
      full_name, business_name, email, phone, requested_services,
      budget, project_details, status, admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New', '', ?, ?)
  `);

  const info = stmt.run(
    input.full_name.trim(),
    (input.business_name || '').trim(),
    input.email.trim().toLowerCase(),
    (input.phone || '').trim(),
    servicesJson,
    (input.budget || '').trim(),
    input.project_details.trim(),
    now,
    now
  );

  const lastId = Number(info.lastInsertRowid);
  const getStmt = db.prepare('SELECT * FROM enquiries WHERE id = ?');
  return getStmt.get(lastId) as unknown as EnquiryRecord;
}

export function getEnquiryById(id: number): EnquiryRecord | null {
  const stmt = db.prepare('SELECT * FROM enquiries WHERE id = ?');
  const res = stmt.get(id);
  return (res as unknown as EnquiryRecord) || null;
}

export interface GetEnquiriesQuery {
  search?: string;
  status?: string;
  service?: string;
  sortBy?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export function getEnquiries(params: GetEnquiriesQuery) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let queryArgs: (string | number)[] = [];

  if (params.status && params.status !== 'All') {
    whereClauses.push('status = ?');
    queryArgs.push(params.status);
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(full_name) LIKE ? OR LOWER(business_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(project_details) LIKE ?)');
    queryArgs.push(term, term, term, term);
  }

  if (params.service && params.service.trim() && params.service !== 'All') {
    const term = `%${params.service.trim()}%`;
    whereClauses.push('requested_services LIKE ?');
    queryArgs.push(term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderSql = params.sortBy === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

  // Count total matching
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM enquiries ${whereSql}`);
  const countRes = countStmt.get(...queryArgs) as { count: number };
  const total = Number(countRes?.count || 0);

  // Select page
  const dataStmt = db.prepare(`SELECT * FROM enquiries ${whereSql} ${orderSql} LIMIT ? OFFSET ?`);
  const items = dataStmt.all(...queryArgs, limit, offset) as unknown as EnquiryRecord[];

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function updateEnquiry(
  id: number,
  updates: { status?: string; admin_notes?: string }
): EnquiryRecord | null {
  const now = new Date().toISOString();
  const current = getEnquiryById(id);
  if (!current) return null;

  const newStatus = updates.status !== undefined ? updates.status : current.status;
  const newNotes = updates.admin_notes !== undefined ? updates.admin_notes : current.admin_notes;

  const stmt = db.prepare(`
    UPDATE enquiries 
    SET status = ?, admin_notes = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(newStatus, newNotes, now, id);

  return getEnquiryById(id);
}

export function deleteEnquiry(id: number): boolean {
  const stmt = db.prepare('DELETE FROM enquiries WHERE id = ?');
  const result = stmt.run(id);
  return Number(result.changes) > 0;
}

export function getStats() {
  const totalRes = db.prepare('SELECT COUNT(*) as c FROM enquiries').get() as { c: number };
  const newRes = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'New'").get() as { c: number };
  const inProgressRes = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'In Progress'").get() as { c: number };
  const contactedRes = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'Contacted'").get() as { c: number };
  const completedRes = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'Completed'").get() as { c: number };
  const archivedRes = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'Archived'").get() as { c: number };

  return {
    total: Number(totalRes.c),
    new: Number(newRes.c),
    inProgress: Number(inProgressRes.c),
    contacted: Number(contactedRes.c),
    completed: Number(completedRes.c),
    archived: Number(archivedRes.c)
  };
}

export function getAllEnquiriesForExport(): EnquiryRecord[] {
  const stmt = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC');
  return stmt.all() as unknown as EnquiryRecord[];
}

// Session store management
export function createSession(sessionId: string, maxAgeHours: number = 4) {
  const now = new Date();
  const expires = new Date(now.getTime() + maxAgeHours * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO admin_sessions (session_id, created_at, expires_at, last_active)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(sessionId, now.toISOString(), expires.toISOString(), now.toISOString());
}

export function validateSession(sessionId: string): boolean {
  if (!sessionId) return false;
  const stmt = db.prepare('SELECT * FROM admin_sessions WHERE session_id = ?');
  const sess = stmt.get(sessionId) as { session_id: string; expires_at: string } | undefined;
  if (!sess) return false;

  const now = new Date();
  const expires = new Date(sess.expires_at);
  if (now > expires) {
    destroySession(sessionId);
    return false;
  }

  // Update last active
  db.prepare('UPDATE admin_sessions SET last_active = ? WHERE session_id = ?').run(now.toISOString(), sessionId);
  return true;
}

export function destroySession(sessionId: string) {
  if (!sessionId) return;
  db.prepare('DELETE FROM admin_sessions WHERE session_id = ?').run(sessionId);
}

export function cleanupExpiredSessions() {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now);
}

// ----------------------------------------------------
// BLOGS SYSTEM
// ----------------------------------------------------

export interface BlogRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  image_alt: string;
  author: string;
  category: string;
  tags: string; // JSON string array
  primary_keyword: string;
  secondary_keywords: string; // JSON string array
  target_location: string;
  search_intent: string;
  target_audience: string;
  target_questions: string; // JSON string array
  seo_title: string;
  meta_description: string;
  canonical_url: string;
  status: 'Draft' | 'Scheduled' | 'Published' | 'Archived' | 'Failed';
  scheduled_at: string | null;
  published_at: string | null;
  publication_error: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  image_alt?: string;
  author?: string;
  category?: string;
  tags?: string[];
  primary_keyword?: string;
  secondary_keywords?: string[];
  target_location?: string;
  search_intent?: string;
  target_audience?: string;
  target_questions?: string[];
  seo_title?: string;
  meta_description?: string;
  canonical_url?: string;
  status?: 'Draft' | 'Scheduled' | 'Published' | 'Archived' | 'Failed';
  scheduled_at?: string | null;
  published_at?: string | null;
  admin_notes?: string;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'untitled-post';
}

export function ensureUniqueSlug(desiredSlug: string, currentId?: number): string {
  let slug = slugify(desiredSlug);
  let counter = 1;
  while (true) {
    const existing = db.prepare('SELECT id FROM blogs WHERE slug = ?').get(slug) as { id: number } | undefined;
    if (!existing || (currentId && existing.id === currentId)) {
      return slug;
    }
    slug = `${slugify(desiredSlug)}-${counter}`;
    counter++;
  }
}

export function createBlog(input: CreateBlogInput): BlogRecord {
  const now = new Date().toISOString();
  const slug = ensureUniqueSlug(input.slug || input.title);
  const status = input.status || 'Draft';
  const publishedAt = status === 'Published' ? (input.published_at || now) : null;

  const stmt = db.prepare(`
    INSERT INTO blogs (
      title, slug, excerpt, content, featured_image, image_alt, author,
      category, tags, primary_keyword, secondary_keywords, target_location,
      search_intent, target_audience, target_questions, seo_title,
      meta_description, canonical_url, status, scheduled_at, published_at,
      publication_error, admin_notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      '', ?, ?, ?
    )
  `);

  const info = stmt.run(
    input.title.trim(),
    slug,
    (input.excerpt || '').trim(),
    (input.content || '').trim(),
    (input.featured_image || '').trim(),
    (input.image_alt || '').trim(),
    (input.author || 'Dawnexus Editorial').trim(),
    (input.category || 'Digital Strategy').trim(),
    JSON.stringify(input.tags || []),
    (input.primary_keyword || '').trim(),
    JSON.stringify(input.secondary_keywords || []),
    (input.target_location || '').trim(),
    input.search_intent || 'Informational',
    (input.target_audience || '').trim(),
    JSON.stringify(input.target_questions || []),
    (input.seo_title || input.title).trim(),
    (input.meta_description || input.excerpt || '').trim(),
    (input.canonical_url || `https://dawnexus.in/blog/${slug}`).trim(),
    status,
    input.scheduled_at || null,
    publishedAt,
    (input.admin_notes || '').trim(),
    now,
    now
  );

  return getBlogById(Number(info.lastInsertRowid))!;
}

export function getBlogById(id: number): BlogRecord | null {
  const stmt = db.prepare('SELECT * FROM blogs WHERE id = ?');
  const res = stmt.get(id);
  return (res as unknown as BlogRecord) || null;
}

export function getBlogBySlug(slug: string): BlogRecord | null {
  const stmt = db.prepare('SELECT * FROM blogs WHERE slug = ?');
  const res = stmt.get(slug);
  return (res as unknown as BlogRecord) || null;
}

export interface GetBlogsQuery {
  search?: string;
  status?: string;
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'scheduled' | 'updated';
  page?: number;
  limit?: number;
}

export function getBlogs(params: GetBlogsQuery) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let queryArgs: (string | number)[] = [];

  if (params.status && params.status !== 'All') {
    whereClauses.push('status = ?');
    queryArgs.push(params.status);
  }

  if (params.category && params.category !== 'All') {
    whereClauses.push('category = ?');
    queryArgs.push(params.category);
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(title) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(primary_keyword) LIKE ? OR LOWER(excerpt) LIKE ?)');
    queryArgs.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  let orderSql = 'ORDER BY created_at DESC';
  if (params.sortBy === 'oldest') orderSql = 'ORDER BY created_at ASC';
  else if (params.sortBy === 'scheduled') orderSql = 'ORDER BY COALESCE(scheduled_at, created_at) ASC';
  else if (params.sortBy === 'updated') orderSql = 'ORDER BY updated_at DESC';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM blogs ${whereSql}`);
  const countRes = countStmt.get(...queryArgs) as { count: number };
  const total = Number(countRes?.count || 0);

  const dataStmt = db.prepare(`SELECT * FROM blogs ${whereSql} ${orderSql} LIMIT ? OFFSET ?`);
  const items = dataStmt.all(...queryArgs, limit, offset) as unknown as BlogRecord[];

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function getPublicBlogs(params: { category?: string; search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 12));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = ["status = 'Published'"];
  let queryArgs: (string | number)[] = [];

  if (params.category && params.category !== 'All') {
    whereClauses.push('category = ?');
    queryArgs.push(params.category);
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(content) LIKE ?)');
    queryArgs.push(term, term, term);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const orderSql = 'ORDER BY published_at DESC, created_at DESC';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM blogs ${whereSql}`);
  const countRes = countStmt.get(...queryArgs) as { count: number };
  const total = Number(countRes?.count || 0);

  const dataStmt = db.prepare(`
    SELECT id, title, slug, excerpt, featured_image, image_alt, author, category, tags,
           primary_keyword, target_location, published_at, created_at
    FROM blogs ${whereSql} ${orderSql} LIMIT ? OFFSET ?
  `);
  const items = dataStmt.all(...queryArgs, limit, offset) as unknown as BlogRecord[];

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function updateBlog(id: number, updates: Partial<CreateBlogInput>): BlogRecord | null {
  const current = getBlogById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  let slug = current.slug;
  if (updates.slug && updates.slug !== current.slug) {
    slug = ensureUniqueSlug(updates.slug, id);
  }

  let status = updates.status !== undefined ? updates.status : current.status;
  let publishedAt = current.published_at;
  if (status === 'Published' && !publishedAt) {
    publishedAt = updates.published_at || now;
  }

  const stmt = db.prepare(`
    UPDATE blogs SET
      title = ?,
      slug = ?,
      excerpt = ?,
      content = ?,
      featured_image = ?,
      image_alt = ?,
      author = ?,
      category = ?,
      tags = ?,
      primary_keyword = ?,
      secondary_keywords = ?,
      target_location = ?,
      search_intent = ?,
      target_audience = ?,
      target_questions = ?,
      seo_title = ?,
      meta_description = ?,
      canonical_url = ?,
      status = ?,
      scheduled_at = ?,
      published_at = ?,
      publication_error = '',
      admin_notes = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    updates.title !== undefined ? updates.title.trim() : current.title,
    slug,
    updates.excerpt !== undefined ? updates.excerpt.trim() : current.excerpt,
    updates.content !== undefined ? updates.content.trim() : current.content,
    updates.featured_image !== undefined ? updates.featured_image.trim() : current.featured_image,
    updates.image_alt !== undefined ? updates.image_alt.trim() : current.image_alt,
    updates.author !== undefined ? updates.author.trim() : current.author,
    updates.category !== undefined ? updates.category.trim() : current.category,
    updates.tags !== undefined ? JSON.stringify(updates.tags) : current.tags,
    updates.primary_keyword !== undefined ? updates.primary_keyword.trim() : current.primary_keyword,
    updates.secondary_keywords !== undefined ? JSON.stringify(updates.secondary_keywords) : current.secondary_keywords,
    updates.target_location !== undefined ? updates.target_location.trim() : current.target_location,
    updates.search_intent !== undefined ? updates.search_intent : current.search_intent,
    updates.target_audience !== undefined ? updates.target_audience.trim() : current.target_audience,
    updates.target_questions !== undefined ? JSON.stringify(updates.target_questions) : current.target_questions,
    updates.seo_title !== undefined ? updates.seo_title.trim() : current.seo_title,
    updates.meta_description !== undefined ? updates.meta_description.trim() : current.meta_description,
    updates.canonical_url !== undefined ? updates.canonical_url.trim() : (current.canonical_url || `https://dawnexus.in/blog/${slug}`),
    status,
    updates.scheduled_at !== undefined ? updates.scheduled_at : current.scheduled_at,
    publishedAt,
    updates.admin_notes !== undefined ? updates.admin_notes.trim() : current.admin_notes,
    now,
    id
  );

  return getBlogById(id);
}

export function deleteBlog(id: number): boolean {
  const stmt = db.prepare('DELETE FROM blogs WHERE id = ?');
  const res = stmt.run(id);
  return Number(res.changes) > 0;
}

export function duplicateBlog(id: number): BlogRecord | null {
  const source = getBlogById(id);
  if (!source) return null;

  return createBlog({
    title: `${source.title} (Copy)`,
    slug: `${source.slug}-copy`,
    excerpt: source.excerpt,
    content: source.content,
    featured_image: source.featured_image,
    image_alt: source.image_alt,
    author: source.author,
    category: source.category,
    tags: JSON.parse(source.tags || '[]'),
    primary_keyword: source.primary_keyword,
    secondary_keywords: JSON.parse(source.secondary_keywords || '[]'),
    target_location: source.target_location,
    search_intent: source.search_intent,
    target_audience: source.target_audience,
    target_questions: JSON.parse(source.target_questions || '[]'),
    seo_title: source.seo_title ? `${source.seo_title} (Copy)` : '',
    meta_description: source.meta_description,
    canonical_url: '',
    status: 'Draft',
    scheduled_at: null,
    published_at: null,
    admin_notes: `Duplicated from #${source.id}`
  });
}

export function getBlogStats() {
  const total = Number((db.prepare('SELECT COUNT(*) as c FROM blogs').get() as { c: number }).c);
  const published = Number((db.prepare("SELECT COUNT(*) as c FROM blogs WHERE status = 'Published'").get() as { c: number }).c);
  const scheduled = Number((db.prepare("SELECT COUNT(*) as c FROM blogs WHERE status = 'Scheduled'").get() as { c: number }).c);
  const drafts = Number((db.prepare("SELECT COUNT(*) as c FROM blogs WHERE status = 'Draft'").get() as { c: number }).c);
  const failed = Number((db.prepare("SELECT COUNT(*) as c FROM blogs WHERE status = 'Failed'").get() as { c: number }).c);

  return { total, published, scheduled, drafts, failed };
}

export function getDueScheduledBlogs(): BlogRecord[] {
  const now = new Date().toISOString();
  const stmt = db.prepare("SELECT * FROM blogs WHERE status = 'Scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?");
  return stmt.all(now) as unknown as BlogRecord[];
}

export function publishBlogRecord(id: number, publishedAt?: string): BlogRecord | null {
  const now = publishedAt || new Date().toISOString();
  db.prepare("UPDATE blogs SET status = 'Published', published_at = ?, publication_error = '', updated_at = ? WHERE id = ?").run(now, now, id);
  return getBlogById(id);
}

export function markBlogFailed(id: number, errorMsg: string): BlogRecord | null {
  const now = new Date().toISOString();
  db.prepare("UPDATE blogs SET status = 'Failed', publication_error = ?, updated_at = ? WHERE id = ?").run(errorMsg, now, id);
  return getBlogById(id);
}

export function publishDueScheduledBlogs(): { publishedCount: number; errors: { id: number; error: string }[] } {
  const due = getDueScheduledBlogs();
  let publishedCount = 0;
  const errors: { id: number; error: string }[] = [];

  for (const item of due) {
    try {
      publishBlogRecord(item.id);
      publishedCount++;
      console.log(`[Scheduler] Auto-published scheduled blog #${item.id} (${item.slug})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auto-publishing error';
      console.error(`[Scheduler] Failed to publish blog #${item.id}:`, err);
      markBlogFailed(item.id, msg);
      errors.push({ id: item.id, error: msg });
    }
  }

  return { publishedCount, errors };
}

export function getPublishedBlogsForSitemap(): { slug: string; updated_at: string; published_at: string }[] {
  const stmt = db.prepare("SELECT slug, updated_at, published_at FROM blogs WHERE status = 'Published' ORDER BY published_at DESC");
  return stmt.all() as { slug: string; updated_at: string; published_at: string }[];
}

function seedBlogsIfEmpty() {
  const countRes = db.prepare('SELECT COUNT(*) as c FROM blogs').get() as { c: number };
  if (Number(countRes?.c || 0) > 0) return;

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  // Seed 1: Coimbatore Web Design
  createBlog({
    title: 'Website Design Costs in Coimbatore: What Businesses Should Know in 2026',
    slug: 'website-design-cost-coimbatore',
    excerpt: 'A comprehensive, transparent analysis of business website development costs in Coimbatore, covering custom builds, performance factors, and return on investment.',
    content: `<h2>Understanding Business Website Investments in Coimbatore</h2>
<p>For growing enterprises, manufacturers, and service brands in Coimbatore, a website is no longer a static digital brochure—it is your primary commercial sales engine and conversion touchpoint.</p>
<p>When businesses search for <strong>website design in Coimbatore</strong>, quotes often range wildly from ₹10,000 to ₹1,50,000+. This wide variance creates confusion for business owners trying to budget effectively.</p>

<h3>What Determines Website Development Pricing?</h3>
<p>The total investment for a professional business website depends on four foundational parameters:</p>
<ul>
  <li><strong>Architecture & Performance:</strong> Clean custom front-end code (such as React or Next.js) vs. slow, vulnerable pre-packaged WordPress templates.</li>
  <li><strong>Conversion Architecture:</strong> Dedicated user journeys, wireframing, and persuasive copywriting tailored to your target buyers.</li>
  <li><strong>Technical SEO Foundation:</strong> Pre-configured schema markup, Core Web Vitals optimization, and mobile-first responsiveness.</li>
  <li><strong>Security & Scalability:</strong> Secure SSL, serverless backend workflows, and zero dependency on unmaintained third-party plugins.</li>
</ul>

<h3>Average Pricing Breakdown for Coimbatore Businesses</h3>
<p>Based on modern web standards in 2026:</p>
<ul>
  <li><strong>High-Converting Landing Page:</strong> ₹15,000 – ₹30,000 (Ideal for single-product campaigns or Google Ads).</li>
  <li><strong>Complete Corporate Website (5-10 Pages):</strong> ₹35,000 – ₹75,000 (Ideal for MSMEs, textile manufacturers, and healthcare clinics).</li>
  <li><strong>Advanced Web Application or Enterprise Platform:</strong> ₹80,000+ (Custom quoting with custom API integrations and portals).</li>
</ul>

<h3>The Real Cost of Cheap Templates</h3>
<p>Opting for a generic ₹10,000 template often incurs hidden liabilities: slow mobile load speeds exceeding 5 seconds, lack of localized SEO optimization, vulnerability to script injections, and high bounce rates that drive up paid advertising acquisition costs.</p>

<h3>Recommended Next Step</h3>
<p>Before commissioning a build, audit your core growth bottlenecks. Explore our <a href="/services/website-design">Website Design & Development</a> capabilities or schedule an architectural consultation with our engineering team.</p>`,
    author: 'Dawnexus Team',
    category: 'Website Design',
    tags: ['Coimbatore', 'Web Design', 'Pricing Guide', 'Business Growth'],
    primary_keyword: 'website design in Coimbatore',
    secondary_keywords: ['website development in Coimbatore', 'business website cost', 'website designer for small business'],
    target_location: 'Coimbatore, Tamil Nadu, India',
    search_intent: 'Commercial Investigation',
    target_audience: 'Coimbatore business owners, entrepreneurs, and marketing managers',
    target_questions: [
      'What affects the price of a business website in Coimbatore?',
      'Does the price include hosting and domain registration?',
      'How long does professional website development take?'
    ],
    seo_title: 'Website Design Costs in Coimbatore: 2026 Pricing Guide',
    meta_description: 'Transparent guide to business website design costs in Coimbatore. Learn what factors determine development pricing, timeline, and ROI for your brand.',
    canonical_url: 'https://dawnexus.in/blog/website-design-cost-coimbatore',
    status: 'Published',
    published_at: twoDaysAgo
  });

  // Seed 2: AI Video Production
  createBlog({
    title: 'How AI Video Production Is Accelerating Brand Marketing in 2026',
    slug: 'ai-video-production-for-businesses',
    excerpt: 'Discover how modern brands combine AI-assisted visual generation with human creative direction to produce high-performing social reels and ad creatives.',
    content: `<h2>The Evolution of Commercial Video Creation</h2>
<p>Video content consistently drives the highest return on ad spend across Meta and Google platforms. However, traditional production cycles—involving physical shoots, studio rental, and lengthy post-production—frequently stifle the testing velocity modern marketers require.</p>
<p>Modern agencies use <strong>AI video creation for businesses</strong> not to replace directorial craft, but to supercharge creative velocity and eliminate logistical friction.</p>

<h3>The Hybrid Production Workflow: AI Velocity + Human Direction</h3>
<p>At Dawnexus, our creative pipeline pairs algorithmic visual generation with disciplined motion editing:</p>
<ol>
  <li><strong>Concept & Script Development:</strong> Human directors construct the narrative arc and commercial conversion triggers.</li>
  <li><strong>AI Storyboard Prototyping:</strong> Visual scenes and environments are synthesized rapidly, allowing clients to review visual style within 48 hours.</li>
  <li><strong>Motion Synthesis & Editing:</strong> Professional sound design, kinetic typography, and color grading unify the output into a broadcast-ready deliverable.</li>
</ol>

<h3>Key Marketing Applications</h3>
<ul>
  <li><strong>Paid Social Hook Testing:</strong> Render 5 distinct opening hooks for Instagram Reels to identify what stops the scroll before investing heavy media budgets.</li>
  <li><strong>Product Feature Demos:</strong> Complex software architectures simplified into compelling visual walkthroughs.</li>
  <li><strong>Brand Anthem Videos:</strong> High-impact website hero visuals communicating corporate ambition.</li>
</ul>

<p>Explore our complete <a href="/services/ai-video-creation">AI Video Creation</a> workflow to see how we help ambitious brands scale their visual presence.</p>`,
    author: 'Dawnexus Editorial',
    category: 'AI Creative',
    tags: ['AI Video', 'Creative Production', 'Reels', 'Advertising'],
    primary_keyword: 'AI video creation for businesses',
    secondary_keywords: ['promotional video production', 'AI marketing videos', 'social media video ads'],
    target_location: 'India',
    search_intent: 'Informational',
    target_audience: 'Brand founders, marketing directors, and creative leads',
    target_questions: [
      'How fast can an AI promotional video be produced?',
      'Does AI replace video editors?',
      'What resolutions and aspect ratios are delivered?'
    ],
    seo_title: 'AI Video Production for Businesses: Modern Creative Guide',
    meta_description: 'How ambitious brands use AI video production to accelerate campaign testing, lower production bottlenecks, and drive higher engagement in 2026.',
    canonical_url: 'https://dawnexus.in/blog/ai-video-production-for-businesses',
    status: 'Published',
    published_at: oneDayAgo
  });

  // Seed 3: Scheduled Article
  createBlog({
    title: 'Local SEO Playbook: Ranking in Google Maps and Local Search',
    slug: 'local-seo-google-maps-playbook',
    excerpt: 'Practical strategies for optimizing your Google Business Profile, winning local search pack rankings, and generating steady inbound customer calls.',
    content: `<h2>Mastering Local Search Discoverability</h2>
<p>When customers in your city search for immediate professional solutions, over 70% of clicks go to the Google Maps 3-Pack. Securing top placement requires a disciplined local SEO framework.</p>

<h3>Core Ranking Factors in Google Maps</h3>
<ul>
  <li><strong>Relevance:</strong> Precise primary and secondary business categories aligned with customer search terms.</li>
  <li><strong>Distance:</strong> Proximity signals reinforced by accurate localized landing pages and schema tags.</li>
  <li><strong>Prominence:</strong> Review velocity, consistent NAP (Name, Address, Phone) citations, and active profile engagement.</li>
</ul>

<p>Learn how our structured <a href="/services/seo-services">SEO Services</a> help local businesses capture high-intent geographic searches.</p>`,
    author: 'Dawnexus SEO Team',
    category: 'SEO Strategy',
    tags: ['Local SEO', 'Google Maps', 'Google Business Profile'],
    primary_keyword: 'local SEO Google Business Profile',
    secondary_keywords: ['Google maps ranking', 'local search optimization'],
    target_location: 'Coimbatore, Tamil Nadu, India',
    search_intent: 'Informational',
    target_audience: 'Local business owners and multi-location brands',
    seo_title: 'Local SEO & Google Maps Playbook | Dawnexus Guide',
    meta_description: 'Step-by-step strategies to optimize your Google Business Profile and capture top rankings in local map search queries.',
    canonical_url: 'https://dawnexus.in/blog/local-seo-google-maps-playbook',
    status: 'Scheduled',
    scheduled_at: twoDaysAhead
  });
}

// Call initialization
initDatabase();


