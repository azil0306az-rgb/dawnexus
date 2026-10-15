import { Router } from 'express';
import crypto from 'node:crypto';
import {
  handleAdminLogin,
  handleAdminSession,
  handleAdminLogout,
  requireAuth
} from '../auth.js';
import {
  getStats,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
  getAllEnquiriesForExport,
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  duplicateBlog,
  getBlogStats,
  getNotificationSettings,
  createOtpChallenge,
  getLatestOtpChallenge,
  recordOtpFailedAttempt,
  completeOtpVerification,
  deactivateNotificationSettings,
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  reorderClients,
  getCalculatorPricingConfig,
  updateCalculatorPricingConfig,
  persistCalculatorPricingConfig,
  refreshFromPersistentStore,
  persistBlog,
  persistBlogDeletion,
  persistEnquiryUpdate,
  persistEnquiryDeletion,
  persistClient,
  persistClientDeletion,
  publishDueScheduledBlogsReliable
} from '../db.js';
import {
  sendOtpVerificationEmail,
  getEmailProviderStatus
} from '../email.js';
import { seoResearchRouter } from './seoResearch.js';
import { getDatabaseHealthStats, performDatabaseHealthCheck } from '../dbHealth.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const adminRouter = Router();

// Authentication Endpoints
adminRouter.post('/login', handleAdminLogin);
adminRouter.get('/session', handleAdminSession);
adminRouter.post('/logout', handleAdminLogout);

// All routes below require valid session authentication
adminRouter.use(requireAuth);

// Ensure admin queries are never cached by intermediate proxies or browser cache
adminRouter.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// GET /api/admin/stats
adminRouter.get('/stats', (req, res) => {
  try {
    const stats = getStats();
    const blogStats = getBlogStats();
    return res.json({
      ...stats,
      blogs: blogStats
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// ==========================================
// BLOG CMS ENDPOINTS
// ==========================================

// GET /api/admin/blogs
adminRouter.get('/blogs', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const sortBy = (['newest', 'oldest', 'scheduled', 'updated'].includes(req.query.sortBy as string))
      ? (req.query.sortBy as 'newest' | 'oldest' | 'scheduled' | 'updated')
      : 'newest';
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    const result = getBlogs({
      search,
      status,
      category,
      sortBy,
      page,
      limit
    });

    return res.json(result);
  } catch (error) {
    console.error('[Admin Get Blogs Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve blogs' });
  }
});

// GET /api/admin/blogs/stats
adminRouter.get('/blogs/stats', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const stats = getBlogStats();
    return res.json(stats);
  } catch (error) {
    console.error('[Admin Blog Stats Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog statistics' });
  }
});

// POST /api/admin/blogs/publish-due (manual trigger from admin)
adminRouter.post('/blogs/publish-due', async (req, res) => {
  try {
    const result = await publishDueScheduledBlogsReliable();
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Admin Publish Due Error]:', error);
    return res.status(500).json({ error: 'Failed to run publication scheduler' });
  }
});

// GET /api/admin/blogs/:id
adminRouter.get('/blogs/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const blog = getBlogById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    return res.json(blog);
  } catch (error) {
    console.error('[Admin Get Blog By ID Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog' });
  }
});

