import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createEnquiry, getPublicBlogs, getBlogBySlug, publishDueScheduledBlogs } from '../db.js';
import { sendEnquiryNotification } from '../email.js';

export const publicRouter = Router();

// ==========================================
// CRON / AUTOMATED PUBLISHING ENDPOINT
// ==========================================
const handleCronPublish = (req: any, res: any) => {
  try {
    const result = publishDueScheduledBlogs();
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    console.error('[Cron Publish Error]:', error);
    return res.status(500).json({ error: 'Failed to run publication scheduler' });
  }
};

publicRouter.get('/cron/publish', handleCronPublish);
publicRouter.post('/cron/publish', handleCronPublish);

// ==========================================
// PUBLIC BLOG ENDPOINTS
// ==========================================

// GET /api/blogs
publicRouter.get('/blogs', (req, res) => {
  try {
    // Lazily ensure any due scheduled posts are published
    try {
      publishDueScheduledBlogs();
    } catch {
      // Ignore background errors
    }

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '12', 10);

    const result = getPublicBlogs({ category, search, page, limit });
    return res.json(result);
  } catch (error) {
    console.error('[Public Get Blogs Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog articles' });
  }
});

// GET /api/blogs/:slug
publicRouter.get('/blogs/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Slug parameter is required' });
    }

    // Lazily ensure any due scheduled posts are published
    try {
      publishDueScheduledBlogs();
    } catch {
      // Ignore
    }

    const blog = getBlogBySlug(slug.trim());
    if (!blog) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Only allow public access to Published blogs (unless preview mode query param provided, e.g. preview=true from admin)
    const isPreview = req.query.preview === 'true';
    if (blog.status !== 'Published' && !isPreview) {
      return res.status(404).json({ error: 'Article is not published yet' });
    }

    // Fetch up to 3 related articles in the same category
    const relatedResult = getPublicBlogs({ category: blog.category, limit: 4 });
    const related = relatedResult.items.filter(item => item.id !== blog.id).slice(0, 3);

    return res.json({
      blog,
      related
    });
  } catch (error) {
    console.error('[Public Get Blog By Slug Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve article' });
  }
});

// Rate limiting for public enquiry submissions: max 10 per 15 minutes per IP
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many submissions from this IP address. Please wait a few minutes before trying again.'
  }
});

// Helper for validating email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/enquiries
publicRouter.post('/enquiries', enquiryLimiter, async (req, res) => {
  try {
    const {
      full_name,
      business_name,
      email,
      phone,
      requested_services,
      budget,
      project_details,
      website_hp // Honeypot field for bot spam detection
    } = req.body;

    // Spam honeypot detection: bots automatically fill hidden inputs
    if (website_hp) {
      console.warn('[Spam Detection] Honeypot triggered. Silently dropping request.');
      return res.status(200).json({
        success: true,
        message: 'Thank you for contacting Dawnexus. Your enquiry has been received successfully.'
      });
    }

    // Validation
    const errors: Record<string, string> = {};

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      errors.full_name = 'Full name is required (minimum 2 characters).';
    } else if (full_name.trim().length > 100) {
      errors.full_name = 'Full name must be under 100 characters.';
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      errors.email = 'A valid email address is required.';
    } else if (email.trim().length > 120) {
      errors.email = 'Email address is too long.';
    }

    if (!project_details || typeof project_details !== 'string' || project_details.trim().length < 10) {
      errors.project_details = 'Please provide at least 10 characters describing your project goals.';
    } else if (project_details.trim().length > 4000) {
      errors.project_details = 'Project details must be under 4000 characters.';
    }

    // Validate requested services
    let services: string[] = [];
    if (Array.isArray(requested_services)) {
      services = requested_services.filter(s => typeof s === 'string' && s.trim().length > 0);
    } else if (typeof requested_services === 'string' && requested_services.trim()) {
      services = [requested_services.trim()];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed. Please correct the highlighted fields.',
        details: errors
      });
    }

    // Persist to SQLite database
    const newRecord = createEnquiry({
      full_name: full_name.trim(),
      business_name: typeof business_name === 'string' ? business_name.trim() : '',
      email: email.trim().toLowerCase(),
      phone: typeof phone === 'string' ? phone.trim() : '',
      requested_services: services,
      budget: typeof budget === 'string' ? budget.trim() : '',
      project_details: project_details.trim()
    });

    // Send async email notification (safe failure handling)
    sendEnquiryNotification(newRecord).catch(err => {
      console.error('[Email Notification Error]:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting Dawnexus. Your enquiry has been received successfully.',
      enquiryId: newRecord.id
    });
  } catch (error) {
    console.error('[Enquiry Submission Error]:', error);
    return res.status(500).json({
      error: 'An unexpected server error occurred while processing your enquiry. Please try again.'
    });
  }
});

