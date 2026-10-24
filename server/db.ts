import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  syncFromSupabase,
  pushEnquiryToSupabase,
  updateEnquiryInSupabase,
  deleteEnquiryFromSupabase,
  pushBlogToSupabase,
  deleteBlogFromSupabase,
  pushClientToSupabase,
  deleteClientFromSupabase,
  pushShowcaseToSupabase,
  deleteShowcaseFromSupabase,
  pushNotificationSettingsToSupabase,
  pushSeoConnectionToSupabase,
  pushCalculatorPricingConfigToSupabase,
  pushContactSettingsToSupabase,
  getContactSettingsFromSupabase,
  isSupabaseActive
} from './supabase.js';
import {
  CalculatorPricingConfig,
  DEFAULT_PRICING_CONFIG
} from './calculatorPricing.js';
import { DEFAULT_SERVICE_PAGES } from './websiteContent.js';
import { seedInitialShowcases } from './showcaseSeeds.js';

export interface ContactSettings {
  id?: number;
  phone: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  phone: '+91 9994487810',
  email: 'dawnexus.exe@gmail.com',
  instagram_url: 'https://www.instagram.com/dawnexus.exe',
  facebook_url: 'https://www.facebook.com/people/Dawnexus/61595080180070/',
  linkedin_url: 'https://www.linkedin.com/company/dawnexus',
  address: 'Coimbatore, Tamil Nadu, India'
};

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

// Enable WAL mode and busy timeout for concurrent safety
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
} catch {
  // Pragma failure is non-fatal
}

export function getDb() {
  return db;
}

export const DEFAULT_SEO_CATEGORIES = [
  {
    name: 'Website Development',
    slug: 'website-development',
    primary_keyword: 'custom website development services',
    secondary_keywords: ['responsive web design', 'business website development', 'ecommerce web development'],
    target_audience: 'Small to mid-sized businesses, startups, and enterprises seeking modern web platforms',
    search_intent: 'Commercial',
    instructions: 'Focus on high performance, modern full-stack architectures, mobile-first responsiveness, and conversion UX.'
  },
  {
    name: 'SEO Services',
    slug: 'seo-services',
    primary_keyword: 'technical seo services',
    secondary_keywords: ['organic search ranking', 'technical seo audit', 'core web vitals optimization', 'link building strategy'],
    target_audience: 'Business owners and marketing leaders looking to capture sustainable organic search revenue',
    search_intent: 'Commercial',
    instructions: 'Highlight data-backed search console performance, site speed, crawlability, and schema markup.'
  },
  {
    name: 'Google Business Profile Optimization',
    slug: 'google-business-profile-optimization',
    primary_keyword: 'google business profile optimization',
    secondary_keywords: ['local seo 3-pack', 'gbp management services', 'google maps ranking', 'local business citations'],
    target_audience: 'Local businesses, medical practices, retail outlets, and multi-location franchises',
    search_intent: 'Commercial',
    instructions: 'Emphasize local map pack visibility, customer review workflows, citation consistency, and geo-relevance.'
  },
  {
    name: 'Digital Marketing',
    slug: 'digital-marketing',
    primary_keyword: 'performance digital marketing agency',
    secondary_keywords: ['roi driven advertising', 'content marketing strategy', 'conversion rate optimization', 'omnichannel growth'],
    target_audience: 'Growth teams and founders looking to scale qualified customer inquiries and pipeline',
    search_intent: 'Commercial',
    instructions: 'Emphasize measurable attribution, CAC reduction, landing page alignment, and full-funnel retention.'
  },
  {
    name: 'AI and Automation',
    slug: 'ai-and-automation',
    primary_keyword: 'business ai workflow automation',
    secondary_keywords: ['custom ai integrations', 'business process automation', 'intelligent chatbots', 'lead qualification automation'],
    target_audience: 'Forward-looking enterprises and modern businesses modernizing operational workflows',
    search_intent: 'Informational',
    instructions: 'Focus on practical automation use cases, eliminating repetitive manual work, and integrating generative AI with real business data.'
  }
];

// Initialize schema
let databaseInitialized = false;

export function initDatabase() {
  if (databaseInitialized) return;
  databaseInitialized = true;
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
      seo_report TEXT DEFAULT NULL,
      content_revision TEXT DEFAULT NULL,
      firsthand_observations TEXT DEFAULT '',
      project_examples TEXT DEFAULT '',
      case_studies TEXT DEFAULT '',
      original_research_data TEXT DEFAULT '',
      implementation_process TEXT DEFAULT '',
      external_sources TEXT DEFAULT '[]',
      limitations_lessons TEXT DEFAULT '',
      author_role TEXT DEFAULT 'Technical Architect & SEO Strategist',
      author_bio TEXT DEFAULT '',
      author_credentials TEXT DEFAULT '',
      reviewer_name TEXT DEFAULT '',
      editorial_notes TEXT DEFAULT '',
      citation_answer_blocks TEXT DEFAULT '[]',
      review_cycle_days INTEGER DEFAULT 90,
      last_reviewed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Table for 301 blog redirects & slug history
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_path TEXT NOT NULL UNIQUE,
      new_path TEXT NOT NULL,
      status_code INTEGER DEFAULT 301,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Table for admin notification email settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active_email TEXT DEFAULT NULL,
      is_verified INTEGER DEFAULT 0,
      verified_at TEXT DEFAULT NULL,
      pending_email TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Table for secure OTP verification challenges
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_otp_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL
    );
  `);

  // Table for isolated Version 3.0 SEO Research Google OAuth & property connections
  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_research_connections (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      google_email TEXT DEFAULT NULL,
      encrypted_tokens TEXT DEFAULT NULL,
      selected_property TEXT DEFAULT NULL,
      last_sync_at TEXT DEFAULT NULL,
      last_attempt_at TEXT DEFAULT NULL,
      last_error TEXT DEFAULT NULL,
      connection_status TEXT DEFAULT 'Disconnected',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_research_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT UNIQUE NOT NULL,
      property TEXT NOT NULL,
      date_range TEXT NOT NULL,
      dimensions TEXT NOT NULL DEFAULT 'query',
      status TEXT NOT NULL DEFAULT 'queued',
      queries_returned INTEGER NOT NULL DEFAULT 0,
      queries_saved INTEGER NOT NULL DEFAULT 0,
      api_requests_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error_message TEXT DEFAULT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS gsc_search_analytics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property TEXT NOT NULL,
      query TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0.0,
      position REAL NOT NULL DEFAULT 0.0,
      period_type TEXT NOT NULL DEFAULT 'current',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );
  `);

  // Safe migrations for seo_research_connections
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN last_sync_at TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN last_attempt_at TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN last_error TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN connection_status TEXT DEFAULT 'Disconnected';`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN selected_ga4_property TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN selected_ga4_property_name TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN ga4_last_sync_at TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN ga4_last_attempt_at TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN ga4_last_error TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE seo_research_connections ADD COLUMN ga4_connection_status TEXT DEFAULT 'Disconnected';`); } catch {}

  // GA4 Analytics jobs and report cache tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS ga4_analytics_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT UNIQUE NOT NULL,
      property_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      date_range TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      rows_returned INTEGER NOT NULL DEFAULT 0,
      api_requests_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error_message TEXT DEFAULT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS ga4_analytics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      date_range TEXT NOT NULL,
      data_json TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      UNIQUE(property_id, report_type, date_range)
    );

    CREATE INDEX IF NOT EXISTS idx_ga4_jobs_status ON ga4_analytics_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_ga4_jobs_created ON ga4_analytics_jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_ga4_cache_lookup ON ga4_analytics_cache(property_id, report_type, date_range);
  `);

  // Table for durable, cross-serverless OAuth state parameters with single-use consumption
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      admin_session_id TEXT DEFAULT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
  `);

  // Table for Version 3.5.297: Our Work / Client Showcase
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      website_url TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      hero_preview_url TEXT NOT NULL DEFAULT '',
      service_category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Table for Version 8.4.0: Dynamic Products & Showcases CMS
    CREATE TABLE IF NOT EXISTS showcases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      card_heading TEXT DEFAULT '',
      full_heading TEXT DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      detailed_description TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Automation & Operations',
      tagline TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'In Development',
      launch_date TEXT DEFAULT '',
      project_url TEXT DEFAULT '',
      link_label TEXT DEFAULT 'Explore Live Demo',
      is_link_enabled INTEGER NOT NULL DEFAULT 1,
      open_in_new_tab INTEGER NOT NULL DEFAULT 1,
      inquiry_service TEXT DEFAULT 'Website Design & Development',
      screenshot_url TEXT NOT NULL DEFAULT '',
      screenshot_source_url TEXT DEFAULT '',
      screenshot_captured_at TEXT DEFAULT NULL,
      screenshot_alt TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      workflow_steps TEXT DEFAULT '[]',
      capabilities TEXT DEFAULT '[]',
      benefits TEXT DEFAULT '[]',
      tech_stack TEXT DEFAULT '[]',
      intended_audience TEXT DEFAULT '',
      use_cases TEXT DEFAULT '[]',
      project_challenges TEXT DEFAULT '',
      implementation_approach TEXT DEFAULT '',
      outcome_results TEXT DEFAULT '',
      gallery_images TEXT DEFAULT '[]',
      faq_items TEXT DEFAULT '[]',
      publication_status TEXT NOT NULL DEFAULT 'Published',
      published_at TEXT DEFAULT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_otp_challenges_email ON notification_otp_challenges(email);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_clients_order ON clients(display_order);
    CREATE INDEX IF NOT EXISTS idx_showcases_status ON showcases(status);
    CREATE INDEX IF NOT EXISTS idx_showcases_slug ON showcases(slug);
    CREATE INDEX IF NOT EXISTS idx_showcases_order ON showcases(display_order);
    CREATE INDEX IF NOT EXISTS idx_showcases_publication ON showcases(publication_status);
    CREATE INDEX IF NOT EXISTS idx_showcases_visible ON showcases(is_visible);
  `);

  // Initial seed for showcases if empty
  try {
    const showcasesCount = (db.prepare('SELECT COUNT(*) as c FROM showcases').get() as any)?.c || 0;
    if (showcasesCount === 0) {
      seedInitialShowcases(db);
    }
  } catch (seedErr: any) {
    console.warn('[Showcases Seed Warning]:', seedErr?.message || seedErr);
  }

  // Ensure singleton row exists in notification_settings
  db.exec(`
    INSERT OR IGNORE INTO notification_settings (id, active_email, is_verified, verified_at, pending_email, updated_at)
    VALUES (1, NULL, 0, NULL, NULL, datetime('now'));
  `);

  // Singleton notification settings initialized


  // Safe migrations for enquiries table
  try {
    db.exec(`ALTER TABLE enquiries ADD COLUMN estimate_ref_id TEXT DEFAULT NULL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE enquiries ADD COLUMN estimate_data TEXT DEFAULT NULL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE enquiries ADD COLUMN idempotency_key TEXT DEFAULT NULL;`);
  } catch {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_idempotency ON enquiries(idempotency_key) WHERE idempotency_key IS NOT NULL;`);
  } catch {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_estimate_ref ON enquiries(estimate_ref_id) WHERE estimate_ref_id IS NOT NULL;`);
  } catch {}

  // Safe migrations for blogs table (Version 8.3.0)
  try { db.exec(`ALTER TABLE blogs ADD COLUMN seo_report TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN content_revision TEXT DEFAULT NULL;`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN firsthand_observations TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN project_examples TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN case_studies TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN original_research_data TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN implementation_process TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN external_sources TEXT DEFAULT '[]';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN limitations_lessons TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN author_role TEXT DEFAULT 'Technical Architect & SEO Strategist';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN author_bio TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN author_credentials TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN reviewer_name TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN editorial_notes TEXT DEFAULT '';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN citation_answer_blocks TEXT DEFAULT '[]';`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN review_cycle_days INTEGER DEFAULT 90;`); } catch {}
  try { db.exec(`ALTER TABLE blogs ADD COLUMN last_reviewed_at TEXT DEFAULT NULL;`); } catch {}

  // Version 8.3.0: AI Discovery & Citation Observations
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_citation_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_slug TEXT NOT NULL,
      source_ai TEXT NOT NULL,
      query_prompt TEXT NOT NULL,
      observed_date TEXT NOT NULL,
      citation_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      recorded_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_citations_slug ON ai_citation_observations(article_slug);
  `);

  // Version 8.3.0: Contextual CTA Configurations & Frequency
  db.exec(`
    CREATE TABLE IF NOT EXISTS contextual_cta_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      headline TEXT NOT NULL,
      description TEXT NOT NULL,
      button_text TEXT NOT NULL,
      target_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      scroll_threshold INTEGER NOT NULL DEFAULT 50,
      dwell_time_seconds INTEGER NOT NULL DEFAULT 20,
      updated_at TEXT NOT NULL
    );
  `);

  // Table for Website Cost Estimator pricing configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculator_pricing_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // Insert default config if empty
  try {
    const configExists = db.prepare('SELECT id FROM calculator_pricing_config WHERE id = 1').get();
    if (!configExists) {
      db.prepare(`
        INSERT INTO calculator_pricing_config (id, config_json, version, updated_at)
        VALUES (1, ?, 1, ?)
      `).run(JSON.stringify(DEFAULT_PRICING_CONFIG), new Date().toISOString());
    }
  } catch (err) {
    console.warn('[Calculator Config Seed Notice]:', err);
  }

  // ----------------------------------------------------
  // CONTACT & SOCIAL SETTINGS
  // ----------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      phone TEXT NOT NULL DEFAULT '+91 95669 88995',
      email TEXT NOT NULL DEFAULT 'contact@dawnexus.in',
      instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/dawnexus',
      facebook_url TEXT NOT NULL DEFAULT 'https://www.facebook.com/dawnexus',
      linkedin_url TEXT NOT NULL DEFAULT 'https://www.linkedin.com/company/dawnexus',
      address TEXT DEFAULT 'Coimbatore, Tamil Nadu, India',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const contactRow = db.prepare('SELECT id FROM contact_settings WHERE id = 1').get();
    if (!contactRow) {
      db.prepare(`
        INSERT INTO contact_settings (id, phone, email, instagram_url, facebook_url, linkedin_url, address, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        DEFAULT_CONTACT_SETTINGS.phone,
        DEFAULT_CONTACT_SETTINGS.email,
        DEFAULT_CONTACT_SETTINGS.instagram_url,
        DEFAULT_CONTACT_SETTINGS.facebook_url,
        DEFAULT_CONTACT_SETTINGS.linkedin_url,
        DEFAULT_CONTACT_SETTINGS.address,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  } catch (err) {
    console.warn('[Contact Settings Seed Notice]:', err);
  }

  // ----------------------------------------------------
  // VERSION 6.1.3: DYNAMIC WEBSITE CONTENT & VISITOR BEHAVIOUR INTELLIGENCE
  // ----------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS website_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      hero_badge TEXT,
      hero_subtitle TEXT,
      hero_description TEXT,
      hero_primary_cta TEXT,
      hero_secondary_cta TEXT,
      capabilities_json TEXT DEFAULT '[]',
      process_steps_json TEXT DEFAULT '[]',
      packages_json TEXT DEFAULT '[]',
      faqs_json TEXT DEFAULT '[]',
      cta_section_json TEXT DEFAULT '{}',
      meta_title TEXT,
      meta_description TEXT,
      og_image TEXT,
      status TEXT DEFAULT 'published',
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS website_content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content_json TEXT NOT NULL,
      change_summary TEXT,
      created_by TEXT NOT NULL,
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_website_versions_slug ON website_content_versions(page_slug, version_number);

    CREATE TABLE IF NOT EXISTS ai_optimization_proposals (
      id TEXT PRIMARY KEY,
      page_slug TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      proposed_changes_json TEXT NOT NULL,
      risk_assessment TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      published_version_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_proposals_status ON ai_optimization_proposals(status, page_slug);

    CREATE TABLE IF NOT EXISTS optimization_experiments (
      id TEXT PRIMARY KEY,
      proposal_id TEXT,
      page_slug TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      variant_json TEXT NOT NULL,
      primary_metric TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      start_date TEXT,
      end_date TEXT,
      baseline_metrics_json TEXT,
      variant_metrics_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_sessions (
      session_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      first_page TEXT NOT NULL,
      last_page TEXT NOT NULL,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device_type TEXT DEFAULT 'desktop',
      browser TEXT,
      os TEXT,
      country TEXT,
      is_bot INTEGER DEFAULT 0,
      bot_reason TEXT,
      started_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 1,
      is_bounce INTEGER DEFAULT 0,
      has_converted INTEGER DEFAULT 0,
      enquiry_ref_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_bot ON analytics_sessions(is_bot);

    CREATE TABLE IF NOT EXISTS analytics_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      page_path TEXT NOT NULL,
      element_id TEXT,
      section_id TEXT,
      scroll_depth INTEGER,
      viewport_width INTEGER,
      viewport_height INTEGER,
      x_pos REAL,
      y_pos REAL,
      properties_json TEXT DEFAULT '{}',
      is_bot INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_path_type ON analytics_events(page_path, event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(timestamp);

    CREATE TABLE IF NOT EXISTS analytics_replay_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      events_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_replay_session ON analytics_replay_chunks(session_id, chunk_index);

    CREATE TABLE IF NOT EXISTS analytics_aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      page_path TEXT NOT NULL,
      device_type TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      avg_scroll_depth REAL DEFAULT 0,
      avg_duration_seconds REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(date, page_path, device_type)
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_agg_date ON analytics_aggregates(date);

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      details_json TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action, created_at);
  `);

  // Seed default service pages if missing
  try {
    const pageCount = (db.prepare('SELECT COUNT(*) as c FROM website_pages').get() as { c: number })?.c || 0;
    if (pageCount === 0) {
      const now = new Date().toISOString();
      for (const [slug, page] of Object.entries(DEFAULT_SERVICE_PAGES)) {
        db.prepare(`
          INSERT INTO website_pages (
            slug, title, canonical_url, hero_badge, hero_subtitle, hero_description,
            hero_primary_cta, hero_secondary_cta, capabilities_json, process_steps_json,
            packages_json, faqs_json, cta_section_json, meta_title, meta_description,
            og_image, status, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?)
        `).run(
          page.slug,
          page.title,
          page.canonical_url,
          page.hero_badge,
          page.hero_subtitle,
          page.hero_description,
          page.hero_primary_cta,
          page.hero_secondary_cta,
          JSON.stringify(page.capabilities),
          JSON.stringify(page.process_steps),
          JSON.stringify(page.packages),
          JSON.stringify(page.faqs),
          JSON.stringify(page.cta_section),
          page.meta_title,
          page.meta_description,
          page.og_image,
          now,
          now
        );

        db.prepare(`
          INSERT INTO website_content_versions (
            page_slug, version_number, content_json, change_summary, created_by, is_published, published_at, created_at
          ) VALUES (?, 1, ?, 'Initial authoritative version', 'system_init', 1, ?, ?)
        `).run(slug, JSON.stringify(page), now, now);
      }
    }
  } catch (seedErr) {
    console.warn('[Website Pages Seed Notice]:', seedErr);
  }

  // Version 7.1.8 — Dynamic SEO Categories & Gemini Usage Telemetry
  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      primary_keyword TEXT DEFAULT '',
      secondary_keywords TEXT DEFAULT '[]',
      target_audience TEXT DEFAULT '',
      search_intent TEXT DEFAULT 'Commercial',
      instructions TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seo_categories_slug ON seo_categories(slug);

    CREATE TABLE IF NOT EXISTS gemini_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      candidate_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gemini_usage_action ON gemini_usage_logs(action, status);
  `);

  // Seed default SEO categories if empty
  try {
    const catCount = (db.prepare('SELECT COUNT(*) as c FROM seo_categories').get() as { c: number })?.c || 0;
    if (catCount === 0) {
      const now = new Date().toISOString();
      for (const cat of DEFAULT_SEO_CATEGORIES) {
        db.prepare(`
          INSERT INTO seo_categories (
            name, slug, primary_keyword, secondary_keywords, target_audience, search_intent, instructions, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cat.name,
          cat.slug,
          cat.primary_keyword,
          JSON.stringify(cat.secondary_keywords),
          cat.target_audience,
          cat.search_intent,
          cat.instructions,
          now,
          now
        );
      }
    }
  } catch (catSeedErr) {
    console.warn('[SEO Categories Seed Notice]:', catSeedErr);
  }

  console.log(`[Database] SQLite initialized successfully at: ${path.resolve(dbPath)}`);

  // Asynchronously synchronize with Supabase PostgreSQL cloud store
  syncFromSupabase(db).catch(err => {
    console.warn('[Supabase Sync Notice]:', err?.message || err);
  });
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
  estimate_ref_id?: string | null;
  estimate_data?: string | null;
  idempotency_key?: string | null;
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
  estimate_ref_id?: string;
  estimate_data?: string;
  idempotency_key?: string;
}

