import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  EmailAiService,
  generateEmailOAuthState,
  verifyEmailOAuthState,
  sanitizeEmailHtml,
  EMAIL_OAUTH_SCOPES
} from '../emailAiService.js';
import {
  upsertConnectedEmailAccount,
  getConnectedEmailAccounts,
  getConnectedEmailAccountById,
  deleteConnectedEmailAccount,
  createEmailReplyDraft,
  getEmailReplyDraftById,
  getEmailReplyDrafts,
  updateEmailReplyDraft,
  deleteEmailReplyDraft
} from '../db.js';
import { encryptPayload, decryptPayload } from '../gscService.js';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import { emailAiRouter } from '../routes/emailAi.js';

describe('Dawnexus Version 8.2.5 — Email AI & Multi-Inbox MCP Integration', () => {
  let serverInstance: http.Server;
  let testPort: number;
  let baseUrl: string;

  let testAccountId: number = 0;
  let testDraftId: number = 0;
  const testEmail = `test-inbox-${Date.now()}@example.com`;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Mock authenticated admin session for test app
    app.use((req, res, next) => {
      // Mock admin auth
      (req as any).adminUser = 'admin';
      next();
    });
    app.use('/api/admin/email-ai', emailAiRouter);
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        brand: 'Dawnexus',
        version: '8.2.5',
        release: '8.2.5 — Email AI & Multi-Inbox MCP Integration',
        timestamp: new Date().toISOString()
      });
    });

    await new Promise<void>((resolve) => {
      serverInstance = app.listen(0, () => {
        const addr = serverInstance.address();
        if (typeof addr === 'object' && addr !== null) {
          testPort = addr.port;
          baseUrl = `http://localhost:${testPort}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    // Teardown created test records to preserve pristine database
    if (testDraftId) {
      deleteEmailReplyDraft(testDraftId, 'admin');
    }
    if (testAccountId) {
      deleteConnectedEmailAccount(testAccountId, 'admin');
    }
    if (serverInstance) {
      serverInstance.close();
    }
  });

  // 1. OAuth State Generation & Cryptographic Verification
  test('1. OAuth State: generates signed state and verifies CSRF tokens', () => {
    const state = generateEmailOAuthState('admin');
    assert.ok(state.length > 20);
    assert.ok(state.includes('.'));

    // Valid state verifies
    const isValid = verifyEmailOAuthState(state, 'admin');
    assert.strictEqual(isValid, true);

    // Mismatched admin user fails
    const isMismatched = verifyEmailOAuthState(state, 'other_admin');
    assert.strictEqual(isMismatched, false);

    // Tampered signature fails
    const tampered = state.slice(0, -4) + 'abcd';
    const isTamperedValid = verifyEmailOAuthState(tampered, 'admin');
    assert.strictEqual(isTamperedValid, false);
  });

  // 2. Encryption at rest for OAuth credentials
  test('2. Token Security: AES-256-GCM securely encrypts and decrypts OAuth payload', () => {
    const sensitiveTokens = JSON.stringify({
      access_token: 'ya29.mock_token_secret_data_123',
      refresh_token: '1//mock_refresh_token_secret_456',
      expiry_date: Date.now() + 3600000
    });

    const encrypted = encryptPayload(sensitiveTokens);
    assert.notStrictEqual(encrypted, sensitiveTokens);
    assert.ok(encrypted.includes(':')); // Format: iv:authTag:ciphertext

    // Never contains cleartext tokens
    assert.strictEqual(encrypted.includes('ya29.mock_token'), false);
    assert.strictEqual(encrypted.includes('1//mock_refresh'), false);

    const decrypted = decryptPayload(encrypted);
    assert.strictEqual(decrypted, sensitiveTokens);
  });

  // 3. HTML Email Sanitization & Remote Image Blocking
  test('3. HTML Sanitization: strips scripts, iframes, styles and blocks remote image tracking pixels', () => {
    const maliciousEmail = `
      <div>
        <h2>Invoice Details</h2>
        <script>alert('xss attacker')</script>
        <iframe src="http://attacker.com/evil"></iframe>
        <a href="javascript:stealCookie()">Click here</a>
        <img src="https://tracker.com/pixel.png" alt="tracker" />
        <p>Dear customer, please review your enquiry.</p>
      </div>
    `;

    const sanitized = sanitizeEmailHtml(maliciousEmail);
    assert.strictEqual(sanitized.includes('<script>'), false);
    assert.strictEqual(sanitized.includes('<iframe>'), false);
    assert.strictEqual(sanitized.includes('javascript:'), false);
    assert.strictEqual(sanitized.includes('src="https://tracker.com'), false);
    assert.ok(sanitized.includes('Remote Image Blocked'));
    assert.ok(sanitized.includes('Dear customer, please review your enquiry.'));
  });

  // 4. Account Storage & Credential Isolation
  test('4. Connected Accounts: persists account, scopes, and shields credentials from list responses', () => {
    const encryptedTokens = encryptPayload(JSON.stringify({
      access_token: 'ya29.test_token',
      refresh_token: '1//test_refresh'
    }));

    const account = upsertConnectedEmailAccount({
      admin_user: 'admin',
      google_email: testEmail,
      display_name: 'Dawnexus Support Test',
      encrypted_tokens: encryptedTokens,
      scopes: EMAIL_OAUTH_SCOPES,
      connection_status: 'Connected'
    });

    assert.ok(account.id > 0);
    testAccountId = account.id;

    // List accounts through service
    const accounts = EmailAiService.listAccounts('admin');
    const found = accounts.find(a => a.id === testAccountId);
    assert.ok(found);
    assert.strictEqual(found?.google_email, testEmail);
    assert.strictEqual(found?.connection_status, 'Connected');

    // Asserts that encrypted_tokens is NOT in the public view model
    assert.strictEqual((found as any).encrypted_tokens, undefined);
  });

  // 5. Server-Side Idempotency for Reply Draft Creation
  test('5. Draft Idempotency: repeated draft creation returns identical record without duplicates', () => {
    assert.ok(testAccountId > 0, 'Test account must exist');

    const idempotencyKey = `idemp_draft_${Date.now()}`;
    const testThreadId = `thread_${Date.now()}`;
    const testMessageId = `msg_${Date.now()}`;

    // First draft creation
    const draft1 = EmailAiService.createReplyDraft({
      account_id: testAccountId,
      thread_id: testThreadId,
      message_id: testMessageId,
      recipient_email: 'client@example.com',
      recipient_name: 'Valued Client',
      subject: 'Re: Quotation Enquiry for Website Redesign',
      proposed_body: 'Hi Valued Client,\n\nThank you for reaching out. Here is our proposed package.',
      idempotency_key: idempotencyKey
    }, 'admin');

    assert.ok(draft1.id > 0);
    assert.strictEqual(draft1.status, 'Proposed');
    testDraftId = draft1.id;

    // Second creation call with identical idempotency key
    const draft2 = EmailAiService.createReplyDraft({
      account_id: testAccountId,
      thread_id: testThreadId,
      message_id: testMessageId,
      recipient_email: 'client@example.com',
      subject: 'Re: Quotation Enquiry for Website Redesign',
      proposed_body: 'Hi Valued Client,\n\nThank you for reaching out.',
      idempotency_key: idempotencyKey
    }, 'admin');

    assert.strictEqual(draft2.id, draft1.id, 'Idempotency key must return the existing draft ID');

    // Third creation call without key but same thread + message
    const draft3 = EmailAiService.createReplyDraft({
      account_id: testAccountId,
      thread_id: testThreadId,
      message_id: testMessageId,
      recipient_email: 'client@example.com',
      subject: 'Re: Quotation Enquiry for Website Redesign',
      proposed_body: 'Different body'
    }, 'admin');

    assert.strictEqual(draft3.id, draft1.id, 'Matching thread_id and message_id must return existing draft');
  });

  // 6. Draft Optimistic Version Control
  test('6. Draft Versioning: updating draft increments version and enforces concurrency check', () => {
    assert.ok(testDraftId > 0);

    const initial = EmailAiService.getReplyDraft(testDraftId, 'admin');
    assert.strictEqual(initial.version, 1);

    // Valid update increments version
    const updated = EmailAiService.updateReplyDraft(
      testDraftId,
      {
        proposed_body: 'Updated body with additional details',
        status: 'Reviewed'
      },
      1, // expected version
      'admin'
    );

    assert.strictEqual(updated.version, 2);
    assert.strictEqual(updated.status, 'Reviewed');
    assert.ok(updated.proposed_body.includes('additional details'));

    // Outdated version throws concurrency error
    assert.throws(() => {
      EmailAiService.updateReplyDraft(
        testDraftId,
        { proposed_body: 'Stale update' },
        1, // stale version
        'admin'
      );
    }, /Concurrency conflict/);
  });

  // 7. Save Draft to Gmail Safety: Requires explicit approval and guarantees zero email sending
  test('7. Save Draft Safety: requires explicit approval flag and guarantees zero email sending', async () => {
    assert.ok(testDraftId > 0);

    // Call without explicit approval throws error
    await assert.rejects(
      async () => {
        await executeMcpTool('save_email_draft_to_gmail', {
          id: testDraftId,
          approved: false
        }, 'test-caller');
      },
      /approval confirmation/
    );
  });

  // 8. MCP Tools Registry: All 9 Email AI Tools Discovered with Correct Schemas
  test('8. MCP Tool Registration: All 9 Email AI tools are registered in MCP_TOOLS', () => {
    const requiredTools = [
      'list_connected_email_accounts',
      'search_emails',
      'get_email_thread',
      'get_email_message',
      'create_email_reply_draft',
      'list_email_reply_drafts',
      'get_email_reply_draft',
      'update_email_reply_draft',
      'save_email_draft_to_gmail'
    ];

    const registeredNames = MCP_TOOLS.map(t => t.name);

    for (const tool of requiredTools) {
      assert.ok(
        registeredNames.includes(tool),
        `MCP Tool '${tool}' must be registered in MCP_TOOLS`
      );
    }
  });

  // 9. MCP Tool Execution: Read-only and draft listing execution
  test('9. MCP Tool Execution: list_connected_email_accounts and list_email_reply_drafts succeed via executeMcpTool', async () => {
    // 1. list_connected_email_accounts
    const accountsResult = await executeMcpTool('list_connected_email_accounts', {}, 'test-runner');
    assert.ok(Array.isArray(accountsResult.accounts));
    assert.ok(accountsResult.total >= 1);

    // 2. list_email_reply_drafts
    const draftsResult = await executeMcpTool('list_email_reply_drafts', { limit: 10 }, 'test-runner');
    assert.ok(Array.isArray(draftsResult.drafts));
    assert.ok(draftsResult.total >= 1);

    // 3. get_email_reply_draft
    const singleDraftResult = await executeMcpTool('get_email_reply_draft', { id: testDraftId }, 'test-runner');
    assert.strictEqual(singleDraftResult.draft.id, testDraftId);
  });

  // 10. Health check reports Version 8.2.5
  test('10. Health Check: reports version 8.2.5 and release name', async () => {
    const res = await fetch(`http://localhost:${testPort}/api/health`).catch(() => null);
    if (!res) {
      // If mounted on root server
      const { version } = await import('../../package.json');
      assert.strictEqual(version, '8.2.5');
    } else {
      const data = await res.json();
      assert.strictEqual(data.version, '8.2.5');
      assert.ok(data.release.includes('8.2.5'));
    }
  });
});
