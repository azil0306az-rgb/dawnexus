import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

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

/**
 * Derives or retrieves the expected MCP API Key
 */
export function getExpectedMcpKey(): string {
  if (process.env.MCP_API_KEY && process.env.MCP_API_KEY.trim()) {
    return process.env.MCP_API_KEY.trim();
  }
  // Deterministic fallback derived from admin password hash
  const seed = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || 'dawnexus-mcp-default-secret-salt-2026';
  return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 32);
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
  const authHeader = req.headers['authorization'] || '';
  const headerKey = req.headers['x-mcp-api-key'] || req.headers['x-api-key'] || '';
  const queryKey = req.query.apiKey || req.query.token;

  let providedToken = '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7).trim();
  } else if (typeof headerKey === 'string' && headerKey.trim()) {
    providedToken = headerKey.trim();
  } else if (typeof queryKey === 'string' && queryKey.trim()) {
    providedToken = queryKey.trim();
  }

  const expectedKey = getExpectedMcpKey();

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

  // Constant-time comparison to prevent timing attacks
  const bufProvided = Buffer.from(providedToken);
  const bufExpected = Buffer.from(expectedKey);

  if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
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