// POST /api/admin/blogs
adminRouter.post('/blogs', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      image_alt,
      author,
      category,
      tags,
      primary_keyword,
      secondary_keywords,
      target_location,
      search_intent,
      target_audience,
      target_questions,
      seo_title,
      meta_description,
      canonical_url,
      status,
      scheduled_at,
      published_at,
      admin_notes
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Article title is required' });
    }

    const created = createBlog({
      title: title.trim(),
      slug: typeof slug === 'string' ? slug.trim() : undefined,
      excerpt: typeof excerpt === 'string' ? excerpt.trim() : '',
      content: typeof content === 'string' ? content.trim() : '',
      featured_image: typeof featured_image === 'string' ? featured_image.trim() : '',
      image_alt: typeof image_alt === 'string' ? image_alt.trim() : '',
      author: typeof author === 'string' ? author.trim() : 'Dawnexus Editorial',
      category: typeof category === 'string' ? category.trim() : 'Digital Strategy',
      tags: Array.isArray(tags) ? tags : [],
      primary_keyword: typeof primary_keyword === 'string' ? primary_keyword.trim() : '',
      secondary_keywords: Array.isArray(secondary_keywords) ? secondary_keywords : [],
      target_location: typeof target_location === 'string' ? target_location.trim() : '',
      search_intent: typeof search_intent === 'string' ? search_intent : 'Informational',
      target_audience: typeof target_audience === 'string' ? target_audience.trim() : '',
      target_questions: Array.isArray(target_questions) ? target_questions : [],
      seo_title: typeof seo_title === 'string' ? seo_title.trim() : title.trim(),
      meta_description: typeof meta_description === 'string' ? meta_description.trim() : (excerpt || '').trim(),
      canonical_url: typeof canonical_url === 'string' ? canonical_url.trim() : '',
      status: (['Draft', 'Scheduled', 'Published', 'Archived'].includes(status)) ? status : 'Draft',
      scheduled_at: typeof scheduled_at === 'string' && scheduled_at.trim() ? scheduled_at.trim() : null,
      published_at: typeof published_at === 'string' && published_at.trim() ? published_at.trim() : null,
      admin_notes: typeof admin_notes === 'string' ? admin_notes.trim() : ''
    });
    await persistBlog(created);

    return res.status(201).json({
      success: true,
      message: 'Article created successfully',
      blog: created
    });
  } catch (error) {
    console.error('[Admin Create Blog Error]:', error);
    return res.status(500).json({ error: 'Failed to create blog article' });
  }
});

// PATCH /api/admin/blogs/:id
adminRouter.patch('/blogs/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const updated = updateBlog(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    await persistBlog(updated);

    return res.json({
      success: true,
      message: 'Article updated successfully',
      blog: updated
    });
  } catch (error) {
    console.error('[Admin Update Blog Error]:', error);
    return res.status(500).json({ error: 'Failed to update blog article' });
  }
});

// DELETE /api/admin/blogs/:id
adminRouter.delete('/blogs/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const deleted = deleteBlog(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Blog not found or already deleted' });
    }
    await persistBlogDeletion(id);

    return res.json({
      success: true,
      message: `Blog #${id} permanently deleted`
    });
  } catch (error) {
    console.error('[Admin Delete Blog Error]:', error);
    return res.status(500).json({ error: 'Failed to delete blog article' });
  }
});

// POST /api/admin/blogs/:id/duplicate
adminRouter.post('/blogs/:id/duplicate', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const copy = duplicateBlog(id);
    if (!copy) {
      return res.status(404).json({ error: 'Original blog article not found' });
    }
    await persistBlog(copy);

    return res.status(201).json({
      success: true,
      message: 'Article duplicated successfully as draft',
      blog: copy
    });
  } catch (error) {
    console.error('[Admin Duplicate Blog Error]:', error);
    return res.status(500).json({ error: 'Failed to duplicate blog article' });
  }
});

// GET /api/admin/enquiries
adminRouter.get('/enquiries', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const service = typeof req.query.service === 'string' ? req.query.service : undefined;
    const sortBy = req.query.sortBy === 'oldest' ? 'oldest' : 'newest';
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    const result = getEnquiries({
      search,
      status,
      service,
      sortBy,
      page,
      limit
    });

    return res.json(result);
  } catch (error) {
    console.error('[Admin Enquiries Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve enquiries' });
  }
});

// GET /api/admin/enquiries/:id
adminRouter.get('/enquiries/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid enquiry ID' });
    }

    const enquiry = getEnquiryById(id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    return res.json(enquiry);
  } catch (error) {
    console.error('[Admin Get Enquiry Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve enquiry' });
  }
});

