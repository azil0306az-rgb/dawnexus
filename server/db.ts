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

  // Create indexes for fast lookup and filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
  `);

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

// Call initialization
initDatabase();

