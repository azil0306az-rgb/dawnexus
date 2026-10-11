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
  publishDueScheduledBlogs,
  getNotificationSettings,
  createOtpChallenge,
  getLatestOtpChallenge,
  recordOtpFailedAttempt,
  completeOtpVerification,
  deactivateNotificationSettings
} from '../db.js';
import {
  sendOtpVerificationEmail,
  getEmailProviderStatus
} from '../email.js';
import { seoResearchRouter } from './seoResearch.js';

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
adminRouter.get('/blogs', (req, res) => {
  try {
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
adminRouter.get('/blogs/stats', (req, res) => {
  try {
    const stats = getBlogStats();
    return res.json(stats);
  } catch (error) {
    console.error('[Admin Blog Stats Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog statistics' });
  }
});

// POST /api/admin/blogs/publish-due (manual trigger from admin)
adminRouter.post('/blogs/publish-due', (req, res) => {
  try {
    const result = publishDueScheduledBlogs();
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
adminRouter.get('/blogs/:id', (req, res) => {
  try {
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
adminRouter.post('/blogs', (req, res) => {
  try {
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
adminRouter.patch('/blogs/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const updated = updateBlog(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Blog not found' });
    }

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
adminRouter.delete('/blogs/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const deleted = deleteBlog(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Blog not found or already deleted' });
    }

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
adminRouter.post('/blogs/:id/duplicate', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const copy = duplicateBlog(id);
    if (!copy) {
      return res.status(404).json({ error: 'Original blog article not found' });
    }

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
adminRouter.get('/enquiries', (req, res) => {
  try {
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
adminRouter.get('/enquiries/:id', (req, res) => {
  try {
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
adminRouter.patch('/enquiries/:id', (req, res) => {
  try {
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
adminRouter.delete('/enquiries/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid enquiry ID' });
    }

    const deleted = deleteEnquiry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Enquiry not found or already deleted' });
    }

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



