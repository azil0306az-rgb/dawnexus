import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { seedInitialShowcases } from './showcaseSeeds.js';

// Resolve environment variables
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('[Supabase] Initialized client for:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Initialization error:', err);
  }
} else {
  console.warn('[Supabase] Disabled: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be configured.');
}

export function isSupabaseActive(): boolean {
  return !!supabase;
}

function assertSupabaseSuccess(error: { message?: string; code?: string } | null, operation: string): void {
  if (!error) return;
  const code = error.code ? ` (${error.code})` : '';
  throw new Error(`${operation} failed${code}: ${error.message || 'Unknown Supabase error'}`);
}

/**
 * Hydrates local SQLite storage from Supabase PostgreSQL on startup or cold start
 */
export async function syncFromSupabase(db: any): Promise<void> {
  if (!supabase) return;

  try {
    console.log('[Supabase Sync] Hydrating local store from Supabase PostgreSQL...');

    // 1. Sync Blogs
    const { data: blogs, error: blogErr } = await supabase
      .from('blogs')
      .select('*');

    assertSupabaseSuccess(blogErr, 'Blog synchronization');
    if (blogs) {
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM blogs').run();
      for (const blog of blogs) {
        db.prepare(`
          INSERT INTO blogs (
            id, title, slug, excerpt, content, featured_image, image_alt, author,
            category, tags, primary_keyword, secondary_keywords, target_location,
            search_intent, target_audience, target_questions, seo_title, meta_description,
            canonical_url, status, scheduled_at, published_at, publication_error,
            admin_notes, seo_report, content_revision,
            firsthand_observations, project_examples, case_studies, original_research_data,
            implementation_process, external_sources, limitations_lessons,
            author_role, author_bio, author_credentials, reviewer_name, editorial_notes,
            citation_answer_blocks, review_cycle_days, last_reviewed_at,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?
          )
          ON CONFLICT(slug) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            excerpt = excluded.excerpt,
            featured_image = excluded.featured_image,
            category = excluded.category,
            status = excluded.status,
            scheduled_at = excluded.scheduled_at,
            published_at = excluded.published_at,
            seo_report = excluded.seo_report,
            content_revision = excluded.content_revision,
            firsthand_observations = excluded.firsthand_observations,
            project_examples = excluded.project_examples,
            case_studies = excluded.case_studies,
            original_research_data = excluded.original_research_data,
            implementation_process = excluded.implementation_process,
            external_sources = excluded.external_sources,
            limitations_lessons = excluded.limitations_lessons,
            author_role = excluded.author_role,
            author_bio = excluded.author_bio,
            author_credentials = excluded.author_credentials,
            reviewer_name = excluded.reviewer_name,
            editorial_notes = excluded.editorial_notes,
            citation_answer_blocks = excluded.citation_answer_blocks,
            review_cycle_days = excluded.review_cycle_days,
            last_reviewed_at = excluded.last_reviewed_at,
            updated_at = excluded.updated_at
        `).run(
          blog.id, blog.title, blog.slug, blog.excerpt || '', blog.content || '',
          blog.featured_image || '', blog.image_alt || '', blog.author || 'Dawnexus Editorial',
          blog.category || 'Digital Strategy', blog.tags || '[]', blog.primary_keyword || '',
          blog.secondary_keywords || '[]', blog.target_location || '', blog.search_intent || 'Informational',
          blog.target_audience || '', blog.target_questions || '[]', blog.seo_title || '',
          blog.meta_description || '', blog.canonical_url || '', blog.status || 'Draft',
          blog.scheduled_at || null, blog.published_at || null, blog.publication_error || '',
          blog.admin_notes || '', blog.seo_report || null, blog.content_revision || null,
          blog.firsthand_observations || '', blog.project_examples || '', blog.case_studies || '',
          blog.original_research_data || '', blog.implementation_process || '',
          typeof blog.external_sources === 'string' ? blog.external_sources : JSON.stringify(blog.external_sources || []),
          blog.limitations_lessons || '',
          blog.author_role || 'Technical Architect & SEO Strategist',
          blog.author_bio || '', blog.author_credentials || '',
          blog.reviewer_name || '', blog.editorial_notes || '',
          typeof blog.citation_answer_blocks === 'string' ? blog.citation_answer_blocks : JSON.stringify(blog.citation_answer_blocks || []),
          blog.review_cycle_days || 90, blog.last_reviewed_at || null,
          blog.created_at || new Date().toISOString(), blog.updated_at || new Date().toISOString()
        );
      }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      console.log(`[Supabase Sync] Hydrated ${blogs.length} blogs.`);
    }

    // 2. Sync Clients (Our Work)
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('*');

    assertSupabaseSuccess(clientErr, 'Client synchronization');
    if (clients) {
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM clients').run();
      for (const c of clients) {
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
      }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      console.log(`[Supabase Sync] Hydrated ${clients.length} clients.`);
    }

    // 2b. Sync Showcases (Dynamic Products & Showcases CMS)
    try {
      const { data: remoteShowcases, error: showcaseErr } = await supabase
        .from('showcases')
        .select('*')
        .order('display_order', { ascending: true });

      if (remoteShowcases && remoteShowcases.length >= 11) {
        db.exec('BEGIN TRANSACTION');
        try {
          db.prepare('DELETE FROM showcases').run();
          const insertStmt = db.prepare(`
            INSERT INTO showcases (
              id, title, slug, card_heading, full_heading, short_description, detailed_description,
              category, tagline, display_order, is_featured, is_visible, status, launch_date,
              project_url, link_label, is_link_enabled, open_in_new_tab, inquiry_service,
              screenshot_url, screenshot_source_url, screenshot_captured_at, screenshot_alt,
              features, workflow_steps, capabilities, benefits, tech_stack, intended_audience,
              use_cases, project_challenges, implementation_approach, outcome_results,
              gallery_images, faq_items, publication_status, published_at, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?
            )
          `);

          for (const s of remoteShowcases) {
            insertStmt.run(
              s.id, s.title, s.slug, s.card_heading || '', s.full_heading || '',
              s.short_description || '', s.detailed_description || '', s.category || '',
              s.tagline || '', s.display_order || 0, s.is_featured ? 1 : 0,
              s.is_visible !== undefined ? (s.is_visible ? 1 : 0) : 1, s.status || 'In Development',
              s.launch_date || '', s.project_url || '', s.link_label || 'Explore Live Demo',
              s.is_link_enabled !== undefined ? (s.is_link_enabled ? 1 : 0) : 1,
              s.open_in_new_tab !== undefined ? (s.open_in_new_tab ? 1 : 0) : 1,
              s.inquiry_service || '', s.screenshot_url || '', s.screenshot_source_url || '',
              s.screenshot_captured_at || null, s.screenshot_alt || '',
              typeof s.features === 'string' ? s.features : JSON.stringify(s.features || []),
              typeof s.workflow_steps === 'string' ? s.workflow_steps : JSON.stringify(s.workflow_steps || []),
              typeof s.capabilities === 'string' ? s.capabilities : JSON.stringify(s.capabilities || []),
              typeof s.benefits === 'string' ? s.benefits : JSON.stringify(s.benefits || []),
              typeof s.tech_stack === 'string' ? s.tech_stack : JSON.stringify(s.tech_stack || []),
              s.intended_audience || '',
              typeof s.use_cases === 'string' ? s.use_cases : JSON.stringify(s.use_cases || []),
              s.project_challenges || '', s.implementation_approach || '', s.outcome_results || '',
              typeof s.gallery_images === 'string' ? s.gallery_images : JSON.stringify(s.gallery_images || []),
              typeof s.faq_items === 'string' ? s.faq_items : JSON.stringify(s.faq_items || []),
              s.publication_status || 'Published', s.published_at || null,
              s.created_at || new Date().toISOString(), s.updated_at || new Date().toISOString()
            );
          }
          db.exec('COMMIT');
          console.log(`[Supabase Sync] Hydrated ${remoteShowcases.length} showcases.`);
        } catch (txErr) {
          db.exec('ROLLBACK');
          throw txErr;
        }
      } else {
        // Remote table has fewer than 11 seed showcases or is empty.
        // First ensure initial showcase seeds exist locally
        seedInitialShowcases(db);

        // If remote has any records, upsert them locally
        if (remoteShowcases && remoteShowcases.length > 0) {
          for (const s of remoteShowcases) {
            db.prepare(`
              INSERT INTO showcases (
                id, title, slug, card_heading, full_heading, short_description, detailed_description,
                category, tagline, display_order, is_featured, is_visible, status, launch_date,
                project_url, link_label, is_link_enabled, open_in_new_tab, inquiry_service,
                screenshot_url, screenshot_source_url, screenshot_captured_at, screenshot_alt,
                features, workflow_steps, capabilities, benefits, tech_stack, intended_audience,
                use_cases, project_challenges, implementation_approach, outcome_results,
                gallery_images, faq_items, publication_status, published_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(slug) DO UPDATE SET
                title = excluded.title,
                short_description = excluded.short_description,
                detailed_description = excluded.detailed_description,
                category = excluded.category,
                status = excluded.status,
                publication_status = excluded.publication_status,
                updated_at = excluded.updated_at
            `).run(
              s.id, s.title, s.slug, s.card_heading || '', s.full_heading || '',
              s.short_description || '', s.detailed_description || '', s.category || '',
              s.tagline || '', s.display_order || 0, s.is_featured ? 1 : 0,
              s.is_visible !== undefined ? (s.is_visible ? 1 : 0) : 1, s.status || 'In Development',
              s.launch_date || '', s.project_url || '', s.link_label || 'Explore Live Demo',
              s.is_link_enabled !== undefined ? (s.is_link_enabled ? 1 : 0) : 1,
              s.open_in_new_tab !== undefined ? (s.open_in_new_tab ? 1 : 0) : 1,
              s.inquiry_service || '', s.screenshot_url || '', s.screenshot_source_url || '',
              s.screenshot_captured_at || null, s.screenshot_alt || '',
              typeof s.features === 'string' ? s.features : JSON.stringify(s.features || []),
              typeof s.workflow_steps === 'string' ? s.workflow_steps : JSON.stringify(s.workflow_steps || []),
              typeof s.capabilities === 'string' ? s.capabilities : JSON.stringify(s.capabilities || []),
              typeof s.benefits === 'string' ? s.benefits : JSON.stringify(s.benefits || []),
              typeof s.tech_stack === 'string' ? s.tech_stack : JSON.stringify(s.tech_stack || []),
              s.intended_audience || '',
              typeof s.use_cases === 'string' ? s.use_cases : JSON.stringify(s.use_cases || []),
              s.project_challenges || '', s.implementation_approach || '', s.outcome_results || '',
              typeof s.gallery_images === 'string' ? s.gallery_images : JSON.stringify(s.gallery_images || []),
              typeof s.faq_items === 'string' ? s.faq_items : JSON.stringify(s.faq_items || []),
              s.publication_status || 'Published', s.published_at || null,
              s.created_at || new Date().toISOString(), s.updated_at || new Date().toISOString()
            );
          }
        }

        // Now push all local showcases to remote Supabase PostgreSQL so it gets fully populated with all 11+ items!
        const localShowcases = db.prepare('SELECT * FROM showcases ORDER BY display_order ASC').all() as any[];
        console.log(`[Supabase Sync] Syncing ${localShowcases.length} local showcases to remote Supabase PostgreSQL...`);
        for (const s of localShowcases) {
          await pushShowcaseToSupabase(s).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Notice]: Showcases hydration skipped:', err?.message || err);
    }

    // 3. Sync Notification Settings
    const { data: notifData } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (notifData) {
      db.prepare(`
        INSERT INTO notification_settings (id, active_email, is_verified, verified_at, pending_email, updated_at)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          active_email = excluded.active_email,
          is_verified = excluded.is_verified,
          verified_at = excluded.verified_at,
          pending_email = excluded.pending_email,
          updated_at = excluded.updated_at
      `).run(
        notifData.active_email,
        notifData.is_verified ? 1 : 0,
        notifData.verified_at,
        notifData.pending_email,
        notifData.updated_at || new Date().toISOString()
      );
      console.log('[Supabase Sync] Hydrated notification settings.');
    }

    // 4. Sync Enquiries
    const { data: enquiries, error: enquiryErr } = await supabase
      .from('enquiries')
      .select('*')
      .order('id', { ascending: false })
      .limit(200);

    assertSupabaseSuccess(enquiryErr, 'Enquiry synchronization');
    if (enquiries) {
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM enquiries').run();
      for (const enq of enquiries) {
        db.prepare(`
          INSERT INTO enquiries (
            id, full_name, business_name, email, phone, requested_services,
            budget, project_details, status, admin_notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            admin_notes = excluded.admin_notes,
            updated_at = excluded.updated_at
        `).run(
          enq.id, enq.full_name, enq.business_name || '', enq.email, enq.phone || '',
          enq.requested_services, enq.budget || '', enq.project_details,
          enq.status || 'New', enq.admin_notes || '', enq.created_at, enq.updated_at
        );
      }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      console.log(`[Supabase Sync] Hydrated ${enquiries.length} enquiries.`);
    }

    // 5. Sync Calculator Pricing Config
    try {
      const { data: calcConfig } = await supabase
        .from('calculator_pricing_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (calcConfig && calcConfig.config_json) {
        const cfgObj = typeof calcConfig.config_json === 'string'
          ? calcConfig.config_json
          : JSON.stringify(calcConfig.config_json);
        db.prepare(`
          INSERT INTO calculator_pricing_config (id, config_json, version, updated_at)
          VALUES (1, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            config_json = excluded.config_json,
            version = excluded.version,
            updated_at = excluded.updated_at
        `).run(cfgObj, calcConfig.version || 1, calcConfig.updated_at || new Date().toISOString());
        console.log('[Supabase Sync] Hydrated calculator pricing config.');
      }
    } catch (calcErr) {
      console.warn('[Supabase Sync Calculator Notice]:', calcErr);
    }

    // 6. Sync SEO Research Connection
    try {
      const { data: seoConn } = await supabase
        .from('seo_research_connections')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (seoConn) {
        db.prepare(`
          INSERT INTO seo_research_connections (
            id, google_email, encrypted_tokens, selected_property,
            last_sync_at, last_attempt_at, last_error, connection_status,
            selected_ga4_property, selected_ga4_property_name,
            ga4_last_sync_at, ga4_last_attempt_at, ga4_last_error, ga4_connection_status,
            updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            google_email = excluded.google_email,
            encrypted_tokens = excluded.encrypted_tokens,
            selected_property = excluded.selected_property,
            last_sync_at = excluded.last_sync_at,
            last_attempt_at = excluded.last_attempt_at,
            last_error = excluded.last_error,
            connection_status = excluded.connection_status,
            selected_ga4_property = excluded.selected_ga4_property,
            selected_ga4_property_name = excluded.selected_ga4_property_name,
            ga4_last_sync_at = excluded.ga4_last_sync_at,
            ga4_last_attempt_at = excluded.ga4_last_attempt_at,
            ga4_last_error = excluded.ga4_last_error,
            ga4_connection_status = excluded.ga4_connection_status,
            updated_at = excluded.updated_at
        `).run(
          seoConn.google_email,
          seoConn.encrypted_tokens,
          seoConn.selected_property,
          seoConn.last_sync_at,
          seoConn.last_attempt_at,
          seoConn.last_error,
          seoConn.connection_status || 'Disconnected',
          seoConn.selected_ga4_property || null,
          seoConn.selected_ga4_property_name || null,
          seoConn.ga4_last_sync_at || null,
          seoConn.ga4_last_attempt_at || null,
          seoConn.ga4_last_error || null,
          seoConn.ga4_connection_status || 'Disconnected',
          seoConn.updated_at || new Date().toISOString()
        );
        console.log('[Supabase Sync] Hydrated SEO research connection.');
      }
    } catch (seoErr) {
      console.warn('[Supabase Sync SEO Notice]:', seoErr);
    }

    // 7. Sync Website Pages (Version 6.1.3 authoritative content)
    try {
      const { data: pages } = await supabase
        .from('website_pages')
        .select('*');

      if (pages && Array.isArray(pages) && pages.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO website_pages (
            slug, title, canonical_url, hero_badge, hero_subtitle, hero_description,
            hero_primary_cta, hero_secondary_cta, capabilities_json, process_steps_json,
            packages_json, faqs_json, cta_section_json, meta_title, meta_description,
            og_image, status, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            title = excluded.title,
            canonical_url = excluded.canonical_url,
            hero_badge = excluded.hero_badge,
            hero_subtitle = excluded.hero_subtitle,
            hero_description = excluded.hero_description,
            hero_primary_cta = excluded.hero_primary_cta,
            hero_secondary_cta = excluded.hero_secondary_cta,
            capabilities_json = excluded.capabilities_json,
            process_steps_json = excluded.process_steps_json,
            packages_json = excluded.packages_json,
            faqs_json = excluded.faqs_json,
            cta_section_json = excluded.cta_section_json,
            meta_title = excluded.meta_title,
            meta_description = excluded.meta_description,
            og_image = excluded.og_image,
            status = excluded.status,
            version = excluded.version,
            updated_at = excluded.updated_at
        `);

        for (const p of pages) {
          stmt.run(
            p.slug,
            p.title,
            p.canonical_url,
            p.hero_badge,
            p.hero_subtitle,
            p.hero_description,
            p.hero_primary_cta,
            p.hero_secondary_cta,
            typeof p.capabilities_json === 'string' ? p.capabilities_json : JSON.stringify(p.capabilities_json || []),
            typeof p.process_steps_json === 'string' ? p.process_steps_json : JSON.stringify(p.process_steps_json || []),
            typeof p.packages_json === 'string' ? p.packages_json : JSON.stringify(p.packages_json || []),
            typeof p.faqs_json === 'string' ? p.faqs_json : JSON.stringify(p.faqs_json || []),
            typeof p.cta_section_json === 'string' ? p.cta_section_json : JSON.stringify(p.cta_section_json || {}),
            p.meta_title,
            p.meta_description,
            p.og_image,
            p.status || 'published',
            p.version || 1,
            p.created_at || new Date().toISOString(),
            p.updated_at || new Date().toISOString()
          );
        }
        console.log(`[Supabase Sync] Hydrated ${pages.length} website pages.`);
      }
    } catch (pageErr) {
      console.warn('[Supabase Sync Pages Notice]:', pageErr);
    }

    // 8. Sync SEO Categories (Version 7.1.8 dynamic categories)
    try {
      const { data: categories } = await supabase
        .from('seo_categories')
        .select('*');

      if (categories && Array.isArray(categories) && categories.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO seo_categories (
            id, name, slug, primary_keyword, secondary_keywords,
            target_audience, search_intent, instructions, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            name = excluded.name,
            primary_keyword = excluded.primary_keyword,
            secondary_keywords = excluded.secondary_keywords,
            target_audience = excluded.target_audience,
            search_intent = excluded.search_intent,
            instructions = excluded.instructions,
            updated_at = excluded.updated_at
        `);

        for (const c of categories) {
          stmt.run(
            c.id,
            c.name,
            c.slug,
            c.primary_keyword || '',
            typeof c.secondary_keywords === 'string' ? c.secondary_keywords : JSON.stringify(c.secondary_keywords || []),
            c.target_audience || '',
            c.search_intent || 'Commercial',
            c.instructions || '',
            c.created_at || new Date().toISOString(),
            c.updated_at || new Date().toISOString()
          );
        }
        console.log(`[Supabase Sync] Hydrated ${categories.length} SEO categories.`);
      }
    } catch {
      // Non-fatal if remote table does not exist yet
    }

    console.log('[Supabase Sync] Local database is fully synchronized with Supabase.');
  } catch (err) {
    console.warn('[Supabase Sync Error]:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// Asynchronous Supabase Write Sinks
// ----------------------------------------------------------------------

export async function pushEnquiryToSupabase(record: any): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for enquiry persistence.');
  const { error } = await supabase.from('enquiries').upsert({
      id: record.id,
      full_name: record.full_name,
      business_name: record.business_name || '',
      email: record.email,
      phone: record.phone || '',
      requested_services: record.requested_services,
      budget: record.budget || '',
      project_details: record.project_details,
      status: record.status || 'New',
      admin_notes: record.admin_notes || '',
      created_at: record.created_at,
      updated_at: record.updated_at
    });
  assertSupabaseSuccess(error, 'Enquiry persistence');
}

export async function updateEnquiryInSupabase(id: number, updates: any): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for enquiry updates.');
  const { error } = await supabase.from('enquiries').update({
      ...updates,
      updated_at: new Date().toISOString()
    }).eq('id', id);
  assertSupabaseSuccess(error, 'Enquiry update');
}

export async function deleteEnquiryFromSupabase(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for enquiry deletion.');
  const { error } = await supabase.from('enquiries').delete().eq('id', id);
  assertSupabaseSuccess(error, 'Enquiry deletion');
}

export async function pushBlogToSupabase(blog: any): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for blog persistence.');
  
  const basePayload: any = {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    featured_image: blog.featured_image || '',
    image_alt: blog.image_alt || '',
    author: blog.author || 'Dawnexus Editorial',
    category: blog.category || 'Digital Strategy',
    tags: typeof blog.tags === 'string' ? blog.tags : JSON.stringify(blog.tags || []),
    primary_keyword: blog.primary_keyword || '',
    secondary_keywords: typeof blog.secondary_keywords === 'string' ? blog.secondary_keywords : JSON.stringify(blog.secondary_keywords || []),
    target_location: blog.target_location || '',
    search_intent: blog.search_intent || 'Informational',
    target_audience: blog.target_audience || '',
    target_questions: typeof blog.target_questions === 'string' ? blog.target_questions : JSON.stringify(blog.target_questions || []),
    seo_title: blog.seo_title || '',
    meta_description: blog.meta_description || '',
    canonical_url: blog.canonical_url || '',
    status: blog.status || 'Draft',
    scheduled_at: blog.scheduled_at || null,
    published_at: blog.published_at || null,
    publication_error: blog.publication_error || '',
    admin_notes: blog.admin_notes || '',
    created_at: blog.created_at,
    updated_at: blog.updated_at
  };

  const extendedPayload = {
    ...basePayload,
    seo_report: blog.seo_report || null,
    content_revision: blog.content_revision || null,
    firsthand_observations: blog.firsthand_observations || '',
    project_examples: blog.project_examples || '',
    case_studies: blog.case_studies || '',
    original_research_data: blog.original_research_data || '',
    implementation_process: blog.implementation_process || '',
    external_sources: typeof blog.external_sources === 'string' ? blog.external_sources : JSON.stringify(blog.external_sources || []),
    limitations_lessons: blog.limitations_lessons || '',
    author_role: blog.author_role || 'Technical Architect & SEO Strategist',
    author_bio: blog.author_bio || '',
    author_credentials: blog.author_credentials || '',
    reviewer_name: blog.reviewer_name || '',
    editorial_notes: blog.editorial_notes || '',
    citation_answer_blocks: typeof blog.citation_answer_blocks === 'string' ? blog.citation_answer_blocks : JSON.stringify(blog.citation_answer_blocks || []),
    review_cycle_days: blog.review_cycle_days || 90,
    last_reviewed_at: blog.last_reviewed_at || null
  };

  const { error } = await supabase.from('blogs').upsert(extendedPayload);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
    // Column doesn't exist on remote PostgreSQL schema; fallback safely to base payload
    const fallbackRes = await supabase.from('blogs').upsert(basePayload);
    assertSupabaseSuccess(fallbackRes.error, 'Blog persistence');
  } else {
    assertSupabaseSuccess(error, 'Blog persistence');
  }
}