// PATCH /api/admin/enquiries/:id
adminRouter.patch('/enquiries/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid enquiry ID' });
    }

    const allowedStatuses = ['New', 'Contacted', 'In Progress', 'Completed', 'Archived'];
    const { status, admin_notes } = req.body;

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}`
      });
    }

    if (admin_notes !== undefined && typeof admin_notes !== 'string') {
      return res.status(400).json({ error: 'Admin notes must be a string' });
    }

    const updated = updateEnquiry(id, { status, admin_notes });
    if (!updated) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    await persistEnquiryUpdate(id, { status, admin_notes });

    return res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry: updated
    });
  } catch (error) {
    console.error('[Admin Update Enquiry Error]:', error);
    return res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// DELETE /api/admin/enquiries/:id
adminRouter.delete('/enquiries/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid enquiry ID' });
    }

    const deleted = deleteEnquiry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Enquiry not found or already deleted' });
    }
    await persistEnquiryDeletion(id);

    return res.json({
      success: true,
      message: `Enquiry #${id} permanently deleted`
    });
  } catch (error) {
    console.error('[Admin Delete Enquiry Error]:', error);
    return res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Helper for CSV cell escaping
function escapeCsv(field: unknown): string {
  if (field === null || field === undefined) return '""';
  let str = String(field);
  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/admin/enquiries/export (CSV)
adminRouter.get('/export', (req, res) => {
  try {
    const enquiries = getAllEnquiriesForExport();

    const headers = [
      'ID',
      'Submission Date',
      'Customer Name',
      'Business Name',
      'Email',
      'Phone',
      'Requested Services',
      'Budget',
      'Status',
      'Admin Notes',
      'Project Details'
    ];

    const rows: string[] = [headers.map(escapeCsv).join(',')];

    for (const item of enquiries) {
      let servicesFormatted = item.requested_services;
      try {
        const parsed = JSON.parse(item.requested_services);
        if (Array.isArray(parsed)) {
          servicesFormatted = parsed.join('; ');
        }
      } catch {
        // Keep raw
      }

      rows.push([
        escapeCsv(item.id),
        escapeCsv(item.created_at),
        escapeCsv(item.full_name),
        escapeCsv(item.business_name),
        escapeCsv(item.email),
        escapeCsv(item.phone),
        escapeCsv(servicesFormatted),
        escapeCsv(item.budget),
        escapeCsv(item.status),
        escapeCsv(item.admin_notes),
        escapeCsv(item.project_details)
      ].join(','));
    }

    const csvContent = rows.join('\r\n');
    const today = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dawnexus-enquiries-${today}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('[Admin CSV Export Error]:', error);
    return res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// ==========================================
// NOTIFICATION EMAIL / EMAIL ALERTS ENDPOINTS
// ==========================================

// GET /api/admin/notification-settings
adminRouter.get('/notification-settings', (req, res) => {
  try {
    const settings = getNotificationSettings();
    const providerStatus = getEmailProviderStatus();
    return res.json({
      ...settings,
      provider_status: providerStatus
    });
  } catch (error) {
    console.error('[Admin Get Notification Settings Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve notification settings' });
  }
});

// POST /api/admin/notification-settings/request-otp
adminRouter.post('/notification-settings/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Enforce 60-second cooldown
    const latest = getLatestOtpChallenge(normalizedEmail);
    if (latest) {
      const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSec} seconds before requesting a new verification code.`,
          remaining_seconds: remainingSec
        });
      }
    }

    // Generate 6-digit numeric OTP and cryptographic salt
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHmac('sha256', salt).update(`${normalizedEmail}:${otp}`).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5-minute expiry

    // Save challenge to database (marks previous challenges superseded)
    createOtpChallenge(normalizedEmail, otpHash, salt, expiresAt);

    // Send email to the requested address
    const sendResult = await sendOtpVerificationEmail(normalizedEmail, otp);
    const providerStatus = getEmailProviderStatus();

    let message = `A 6-digit verification code has been dispatched to ${normalizedEmail}.`;
    if (!sendResult.success && sendResult.error) {
      message = `Code generated, but email delivery returned: ${sendResult.error}`;
    }

    return res.status(200).json({
      success: true,
      message,
      email: normalizedEmail,
      expires_in_seconds: 300,
      resend_cooldown_seconds: 60,
      provider_configured: providerStatus !== 'none',
      email_dispatched: sendResult.success,
      delivery_error: sendResult.error || null
    });
  } catch (error) {
    console.error('[Admin Request OTP Error]:', error);
    return res.status(500).json({ error: 'Failed to generate verification code. Please try again.' });
  }
});

// POST /api/admin/notification-settings/verify-otp
adminRouter.post('/notification-settings/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit numeric verification code.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    const challenge = getLatestOtpChallenge(normalizedEmail);
    if (!challenge) {
      return res.status(400).json({ error: 'No active verification code found for this address. Please request a new code.' });
    }

    // Check failed attempts (max 5)
    if (challenge.attempts >= challenge.max_attempts) {
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    // Check expiration (5 minutes)
    if (new Date() > new Date(challenge.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Verify cryptographic digest
    const testHash = crypto.createHmac('sha256', challenge.salt).update(`${normalizedEmail}:${trimmedOtp}`).digest('hex');
    if (testHash !== challenge.otp_hash) {
      const attemptsMade = recordOtpFailedAttempt(challenge.id);
      const remaining = Math.max(0, challenge.max_attempts - attemptsMade);
      if (remaining === 0) {
        return res.status(400).json({ error: 'Maximum verification attempts exceeded for this code. Please request a new code.' });
      }
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }

    // Success: activate verified recipient
    const updatedSettings = completeOtpVerification(challenge.id, normalizedEmail);

    return res.json({
      success: true,
      message: `${normalizedEmail} has been verified and activated for all inquiry alerts.`,
      settings: updatedSettings
    });
  } catch (error) {
    console.error('[Admin Verify OTP Error]:', error);
    return res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
});

// POST /api/admin/notification-settings/deactivate
adminRouter.post('/notification-settings/deactivate', (req, res) => {
  try {
    const updated = deactivateNotificationSettings();
    return res.json({
      success: true,
      message: 'Email alerts deactivated successfully. Inquiries will continue to be safely recorded in the database.',
      settings: updated
    });
  } catch (error) {
    console.error('[Admin Deactivate Notification Error]:', error);
    return res.status(500).json({ error: 'Failed to deactivate notification recipient' });
  }
});

// VERSION 3.0: SEO Research & Blog Ideas Router
adminRouter.use('/seo-research', seoResearchRouter);

// ==========================================
// VERSION 3.5.297: CLIENT SHOWCASE / OUR WORK ENDPOINTS
// ==========================================

// Helper for validating public website URLs and blocking private/internal network ranges (SSRF defense)
function isValidPublicWebUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block loopback, localhost, and private IPv4/IPv6
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^169\.254\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// GET /api/admin/clients
adminRouter.get('/clients', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const clients = getAllClients();
    return res.json({ success: true, items: clients });
  } catch (error) {
    console.error('[Admin Get Clients Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve clients' });
  }
});

// POST /api/admin/clients
adminRouter.post('/clients', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const {
      client_name,
      website_url,
      logo_url,
      hero_preview_url,
      service_category,
      description,
      display_order,
      status
    } = req.body;

    if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
      return res.status(400).json({ error: 'Client company name is required.' });
    }

    if (!website_url || typeof website_url !== 'string' || !isValidPublicWebUrl(website_url.trim())) {
      return res.status(400).json({ error: 'A valid public website URL is required (e.g. https://example.com).' });
    }

    if (status === 'Published') {
      if (!logo_url || typeof logo_url !== 'string' || !logo_url.trim()) {
        return res.status(400).json({ error: 'Client logo is required before publishing.' });
      }
      if (!hero_preview_url || typeof hero_preview_url !== 'string' || !hero_preview_url.trim()) {
        return res.status(400).json({ error: 'Website hero preview is required before publishing.' });
      }
    }

    const created = createClient({
      client_name: client_name.trim(),
      website_url: website_url.trim(),
      logo_url: typeof logo_url === 'string' ? logo_url.trim() : '',
      hero_preview_url: typeof hero_preview_url === 'string' ? hero_preview_url.trim() : '',
      service_category: typeof service_category === 'string' ? service_category.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      display_order: typeof display_order === 'number' ? display_order : undefined,
      status: status === 'Published' ? 'Published' : 'Draft'
    });
    await persistClient(created);

    return res.status(201).json({
      success: true,
      message: 'Client portfolio entry created successfully',
      client: created
    });
  } catch (error) {
    console.error('[Admin Create Client Error]:', error);
    return res.status(500).json({ error: 'Failed to create client portfolio entry' });
  }
});

// PATCH /api/admin/clients/:id
adminRouter.patch('/clients/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const {
      client_name,
      website_url,
      logo_url,
      hero_preview_url,
      service_category,
      description,
      display_order,
      status
    } = req.body;

    if (client_name !== undefined && (!client_name || !client_name.trim())) {
      return res.status(400).json({ error: 'Client company name cannot be empty.' });
    }

    if (website_url !== undefined && (!website_url || !isValidPublicWebUrl(website_url.trim()))) {
      return res.status(400).json({ error: 'A valid public website URL is required.' });
    }

    if (status === 'Published') {
      const targetLogo = logo_url !== undefined ? logo_url : (req.body._existingLogo || '');
      const targetHero = hero_preview_url !== undefined ? hero_preview_url : (req.body._existingHero || '');
      if (!targetLogo || !targetLogo.trim()) {
        return res.status(400).json({ error: 'Client logo is required before publishing.' });
      }
      if (!targetHero || !targetHero.trim()) {
        return res.status(400).json({ error: 'Website hero preview is required before publishing.' });
      }
    }

    const updated = updateClient(id, {
      client_name,
      website_url,
      logo_url,
      hero_preview_url,
      service_category,
      description,
      display_order,
      status
    });

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' });
    }
    await persistClient(updated);

    return res.json({
      success: true,
      message: 'Client portfolio entry updated successfully',
      client: updated
    });
  } catch (error) {
    console.error('[Admin Update Client Error]:', error);
    return res.status(500).json({ error: 'Failed to update client portfolio entry' });
  }
});

// DELETE /api/admin/clients/:id
adminRouter.delete('/clients/:id', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const deleted = deleteClient(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Client not found or already deleted' });
    }
    await persistClientDeletion(id);

    return res.json({
      success: true,
      message: 'Client portfolio entry deleted successfully'
    });
  } catch (error) {
    console.error('[Admin Delete Client Error]:', error);
    return res.status(500).json({ error: 'Failed to delete client portfolio entry' });
  }
});

// POST /api/admin/clients/reorder
adminRouter.post('/clients/reorder', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'Array of ordered client IDs is required.' });
    }

    reorderClients(orderedIds.map(Number));
    for (const client of getAllClients()) await persistClient(client);
    return res.json({ success: true, message: 'Display order updated successfully' });
  } catch (error) {
    console.error('[Admin Reorder Clients Error]:', error);
    return res.status(500).json({ error: 'Failed to update display order' });
  }
});

// POST /api/admin/clients/auto-preview
// Attempts to capture or fetch a high-res website hero preview
adminRouter.post('/clients/auto-preview', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !isValidPublicWebUrl(url.trim())) {
      return res.status(400).json({ error: 'Valid public website URL is required.' });
    }

    const targetUrl = url.trim();
    // Microlink API gives reliable browser screenshots for hero sections
    const endpoint = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&viewport[width]=1440&viewport[height]=900`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const mRes = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (mRes.ok) {
      const data = await mRes.json();
      const screenshotUrl = data?.data?.screenshot?.url;
      if (screenshotUrl) {
        return res.json({
          success: true,
          previewUrl: screenshotUrl,
          message: 'Website preview generated successfully.'
        });
      }
    }

    return res.status(422).json({
      success: false,
      error: 'Automatic capture was unable to render this website. Please upload a screenshot manually.'
    });
  } catch (err: any) {
    return res.status(422).json({
      success: false,
      error: 'Automatic screenshot capture timed out or failed. Please upload a screenshot manually.'
    });
  }
});

// ======================================================================
// BLOG IMAGE UPLOAD (SUPABASE STORAGE BUCKET: blog-images)
// ======================================================================
adminRouter.post('/blogs/upload-image', async (req, res) => {
  try {
    const { image, filename: requestedName } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data URL is required.' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already a hosted URL, just return it
      if (image.startsWith('http://') || image.startsWith('https://')) {
        return res.json({ success: true, url: image });
      }
      return res.status(400).json({ error: 'Invalid image format.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image file size exceeds 5MB limit.' });
    }

    const extension = mimeType.split('/')[1] || 'png';
    const cleanExt = extension.replace('jpeg', 'jpg');
    const safeName = `blog-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(safeName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage
          .from('blog-images')
          .getPublicUrl(safeName);

        return res.json({
          success: true,
          url: pubData.publicUrl,
          filename: safeName
        });
      }
      console.error('[Blog Image Upload Storage Error]:', error?.message || 'Upload returned no data');
      return res.status(502).json({ error: 'Supabase Storage rejected the blog image upload. Please retry.' });
    }

    return res.status(503).json({ error: 'Blog image storage is not configured on the server.' });
  } catch (err: any) {
    console.error('[Blog Image Upload Error]:', err);
    return res.status(500).json({ error: 'Failed to process blog image upload.' });
  }
});

// ======================================================================
// CLIENT SHOWCASE IMAGE UPLOAD (SUPABASE STORAGE BUCKET: client-showcase)
// ======================================================================
adminRouter.post('/clients/upload-image', async (req, res) => {
  try {
    const { image, type = 'screenshot' } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data URL is required.' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      if (image.startsWith('http://') || image.startsWith('https://')) {
        return res.json({ success: true, url: image });
      }
      return res.status(400).json({ error: 'Invalid image format.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image file size exceeds 5MB limit.' });
    }

    const extension = mimeType.split('/')[1] || 'png';
    const cleanExt = extension.replace('jpeg', 'jpg');
    const safeName = `client-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      const { data, error } = await supabase.storage
        .from('client-showcase')
        .upload(safeName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage
          .from('client-showcase')
          .getPublicUrl(safeName);

        return res.json({
          success: true,
          url: pubData.publicUrl,
          filename: safeName
        });
      }
      console.error('[Client Image Upload Storage Error]:', error?.message || 'Upload returned no data');
      return res.status(502).json({ error: 'Supabase Storage rejected the client image upload. Please retry.' });
    }

    return res.status(503).json({ error: 'Client image storage is not configured on the server.' });
  } catch (err: any) {
    console.error('[Client Image Upload Error]:', err);
    return res.status(500).json({ error: 'Failed to process client image upload.' });
  }
});

