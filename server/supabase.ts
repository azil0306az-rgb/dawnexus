import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://susdqywigvzcijsvlksb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1c2RxeXdpZ3Z6Y2lqc3Zsa3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTk4NTYxOCwiZXhwIjoyMTA3NTYxNjE4fQ.4Akv8u7-Gz87E9DJJPs5iuRhNwPcFWVVfZhRIlbNLZw';

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
}

export function isSupabaseActive(): boolean {
  return !!supabase;
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

    if (!blogErr && blogs && blogs.length > 0) {
      for (const blog of blogs) {
        db.prepare(`
          INSERT INTO blogs (
            id, title, slug, excerpt, content, featured_image, image_alt, author,
            category, tags, primary_keyword, secondary_keywords, target_location,
            search_intent, target_audience, target_questions, seo_title, meta_description,
            canonical_url, status, scheduled_at, published_at, publication_error,
            admin_notes, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?
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
            updated_at = excluded.updated_at
        `).run(
          blog.id, blog.title, blog.slug, blog.excerpt || '', blog.content || '',
          blog.featured_image || '', blog.image_alt || '', blog.author || 'Dawnexus Editorial',
          blog.category || 'Digital Strategy', blog.tags || '[]', blog.primary_keyword || '',
          blog.secondary_keywords || '[]', blog.target_location || '', blog.search_intent || 'Informational',
          blog.target_audience || '', blog.target_questions || '[]', blog.seo_title || '',
          blog.meta_description || '', blog.canonical_url || '', blog.status || 'Draft',
          blog.scheduled_at || null, blog.published_at || null, blog.publication_error || '',
          blog.admin_notes || '', blog.created_at || new Date().toISOString(), blog.updated_at || new Date().toISOString()
        );
      }
      console.log(`[Supabase Sync] Hydrated ${blogs.length} blogs.`);
    }

    // 2. Sync Clients (Our Work)
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('*');

    if (!clientErr && clients && clients.length > 0) {
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
      console.log(`[Supabase Sync] Hydrated ${clients.length} clients.`);
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
    const { data: enquiries } = await supabase
      .from('enquiries')
      .select('*')
      .order('id', { ascending: false })
      .limit(200);

    if (enquiries && enquiries.length > 0) {
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
      console.log(`[Supabase Sync] Hydrated ${enquiries.length} enquiries.`);
    }

    console.log('[Supabase Sync] Local database is fully synchronized with Supabase.');
  } catch (err) {
    console.warn('[Supabase Sync Error]:', err);
  }
}

// ----------------------------------------------------------------------
// Asynchronous Supabase Write Sinks
// ----------------------------------------------------------------------

export async function pushEnquiryToSupabase(record: any): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('enquiries').upsert({
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
  } catch (err) {
    console.warn('[Supabase pushEnquiry Error]:', err);
  }
}

export async function updateEnquiryInSupabase(id: number, updates: any): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('enquiries').update({
      ...updates,
      updated_at: new Date().toISOString()
    }).eq('id', id);
  } catch (err) {
    console.warn('[Supabase updateEnquiry Error]:', err);
  }
}

export async function deleteEnquiryFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('enquiries').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase deleteEnquiry Error]:', err);
  }
}

export async function pushBlogToSupabase(blog: any): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('blogs').upsert({
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
    });
  } catch (err) {
    console.warn('[Supabase pushBlog Error]:', err);
  }
}

export async function deleteBlogFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('blogs').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase deleteBlog Error]:', err);
  }
}

export async function pushClientToSupabase(client: any): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('clients').upsert({
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
  } catch (err) {
    console.warn('[Supabase pushClient Error]:', err);
  }
}

export async function deleteClientFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('clients').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase deleteClient Error]:', err);
  }
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
      await supabase.from('seo_research_connections').upsert({
        id: 1,
        google_email: conn.google_email,
        encrypted_tokens: conn.encrypted_tokens,
        selected_property: conn.selected_property,
        updated_at: conn.updated_at || new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('[Supabase pushSeoConnection Error]:', err);
  }
}