export async function deleteBlogFromSupabase(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for blog deletion.');
  const { error } = await supabase.from('blogs').delete().eq('id', id);
  assertSupabaseSuccess(error, 'Blog deletion');
}

export async function pushClientToSupabase(client: any): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for client persistence.');
  const { error } = await supabase.from('clients').upsert({
      id: client.id,
      client_name: client.client_name,
      website_url: client.website_url,
      logo_url: client.logo_url || '',
      hero_preview_url: client.hero_preview_url || '',
      service_category: client.service_category || '',
      description: client.description || '',
      display_order: client.display_order || 0,
      status: client.status || 'Draft',
      created_at: client.created_at,
      updated_at: client.updated_at
    });
  assertSupabaseSuccess(error, 'Client persistence');
}

export async function deleteClientFromSupabase(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for client deletion.');
  const { error } = await supabase.from('clients').delete().eq('id', id);
  assertSupabaseSuccess(error, 'Client deletion');
}

export async function pushShowcaseToSupabase(showcase: any): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for showcase persistence.');
  const { error } = await supabase.from('showcases').upsert({
    title: showcase.title,
    slug: showcase.slug,
    card_heading: showcase.card_heading || showcase.subtitle || '',
    full_heading: showcase.full_heading || '',
    short_description: showcase.short_description || showcase.description || '',
    detailed_description: showcase.detailed_description || showcase.long_description || '',
    category: showcase.category || 'Automation & Operations',
    tagline: showcase.tagline || showcase.badge || '',
    display_order: showcase.display_order || 0,
    is_featured: showcase.is_featured ? 1 : 0,
    is_visible: showcase.is_visible !== undefined ? (showcase.is_visible ? 1 : 0) : 1,
    status: showcase.status || 'In Development',
    launch_date: showcase.launch_date || showcase.estimated_launch_date || '',
    project_url: showcase.project_url || showcase.website_url || showcase.demo_url || '',
    link_label: showcase.link_label || 'Explore Live Demo',
    is_link_enabled: showcase.is_link_enabled !== undefined ? (showcase.is_link_enabled ? 1 : 0) : 1,
    open_in_new_tab: showcase.open_in_new_tab !== undefined ? (showcase.open_in_new_tab ? 1 : 0) : 1,
    inquiry_service: showcase.inquiry_service || 'Website Design & Development',
    screenshot_url: showcase.screenshot_url || showcase.screenshot_thumbnail_url || '',
    screenshot_source_url: showcase.screenshot_source_url || '',
    screenshot_captured_at: showcase.screenshot_captured_at || null,
    screenshot_alt: showcase.screenshot_alt || `${showcase.title} concept showcase`,
    features: typeof showcase.features === 'string' ? showcase.features : JSON.stringify(showcase.features || []),
    workflow_steps: typeof showcase.workflow_steps === 'string' ? showcase.workflow_steps : JSON.stringify(showcase.workflow_steps || []),
    capabilities: typeof showcase.capabilities === 'string' ? showcase.capabilities : JSON.stringify(showcase.capabilities || []),
    benefits: typeof showcase.benefits === 'string' ? showcase.benefits : JSON.stringify(showcase.benefits || []),
    tech_stack: typeof showcase.tech_stack === 'string' ? showcase.tech_stack : JSON.stringify(showcase.tech_stack || []),
    intended_audience: showcase.intended_audience || '',
    use_cases: typeof showcase.use_cases === 'string' ? showcase.use_cases : JSON.stringify(showcase.use_cases || []),
    project_challenges: showcase.project_challenges || '',
    implementation_approach: showcase.implementation_approach || '',
    outcome_results: showcase.outcome_results || '',
    gallery_images: typeof showcase.gallery_images === 'string' ? showcase.gallery_images : JSON.stringify(showcase.gallery_images || []),
    faq_items: typeof showcase.faq_items === 'string' ? showcase.faq_items : JSON.stringify(showcase.faq_items || []),
    publication_status: showcase.publication_status || 'Published',
    published_at: showcase.published_at || null,
    created_at: showcase.created_at || new Date().toISOString(),
    updated_at: showcase.updated_at || new Date().toISOString()
  }, { onConflict: 'slug' });
  assertSupabaseSuccess(error, 'Showcase persistence');
}