// ======================================================================
// DATABASE HEALTH CHECK MONITORING ENDPOINTS
// ======================================================================

// GET /api/admin/db-health - View health statistics and recent check history
adminRouter.get('/db-health', async (req, res) => {
  try {
    let stats = await getDatabaseHealthStats();
    // Auto-refresh if no check exists or last check is older than 4 hours
    if (!stats.lastCheck || (Date.now() - new Date(stats.lastCheck.checked_at).getTime() > 4 * 60 * 60 * 1000)) {
      try {
        await performDatabaseHealthCheck('scheduled');
        stats = await getDatabaseHealthStats();
      } catch (checkErr) {
        console.warn('[Admin DB Health Auto-Check Notice]:', checkErr);
      }
    }
    return res.json({
      success: true,
      stats
    });
  } catch (err: any) {
    console.error('[Admin DB Health Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch database health statistics.' });
  }
});

// POST /api/admin/db-health/check - Trigger manual on-demand health check
adminRouter.post('/db-health/check', async (req, res) => {
  try {
    const checkResult = await performDatabaseHealthCheck('manual');
    const stats = await getDatabaseHealthStats();
    return res.json({
      success: true,
      result: checkResult,
      stats
    });
  } catch (err: any) {
    console.error('[Admin DB Health Check Error]:', err);
    return res.status(500).json({ error: 'Failed to execute manual database health check.' });
  }
});

