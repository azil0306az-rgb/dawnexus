/**
 * Dawnexus MCP — Standard OAuth 2.0 Authorization Server
 * Implements RFC 6749 (OAuth 2.0) and RFC 8414 (OAuth 2.0 Authorization Server Metadata)
 * Compatible with Google Gemini, Vertex AI Extensions, ChatGPT, and enterprise MCP clients.
 */

import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';

export const mcpOAuthRouter = Router();

// CORS for OAuth endpoints (Claude web connector compatibility)
mcpOAuthRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, x-mcp-api-key, x-api-key');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

export const DEFAULT_OAUTH_CLIENT_ID = 'dawnexus-claude-client';
export const DEFAULT_OAUTH_CLIENT_SECRET = 'dawnexus_sec_claude_oauth_9566';
export const LEGACY_OAUTH_CLIENT_SECRET = 'dawnexus_sec_gemini_oauth_9566';
export const FALLBACK_MCP_KEY = 'dawnexus_mcp_sec_dd4261fa4c111e447e53e7774bab3965';

export function getOAuthSecret(): string {
  return process.env.JWT_SECRET || process.env.MCP_API_KEY || 'dawnexus_oauth_signing_secret_v800';
}

export function getExpectedClientId(): string {
  return (process.env.MCP_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID).trim();
}

export function getExpectedClientSecret(): string {
  return (process.env.MCP_OAUTH_CLIENT_SECRET || process.env.MCP_API_KEY || DEFAULT_OAUTH_CLIENT_SECRET).trim();
}

export function validateClientCredentials(clientId: string, clientSecret: string): boolean {
  const expectedId = getExpectedClientId();
  const expectedSec = getExpectedClientSecret();

  const secValid =
    clientSecret === expectedSec ||
    clientSecret === DEFAULT_OAUTH_CLIENT_SECRET ||
    clientSecret === LEGACY_OAUTH_CLIENT_SECRET ||
    clientSecret === FALLBACK_MCP_KEY ||
    (process.env.MCP_API_KEY && clientSecret === process.env.MCP_API_KEY.trim());

  if (!secValid) return false;

  // When client secret is verified, permit any valid client ID
  // (e.g. dawnexus-claude-client, dawnexus-gemini-client, user_bound_custom-mcp-*, etc.)
  return true;
}

/**
 * Issues a cryptographically signed HMAC OAuth 2.0 Access Token
 */
export function issueOAuthAccessToken(clientId: string, scope: string = 'mcp:tools'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: 'https://www.dawnexus.in',
    sub: clientId || getExpectedClientId(),
    scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days validity
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getOAuthSecret())
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

/**
 * Verifies signed OAuth 2.0 Access Token
 */