// Queries
export function createEnquiry(input: CreateEnquiryInput): EnquiryRecord {
  const emailNorm = input.email.trim().toLowerCase();
  const phoneNorm = (input.phone || '').trim();
  const idempotencyKey = (input.idempotency_key || '').trim() || null;
  const estimateRefId = (input.estimate_ref_id || '').trim() || null;

  // 1. Idempotency Check by explicit key
  if (idempotencyKey) {
    const existing = db.prepare('SELECT * FROM enquiries WHERE idempotency_key = ?').get(idempotencyKey) as EnquiryRecord | undefined;
    if (existing) {
      console.log(`[Idempotency Hit] Returning existing enquiry #${existing.id} for key "${idempotencyKey}"`);
      return existing;
    }
  }

  // 2. Idempotency Check by estimate reference ID
  if (estimateRefId) {
    const existing = db.prepare('SELECT * FROM enquiries WHERE estimate_ref_id = ?').get(estimateRefId) as EnquiryRecord | undefined;
    if (existing) {
      console.log(`[Idempotency Hit] Returning existing enquiry #${existing.id} for estimateRef "${estimateRefId}"`);
      return existing;
    }
  }

  // 3. Duplicate submission prevention: same email + phone + content within 120 seconds
  const recentWindowIso = new Date(Date.now() - 120 * 1000).toISOString();
  const duplicate = db.prepare(`
    SELECT * FROM enquiries 
    WHERE email = ? AND phone = ? AND created_at >= ?
    ORDER BY id DESC LIMIT 1
  `).get(emailNorm, phoneNorm, recentWindowIso) as EnquiryRecord | undefined;

  if (duplicate) {
    const servicesJson = JSON.stringify(input.requested_services || []);
    if (duplicate.requested_services === servicesJson && duplicate.project_details.trim() === input.project_details.trim()) {
      console.log(`[Duplicate Prevented] Returning recent identical enquiry #${duplicate.id} submitted within 120s`);
      return duplicate;
    }
  }

  const now = new Date().toISOString();
  const servicesJson = JSON.stringify(input.requested_services || []);
  
  const stmt = db.prepare(`
    INSERT INTO enquiries (
      full_name, business_name, email, phone, requested_services,
      budget, project_details, status, admin_notes, estimate_ref_id, estimate_data, idempotency_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New', '', ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    input.full_name.trim(),
    (input.business_name || '').trim(),
    emailNorm,
    phoneNorm,
    servicesJson,
    (input.budget || '').trim(),
    input.project_details.trim(),
    estimateRefId,
    input.estimate_data 
      ? (typeof input.estimate_data === 'string' ? input.estimate_data.trim() : JSON.stringify(input.estimate_data))
      : null,
    idempotencyKey,
    now,
    now
  );

  const lastId = Number(info.lastInsertRowid);
  const getStmt = db.prepare('SELECT * FROM enquiries WHERE id = ?');
  const record = getStmt.get(lastId) as unknown as EnquiryRecord;
  return record;
}

export function getCalculatorPricingConfig(): CalculatorPricingConfig {
  try {
    const row = db.prepare('SELECT config_json FROM calculator_pricing_config WHERE id = 1').get() as { config_json: string } | undefined;
    if (row && row.config_json) {
      return JSON.parse(row.config_json);
    }
  } catch (err) {
    console.warn('[Get Calculator Config Notice]:', err);
  }
  return DEFAULT_PRICING_CONFIG;
}

export function updateCalculatorPricingConfig(newConfig: CalculatorPricingConfig): CalculatorPricingConfig {
  const now = new Date().toISOString();
  const nextVersion = (newConfig.version || 1) + 1;
  const configToSave: CalculatorPricingConfig = {
    ...newConfig,
    version: nextVersion,
    updatedAt: now
  };

  const json = JSON.stringify(configToSave);
  db.prepare(`
    INSERT INTO calculator_pricing_config (id, config_json, version, updated_at)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, version = excluded.version, updated_at = excluded.updated_at
  `).run(json, nextVersion, now);

  return configToSave;
}

export function getContactSettings(): ContactSettings {
  try {
    const row = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get() as any;
    if (row) {
      return {
        id: 1,
        phone: row.phone || DEFAULT_CONTACT_SETTINGS.phone,
        email: row.email || DEFAULT_CONTACT_SETTINGS.email,
        instagram_url: row.instagram_url || DEFAULT_CONTACT_SETTINGS.instagram_url,
        facebook_url: row.facebook_url || DEFAULT_CONTACT_SETTINGS.facebook_url,
        linkedin_url: row.linkedin_url || DEFAULT_CONTACT_SETTINGS.linkedin_url,
        address: row.address !== undefined ? row.address : DEFAULT_CONTACT_SETTINGS.address,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    }
  } catch (err) {
    console.warn('[Get Contact Settings Notice]:', err);
  }
  return { ...DEFAULT_CONTACT_SETTINGS };
}

export async function getContactSettingsAsync(): Promise<ContactSettings> {
  if (isSupabaseActive()) {
    try {
      const remote = await getContactSettingsFromSupabase();
      if (remote) {
        db.prepare(`
          INSERT INTO contact_settings (id, phone, email, instagram_url, facebook_url, linkedin_url, address, updated_at)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            phone = excluded.phone,
            email = excluded.email,
            instagram_url = excluded.instagram_url,
            facebook_url = excluded.facebook_url,
            linkedin_url = excluded.linkedin_url,
            address = excluded.address,
            updated_at = excluded.updated_at
        `).run(
          remote.phone || DEFAULT_CONTACT_SETTINGS.phone,
          remote.email || DEFAULT_CONTACT_SETTINGS.email,
          remote.instagram_url || DEFAULT_CONTACT_SETTINGS.instagram_url,
          remote.facebook_url || DEFAULT_CONTACT_SETTINGS.facebook_url,
          remote.linkedin_url || DEFAULT_CONTACT_SETTINGS.linkedin_url,
          remote.address !== undefined ? remote.address : DEFAULT_CONTACT_SETTINGS.address,
          remote.updated_at || new Date().toISOString()
        );

        return {
          id: 1,
          phone: remote.phone || DEFAULT_CONTACT_SETTINGS.phone,
          email: remote.email || DEFAULT_CONTACT_SETTINGS.email,
          instagram_url: remote.instagram_url || DEFAULT_CONTACT_SETTINGS.instagram_url,
          facebook_url: remote.facebook_url || DEFAULT_CONTACT_SETTINGS.facebook_url,
          linkedin_url: remote.linkedin_url || DEFAULT_CONTACT_SETTINGS.linkedin_url,
          address: remote.address !== undefined ? remote.address : DEFAULT_CONTACT_SETTINGS.address,
          updated_at: remote.updated_at
        };
      }
    } catch (err) {
      console.warn('[Get Contact Settings Async Warning]:', err);
    }
  }
  return getContactSettings();
}

export function updateContactSettings(settings: Partial<ContactSettings>): ContactSettings {
  const current = getContactSettings();
  const now = new Date().toISOString();
  const phone = (settings.phone !== undefined ? settings.phone : current.phone).trim();
  const email = (settings.email !== undefined ? settings.email : current.email).trim();
  const instagram_url = (settings.instagram_url !== undefined ? settings.instagram_url : current.instagram_url).trim();
  const facebook_url = (settings.facebook_url !== undefined ? settings.facebook_url : current.facebook_url).trim();
  const linkedin_url = (settings.linkedin_url !== undefined ? settings.linkedin_url : current.linkedin_url).trim();
  const address = settings.address !== undefined ? settings.address.trim() : (current.address || '');

  db.prepare(`
    INSERT INTO contact_settings (id, phone, email, instagram_url, facebook_url, linkedin_url, address, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      phone = excluded.phone,
      email = excluded.email,
      instagram_url = excluded.instagram_url,
      facebook_url = excluded.facebook_url,
      linkedin_url = excluded.linkedin_url,
      address = excluded.address,
      updated_at = excluded.updated_at
  `).run(phone, email, instagram_url, facebook_url, linkedin_url, address, now);

  const updated: ContactSettings = {
    id: 1,
    phone,
    email,
    instagram_url,
    facebook_url,
    linkedin_url,
    address,
    updated_at: now
  };

  return updated;
}

export async function persistContactSettings(settings: ContactSettings): Promise<void> {
  if (isSupabaseActive()) {
    await pushContactSettingsToSupabase(settings);
  }
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
  const updated = getEnquiryById(id);
  return updated;
}

export function deleteEnquiry(id: number): boolean {
  const stmt = db.prepare('DELETE FROM enquiries WHERE id = ?');
  const result = stmt.run(id);
  const ok = Number(result.changes) > 0;
  if (ok) {
    deleteEnquiryFromSupabase(id).catch(err => {
      console.warn(`[Supabase Delete Warning] Enquiry #${id}:`, err?.message || err);
    });
  }
  return ok;
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
  seo_report?: string | null;
  content_revision?: string | null;
  // Version 8.3.0: Information Gain, E-E-A-T & AI Citation Blocks
  firsthand_observations?: string;
  project_examples?: string;
  case_studies?: string;
  original_research_data?: string;
  implementation_process?: string;
  external_sources?: string; // JSON string array
  limitations_lessons?: string;
  author_role?: string;
  author_bio?: string;
  author_credentials?: string;
  reviewer_name?: string;
  editorial_notes?: string;
  citation_answer_blocks?: string; // JSON string array
  review_cycle_days?: number;
  last_reviewed_at?: string | null;
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
  seo_report?: string | null;
  content_revision?: string | null;
  // Version 8.3.0
  firsthand_observations?: string;
  project_examples?: string;
  case_studies?: string;
  original_research_data?: string;
  implementation_process?: string;
  external_sources?: string[] | string;
  limitations_lessons?: string;
  author_role?: string;
  author_bio?: string;
  author_credentials?: string;
  reviewer_name?: string;
  editorial_notes?: string;
  citation_answer_blocks?: any[] | string;
  review_cycle_days?: number;
  last_reviewed_at?: string | null;
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
  // Safeguard: Check if an identical draft already exists by title to prevent duplicate drafts
  const normTitle = input.title.trim().toLowerCase();
  const existingDraft = db.prepare(`SELECT * FROM blogs WHERE LOWER(TRIM(title)) = ? AND status = 'Draft' LIMIT 1`).get(normTitle) as BlogRecord | undefined;
  if (existingDraft) {
    console.log(`[Blog Idempotency Hit] Returning existing draft #${existingDraft.id} ("${existingDraft.title}") instead of creating duplicate`);
    return existingDraft;
  }

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
      publication_error, admin_notes, seo_report, content_revision,
      firsthand_observations, project_examples, case_studies, original_research_data,
      implementation_process, external_sources, limitations_lessons,
      author_role, author_bio, author_credentials, reviewer_name, editorial_notes,
      citation_answer_blocks, review_cycle_days, last_reviewed_at,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      '', ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
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
    (input.canonical_url || `https://www.dawnexus.in/blog/${slug}`).trim(),
    status,
    input.scheduled_at || null,
    publishedAt,
    (input.admin_notes || '').trim(),
    input.seo_report !== undefined ? (typeof input.seo_report === 'string' ? input.seo_report : JSON.stringify(input.seo_report)) : null,
    input.content_revision || null,
    (input.firsthand_observations || '').trim(),
    (input.project_examples || '').trim(),
    (input.case_studies || '').trim(),
    (input.original_research_data || '').trim(),
    (input.implementation_process || '').trim(),
    typeof input.external_sources === 'string' ? input.external_sources : JSON.stringify(input.external_sources || []),
    (input.limitations_lessons || '').trim(),
    (input.author_role || 'Technical Architect & SEO Strategist').trim(),
    (input.author_bio || '').trim(),
    (input.author_credentials || '').trim(),
    (input.reviewer_name || '').trim(),
    (input.editorial_notes || '').trim(),
    typeof input.citation_answer_blocks === 'string' ? input.citation_answer_blocks : JSON.stringify(input.citation_answer_blocks || []),
    input.review_cycle_days || 90,
    input.last_reviewed_at || null,
    now,
    now
  );

  const created = getBlogById(Number(info.lastInsertRowid))!;
  return created;
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

