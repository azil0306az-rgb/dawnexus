import { Router } from 'express';
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
  getAllEnquiriesForExport
} from '../db.js';

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
    return res.json(stats);
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve statistics' });
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