export function verifyOAuthAccessToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [b64Header, b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getOAuthSecret())
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    if (signature !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Issues temporary authorization code (valid 10 minutes)
 * Includes RFC 7636 PKCE code_challenge and code_challenge_method
 */
export function issueAuthCode(
  clientId: string,
  redirectUri: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): string {
  const payload = {
    sub: clientId,
    ruri: redirectUri,
    cch: codeChallenge || '',
    cm: codeChallengeMethod || (codeChallenge ? 'S256' : ''),
    exp: Math.floor(Date.now() / 1000) + 600
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getOAuthSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/**
 * Verifies temporary authorization code
 */
export function verifyAuthCode(code: string): {
  valid: boolean;
  clientId?: string;
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
} {
  try {
    const parts = code.split('.');
    if (parts.length !== 2) return { valid: false };

    const [b64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', getOAuthSecret()).update(b64).digest('base64url');
    if (sig !== expectedSig) return { valid: false };

    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return {
      valid: true,
      clientId: payload.sub,
      redirectUri: payload.ruri,
      codeChallenge: payload.cch,
      codeChallengeMethod: payload.cm
    };
  } catch {
    return { valid: false };
  }
}

// --------------------------------------------------------------------------
// Endpoints
// --------------------------------------------------------------------------

/**
 * GET /api/mcp/oauth/authorize
 * Standard OAuth 2.0 Authorization Endpoint with RFC 7636 PKCE support
 */
mcpOAuthRouter.get('/authorize', (req: Request, res: Response) => {
  const clientId = (req.query.client_id as string) || '';
  const redirectUri = (req.query.redirect_uri as string) || '';
  const responseType = (req.query.response_type as string) || 'code';
  const state = (req.query.state as string) || '';
  const scope = (req.query.scope as string) || 'mcp:tools';
  const codeChallenge = (req.query.code_challenge as string) || '';
  const codeChallengeMethod = ((req.query.code_challenge_method as string) || (codeChallenge ? 'S256' : '')).toUpperCase();

  if (responseType !== 'code') {
    return res.status(400).json({ error: 'unsupported_response_type', error_description: 'response_type must be code' });
  }

  const code = issueAuthCode(clientId, redirectUri, codeChallenge, codeChallengeMethod);

  // If redirect_uri is specified, automatically redirect back to the client
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    } catch (err) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' });
    }
  }

  // Render HTML authorization consent page if opened in a browser
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authorize Dawnexus MCP Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #050505; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    h1 { font-size: 20px; margin: 0 0 8px; color: #fff; }
    p { color: #a5a5a5; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
    .scope { background: #0b0b0b; border: 1px solid #222; border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: left; font-size: 13px; color: #C7FF4D; font-family: monospace; }
    .code-box { background: #000; border: 1px solid #333; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; color: #fff; margin-bottom: 24px; }
    .btn { display: inline-block; background: #C7FF4D; color: #000; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; width: 100%; box-sizing: border-box; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: rgba(199,255,77,0.1); color: #C7FF4D; border: 1px solid rgba(199,255,77,0.2); margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Dawnexus OAuth 2.0</div>
    <h1>Authorize MCP Server</h1>
    <p>Claude or AI assistant is requesting access to execute Dawnexus MCP tools.</p>
    <div class="scope">Scope: ${scope}</div>
    <p style="font-size:12px; color:#888;">Authorization Code:</p>
    <div class="code-box">${code}</div>
    <div style="font-size:11px; color:#666;">Copy this code into your client, or complete authorization through your connector.</div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

/**
 * POST /api/mcp/oauth/token
 * Standard OAuth 2.0 Token Endpoint
 * Handles client_credentials, authorization_code (with PKCE support), and refresh_token
 */
mcpOAuthRouter.post('/token', (req: Request, res: Response) => {
  // Support application/x-www-form-urlencoded and application/json
  let { grant_type, client_id, client_secret, code, refresh_token, scope, code_verifier } = req.body || {};

  // Extract Basic Authorization header if present
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const creds = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const [basicId, basicSecret] = creds.split(':');
      if (basicId) client_id = basicId;
      if (basicSecret) client_secret = basicSecret;
    } catch {}
  }

  // Normalize defaults
  const targetScope = scope || 'mcp:tools';

  // 1. Grant Type: client_credentials (Server-to-Server)
  if (grant_type === 'client_credentials') {
    if (!validateClientCredentials(client_id, client_secret)) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication failed. Verify client_id and client_secret.'
      });
    }

    const accessToken = issueOAuthAccessToken(client_id || getExpectedClientId(), targetScope);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400 * 30,
      scope: targetScope
    });
  }

  // 2. Grant Type: authorization_code (supports standard and PKCE)
  if (grant_type === 'authorization_code') {
    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
    }

    const check = verifyAuthCode(code);
    if (!check.valid) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code is invalid or expired' });
    }

    // Verify PKCE if code_challenge was recorded
    if (check.codeChallenge) {
      if (!code_verifier) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE code_verifier is required for this authorization code.'
        });
      }

      let challengeMatches = false;
      if (check.codeChallengeMethod === 'S256') {
        const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
        challengeMatches = hash === check.codeChallenge;
      } else {
        // Plain
        challengeMatches = code_verifier === check.codeChallenge;
      }

      if (!challengeMatches) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed: code_verifier does not match code_challenge.'
        });
      }
    } else {
      // If not using PKCE, client_secret is required if provided
      if (client_secret && !validateClientCredentials(client_id, client_secret)) {
        return res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
      }
    }

    // If client_secret is provided with PKCE, still validate if present
    if (client_secret && !validateClientCredentials(client_id, client_secret)) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
    }

    const accessToken = issueOAuthAccessToken(client_id || check.clientId || getExpectedClientId(), targetScope);
    const refreshToken = issueOAuthAccessToken(client_id || check.clientId || getExpectedClientId(), `${targetScope}:refresh`);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400 * 30,
      refresh_token: refreshToken,
      scope: targetScope
    });
  }

  // 3. Grant Type: refresh_token
  if (grant_type === 'refresh_token') {
    if (!refresh_token || !verifyOAuthAccessToken(refresh_token)) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh token' });
    }

    const accessToken = issueOAuthAccessToken(client_id || getExpectedClientId(), targetScope);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400 * 30,
      scope: targetScope
    });
  }

  return res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: `grant_type '${grant_type}' is not supported. Use client_credentials or authorization_code.`
  });
});

/**
 * POST /api/mcp/oauth/register
 * RFC 7591 OAuth 2.0 Dynamic Client Registration
 * Enables Claude Custom Connector to automatically register without manual Client ID entry
 */
mcpOAuthRouter.post('/register', (req: Request, res: Response) => {
  const { client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method } = req.body || {};

  const clientId = DEFAULT_OAUTH_CLIENT_ID;
  const clientSecret = DEFAULT_OAUTH_CLIENT_SECRET;

  return res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    client_name: client_name || 'Claude Custom Connector',
    redirect_uris: Array.isArray(redirect_uris) && redirect_uris.length > 0
      ? redirect_uris
      : ['https://claude.ai/api/mcp/auth_callback'],
    grant_types: grant_types || ['authorization_code', 'refresh_token'],
    response_types: response_types || ['code'],
    token_endpoint_auth_method: token_endpoint_auth_method || 'none'
  });
});

/**
 * Standard RFC 8414 OAuth 2.0 Authorization Server Metadata
 */
export function getOAuthServerMetadata(baseUrl: string) {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
    registration_endpoint: `${baseUrl}/api/mcp/oauth/register`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: ['mcp:tools', 'read', 'write'],
    service_documentation: `${baseUrl}/api/mcp/status`
  };
}

/**
 * Standard RFC 9728 OAuth 2.0 Protected Resource Metadata
 */
export function getOAuthProtectedResourceMetadata(baseUrl: string) {
  return {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ['mcp:tools', 'read', 'write'],
    bearer_methods_supported: ['header', 'query']
  };
}

mcpOAuthRouter.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host') || 'www.dawnexus.in';
  res.json(getOAuthServerMetadata(`${protocol}://${host}`));
});
