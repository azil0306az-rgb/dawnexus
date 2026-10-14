import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createEnquiry, getPublicBlogs, getBlogBySlug, publishDueScheduledBlogs, getPublicClients } from '../db.js';
import { sendEnquiryNotification } from '../email.js';
import { performDatabaseHealthCheck } from '../dbHealth.js';

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
// CRON / AUTOMATED 4-HOUR DATABASE HEALTH CHECK
// ==========================================
const handleCronDbHealth = async (req: any, res: any) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.headers['x-vercel-cron'] !== '1') {
      return res.status(401).json({ error: 'Unauthorized cron invocation' });
    }

    const result = await performDatabaseHealthCheck('scheduled');
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    console.error('[Cron DB Health Error]:', error);
    return res.status(500).json({ error: 'Failed to execute database health check' });
  }
};

publicRouter.get('/cron/db-health', handleCronDbHealth);
publicRouter.post('/cron/db-health', handleCronDbHealth);

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

export const ALLOWED_BUDGETS = [
  '₹5,000–₹10,000',
  '₹10,000–₹20,000',
  '₹20,000–₹30,000',
  '₹30,000–₹50,000',
  '₹50,000'
];

/**
 * Validates and normalizes an Indian mobile phone number into +91XXXXXXXXXX format.
 * Accepts numbers with or without +91, with spaces, dashes, or leading 0.
 * Rejects non-Indian country codes (such as US +1) and invalid lengths.
 */
export function normalizeIndianPhone(raw: string): { valid: boolean; normalized?: string; error?: string } {
  if (!raw || !raw.trim()) {
    return { valid: true, normalized: '' };
  }
  const trimmed = raw.trim();

  // Reject foreign country prefixes (e.g. +1 for US, +44 for UK, etc.)
  if (/^\+/.test(trimmed)) {
    if (!/^\+91\b|^\+91\d/.test(trimmed)) {
      return { valid: false, error: 'Only Indian phone numbers (+91) are accepted.' };
    }
  }

  // Strip spaces, dashes, dots, brackets
  let cleaned = trimmed.replace(/[\s\-\(\)\.]/g, '');

  // Strip all leading +91 occurrences (guards against duplicate +91+91)
  while (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  }

  // Strip leading 91 if length > 10 (e.g. 919876543210 -> 9876543210)
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }

  // Strip leading 0 for domestic trunk dialing (e.g. 09876543210 -> 9876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // If there are still non-digit characters
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  // Check length
  if (cleaned.length !== 10) {
    return { valid: false, error: 'Indian mobile numbers must be exactly 10 digits.' };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleaned)) {
    return { valid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9.' };
  }

  return { valid: true, normalized: `+91${cleaned}` };
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

    // Validate and normalize Indian phone number (optional field)
    let normalizedPhone = '';
    if (phone && typeof phone === 'string' && phone.trim()) {
      const phoneRes = normalizeIndianPhone(phone);
      if (!phoneRes.valid) {
        errors.phone = phoneRes.error || 'Please provide a valid Indian mobile number (+91).';
      } else {
        normalizedPhone = phoneRes.normalized || '';
      }
    }

    // Validate budget against allowed INR options (optional field)
    let validatedBudget = '';
    if (budget && typeof budget === 'string' && budget.trim()) {
      const trimmedBudget = budget.trim();
      if (!ALLOWED_BUDGETS.includes(trimmedBudget)) {
        errors.budget = 'Please select a valid budget option from the allowed rupee ranges.';
      } else {
        validatedBudget = trimmedBudget;
      }
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
      phone: normalizedPhone,
      requested_services: services,
      budget: validatedBudget,
      project_details: project_details.trim()
    });

    // Send email notification safely before ending serverless function cycle
    try {
      await sendEnquiryNotification(newRecord);
    } catch (err) {
      console.error('[Email Notification Error]:', err);
    }

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

// ==========================================
// PUBLIC CLIENT SHOWCASE / OUR WORK ENDPOINTS
// ==========================================

// GET /api/clients
// Returns list of published clients for public showcase
publicRouter.get('/clients', (req, res) => {
  try {
    const clients = getPublicClients();
    return res.json({
      success: true,
      items: clients,
      total: clients.length
    });
  } catch (error) {
    console.error('[Public Get Clients Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve client showcase' });
  }
});