export interface BlogRedirectRecord {
  id: number;
  old_path: string;
  new_path: string;
  status_code: number;
  notes: string;
  created_at: string;
}

export function getBlogRedirect(pathOrSlug: string): BlogRedirectRecord | null {
  const normalized = pathOrSlug.startsWith('/') ? pathOrSlug : `/blog/${pathOrSlug}`;
  const stmt = db.prepare('SELECT * FROM blog_redirects WHERE old_path = ? OR old_path = ?');
  const res = stmt.get(normalized, pathOrSlug);
  return (res as unknown as BlogRedirectRecord) || null;
}

export function addBlogRedirect(oldPath: string, newPath: string, statusCode = 301, notes = ''): void {
  const normOld = oldPath.startsWith('/') ? oldPath : `/blog/${oldPath}`;
  const normNew = newPath.startsWith('/') || newPath.startsWith('http') ? newPath : `/blog/${newPath}`;
  const stmt = db.prepare(`
    INSERT INTO blog_redirects (old_path, new_path, status_code, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(old_path) DO UPDATE SET
      new_path = excluded.new_path,
      status_code = excluded.status_code,
      notes = excluded.notes
  `);
  stmt.run(normOld, normNew, statusCode, notes);
}

export function getAllBlogRedirects(): BlogRedirectRecord[] {
  const stmt = db.prepare('SELECT * FROM blog_redirects ORDER BY id ASC');
  return (stmt.all() as unknown as BlogRedirectRecord[]) || [];
}

export interface GetBlogsQuery {
  search?: string;
  status?: string;
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'scheduled' | 'updated';
  page?: number;
  limit?: number;
}

export function getBlogs(params: GetBlogsQuery = {}) {
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
      seo_report = ?,
      content_revision = ?,
      firsthand_observations = ?,
      project_examples = ?,
      case_studies = ?,
      original_research_data = ?,
      implementation_process = ?,
      external_sources = ?,
      limitations_lessons = ?,
      author_role = ?,
      author_bio = ?,
      author_credentials = ?,
      reviewer_name = ?,
      editorial_notes = ?,
      citation_answer_blocks = ?,
      review_cycle_days = ?,
      last_reviewed_at = ?,
      updated_at = ?
    WHERE id = ?
  `);

  (stmt as any).run(
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
    updates.canonical_url !== undefined ? updates.canonical_url.trim() : (current.canonical_url || `https://www.dawnexus.in/blog/${slug}`),
    status,
    updates.scheduled_at !== undefined ? updates.scheduled_at : current.scheduled_at,
    publishedAt,
    updates.admin_notes !== undefined ? updates.admin_notes.trim() : current.admin_notes,
    updates.seo_report !== undefined ? (typeof updates.seo_report === 'string' ? updates.seo_report : JSON.stringify(updates.seo_report)) : current.seo_report || null,
    updates.content_revision !== undefined ? updates.content_revision : current.content_revision || null,
    updates.firsthand_observations !== undefined ? updates.firsthand_observations.trim() : (current.firsthand_observations || ''),
    updates.project_examples !== undefined ? updates.project_examples.trim() : (current.project_examples || ''),
    updates.case_studies !== undefined ? updates.case_studies.trim() : (current.case_studies || ''),
    updates.original_research_data !== undefined ? updates.original_research_data.trim() : (current.original_research_data || ''),
    updates.implementation_process !== undefined ? updates.implementation_process.trim() : (current.implementation_process || ''),
    updates.external_sources !== undefined ? (typeof updates.external_sources === 'string' ? updates.external_sources : JSON.stringify(updates.external_sources)) : (current.external_sources || '[]'),
    updates.limitations_lessons !== undefined ? updates.limitations_lessons.trim() : (current.limitations_lessons || ''),
    updates.author_role !== undefined ? updates.author_role.trim() : (current.author_role || 'Technical Architect & SEO Strategist'),
    updates.author_bio !== undefined ? updates.author_bio.trim() : (current.author_bio || ''),
    updates.author_credentials !== undefined ? updates.author_credentials.trim() : (current.author_credentials || ''),
    updates.reviewer_name !== undefined ? updates.reviewer_name.trim() : (current.reviewer_name || ''),
    updates.editorial_notes !== undefined ? updates.editorial_notes.trim() : (current.editorial_notes || ''),
    updates.citation_answer_blocks !== undefined ? (typeof updates.citation_answer_blocks === 'string' ? updates.citation_answer_blocks : JSON.stringify(updates.citation_answer_blocks)) : (current.citation_answer_blocks || '[]'),
    updates.review_cycle_days !== undefined ? Number(updates.review_cycle_days) : (current.review_cycle_days || 90),
    updates.last_reviewed_at !== undefined ? updates.last_reviewed_at : current.last_reviewed_at,
    now,
    id
  );

  const updated = getBlogById(id);
  return updated;
}

