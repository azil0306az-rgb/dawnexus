const { Client } = require('pg');
require('dotenv').config();

const sql = `
  -- Website Pages Table
  CREATE TABLE IF NOT EXISTS website_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    canonical_url VARCHAR(255) NOT NULL,
    hero_badge TEXT,
    hero_subtitle TEXT,
    hero_description TEXT,
    hero_primary_cta TEXT,
    hero_secondary_cta TEXT,
    capabilities_json JSONB DEFAULT '[]'::jsonb,
    process_steps_json JSONB DEFAULT '[]'::jsonb,
    packages_json JSONB DEFAULT '[]'::jsonb,
    faqs_json JSONB DEFAULT '[]'::jsonb,
    cta_section_json JSONB DEFAULT '{}'::jsonb,
    meta_title VARCHAR(255),
    meta_description TEXT,
    og_image TEXT,
    status VARCHAR(50) DEFAULT 'published',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Website Content Versions Table
  CREATE TABLE IF NOT EXISTS website_content_versions (
    id SERIAL PRIMARY KEY,
    page_slug VARCHAR(120) NOT NULL,
    version_number INT NOT NULL,
    content_json JSONB NOT NULL,
    change_summary TEXT,
    created_by VARCHAR(100) NOT NULL,
    is_published INT DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_website_versions_slug ON website_content_versions(page_slug, version_number);

  -- AI Optimization Proposals Table
  CREATE TABLE IF NOT EXISTS ai_optimization_proposals (
    id VARCHAR(100) PRIMARY KEY,
    page_slug VARCHAR(120) NOT NULL,
    problem_statement TEXT NOT NULL,
    evidence_json JSONB NOT NULL,
    hypothesis TEXT NOT NULL,
    proposed_changes_json JSONB NOT NULL,
    risk_assessment TEXT NOT NULL,
    confidence_score NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(100),
    published_version_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_proposals_status ON ai_optimization_proposals(status, page_slug);

  -- Optimization Experiments Table
  CREATE TABLE IF NOT EXISTS optimization_experiments (
    id VARCHAR(100) PRIMARY KEY,
    proposal_id VARCHAR(100),
    page_slug VARCHAR(120) NOT NULL,
    hypothesis TEXT NOT NULL,
    variant_json JSONB NOT NULL,
    primary_metric VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    baseline_metrics_json JSONB,
    variant_metrics_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Analytics Sessions Table
  CREATE TABLE IF NOT EXISTS analytics_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    visitor_id VARCHAR(100) NOT NULL,
    first_page VARCHAR(255) NOT NULL,
    last_page VARCHAR(255) NOT NULL,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    device_type VARCHAR(50) DEFAULT 'desktop',
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    is_bot INT DEFAULT 0,
    bot_reason TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT DEFAULT 0,
    page_count INT DEFAULT 1,
    is_bounce INT DEFAULT 0,
    has_converted INT DEFAULT 0,
    enquiry_ref_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions(visitor_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_sessions_bot ON analytics_sessions(is_bot);

  -- Analytics Events Table
  CREATE TABLE IF NOT EXISTS analytics_events (
    event_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    visitor_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    element_id VARCHAR(255),
    section_id VARCHAR(255),
    scroll_depth INT,
    viewport_width INT,
    viewport_height INT,
    x_pos NUMERIC(8,4),
    y_pos NUMERIC(8,4),
    properties_json JSONB DEFAULT '{}'::jsonb,
    is_bot INT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_events_path_type ON analytics_events(page_path, event_type);
  CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(timestamp DESC);

  -- Analytics Replay Chunks Table
  CREATE TABLE IF NOT EXISTS analytics_replay_chunks (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    chunk_index INT NOT NULL,
    events_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_replay_session ON analytics_replay_chunks(session_id, chunk_index);

  -- Analytics Aggregates Table
  CREATE TABLE IF NOT EXISTS analytics_aggregates (
    id SERIAL PRIMARY KEY,
    date VARCHAR(20) NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    views INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    sessions INT DEFAULT 0,
    bounces INT DEFAULT 0,
    conversions INT DEFAULT 0,
    avg_scroll_depth NUMERIC(5,2) DEFAULT 0,
    avg_duration_seconds NUMERIC(8,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_analytics_agg UNIQUE(date, page_path, device_type)
  );
  CREATE INDEX IF NOT EXISTS idx_analytics_agg_date ON analytics_aggregates(date DESC);

  -- Admin Audit Logs Table
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    details_json JSONB,
    ip_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action, created_at DESC);
`;

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL, executing schema migrations...');
  await client.query(sql);
  console.log('Successfully executed Version 6.1.3 PostgreSQL migrations!');
  await client.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

