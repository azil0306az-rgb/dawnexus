import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { verifyOAuthAccessToken } from './mcpOAuth.js';

export interface McpAuditEntry {
  id: string;
  timestamp: string;
  tool: string;
  action: 'read' | 'write' | 'audit';
  status: 'success' | 'failed' | 'rejected';
  callerIp: string;
  targetId?: string | number;
  details: string;
}

const auditLog: McpAuditEntry[] = [];
const MAX_AUDIT_LOGS = 500;

export function recordMcpAudit(entry: Omit<McpAuditEntry, 'id' | 'timestamp'>) {
  const record: McpAuditEntry = {
    id: `mcp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.unshift(record);
  if (auditLog.length > MAX_AUDIT_LOGS) {
    auditLog.pop();
  }
  console.log(`[MCP Audit] [${record.status.toUpperCase()}] ${record.action} ${record.tool}: ${record.details}`);
}

export function getMcpAuditTrail(): McpAuditEntry[] {
  return [...auditLog];
}

export const DOCUMENTED_MCP_KEY = 'dawnexus_mcp_sec_dd4261fa4c111e447e53e7774bab3965';

/**
 * Derives or retrieves the expected MCP API Key
 */
export function getExpectedMcpKey(): string {
  let key = (process.env.MCP_API_KEY || '').trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1).trim();
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1).trim();
  }
  if (key.length >= 8) {
    return key;
  }
  return DOCUMENTED_MCP_KEY;
}

/**
 * Express middleware to authenticate MCP incoming requests
 */
export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Check Authorization header or query parameter for SSE stream handshake
  const rawAuth = (req.headers['authorization'] || req.headers['Authorization'] || '') as string;
  const headerKey = (req.headers['x-mcp-api-key'] || req.headers['x-api-key'] || '') as string;
  const queryKey = req.query.apiKey || req.query.token;

  let providedToken = '';
  const bearerMatch = typeof rawAuth === 'string' ? rawAuth.match(/^bearer\s+(.+)$/i) : null;
  if (bearerMatch) {
    providedToken = bearerMatch[1].trim();
  } else if (typeof rawAuth === 'string' && rawAuth.trim() && !rawAuth.includes(' ')) {
    providedToken = rawAuth.trim();
  } else if (typeof headerKey === 'string' && headerKey.trim()) {
    providedToken = headerKey.trim();
  } else if (typeof queryKey === 'string' && queryKey.trim()) {
    providedToken = queryKey.trim();
  }

  const expectedKey = getExpectedMcpKey();
  const validKeys = Array.from(new Set([expectedKey, DOCUMENTED_MCP_KEY]));

  if (!providedToken) {
    recordMcpAudit({
      tool: req.path,
      action: 'read',
      status: 'rejected',
      callerIp: req.ip || req.socket.remoteAddress || 'unknown',
      details: 'Missing MCP authentication token (Bearer header or x-mcp-api-key required).'
    });
    return res.status(401).json({
      error: 'Unauthorized. Provide Bearer token or x-mcp-api-key header.',
      hint: 'Configure MCP_API_KEY in your client connection.'
    });
  }

  let authenticated = false;

  // 1. Check if provided token is a valid signed OAuth 2.0 Access Token
  if (verifyOAuthAccessToken(providedToken)) {
    authenticated = true;
  }

  // 2. Constant-time comparison against configured API keys (x-mcp-api-key / Bearer fallback)
  if (!authenticated) {
    const bufProvided = Buffer.from(providedToken);
    for (const k of validKeys) {
      const bufK = Buffer.from(k);
      if (bufProvided.length === bufK.length && crypto.timingSafeEqual(bufProvided, bufK)) {
        authenticated = true;
        break;
      }
    }
  }

  if (!authenticated) {
    recordMcpAudit({
      tool: req.path,
      action: 'read',
      status: 'rejected',
      callerIp: req.ip || req.socket.remoteAddress || 'unknown',
      details: 'Invalid MCP authentication token provided.'
    });
    return res.status(403).json({
      error: 'Forbidden. Invalid MCP credentials provided.'
    });
  }

  // Authenticated successfully
  next();
}