export async function deleteShowcaseFromSupabase(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured for showcase deletion.');
  const { error } = await supabase.from('showcases').delete().eq('id', id);
  assertSupabaseSuccess(error, 'Showcase deletion');
}

export async function pushNotificationSettingsToSupabase(settings: any): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('notification_settings').upsert({
      id: 1,
      active_email: settings.active_email,
      is_verified: settings.is_verified ? 1 : 0,
      verified_at: settings.verified_at,
      pending_email: settings.pending_email,
      updated_at: settings.updated_at || new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Supabase pushNotificationSettings Error]:', err);
  }
}

export async function pushSeoConnectionToSupabase(conn: any): Promise<void> {
  if (!supabase) return;
  try {
    if (!conn) {
      await supabase.from('seo_research_connections').delete().eq('id', 1);
    } else {
      const fullPayload = {
        id: 1,
        google_email: conn.google_email,
        encrypted_tokens: conn.encrypted_tokens,
        selected_property: conn.selected_property,
        last_sync_at: conn.last_sync_at || null,
        last_attempt_at: conn.last_attempt_at || null,
        last_error: conn.last_error || null,
        connection_status: conn.connection_status || 'Disconnected',
        selected_ga4_property: conn.selected_ga4_property || null,
        selected_ga4_property_name: conn.selected_ga4_property_name || null,
        ga4_last_sync_at: conn.ga4_last_sync_at || null,
        ga4_last_attempt_at: conn.ga4_last_attempt_at || null,
        ga4_last_error: conn.ga4_last_error || null,
        ga4_connection_status: conn.ga4_connection_status || 'Disconnected',
        updated_at: conn.updated_at || new Date().toISOString()
      };
      const { error: upsertErr } = await supabase.from('seo_research_connections').upsert(fullPayload);
      if (upsertErr) {
        // Fallback to base columns if remote Supabase PostgreSQL does not have GA4 columns yet
        await supabase.from('seo_research_connections').upsert({
          id: 1,
          google_email: conn.google_email,
          encrypted_tokens: conn.encrypted_tokens,
          selected_property: conn.selected_property,
          last_sync_at: conn.last_sync_at || null,
          last_attempt_at: conn.last_attempt_at || null,
          last_error: conn.last_error || null,
          connection_status: conn.connection_status || 'Disconnected',
          updated_at: conn.updated_at || new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('[Supabase pushSeoConnection Error]:', err);
  }
}

export async function pushCalculatorPricingConfigToSupabase(config: any): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('calculator_pricing_config').upsert({
      id: 1,
      config_json: config,
      version: config.version || 1,
      updated_at: config.updatedAt || new Date().toISOString()
    });
    if (error) {
      console.warn('[Supabase pushCalculatorPricingConfig Notice]:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase pushCalculatorPricingConfig Error]:', err);
  }
}

export async function pushWebsitePageToSupabase(page: any): Promise<void> {
  if (!supabase) return;
  try {
    const payload = {
      slug: page.slug,
      title: page.title,
      canonical_url: page.canonical_url,
      hero_badge: page.hero_badge,
      hero_subtitle: page.hero_subtitle,
      hero_description: page.hero_description,
      hero_primary_cta: page.hero_primary_cta,
      hero_secondary_cta: page.hero_secondary_cta,
      capabilities_json: typeof page.capabilities_json === 'string' ? JSON.parse(page.capabilities_json) : (page.capabilities || page.capabilities_json || []),
      process_steps_json: typeof page.process_steps_json === 'string' ? JSON.parse(page.process_steps_json) : (page.process_steps || page.process_steps_json || []),
      packages_json: typeof page.packages_json === 'string' ? JSON.parse(page.packages_json) : (page.packages || page.packages_json || []),
      faqs_json: typeof page.faqs_json === 'string' ? JSON.parse(page.faqs_json) : (page.faqs || page.faqs_json || []),
      cta_section_json: typeof page.cta_section_json === 'string' ? JSON.parse(page.cta_section_json) : (page.cta_section || page.cta_section_json || {}),
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      og_image: page.og_image,
      status: page.status || 'published',
      version: page.version || 1,
      updated_at: page.updated_at || new Date().toISOString()
    };

    const { error } = await supabase.from('website_pages').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[Supabase pushWebsitePage Notice]:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase pushWebsitePage Error]:', err);
  }
}

export async function pushOptimizationProposalToSupabase(prop: any): Promise<void> {
  if (!supabase) return;
  try {
    const payload = {
      id: prop.id,
      page_slug: prop.page_slug || prop.pageSlug,
      problem_statement: prop.problem_statement || prop.problemStatement,
      evidence_json: typeof prop.evidence_json === 'string' ? JSON.parse(prop.evidence_json) : (prop.evidence || {}),
      hypothesis: prop.hypothesis,
      proposed_changes_json: typeof prop.proposed_changes_json === 'string' ? JSON.parse(prop.proposed_changes_json) : (prop.proposedChanges || {}),
      risk_assessment: prop.risk_assessment || prop.riskAssessment,
      confidence_score: prop.confidence_score || prop.confidenceScore,
      status: prop.status || 'pending',
      approved_by: prop.approved_by || prop.approvedBy || null,
      published_version_id: prop.published_version_id || prop.publishedVersionId || null,
      updated_at: prop.updated_at || new Date().toISOString()
    };

    const { error } = await supabase.from('ai_optimization_proposals').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase pushOptimizationProposal Notice]:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase pushOptimizationProposal Error]:', err);
  }
}

export async function pushSeoCategoryToSupabase(category: any): Promise<void> {
  if (!supabase) return;
  try {
    const payload = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      primary_keyword: category.primary_keyword,
      secondary_keywords: typeof category.secondary_keywords === 'string' ? JSON.parse(category.secondary_keywords) : category.secondary_keywords,
      target_audience: category.target_audience,
      search_intent: category.search_intent,
      instructions: category.instructions,
      updated_at: category.updated_at || new Date().toISOString()
    };

    const { error } = await supabase.from('seo_categories').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[Supabase pushSeoCategory Notice]:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase pushSeoCategory Error]:', err);
  }
}

export async function deleteSeoCategoryFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('seo_categories').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase deleteSeoCategory Notice]:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase deleteSeoCategory Error]:', err);
  }
}

