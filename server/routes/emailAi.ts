/**
 * Dawnexus Version 8.2.5 — Email AI Admin Routes
 * Endpoints for managing Gmail accounts, searching inboxes, viewing threads,
 * and creating/saving reply drafts.
 * 
 * CRITICAL RULE: NEVER sends email automatically or manually.
 */

import { Router, Request, Response } from 'express';
import { EmailAiService } from '../emailAiService.js';
import { requireAuth } from '../auth.js';
import { refreshFromPersistentStore } from '../db.js';

export const emailAiRouter = Router();

// Derive redirect URI dynamically based on request host or environment variable
export function getGoogleEmailRedirectUri(req: Request): string {
  if (process.env.GOOGLE_EMAIL_REDIRECT_URI) {
    return process.env.GOOGLE_EMAIL_REDIRECT_URI.trim();
  }
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host') || 'www.dawnexus.in';
  return `${protocol}://${host}/api/admin/email-ai/google/callback`;
}

/**
 * Public OAuth callback endpoint registered in Google Cloud Console
 * GET /api/admin/email-ai/google/callback
 */
export async function handleGoogleEmailOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.warn('[Email AI OAuth Callback] Google returned error:', String(error));
      return res.redirect(`/admin?tab=email-ai&email_error=${encodeURIComponent(String(error))}`);
    }

    if (!code || !state) {
      return res.redirect('/admin?tab=email-ai&email_error=missing_callback_params');
    }

    const redirectUri = getGoogleEmailRedirectUri(req);
    const result = await EmailAiService.handleOAuthCallback(
      String(code),
      String(state),
      redirectUri,
      'admin'
    );

    return res.redirect(`/admin?tab=email-ai&email_connected=true&email=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    console.error('[Email AI OAuth Callback Error]:', err?.message || err);
    return res.redirect(`/admin?tab=email-ai&email_error=${encodeURIComponent(err?.message || 'authorization_failed')}`);
  }
}

// All subsequent routes require admin authentication
emailAiRouter.use(requireAuth);

/**
 * GET /api/admin/email-ai/accounts
 * List all connected Gmail / Google Workspace accounts
 */
emailAiRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const accounts = EmailAiService.listAccounts('admin');
    return res.json({ accounts });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to list accounts' });
  }
});

/**
 * GET /api/admin/email-ai/google/auth-url
 * Generate authorization URL to connect a new Google account
 */
emailAiRouter.get('/google/auth-url', (req: Request, res: Response) => {
  try {
    const redirectUri = getGoogleEmailRedirectUri(req);
    const { authUrl, state } = EmailAiService.getAuthUrl(redirectUri, 'admin');
    return res.json({ authUrl, state });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to generate authorization URL' });
  }
});

/**
 * POST /api/admin/email-ai/accounts/:id/refresh
 * Refresh connection status and verify token
 */
emailAiRouter.post('/accounts/:id/refresh', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid account ID required' });
    const result = await EmailAiService.refreshAccount(id, 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to refresh account' });
  }
});

/**
 * DELETE /api/admin/email-ai/accounts/:id
 * Disconnect an email account
 */
emailAiRouter.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid account ID required' });
    const result = await EmailAiService.disconnectAccount(id, 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to disconnect account' });
  }
});

/**
 * GET /api/admin/email-ai/search
 * Search emails across authorized accounts
 */
emailAiRouter.get('/search', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const unreadOnly = req.query.unreadOnly === 'true';
    const likelyUnansweredOnly = req.query.likelyUnansweredOnly === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

    const data = await EmailAiService.searchEmails({
      accountId,
      query,
      unreadOnly,
      likelyUnansweredOnly,
      limit,
      pageToken
    }, 'admin');

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to search emails' });
  }
});

/**
 * GET /api/admin/email-ai/threads/:accountId/:threadId
 * Retrieve thread messages and metadata
 */
emailAiRouter.get('/threads/:accountId/:threadId', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const accountId = Number(req.params.accountId);
    const threadId = String(req.params.threadId || '');
    if (!accountId || !threadId) {
      return res.status(400).json({ error: 'Account ID and thread ID are required' });
    }

    const thread = await EmailAiService.getEmailThread(accountId, threadId, 'admin');
    return res.json(thread);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve email thread' });
  }
});

/**
 * GET /api/admin/email-ai/messages/:accountId/:messageId
 * Retrieve single message
 */
emailAiRouter.get('/messages/:accountId/:messageId', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const accountId = Number(req.params.accountId);
    const messageId = String(req.params.messageId || '');
    if (!accountId || !messageId) {
      return res.status(400).json({ error: 'Account ID and message ID are required' });
    }

    const message = await EmailAiService.getEmailMessage(accountId, messageId, 'admin');
    return res.json(message);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve message' });
  }
});

/**
 * GET /api/admin/email-ai/drafts
 * List reply drafts with filters
 */
emailAiRouter.get('/drafts', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const result = EmailAiService.listReplyDrafts({
      accountId,
      status,
      search,
      limit,
      offset
    }, 'admin');

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to list drafts' });
  }
});

/**
 * POST /api/admin/email-ai/drafts
 * Create a new email reply draft (idempotent)
 */
emailAiRouter.post('/drafts', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const {
      account_id,
      thread_id,
      message_id,
      recipient_email,
      recipient_name,
      subject,
      proposed_body,
      idempotency_key
    } = req.body;

    if (!account_id || !thread_id || !message_id || !recipient_email || !subject || !proposed_body) {
      return res.status(400).json({
        error: 'Missing required draft fields: account_id, thread_id, message_id, recipient_email, subject, proposed_body'
      });
    }

    const draft = EmailAiService.createReplyDraft({
      account_id: Number(account_id),
      thread_id: String(thread_id),
      message_id: String(message_id),
      recipient_email: String(recipient_email),
      recipient_name: recipient_name ? String(recipient_name) : undefined,
      subject: String(subject),
      proposed_body: String(proposed_body),
      idempotency_key: idempotency_key ? String(idempotency_key) : undefined
    }, 'admin');

    return res.status(201).json({ draft });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create draft' });
  }
});

/**
 * GET /api/admin/email-ai/drafts/:id
 * Retrieve a specific draft
 */
emailAiRouter.get('/drafts/:id', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid draft ID required' });
    const draft = EmailAiService.getReplyDraft(id, 'admin');
    return res.json({ draft });
  } catch (err: any) {
    return res.status(404).json({ error: err?.message || 'Draft not found' });
  }
});

/**
 * PUT /api/admin/email-ai/drafts/:id
 * Update an existing draft
 */
emailAiRouter.put('/drafts/:id', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid draft ID required' });

    const { subject, proposed_body, status, expected_version } = req.body;
    const updated = EmailAiService.updateReplyDraft(id, {
      subject,
      proposed_body,
      status
    }, expected_version ? Number(expected_version) : undefined, 'admin');

    return res.json({ draft: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update draft' });
  }
});

/**
 * POST /api/admin/email-ai/drafts/:id/save-to-gmail
 * Explicitly save an approved draft to Gmail as a draft
 * NEVER SENDS EMAIL.
 */
emailAiRouter.post('/drafts/:id/save-to-gmail', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid draft ID required' });

    const result = await EmailAiService.saveDraftToGmail(id, 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save draft to Gmail' });
  }
});

/**
 * DELETE /api/admin/email-ai/drafts/:id
 * Delete or archive a draft
 */
emailAiRouter.delete('/drafts/:id', async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Valid draft ID required' });
    const ok = EmailAiService.deleteReplyDraft(id, 'admin');
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete draft' });
  }
});