export function deleteBlog(id: number): boolean {
  const stmt = db.prepare('DELETE FROM blogs WHERE id = ?');
  const res = stmt.run(id);
  const ok = Number(res.changes) > 0;
  if (ok) {
    deleteBlogFromSupabase(id).catch(err => {
      console.warn(`[Supabase Delete Warning] Blog #${id}:`, err?.message || err);
    });
  }
  return ok;
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

export async function publishDueScheduledBlogsReliable(): Promise<{ publishedCount: number; errors: { id: number; error: string }[] }> {
  const due = getDueScheduledBlogs();
  let publishedCount = 0;
  const errors: { id: number; error: string }[] = [];

  for (const item of due) {
    try {
      const published = publishBlogRecord(item.id);
      if (published && isSupabaseActive()) {
        await pushBlogToSupabase(published);
      }
      publishedCount++;
      console.log(`[Scheduler] Auto-published scheduled blog #${item.id} (${item.slug})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auto-publishing error';
      console.error(`[Scheduler] Failed to publish blog #${item.id}:`, err);
      const failed = markBlogFailed(item.id, msg);
      if (failed && isSupabaseActive()) {
        try {
          await pushBlogToSupabase(failed);
        } catch {}
      }
      errors.push({ id: item.id, error: msg });
    }
  }

  return { publishedCount, errors };
}

// ----------------------------------------------------
// Version 7.1.8: Bulk Blog Scheduling
// ----------------------------------------------------
export interface BulkScheduleItem {
  id: number;
  scheduledAt: string; // ISO string or parsable date string
}

export interface BulkScheduleResult {
  success: boolean;
  scheduledCount: number;
  updatedBlogs: BlogRecord[];
  errors: Array<{ id: number; error: string }>;
}

export async function bulkScheduleBlogsReliable(items: BulkScheduleItem[]): Promise<BulkScheduleResult> {
  const errors: Array<{ id: number; error: string }> = [];
  const updatedBlogs: BlogRecord[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, scheduledCount: 0, updatedBlogs: [], errors: [{ id: 0, error: 'No blogs provided for scheduling' }] };
  }

  const validatedItems: Array<{ id: number; targetIso: string }> = [];
  const now = new Date();

  for (const item of items) {
    if (!item.id || !item.scheduledAt) {
      errors.push({ id: item.id || 0, error: 'Missing blog ID or scheduled date' });
      continue;
    }

    const blog = getBlogById(item.id);
    if (!blog) {
      errors.push({ id: item.id, error: `Blog #${item.id} not found` });
      continue;
    }

    const scheduledDate = new Date(item.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      errors.push({ id: item.id, error: `Invalid date format: ${item.scheduledAt}` });
      continue;
    }

    if (scheduledDate.getTime() <= now.getTime()) {
      errors.push({ id: item.id, error: `Scheduled time must be in the future (received: ${item.scheduledAt})` });
      continue;
    }

    validatedItems.push({ id: item.id, targetIso: scheduledDate.toISOString() });
  }

  if (errors.length > 0 && validatedItems.length === 0) {
    return { success: false, scheduledCount: 0, updatedBlogs: [], errors };
  }

  db.exec('BEGIN');
  try {
    for (const item of validatedItems) {
      const nowIso = new Date().toISOString();
      db.prepare(`
        UPDATE blogs 
        SET status = 'Scheduled', scheduled_at = ?, publication_error = '', updated_at = ?
        WHERE id = ?
      `).run(item.targetIso, nowIso, item.id);

      const updated = getBlogById(item.id);
      if (updated) {
        updatedBlogs.push(updated);
      }
    }
    db.exec('COMMIT');
  } catch (err: unknown) {
    db.exec('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, scheduledCount: 0, updatedBlogs: [], errors: [{ id: 0, error: `Batch rollback: ${msg}` }] };
  }

  // Push updated scheduled blogs to Supabase if active
  if (isSupabaseActive()) {
    for (const b of updatedBlogs) {
      try {
        await pushBlogToSupabase(b);
      } catch (pushErr) {
        console.warn(`[BulkScheduler] Could not sync scheduled blog #${b.id} to Supabase:`, pushErr);
      }
    }
  }

  return {
    success: errors.length === 0,
    scheduledCount: updatedBlogs.length,
    updatedBlogs,
    errors
  };
}

// ----------------------------------------------------
// Version 7.1.8: Dynamic SEO Categories Management
// ----------------------------------------------------
export interface SeoCategoryRecord {
  id: number;
  name: string;
  slug: string;
  primary_keyword: string;
  secondary_keywords: string[];
  target_audience: string;
  search_intent: string;
  instructions: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSeoCategoryInput {
  name: string;
  slug?: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  target_audience?: string;
  search_intent?: string;
  instructions?: string;
}

export interface UpdateSeoCategoryInput {
  name?: string;
  slug?: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  target_audience?: string;
  search_intent?: string;
  instructions?: string;
}

export function getSeoCategories(): SeoCategoryRecord[] {
  const rows = db.prepare('SELECT * FROM seo_categories ORDER BY id ASC').all() as any[];
  return rows.map(r => ({
    ...r,
    secondary_keywords: typeof r.secondary_keywords === 'string' ? JSON.parse(r.secondary_keywords || '[]') : (r.secondary_keywords || [])
  }));
}

export function getSeoCategoryById(id: number): SeoCategoryRecord | null {
  const r = db.prepare('SELECT * FROM seo_categories WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    ...r,
    secondary_keywords: typeof r.secondary_keywords === 'string' ? JSON.parse(r.secondary_keywords || '[]') : (r.secondary_keywords || [])
  };
}

export function getSeoCategoryBySlug(slug: string): SeoCategoryRecord | null {
  const r = db.prepare('SELECT * FROM seo_categories WHERE slug = ?').get(slug) as any;
  if (!r) return null;
  return {
    ...r,
    secondary_keywords: typeof r.secondary_keywords === 'string' ? JSON.parse(r.secondary_keywords || '[]') : (r.secondary_keywords || [])
  };
}

export function createSeoCategory(input: CreateSeoCategoryInput): SeoCategoryRecord {
  const name = input.name.trim();
  const slug = (input.slug || input.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const now = new Date().toISOString();
  const secJson = JSON.stringify(input.secondary_keywords || []);

  const res = db.prepare(`
    INSERT INTO seo_categories (
      name, slug, primary_keyword, secondary_keywords, target_audience, search_intent, instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    slug,
    input.primary_keyword || '',
    secJson,
    input.target_audience || '',
    input.search_intent || 'Commercial',
    input.instructions || '',
    now,
    now
  );

  return getSeoCategoryById(Number(res.lastInsertRowid))!;
}

export function updateSeoCategory(id: number, input: UpdateSeoCategoryInput): SeoCategoryRecord | null {
  const current = getSeoCategoryById(id);
  if (!current) return null;

  const name = input.name !== undefined ? input.name.trim() : current.name;
  const slug = input.slug !== undefined ? input.slug.trim() : current.slug;
  const primary = input.primary_keyword !== undefined ? input.primary_keyword.trim() : current.primary_keyword;
  const secJson = input.secondary_keywords !== undefined ? JSON.stringify(input.secondary_keywords) : JSON.stringify(current.secondary_keywords);
  const audience = input.target_audience !== undefined ? input.target_audience.trim() : current.target_audience;
  const intent = input.search_intent !== undefined ? input.search_intent.trim() : current.search_intent;
  const instructions = input.instructions !== undefined ? input.instructions.trim() : current.instructions;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE seo_categories SET
      name = ?, slug = ?, primary_keyword = ?, secondary_keywords = ?,
      target_audience = ?, search_intent = ?, instructions = ?, updated_at = ?
    WHERE id = ?
  `).run(name, slug, primary, secJson, audience, intent, instructions, now, id);

  return getSeoCategoryById(id);
}

export function deleteSeoCategory(id: number): boolean {
  const res = db.prepare('DELETE FROM seo_categories WHERE id = ?').run(id);
  return res.changes > 0;
}

let lastSyncTime = 0;
export async function refreshFromPersistentStore(force = false): Promise<void> {
  if (!isSupabaseActive()) return;
  const now = Date.now();
  if (!force && now - lastSyncTime < 3000) {
    return;
  }
  await syncFromSupabase(db);
  lastSyncTime = Date.now();
}

export async function persistEnquiry(record: EnquiryRecord): Promise<void> {
  if (!isSupabaseActive()) return;
  await pushEnquiryToSupabase(record);
}

export async function persistEnquiryUpdate(id: number, updates: { status?: string; admin_notes?: string }): Promise<void> {
  if (!isSupabaseActive()) return;
  await updateEnquiryInSupabase(id, updates);
}

export async function persistEnquiryDeletion(id: number): Promise<void> {
  if (!isSupabaseActive()) return;
  await deleteEnquiryFromSupabase(id);
}

export async function persistBlog(blog: BlogRecord): Promise<void> {
  if (!isSupabaseActive()) return;
  await pushBlogToSupabase(blog);
}

export async function persistBlogDeletion(id: number): Promise<void> {
  if (!isSupabaseActive()) return;
  await deleteBlogFromSupabase(id);
}

export async function persistClient(client: ClientRecord): Promise<void> {
  if (!isSupabaseActive()) return;
  await pushClientToSupabase(client);
}

export async function persistClientDeletion(id: number): Promise<void> {
  if (!isSupabaseActive()) return;
  await deleteClientFromSupabase(id);
}

export async function persistShowcase(showcase: ShowcaseRecord): Promise<void> {
  if (!isSupabaseActive()) return;
  await pushShowcaseToSupabase(showcase);
}

export async function persistShowcaseDeletion(id: number): Promise<void> {
  if (!isSupabaseActive()) return;
  await deleteShowcaseFromSupabase(id);
}

export async function persistCalculatorPricingConfig(config: CalculatorPricingConfig): Promise<void> {
  if (!isSupabaseActive()) return;
  await pushCalculatorPricingConfigToSupabase(config);
}

export function getPublishedBlogsForSitemap(): { slug: string; updated_at: string; published_at: string }[] {
  const stmt = db.prepare("SELECT slug, updated_at, published_at FROM blogs WHERE status = 'Published' AND slug IS NOT NULL AND TRIM(slug) != '' ORDER BY published_at DESC");
  return stmt.all() as { slug: string; updated_at: string; published_at: string }[];
}

// ----------------------------------------------------
// NOTIFICATION SETTINGS & OTP CHALLENGES
// ----------------------------------------------------

export interface NotificationSettingsRecord {
  id: number;
  active_email: string | null;
  is_verified: number;
  verified_at: string | null;
  pending_email: string | null;
  updated_at: string;
}

export interface OtpChallengeRecord {
  id: number;
  email: string;
  otp_hash: string;
  salt: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export function getNotificationSettings(): NotificationSettingsRecord {
  const row = db.prepare('SELECT * FROM notification_settings WHERE id = 1').get() as unknown as NotificationSettingsRecord | undefined;
  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO notification_settings (id, active_email, is_verified, verified_at, pending_email, updated_at)
      VALUES (1, NULL, 0, NULL, NULL, datetime('now'))
    `).run();
    return db.prepare('SELECT * FROM notification_settings WHERE id = 1').get() as unknown as NotificationSettingsRecord;
  }
  return row;
}

export function getActiveNotificationEmail(): string | null {
  const settings = getNotificationSettings();
  if (settings && settings.is_verified === 1 && settings.active_email) {
    return settings.active_email;
  }
  // Robust serverless fallback: if configured via environment or verified address
  const envEmail = process.env.NOTIFICATION_EMAIL || process.env.INQUIRY_ALERT_EMAIL;
  if (envEmail && envEmail.trim()) {
    return envEmail.trim();
  }
  return null;
}

export function createOtpChallenge(email: string, otpHash: string, salt: string, expiresAt: string): OtpChallengeRecord {
  const now = new Date().toISOString();
  
  // Invalidate any active, superseded challenges for this email
  db.prepare(`
    UPDATE notification_otp_challenges
    SET used_at = ?
    WHERE email = ? AND used_at IS NULL
  `).run(now, email);

  // Insert new challenge
  const stmt = db.prepare(`
    INSERT INTO notification_otp_challenges (
      email, otp_hash, salt, attempts, max_attempts, expires_at, created_at, used_at
    ) VALUES (?, ?, ?, 0, 5, ?, ?, NULL)
  `);
  const info = stmt.run(email, otpHash, salt, expiresAt, now);

  // Update pending email in settings without overriding the existing active email
  db.prepare(`
    UPDATE notification_settings
    SET pending_email = ?, updated_at = ?
    WHERE id = 1
  `).run(email, now);

  const getStmt = db.prepare('SELECT * FROM notification_otp_challenges WHERE id = ?');
  return getStmt.get(Number(info.lastInsertRowid)) as unknown as OtpChallengeRecord;
}

export function getLatestOtpChallenge(email: string): OtpChallengeRecord | null {
  const stmt = db.prepare(`
    SELECT * FROM notification_otp_challenges 
    WHERE email = ? AND used_at IS NULL
    ORDER BY id DESC LIMIT 1
  `);
  const res = stmt.get(email);
  return (res as unknown as OtpChallengeRecord) || null;
}

export function recordOtpFailedAttempt(challengeId: number): number {
  db.prepare(`
    UPDATE notification_otp_challenges
    SET attempts = attempts + 1
    WHERE id = ?
  `).run(challengeId);

  const res = db.prepare('SELECT attempts, max_attempts FROM notification_otp_challenges WHERE id = ?').get(challengeId) as { attempts: number; max_attempts: number };
  return res ? res.attempts : 5;
}

export function completeOtpVerification(challengeId: number, email: string): NotificationSettingsRecord {
  const now = new Date().toISOString();

  // Mark challenge as used
  db.prepare(`
    UPDATE notification_otp_challenges
    SET used_at = ?
    WHERE id = ?
  `).run(now, challengeId);

  // Invalidate any remaining challenges for this email
  db.prepare(`
    UPDATE notification_otp_challenges
    SET used_at = ?
    WHERE email = ? AND used_at IS NULL
  `).run(now, email);

  // Activate the new verified recipient in settings
  db.prepare(`
    UPDATE notification_settings
    SET active_email = ?, is_verified = 1, verified_at = ?, pending_email = NULL, updated_at = ?
    WHERE id = 1
  `).run(email, now, now);

  const res = getNotificationSettings();
  pushNotificationSettingsToSupabase(res).catch(() => {});
  return res;
}

export function deactivateNotificationSettings(): NotificationSettingsRecord {
  const now = new Date().toISOString();

  // Invalidate all open challenges
  db.prepare(`
    UPDATE notification_otp_challenges
    SET used_at = ?
    WHERE used_at IS NULL
  `).run(now);

  // Clear active and pending recipient
  db.prepare(`
    UPDATE notification_settings
    SET active_email = NULL, is_verified = 0, verified_at = NULL, pending_email = NULL, updated_at = ?
    WHERE id = 1
  `).run(now);

  const res = getNotificationSettings();
  pushNotificationSettingsToSupabase(res).catch(() => {});
  return res;
}

// ----------------------------------------------------
// VERSION 3.0: SEO RESEARCH GOOGLE CONNECTION HELPERS
// ----------------------------------------------------

export interface SeoConnectionRecord {
  id: number;
  google_email: string | null;
  encrypted_tokens: string | null;
  selected_property: string | null;
  last_sync_at?: string | null;
  last_attempt_at?: string | null;
  last_error?: string | null;
  connection_status?: string | null;
  selected_ga4_property?: string | null;
  selected_ga4_property_name?: string | null;
  ga4_last_sync_at?: string | null;
  ga4_last_attempt_at?: string | null;
  ga4_last_error?: string | null;
  ga4_connection_status?: string | null;
  updated_at: string;
}

export interface Ga4AnalyticsJobRecord {
  id: number;
  job_id: string;
  property_id: string;
  report_type: string;
  date_range: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  rows_returned: number;
  api_requests_count: number;
  duration_ms: number;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface Ga4ReportCacheRecord {
  id: number;
  property_id: string;
  report_type: string;
  date_range: string;
  data_json: string;
  synced_at: string;
}

export interface SeoResearchJobRecord {
  id: number;
  job_id: string;
  property: string;
  date_range: string;
  dimensions: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queries_returned: number;
  queries_saved: number;
  api_requests_count: number;
  duration_ms: number;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface GscSearchAnalyticsCacheRecord {
  id: number;
  property: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  period_type: 'current' | 'previous';
  start_date: string;
  end_date: string;
  synced_at: string;
}

export function getSeoConnection(): SeoConnectionRecord | null {
  const stmt = db.prepare('SELECT * FROM seo_research_connections WHERE id = 1');
  const res = stmt.get();
  return (res as unknown as SeoConnectionRecord) || null;
}

export function saveSeoConnection(
  googleEmail: string,
  encryptedTokens: string,
  defaultProperty?: string,
  extra?: { last_sync_at?: string; last_attempt_at?: string; last_error?: string | null; connection_status?: string }
): SeoConnectionRecord {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO seo_research_connections (
      id, google_email, encrypted_tokens, selected_property,
      last_sync_at, last_attempt_at, last_error, connection_status, updated_at
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      google_email = excluded.google_email,
      encrypted_tokens = excluded.encrypted_tokens,
      selected_property = COALESCE(excluded.selected_property, seo_research_connections.selected_property),
      last_sync_at = COALESCE(excluded.last_sync_at, seo_research_connections.last_sync_at),
      last_attempt_at = COALESCE(excluded.last_attempt_at, seo_research_connections.last_attempt_at),
      last_error = excluded.last_error,
      connection_status = COALESCE(excluded.connection_status, seo_research_connections.connection_status),
      updated_at = excluded.updated_at
  `).run(
    googleEmail,
    encryptedTokens,
    defaultProperty || null,
    extra?.last_sync_at || null,
    extra?.last_attempt_at || now,
    extra?.last_error || null,
    extra?.connection_status || 'Connected',
    now
  );

  const conn = getSeoConnection()!;
  pushSeoConnectionToSupabase(conn).catch(() => {});
  return conn;
}

export function updateSeoConnectionTelemetry(updates: {
  last_sync_at?: string | null;
  last_attempt_at?: string | null;
  last_error?: string | null;
  connection_status?: string;
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE seo_research_connections SET
      last_sync_at = COALESCE(?, last_sync_at),
      last_attempt_at = COALESCE(?, last_attempt_at),
      last_error = ?,
      connection_status = COALESCE(?, connection_status),
      updated_at = ?
    WHERE id = 1
  `).run(
    updates.last_sync_at || null,
    updates.last_attempt_at || now,
    updates.last_error !== undefined ? updates.last_error : null,
    updates.connection_status || null,
    now
  );
  const conn = getSeoConnection();
  if (conn) {
    pushSeoConnectionToSupabase(conn).catch(() => {});
  }
}

export function updateSeoSelectedProperty(propertyUrl: string): SeoConnectionRecord {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO seo_research_connections (id, google_email, encrypted_tokens, selected_property, updated_at)
    VALUES (1, NULL, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      selected_property = excluded.selected_property,
      updated_at = excluded.updated_at
  `).run(propertyUrl, now);

  const conn = getSeoConnection()!;
  pushSeoConnectionToSupabase(conn).catch(() => {});
  return conn;
}

export function clearSeoConnection(): void {
  db.prepare('DELETE FROM seo_research_connections WHERE id = 1').run();
  pushSeoConnectionToSupabase(null).catch(() => {});
}

// ----------------------------------------------------
// SEO RESEARCH JOBS & SEARCH ANALYTICS CACHE
// ----------------------------------------------------

export function createSeoResearchJob(job: {
  job_id: string;
  property: string;
  date_range: string;
  dimensions?: string;
  status?: 'queued' | 'running';
  triggered_by?: string;
}): SeoResearchJobRecord {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO seo_research_jobs (
      job_id, property, date_range, dimensions, status, triggered_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    job.job_id,
    job.property,
    job.date_range,
    job.dimensions || 'query',
    job.status || 'queued',
    job.triggered_by || 'admin',
    now
  );
  return getSeoResearchJobById(job.job_id)!;
}

export function updateSeoResearchJob(
  jobId: string,
  updates: Partial<Omit<SeoResearchJobRecord, 'id' | 'job_id' | 'created_at'>>
): SeoResearchJobRecord | null {
  const existing = getSeoResearchJobById(jobId);
  if (!existing) return null;

  db.prepare(`
    UPDATE seo_research_jobs SET
      status = COALESCE(?, status),
      queries_returned = COALESCE(?, queries_returned),
      queries_saved = COALESCE(?, queries_saved),
      api_requests_count = COALESCE(?, api_requests_count),
      duration_ms = COALESCE(?, duration_ms),
      error_message = ?,
      completed_at = COALESCE(?, completed_at)
    WHERE job_id = ?
  `).run(
    updates.status || null,
    updates.queries_returned !== undefined ? updates.queries_returned : null,
    updates.queries_saved !== undefined ? updates.queries_saved : null,
    updates.api_requests_count !== undefined ? updates.api_requests_count : null,
    updates.duration_ms !== undefined ? updates.duration_ms : null,
    updates.error_message !== undefined ? updates.error_message : existing.error_message,
    updates.completed_at || null,
    jobId
  );

  return getSeoResearchJobById(jobId);
}

export function getSeoResearchJobById(jobId: string): SeoResearchJobRecord | null {
  const res = db.prepare('SELECT * FROM seo_research_jobs WHERE job_id = ?').get(jobId);
  return (res as unknown as SeoResearchJobRecord) || null;
}

export function getLatestSeoResearchJobs(limit = 15): SeoResearchJobRecord[] {
  const res = db.prepare('SELECT * FROM seo_research_jobs ORDER BY id DESC LIMIT ?').all(limit);
  return res as unknown as SeoResearchJobRecord[];
}

export function saveGscSearchAnalyticsCache(rows: Array<{
  property: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  period_type: 'current' | 'previous';
  start_date: string;
  end_date: string;
}>): number {
  if (rows.length === 0) return 0;
  const now = new Date().toISOString();
  const property = rows[0].property;
  const periodType = rows[0].period_type;

  db.exec('BEGIN');
  try {
    // Clear old cache for this property and period
    db.prepare('DELETE FROM gsc_search_analytics_cache WHERE property = ? AND period_type = ?').run(property, periodType);

    const stmt = db.prepare(`
      INSERT INTO gsc_search_analytics_cache (
        property, query, clicks, impressions, ctr, position, period_type, start_date, end_date, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of rows) {
      stmt.run(
        r.property,
        r.query,
        r.clicks,
        r.impressions,
        r.ctr,
        r.position,
        r.period_type,
        r.start_date,
        r.end_date,
        now
      );
    }
    db.exec('COMMIT');
    return rows.length;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getGscSearchAnalyticsCache(property: string, periodType: 'current' | 'previous' = 'current'): GscSearchAnalyticsCacheRecord[] {
  const res = db.prepare('SELECT * FROM gsc_search_analytics_cache WHERE property = ? AND period_type = ?').all(property, periodType);
  return res as unknown as GscSearchAnalyticsCacheRecord[];
}

// ----------------------------------------------------
// GA4 ANALYTICS CONNECTION, JOB & CACHE HELPERS
// ----------------------------------------------------

export function updateGa4SelectedProperty(propertyId: string, propertyName?: string): SeoConnectionRecord {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO seo_research_connections (
      id, selected_ga4_property, selected_ga4_property_name, ga4_connection_status, ga4_last_error, updated_at
    )
    VALUES (1, ?, ?, 'Connected', NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      selected_ga4_property = excluded.selected_ga4_property,
      selected_ga4_property_name = COALESCE(excluded.selected_ga4_property_name, seo_research_connections.selected_ga4_property_name),
      ga4_connection_status = 'Connected',
      ga4_last_error = NULL,
      updated_at = excluded.updated_at
  `).run(propertyId, propertyName || null, now);

  const conn = getSeoConnection()!;
  pushSeoConnectionToSupabase(conn).catch(() => {});
  return conn;
}

export async function persistGa4SelectedProperty(propertyId: string, propertyName?: string): Promise<SeoConnectionRecord> {
  const conn = updateGa4SelectedProperty(propertyId, propertyName);
  try {
    await pushSeoConnectionToSupabase(conn);
  } catch (err) {
    console.warn('[DB] pushSeoConnectionToSupabase error in persistGa4SelectedProperty:', err);
  }
  return conn;
}

export async function disconnectGa4Property(): Promise<SeoConnectionRecord> {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE seo_research_connections SET
      selected_ga4_property = NULL,
      selected_ga4_property_name = NULL,
      ga4_connection_status = 'Disconnected',
      ga4_last_sync_at = NULL,
      ga4_last_error = NULL,
      updated_at = ?
    WHERE id = 1
  `).run(now);

  clearGa4ReportCache();

  const conn = getSeoConnection()!;
  try {
    await pushSeoConnectionToSupabase(conn);
  } catch (err) {
    console.warn('[DB] pushSeoConnectionToSupabase error in disconnectGa4Property:', err);
  }
  return conn;
}

export function clearGa4ReportCache(propertyId?: string): void {
  try {
    if (propertyId) {
      db.prepare('DELETE FROM ga4_analytics_cache WHERE property_id = ?').run(propertyId);
    } else {
      db.prepare('DELETE FROM ga4_analytics_cache').run();
    }
  } catch {}
}

export function updateGa4ConnectionTelemetry(updates: {
  ga4_last_sync_at?: string | null;
  ga4_last_attempt_at?: string | null;
  ga4_last_error?: string | null;
  ga4_connection_status?: string;
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE seo_research_connections SET
      ga4_last_sync_at = COALESCE(?, ga4_last_sync_at),
      ga4_last_attempt_at = COALESCE(?, ga4_last_attempt_at),
      ga4_last_error = ?,
      ga4_connection_status = COALESCE(?, ga4_connection_status),
      updated_at = ?
    WHERE id = 1
  `).run(
    updates.ga4_last_sync_at || null,
    updates.ga4_last_attempt_at || now,
    updates.ga4_last_error !== undefined ? updates.ga4_last_error : null,
    updates.ga4_connection_status || null,
    now
  );
  const conn = getSeoConnection();
  if (conn) {
    pushSeoConnectionToSupabase(conn).catch(() => {});
  }
}

export function createGa4Job(job: {
  job_id: string;
  property_id: string;
  report_type: string;
  date_range: string;
  status?: 'queued' | 'running';
  triggered_by?: string;
}): Ga4AnalyticsJobRecord {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO ga4_analytics_jobs (
      job_id, property_id, report_type, date_range, status, triggered_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(job_id) DO UPDATE SET
      property_id = excluded.property_id,
      report_type = excluded.report_type,
      date_range = excluded.date_range,
      status = excluded.status,
      triggered_by = excluded.triggered_by
  `).run(
    job.job_id,
    job.property_id,
    job.report_type,
    job.date_range,
    job.status || 'queued',
    job.triggered_by || 'admin',
    now
  );
  return getGa4JobById(job.job_id)!;
}

export function updateGa4Job(
  jobId: string,
  updates: Partial<Omit<Ga4AnalyticsJobRecord, 'id' | 'job_id' | 'created_at'>>
): Ga4AnalyticsJobRecord | null {
  const existing = getGa4JobById(jobId);
  if (!existing) return null;

  db.prepare(`
    UPDATE ga4_analytics_jobs SET
      status = COALESCE(?, status),
      rows_returned = COALESCE(?, rows_returned),
      api_requests_count = COALESCE(?, api_requests_count),
      duration_ms = COALESCE(?, duration_ms),
      error_message = ?,
      completed_at = COALESCE(?, completed_at)
    WHERE job_id = ?
  `).run(
    updates.status || null,
    updates.rows_returned !== undefined ? updates.rows_returned : null,
    updates.api_requests_count !== undefined ? updates.api_requests_count : null,
    updates.duration_ms !== undefined ? updates.duration_ms : null,
    updates.error_message !== undefined ? updates.error_message : existing.error_message,
    updates.completed_at || null,
    jobId
  );

  return getGa4JobById(jobId);
}

export function getGa4JobById(jobId: string): Ga4AnalyticsJobRecord | null {
  const res = db.prepare('SELECT * FROM ga4_analytics_jobs WHERE job_id = ?').get(jobId);
  return (res as unknown as Ga4AnalyticsJobRecord) || null;
}

export function getGa4Jobs(limit = 15): Ga4AnalyticsJobRecord[] {
  const res = db.prepare('SELECT * FROM ga4_analytics_jobs ORDER BY created_at DESC LIMIT ?').all(limit);
  return res as unknown as Ga4AnalyticsJobRecord[];
}

export function getGa4JobStats(): { total: number; completed: number; failed: number; running: number } {
  const total = (db.prepare('SELECT COUNT(*) as count FROM ga4_analytics_jobs').get() as any)?.count || 0;
  const completed = (db.prepare("SELECT COUNT(*) as count FROM ga4_analytics_jobs WHERE status = 'completed'").get() as any)?.count || 0;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM ga4_analytics_jobs WHERE status = 'failed'").get() as any)?.count || 0;
  const running = (db.prepare("SELECT COUNT(*) as count FROM ga4_analytics_jobs WHERE status = 'running' OR status = 'queued'").get() as any)?.count || 0;
  return { total, completed, failed, running };
}

export function getGa4ReportCache(propertyId: string, reportType: string, dateRange: string, maxAgeMs = 15 * 60 * 1000): any | null {
  const row = db.prepare('SELECT * FROM ga4_analytics_cache WHERE property_id = ? AND report_type = ? AND date_range = ?').get(propertyId, reportType, dateRange) as any;
  if (!row) return null;
  const age = Date.now() - new Date(row.synced_at).getTime();
  if (age > maxAgeMs) return null;
  try {
    return JSON.parse(row.data_json);
  } catch {
    return null;
  }
}

export function setGa4ReportCache(propertyId: string, reportType: string, dateRange: string, data: any): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO ga4_analytics_cache (property_id, report_type, date_range, data_json, synced_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(property_id, report_type, date_range) DO UPDATE SET
      data_json = excluded.data_json,
      synced_at = excluded.synced_at
  `).run(propertyId, reportType, dateRange, JSON.stringify(data), now);
}

// ----------------------------------------------------
// VERSION 3.5.297: CLIENT SHOWCASE / OUR WORK HELPERS
// ----------------------------------------------------

export interface ClientRecord {
  id: number;
  client_name: string;
  website_url: string;
  logo_url: string;
  hero_preview_url: string;
  service_category: string;
  description: string;
  display_order: number;
  status: 'Draft' | 'Published';
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  client_name: string;
  website_url: string;
  logo_url?: string;
  hero_preview_url?: string;
  service_category?: string;
  description?: string;
  display_order?: number;
  status?: 'Draft' | 'Published';
}

export interface UpdateClientInput {
  client_name?: string;
  website_url?: string;
  logo_url?: string;
  hero_preview_url?: string;
  service_category?: string;
  description?: string;
  display_order?: number;
  status?: 'Draft' | 'Published';
}

export function getAllClients(): ClientRecord[] {
  const stmt = db.prepare('SELECT * FROM clients ORDER BY display_order ASC, created_at DESC');
  return stmt.all() as unknown as ClientRecord[];
}

export function getPublicClients(): ClientRecord[] {
  const stmt = db.prepare("SELECT id, client_name, website_url, logo_url, hero_preview_url, service_category, description, display_order FROM clients WHERE status = 'Published' ORDER BY display_order ASC, created_at DESC");
  return stmt.all() as unknown as ClientRecord[];
}

export async function getPublicClientsAsync(): Promise<ClientRecord[]> {
  // First query local SQLite
  let localClients = getPublicClients();
  if (localClients.length > 0) {
    return localClients;
  }

  // If local SQLite is empty (e.g. serverless cold start in Vercel /tmp or unhydrated instance), query Supabase directly
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/clients?status=eq.Published&select=*&order=display_order.asc,created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (res.ok) {
        const remoteClients = await res.json();
        if (Array.isArray(remoteClients) && remoteClients.length > 0) {
          // Hydrate local SQLite in background for subsequent requests
          for (const c of remoteClients) {
            try {
              db.prepare(`
                INSERT INTO clients (
                  id, client_name, website_url, logo_url, hero_preview_url,
                  service_category, description, display_order, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  client_name = excluded.client_name,
                  website_url = excluded.website_url,
                  logo_url = excluded.logo_url,
                  hero_preview_url = excluded.hero_preview_url,
                  service_category = excluded.service_category,
                  description = excluded.description,
                  display_order = excluded.display_order,
                  status = excluded.status,
                  updated_at = excluded.updated_at
              `).run(
                c.id, c.client_name, c.website_url, c.logo_url || '', c.hero_preview_url || '',
                c.service_category || '', c.description || '', c.display_order || 0,
                c.status || 'Draft', c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString()
              );
            } catch {}
          }
          return remoteClients;
        }
      }
    } catch (err) {
      console.warn('[getPublicClientsAsync Supabase fallback error]:', err);
    }
  }

  return localClients;
}

export function getClientById(id: number): ClientRecord | null {
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
  const res = stmt.get(id);
  return (res as unknown as ClientRecord) || null;
}

export function createClient(input: CreateClientInput): ClientRecord {
  const now = new Date().toISOString();
  
  // Auto-assign display order to be at the end if not provided
  let order = input.display_order;
  if (order === undefined || isNaN(order)) {
    const maxOrderRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM clients').get() as { maxOrder: number | null };
    order = (maxOrderRow?.maxOrder ?? -1) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO clients (
      client_name, website_url, logo_url, hero_preview_url,
      service_category, description, display_order, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    input.client_name.trim(),
    input.website_url.trim(),
    (input.logo_url || '').trim(),
    (input.hero_preview_url || '').trim(),
    (input.service_category || '').trim(),
    (input.description || '').trim(),
    order,
    input.status === 'Published' ? 'Published' : 'Draft',
    now,
    now
  );

  const lastId = Number(info.lastInsertRowid);
  const created = getClientById(lastId)!;
  return created;
}

export function updateClient(id: number, input: UpdateClientInput): ClientRecord | null {
  const existing = getClientById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedName = input.client_name !== undefined ? input.client_name.trim() : existing.client_name;
  const updatedUrl = input.website_url !== undefined ? input.website_url.trim() : existing.website_url;
  const updatedLogo = input.logo_url !== undefined ? input.logo_url.trim() : existing.logo_url;
  const updatedHero = input.hero_preview_url !== undefined ? input.hero_preview_url.trim() : existing.hero_preview_url;
  const updatedCategory = input.service_category !== undefined ? input.service_category.trim() : existing.service_category;
  const updatedDesc = input.description !== undefined ? input.description.trim() : existing.description;
  const updatedOrder = input.display_order !== undefined && !isNaN(input.display_order) ? input.display_order : existing.display_order;
  const updatedStatus = input.status !== undefined ? (input.status === 'Published' ? 'Published' : 'Draft') : existing.status;

  db.prepare(`
    UPDATE clients SET
      client_name = ?,
      website_url = ?,
      logo_url = ?,
      hero_preview_url = ?,
      service_category = ?,
      description = ?,
      display_order = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updatedName,
    updatedUrl,
    updatedLogo,
    updatedHero,
    updatedCategory,
    updatedDesc,
    updatedOrder,
    updatedStatus,
    now,
    id
  );

  const updated = getClientById(id);
  return updated;
}

export function deleteClient(id: number): boolean {
  const res = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  const ok = res.changes > 0;
  return ok;
}

export function reorderClients(orderedIds: number[]): boolean {
  const updateStmt = db.prepare('UPDATE clients SET display_order = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();
  
  for (let i = 0; i < orderedIds.length; i++) {
    updateStmt.run(i, now, orderedIds[i]);
  }
  return true;
}

// ----------------------------------------------------
// VERSION 8.4.0: DYNAMIC PRODUCTS & SHOWCASES CMS
// ----------------------------------------------------

export interface ShowcaseRecord {
  id: number;
  title: string;
  slug: string;
  card_heading: string;
  full_heading: string;
  short_description: string;
  detailed_description: string;
  category: string;
  tagline: string;
  display_order: number;
  is_featured: number;
  is_visible: number;
  status: 'Live' | 'In Development' | 'Coming Soon';
  launch_date: string;
  project_url: string;
  link_label: string;
  is_link_enabled: number;
  open_in_new_tab: number;
  inquiry_service: string;
  screenshot_url: string;
  screenshot_source_url: string;
  screenshot_captured_at: string | null;
  screenshot_alt: string;
  features: string;
  workflow_steps: string;
  capabilities: string;
  benefits: string;
  tech_stack: string;
  intended_audience: string;
  use_cases: string;
  project_challenges: string;
  implementation_approach: string;
  outcome_results: string;
  gallery_images: string;
  faq_items: string;
  publication_status: 'Draft' | 'Published' | 'Archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShowcaseInput {
  title: string;
  slug?: string;
  card_heading?: string;
  full_heading?: string;
  short_description: string;
  detailed_description?: string;
  category?: string;
  tagline?: string;
  display_order?: number;
  is_featured?: boolean | number;
  is_visible?: boolean | number;
  status?: 'Live' | 'In Development' | 'Coming Soon';
  launch_date?: string;
  project_url?: string;
  link_label?: string;
  is_link_enabled?: boolean | number;
  open_in_new_tab?: boolean | number;
  inquiry_service?: string;
  screenshot_url?: string;
  screenshot_source_url?: string;
  screenshot_captured_at?: string | null;
  screenshot_alt?: string;
  features?: any[] | string;
  workflow_steps?: any[] | string;
  capabilities?: any[] | string;
  benefits?: any[] | string;
  tech_stack?: any[] | string;
  intended_audience?: string;
  use_cases?: any[] | string;
  project_challenges?: string;
  implementation_approach?: string;
  outcome_results?: string;
  gallery_images?: any[] | string;
  faq_items?: any[] | string;
  publication_status?: 'Draft' | 'Published' | 'Archived';
}

export type UpdateShowcaseInput = Partial<CreateShowcaseInput>;

function parseJsonSafe<T>(val: any, fallback: T): T {
  if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
    return val as T;
  }
  if (typeof val === 'string' && val.trim()) {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function normalizeShowcaseRecord(r: any): any {
  if (!r) return null;
  const features = parseJsonSafe(r.features, []);
  const workflow_steps = parseJsonSafe(r.workflow_steps, []);
  const tech_stack = parseJsonSafe(r.tech_stack, []);
  const capabilities = parseJsonSafe(r.capabilities, []);
  const benefits = parseJsonSafe(r.benefits, []);
  const use_cases = parseJsonSafe(r.use_cases, []);
  const gallery_images = parseJsonSafe(r.gallery_images, []);
  const faq_items = parseJsonSafe(r.faq_items, []);

  return {
    ...r,
    description: r.short_description || '',
    long_description: r.detailed_description || '',
    subtitle: r.card_heading || '',
    badge: r.tagline || '',
    website_url: r.project_url || '',
    demo_url: r.project_url || '',
    screenshot_thumbnail_url: r.screenshot_url || '',
    estimated_launch_date: r.launch_date || '',
    features,
    workflow_steps,
    tech_stack,
    capabilities,
    benefits,
    use_cases,
    tags: capabilities.length > 0 ? capabilities : use_cases,
    gallery_images,
    faq_items,
    is_featured: Boolean(r.is_featured),
    client_inquiry_enabled: Boolean(r.is_link_enabled),
    publication_status: r.publication_status ? r.publication_status.toLowerCase() : 'published'
  };
}

export function getAllShowcases(params: {
  search?: string;
  status?: string;
  category?: string;
  publication_status?: string;
  sortBy?: 'order' | 'updated' | 'title' | string;
} = {}): ShowcaseRecord[] {
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

  if (params.publication_status && params.publication_status !== 'All') {
    whereClauses.push('LOWER(publication_status) = ?');
    queryArgs.push(params.publication_status.toLowerCase());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(title) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(short_description) LIKE ? OR LOWER(category) LIKE ?)');
    queryArgs.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  let orderSql = 'ORDER BY display_order ASC, created_at DESC';
  if (params.sortBy === 'updated' || params.sortBy === 'newest') {
    orderSql = 'ORDER BY updated_at DESC';
  } else if (params.sortBy === 'title') {
    orderSql = 'ORDER BY title ASC';
  }

  const stmt = db.prepare(`SELECT * FROM showcases ${whereSql} ${orderSql}`);
  const rows = stmt.all(...queryArgs) as any[];
  return rows.map(normalizeShowcaseRecord);
}

export function getPublicShowcases(params: { category?: string } = {}): ShowcaseRecord[] {
  let whereSql = "WHERE LOWER(publication_status) = 'published' AND is_visible = 1";
  let queryArgs: (string | number)[] = [];

  if (params.category && params.category !== 'All') {
    whereSql += ' AND category = ?';
    queryArgs.push(params.category);
  }

  const stmt = db.prepare(`
    SELECT * FROM showcases ${whereSql} ORDER BY display_order ASC, created_at DESC
  `);
  const rows = stmt.all(...queryArgs) as any[];
  return rows.map(normalizeShowcaseRecord);
}

export async function getPublicShowcasesAsync(params: { category?: string } = {}): Promise<ShowcaseRecord[]> {
  const local = getPublicShowcases(params);
  if (local.length > 0) return local;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (supabaseUrl && supabaseKey) {
    try {
      let query = `${supabaseUrl}/rest/v1/showcases?publication_status=eq.Published&is_visible=eq.1&order=display_order.asc,created_at.desc`;
      if (params.category && params.category !== 'All') {
        query += `&category=eq.${encodeURIComponent(params.category)}`;
      }
      const res = await fetch(query, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote) && remote.length > 0) {
          return remote.map(normalizeShowcaseRecord);
        }
      }
    } catch (err) {
      console.warn('[getPublicShowcasesAsync Supabase query error]:', err);
    }
  }

  return local;
}

export function getShowcaseById(id: number): ShowcaseRecord | null {
  const stmt = db.prepare('SELECT * FROM showcases WHERE id = ?');
  const res = stmt.get(id);
  return normalizeShowcaseRecord(res);
}

export function getShowcaseBySlug(slug: string): ShowcaseRecord | null {
  const norm = slug.trim().toLowerCase();
  const stmt = db.prepare('SELECT * FROM showcases WHERE LOWER(slug) = ?');
  const res = stmt.get(norm);
  return normalizeShowcaseRecord(res);
}

function generateShowcaseSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'showcase';
  
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = db.prepare('SELECT id FROM showcases WHERE LOWER(slug) = ?').get(candidate);
    if (!existing) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

export function createShowcase(input: CreateShowcaseInput): ShowcaseRecord {
  const now = new Date().toISOString();
  const title = input.title.trim();
  const baseSlug = (input.slug && input.slug.trim()) ? input.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : generateShowcaseSlug(title);

  // Ensure slug uniqueness
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = db.prepare('SELECT id FROM showcases WHERE LOWER(slug) = ?').get(slug);
    if (!existing) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  let order = input.display_order;
  if (order === undefined || isNaN(order)) {
    const maxRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM showcases').get() as { maxOrder: number | null };
    order = (maxRow?.maxOrder ?? -1) + 1;
  }

  const isFeatured = input.is_featured ? 1 : 0;
  const isVisible = input.is_visible !== undefined ? (input.is_visible ? 1 : 0) : 1;
  const isLinkEnabled = input.is_link_enabled !== undefined
    ? (input.is_link_enabled ? 1 : 0)
    : ((input as any).client_inquiry_enabled !== undefined ? ((input as any).client_inquiry_enabled ? 1 : 0) : 1);
  const openInNewTab = input.open_in_new_tab !== undefined ? (input.open_in_new_tab ? 1 : 0) : 1;

  let pubStatus = input.publication_status || 'Published';
  if (pubStatus.toLowerCase() === 'published') pubStatus = 'Published';
  else if (pubStatus.toLowerCase() === 'draft') pubStatus = 'Draft';
  else if (pubStatus.toLowerCase() === 'archived') pubStatus = 'Archived';

  const publishedAt = pubStatus === 'Published' ? now : null;

  const shortDesc = (input.short_description || (input as any).description || '').trim();
  const detailedDesc = (input.detailed_description || (input as any).long_description || '').trim();
  const cardHeading = (input.card_heading || (input as any).subtitle || '').trim();
  const tagline = (input.tagline || (input as any).badge || '').trim();
  const projectUrl = (input.project_url || (input as any).website_url || (input as any).demo_url || '').trim();
  const launchDate = (input.launch_date || (input as any).estimated_launch_date || '').trim();
  const screenshotUrl = (input.screenshot_url || (input as any).screenshot_thumbnail_url || '').trim();

  const featuresStr = typeof input.features === 'string' ? input.features : JSON.stringify(input.features || []);
  const workflowStr = typeof input.workflow_steps === 'string' ? input.workflow_steps : JSON.stringify(input.workflow_steps || []);
  const capabilitiesStr = typeof input.capabilities === 'string' ? input.capabilities : JSON.stringify(input.capabilities || (input as any).tags || []);
  const benefitsStr = typeof input.benefits === 'string' ? input.benefits : JSON.stringify(input.benefits || []);
  const techStackStr = typeof input.tech_stack === 'string' ? input.tech_stack : JSON.stringify(input.tech_stack || []);
  const useCasesStr = typeof input.use_cases === 'string' ? input.use_cases : JSON.stringify(input.use_cases || (input as any).tags || []);
  const galleryStr = typeof input.gallery_images === 'string' ? input.gallery_images : JSON.stringify(input.gallery_images || []);
  const faqStr = typeof input.faq_items === 'string' ? input.faq_items : JSON.stringify(input.faq_items || []);

  const stmt = db.prepare(`
    INSERT INTO showcases (
      title, slug, card_heading, full_heading, short_description, detailed_description,
      category, tagline, display_order, is_featured, is_visible, status, launch_date,
      project_url, link_label, is_link_enabled, open_in_new_tab, inquiry_service,
      screenshot_url, screenshot_source_url, screenshot_captured_at, screenshot_alt,
      features, workflow_steps, capabilities, benefits, tech_stack, intended_audience,
      use_cases, project_challenges, implementation_approach, outcome_results,
      gallery_images, faq_items, publication_status, published_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const info = stmt.run(
    title,
    slug,
    cardHeading,
    (input.full_heading || '').trim(),
    shortDesc,
    detailedDesc,
    (input.category || 'Automation & Operations').trim(),
    tagline,
    order,
    isFeatured,
    isVisible,
    input.status || 'In Development',
    launchDate,
    projectUrl,
    (input.link_label || 'Explore Live Demo').trim(),
    isLinkEnabled,
    openInNewTab,
    (input.inquiry_service || 'Website Design & Development').trim(),
    screenshotUrl,
    (input.screenshot_source_url || '').trim(),
    input.screenshot_captured_at || (screenshotUrl ? now : null),
    (input.screenshot_alt || `${title} concept showcase`).trim(),
    featuresStr,
    workflowStr,
    capabilitiesStr,
    benefitsStr,
    techStackStr,
    (input.intended_audience || '').trim(),
    useCasesStr,
    (input.project_challenges || '').trim(),
    (input.implementation_approach || '').trim(),
    (input.outcome_results || '').trim(),
    galleryStr,
    faqStr,
    pubStatus,
    publishedAt,
    now,
    now
  );

  return getShowcaseById(Number(info.lastInsertRowid))!;
}

export function updateShowcase(id: number, input: UpdateShowcaseInput): ShowcaseRecord | null {
  const current = getShowcaseById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const title = input.title !== undefined ? input.title.trim() : current.title;
  let slug = current.slug;
  if (input.slug !== undefined && input.slug.trim()) {
    const desired = input.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = db.prepare('SELECT id FROM showcases WHERE LOWER(slug) = ? AND id != ?').get(desired, id);
    if (!existing) {
      slug = desired;
    }
  }

  const cardHeading = input.card_heading !== undefined
    ? input.card_heading.trim()
    : ((input as any).subtitle !== undefined ? ((input as any).subtitle || '').trim() : current.card_heading);
  const fullHeading = input.full_heading !== undefined ? input.full_heading.trim() : current.full_heading;
  const shortDesc = input.short_description !== undefined
    ? input.short_description.trim()
    : ((input as any).description !== undefined ? ((input as any).description || '').trim() : current.short_description);
  const detailedDesc = input.detailed_description !== undefined
    ? input.detailed_description.trim()
    : ((input as any).long_description !== undefined ? ((input as any).long_description || '').trim() : current.detailed_description);
  const category = input.category !== undefined ? input.category.trim() : current.category;
  const tagline = input.tagline !== undefined
    ? input.tagline.trim()
    : ((input as any).badge !== undefined ? ((input as any).badge || '').trim() : current.tagline);
  const displayOrder = input.display_order !== undefined ? Number(input.display_order) : (current.display_order || 0);
  const isFeatured = input.is_featured !== undefined ? (input.is_featured ? 1 : 0) : (current.is_featured ? 1 : 0);
  const isVisible = input.is_visible !== undefined ? (input.is_visible ? 1 : 0) : (current.is_visible ? 1 : 0);
  const status = input.status !== undefined ? input.status : current.status;
  const launchDate = input.launch_date !== undefined
    ? input.launch_date.trim()
    : ((input as any).estimated_launch_date !== undefined ? ((input as any).estimated_launch_date || '').trim() : (current.launch_date || ''));
  const projectUrl = input.project_url !== undefined
    ? input.project_url.trim()
    : ((input as any).website_url !== undefined ? ((input as any).website_url || '').trim() : ((input as any).demo_url !== undefined ? ((input as any).demo_url || '').trim() : (current.project_url || '')));
  const linkLabel = input.link_label !== undefined ? input.link_label.trim() : (current.link_label || 'Explore Live Demo');
  const isLinkEnabled = input.is_link_enabled !== undefined
    ? (input.is_link_enabled ? 1 : 0)
    : ((input as any).client_inquiry_enabled !== undefined ? ((input as any).client_inquiry_enabled ? 1 : 0) : (current.is_link_enabled ? 1 : 0));
  const openInNewTab = input.open_in_new_tab !== undefined ? (input.open_in_new_tab ? 1 : 0) : (current.open_in_new_tab ? 1 : 0);
  const inquiryService = input.inquiry_service !== undefined ? input.inquiry_service.trim() : current.inquiry_service;
  const screenshotUrl = input.screenshot_url !== undefined
    ? input.screenshot_url.trim()
    : ((input as any).screenshot_thumbnail_url !== undefined ? ((input as any).screenshot_thumbnail_url || '').trim() : current.screenshot_url);
  const screenshotSourceUrl = input.screenshot_source_url !== undefined ? input.screenshot_source_url.trim() : current.screenshot_source_url;
  const screenshotCapturedAt = input.screenshot_captured_at !== undefined ? input.screenshot_captured_at : current.screenshot_captured_at;
  const screenshotAlt = input.screenshot_alt !== undefined ? input.screenshot_alt.trim() : current.screenshot_alt;

  const features = input.features !== undefined
    ? (typeof input.features === 'string' ? input.features : JSON.stringify(input.features))
    : (typeof current.features === 'string' ? current.features : JSON.stringify(current.features || []));
  const workflowSteps = input.workflow_steps !== undefined
    ? (typeof input.workflow_steps === 'string' ? input.workflow_steps : JSON.stringify(input.workflow_steps))
    : (typeof current.workflow_steps === 'string' ? current.workflow_steps : JSON.stringify(current.workflow_steps || []));
  const capabilities = input.capabilities !== undefined
    ? (typeof input.capabilities === 'string' ? input.capabilities : JSON.stringify(input.capabilities))
    : ((input as any).tags !== undefined ? JSON.stringify((input as any).tags) : (typeof current.capabilities === 'string' ? current.capabilities : JSON.stringify(current.capabilities || [])));
  const benefits = input.benefits !== undefined
    ? (typeof input.benefits === 'string' ? input.benefits : JSON.stringify(input.benefits))
    : (typeof current.benefits === 'string' ? current.benefits : JSON.stringify(current.benefits || []));
  const techStack = input.tech_stack !== undefined
    ? (typeof input.tech_stack === 'string' ? input.tech_stack : JSON.stringify(input.tech_stack))
    : (typeof current.tech_stack === 'string' ? current.tech_stack : JSON.stringify(current.tech_stack || []));
  const intendedAudience = input.intended_audience !== undefined ? input.intended_audience.trim() : (current.intended_audience || '');
  const useCases = input.use_cases !== undefined
    ? (typeof input.use_cases === 'string' ? input.use_cases : JSON.stringify(input.use_cases))
    : (typeof current.use_cases === 'string' ? current.use_cases : JSON.stringify(current.use_cases || []));
  const projectChallenges = input.project_challenges !== undefined ? input.project_challenges.trim() : (current.project_challenges || '');
  const implementationApproach = input.implementation_approach !== undefined ? input.implementation_approach.trim() : (current.implementation_approach || '');
  const outcomeResults = input.outcome_results !== undefined ? input.outcome_results.trim() : (current.outcome_results || '');
  const galleryImages = input.gallery_images !== undefined
    ? (typeof input.gallery_images === 'string' ? input.gallery_images : JSON.stringify(input.gallery_images))
    : (typeof current.gallery_images === 'string' ? current.gallery_images : JSON.stringify(current.gallery_images || []));
  const faqItems = input.faq_items !== undefined
    ? (typeof input.faq_items === 'string' ? input.faq_items : JSON.stringify(input.faq_items))
    : (typeof current.faq_items === 'string' ? current.faq_items : JSON.stringify(current.faq_items || []));

  let publicationStatus = current.publication_status;
  let publishedAt = current.published_at;
  if (input.publication_status !== undefined) {
    const pLower = input.publication_status.toLowerCase();
    if (pLower === 'published') publicationStatus = 'Published';
    else if (pLower === 'draft') publicationStatus = 'Draft';
    else if (pLower === 'archived') publicationStatus = 'Archived';
    else publicationStatus = input.publication_status;

    if (pLower === 'published' && !publishedAt) {
      publishedAt = now;
    }
  }

  db.prepare(`
    UPDATE showcases SET
      title = ?, slug = ?, card_heading = ?, full_heading = ?, short_description = ?, detailed_description = ?,
      category = ?, tagline = ?, display_order = ?, is_featured = ?, is_visible = ?, status = ?, launch_date = ?,
      project_url = ?, link_label = ?, is_link_enabled = ?, open_in_new_tab = ?, inquiry_service = ?,
      screenshot_url = ?, screenshot_source_url = ?, screenshot_captured_at = ?, screenshot_alt = ?,
      features = ?, workflow_steps = ?, capabilities = ?, benefits = ?, tech_stack = ?, intended_audience = ?,
      use_cases = ?, project_challenges = ?, implementation_approach = ?, outcome_results = ?,
      gallery_images = ?, faq_items = ?, publication_status = ?, published_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title, slug, cardHeading, fullHeading, shortDesc, detailedDesc,
    category, tagline, displayOrder, isFeatured, isVisible, status, launchDate,
    projectUrl, linkLabel, isLinkEnabled, openInNewTab, inquiryService,
    screenshotUrl, screenshotSourceUrl, screenshotCapturedAt, screenshotAlt,
    features, workflowSteps, capabilities, benefits, techStack, intendedAudience,
    useCases, projectChallenges, implementationApproach, outcomeResults,
    galleryImages, faqItems, publicationStatus, publishedAt, now,
    id
  );

  return getShowcaseById(id);
}

export function deleteShowcase(id: number): boolean {
  const res = db.prepare('DELETE FROM showcases WHERE id = ?').run(id);
  return res.changes > 0;
}

export function duplicateShowcase(id: number): ShowcaseRecord | null {
  const original = getShowcaseById(id);
  if (!original) return null;

  const newTitle = `${original.title} (Copy)`;
  const newSlug = generateShowcaseSlug(newTitle);

  return createShowcase({
    ...original,
    title: newTitle,
    slug: newSlug,
    publication_status: 'Draft',
    display_order: original.display_order + 1
  });
}

export function reorderShowcases(orderedIds: number[]): boolean {
  const updateStmt = db.prepare('UPDATE showcases SET display_order = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();

  for (let i = 0; i < orderedIds.length; i++) {
    updateStmt.run(i, now, orderedIds[i]);
  }
  return true;
}

// ----------------------------------------------------
// DURABLE OAUTH STATE MANAGEMENT (CROSS-SERVERLESS & ATOMIC)
// ----------------------------------------------------

export function createOAuthState(state: string, adminSessionId: string | null = null, ttlMs: number = 10 * 60 * 1000): void {
  const now = new Date().toISOString();
  const expiresAt = Date.now() + ttlMs;
  db.prepare(`
    INSERT INTO oauth_states (state, admin_session_id, expires_at, created_at, used_at)
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(state) DO UPDATE SET
      admin_session_id = excluded.admin_session_id,
      expires_at = excluded.expires_at,
      created_at = excluded.created_at,
      used_at = NULL
  `).run(state, adminSessionId, expiresAt, now);
}

export interface OAuthStateValidationResult {
  valid: boolean;
  reason: 'valid' | 'not_found' | 'expired' | 'already_used' | 'session_mismatch';
}

export function consumeOAuthState(state: string, expectedSessionId?: string | null): OAuthStateValidationResult {
  if (!state || typeof state !== 'string') {
    return { valid: false, reason: 'not_found' };
  }

  const row = db.prepare('SELECT state, admin_session_id, expires_at, used_at FROM oauth_states WHERE state = ?').get(state) as {
    state: string;
    admin_session_id: string | null;
    expires_at: number;
    used_at: string | null;
  } | undefined;

  if (!row) {
    return { valid: false, reason: 'not_found' };
  }

  if (row.used_at) {
    return { valid: false, reason: 'already_used' };
  }

  if (Date.now() > row.expires_at) {
    return { valid: false, reason: 'expired' };
  }

  // If bound to a session ID and an expected session ID is provided, verify match
  if (expectedSessionId && row.admin_session_id && row.admin_session_id !== expectedSessionId) {
    return { valid: false, reason: 'session_mismatch' };
  }

  // Atomically mark state as used
  const now = new Date().toISOString();
  const updateRes = db.prepare('UPDATE oauth_states SET used_at = ? WHERE state = ? AND used_at IS NULL').run(now, state);
  if (updateRes.changes === 0) {
    // Concurrent attempt consumed it first
    return { valid: false, reason: 'already_used' };
  }

  return { valid: true, reason: 'valid' };
}

export function cleanupExpiredOAuthStates(): void {
  try {
    const now = Date.now();
    db.prepare('DELETE FROM oauth_states WHERE expires_at < ? OR used_at IS NOT NULL').run(now);
  } catch {
    // Non-fatal
  }
}

// ----------------------------------------------------
// VERSION 8.3.0: AI CITATIONS, CTAS & EDITORIAL MAINTENANCE
// ----------------------------------------------------

export interface AiCitationObservationRecord {
  id: number;
  article_slug: string;
  source_ai: string;
  query_prompt: string;
  observed_date: string;
  citation_url: string;
  notes: string;
  recorded_by: string;
  created_at: string;
}

export function getAiCitationObservations(articleSlug?: string): AiCitationObservationRecord[] {
  if (articleSlug) {
    const stmt = db.prepare('SELECT * FROM ai_citation_observations WHERE article_slug = ? ORDER BY id DESC');
    return stmt.all(articleSlug) as unknown as AiCitationObservationRecord[];
  }
  const stmt = db.prepare('SELECT * FROM ai_citation_observations ORDER BY id DESC');
  return stmt.all() as unknown as AiCitationObservationRecord[];
}

export function createAiCitationObservation(input: {
  article_slug: string;
  source_ai: string;
  query_prompt: string;
  observed_date: string;
  citation_url?: string;
  notes?: string;
  recorded_by?: string;
}): AiCitationObservationRecord {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO ai_citation_observations (
      article_slug, source_ai, query_prompt, observed_date, citation_url, notes, recorded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    input.article_slug.trim(),
    input.source_ai.trim(),
    input.query_prompt.trim(),
    input.observed_date.trim(),
    (input.citation_url || '').trim(),
    (input.notes || '').trim(),
    (input.recorded_by || 'admin').trim(),
    now
  );
  return db.prepare('SELECT * FROM ai_citation_observations WHERE id = ?').get(Number(res.lastInsertRowid)) as unknown as AiCitationObservationRecord;
}

export function deleteAiCitationObservation(id: number): boolean {
  const stmt = db.prepare('DELETE FROM ai_citation_observations WHERE id = ?');
  const res = stmt.run(id);
  return Number(res.changes) > 0;
}

export interface ContextualCtaRecord {
  id: number;
  service_key: string;
  title: string;
  headline: string;
  description: string;
  button_text: string;
  target_url: string;
  is_active: number;
  scroll_threshold: number;
  dwell_time_seconds: number;
  updated_at: string;
}

export const DEFAULT_CONTEXTUAL_CTAS: Array<Omit<ContextualCtaRecord, 'id' | 'updated_at'>> = [
  {
    service_key: 'website-design',
    title: 'Custom Website Design & Engineering',
    headline: 'Ready to modernize your digital presence with zero technical debt?',
    description: 'Get a bespoke, conversion-architected website engineered for speed, mobile ergonomics, and local Coimbatore dominance.',
    button_text: 'Estimate Project in Calculator',
    target_url: '/website-cost-calculator',
    is_active: 1,
    scroll_threshold: 50,
    dwell_time_seconds: 20
  },
  {
    service_key: 'seo-services',
    title: 'Evidence-Based Technical & Local SEO',
    headline: 'Looking to turn organic search into an enduring customer acquisition channel?',
    description: 'Our technical SEO audits eliminate indexing blocks, accelerate Core Web Vitals, and build verifiable local authority.',
    button_text: 'Request Strategic SEO Audit',
    target_url: '/services/seo-services#contact',
    is_active: 1,
    scroll_threshold: 50,
    dwell_time_seconds: 20
  },
  {
    service_key: 'ai-video-creation',
    title: 'High-Velocity AI Video Production',
    headline: 'Scale your marketing assets without expensive multi-week video shoots.',
    description: 'Broadcast-grade digital avatars, automated video localization, and product explainers engineered for high conversion.',
    button_text: 'Explore AI Video Packages',
    target_url: '/services/ai-video-creation',
    is_active: 1,
    scroll_threshold: 50,
    dwell_time_seconds: 20
  },
  {
    service_key: 'digital-marketing',
    title: 'Multi-Channel Growth & Demand Gen',
    headline: 'Drive measurable ROI with privacy-first attribution & funnel architecture.',
    description: 'Data-driven paid media, Google Ads optimization, and audience retention strategies designed for sustainable revenue.',
    button_text: 'Book Strategy Consultation',
    target_url: '/services/digital-marketing#contact',
    is_active: 1,
    scroll_threshold: 50,
    dwell_time_seconds: 20
  }
];

export function getContextualCtaConfigs(): ContextualCtaRecord[] {
  const stmt = db.prepare('SELECT * FROM contextual_cta_configs ORDER BY id ASC');
  const rows = stmt.all() as unknown as ContextualCtaRecord[];
  if (rows.length === 0) {
    // Seed default CTAs if empty
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO contextual_cta_configs (
        service_key, title, headline, description, button_text, target_url, is_active, scroll_threshold, dwell_time_seconds, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const d of DEFAULT_CONTEXTUAL_CTAS) {
      insertStmt.run(d.service_key, d.title, d.headline, d.description, d.button_text, d.target_url, d.is_active, d.scroll_threshold, d.dwell_time_seconds, now);
    }
    return db.prepare('SELECT * FROM contextual_cta_configs ORDER BY id ASC').all() as unknown as ContextualCtaRecord[];
  }
  return rows;
}

export function upsertContextualCtaConfig(input: Partial<ContextualCtaRecord> & { service_key: string }): ContextualCtaRecord {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM contextual_cta_configs WHERE service_key = ?').get(input.service_key) as ContextualCtaRecord | undefined;
  if (existing) {
    db.prepare(`
      UPDATE contextual_cta_configs SET
        title = ?, headline = ?, description = ?, button_text = ?, target_url = ?,
        is_active = ?, scroll_threshold = ?, dwell_time_seconds = ?, updated_at = ?
      WHERE service_key = ?
    `).run(
      input.title !== undefined ? input.title : existing.title,
      input.headline !== undefined ? input.headline : existing.headline,
      input.description !== undefined ? input.description : existing.description,
      input.button_text !== undefined ? input.button_text : existing.button_text,
      input.target_url !== undefined ? input.target_url : existing.target_url,
      input.is_active !== undefined ? (input.is_active ? 1 : 0) : existing.is_active,
      input.scroll_threshold !== undefined ? input.scroll_threshold : existing.scroll_threshold,
      input.dwell_time_seconds !== undefined ? input.dwell_time_seconds : existing.dwell_time_seconds,
      now,
      input.service_key
    );
  } else {
    db.prepare(`
      INSERT INTO contextual_cta_configs (
        service_key, title, headline, description, button_text, target_url, is_active, scroll_threshold, dwell_time_seconds, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.service_key,
      input.title || 'Specialized Service',
      input.headline || 'Work with Dawnexus',
      input.description || 'Request a customized strategic consultation.',
      input.button_text || 'Contact Us',
      input.target_url || '/#contact',
      input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
      input.scroll_threshold || 50,
      input.dwell_time_seconds || 20,
      now
    );
  }
  return db.prepare('SELECT * FROM contextual_cta_configs WHERE service_key = ?').get(input.service_key) as unknown as ContextualCtaRecord;
}

export function getBlogsRequiringReview(): Array<BlogRecord & { days_since_review: number; is_overdue: boolean }> {
  const published = db.prepare("SELECT * FROM blogs WHERE status = 'Published' ORDER BY id DESC").all() as unknown as BlogRecord[];
  const now = Date.now();

  return published.map(blog => {
    const referenceDate = blog.last_reviewed_at || blog.updated_at || blog.published_at || blog.created_at;
    const refMs = new Date(referenceDate).getTime();
    const daysSince = Math.floor((now - refMs) / (1000 * 60 * 60 * 24));
    const cycle = blog.review_cycle_days || 90;
    return {
      ...blog,
      days_since_review: daysSince,
      is_overdue: daysSince >= cycle
    };
  });
}

export function recordBlogReview(id: number, notes?: string): BlogRecord | null {
  const now = new Date().toISOString();
  const current = getBlogById(id);
  if (!current) return null;

  const editorialNote = notes
    ? (current.editorial_notes ? `${current.editorial_notes}\n[Review ${now.split('T')[0]}]: ${notes}` : `[Review ${now.split('T')[0]}]: ${notes}`)
    : current.editorial_notes;

  (db.prepare(`
    UPDATE blogs SET
      last_reviewed_at = ?,
      editorial_notes = ?,
      updated_at = ?
    WHERE id = ?
  `) as any).run(now, editorialNote, now, id);

  const updated = getBlogById(id)!;
  pushBlogToSupabase(updated).catch(() => {});
  return updated;
}

// Call initialization
initDatabase();