// ======================================================================
// WEBSITE COST ESTIMATOR SETTINGS (VERSION 5.8)
// ======================================================================

// GET /api/admin/calculator/config
adminRouter.get('/calculator/config', async (req, res) => {
  try {
    await refreshFromPersistentStore();
    const config = getCalculatorPricingConfig();
    return res.json({
      success: true,
      config
    });
  } catch (err: any) {
    console.error('[Admin Get Calculator Config Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve calculator settings.' });
  }
});

// PUT /api/admin/calculator/config
adminRouter.put('/calculator/config', async (req, res) => {
  try {
    const newConfig = req.body;
    if (
      !newConfig ||
      typeof newConfig !== 'object' ||
      !Array.isArray(newConfig.websiteTypes) ||
      !Array.isArray(newConfig.features)
    ) {
      return res.status(400).json({ error: 'Invalid calculator pricing configuration schema.' });
    }

    const updated = updateCalculatorPricingConfig(newConfig);
    await persistCalculatorPricingConfig(updated);
    return res.json({
      success: true,
      message: 'Calculator pricing configuration updated successfully.',
      config: updated
    });
  } catch (err: any) {
    console.error('[Admin Update Calculator Config Error]:', err);
    return res.status(500).json({ error: 'Failed to save calculator settings.' });
  }
});



