/**
 * Dawnexus Version 8.3.0 — Remote MCP Server for Claude
 * Implements official Streamable HTTP transport via @modelcontextprotocol/sdk
 * Endpoint: https://www.dawnexus.in/mcp
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createDawnexusMcpServer, MCP_TOOLS, executeMcpTool } from './mcpServer.js';
import { mcpAuthMiddleware } from './mcpAuth.js';
import { refreshFromPersistentStore } from './db.js';

export const mcpStreamableRouter = Router();

interface McpSessionEntry {
  transport: StreamableHTTPServerTransport;
  server: Server;
  lastActive: number;
}

export const activeStreamableSessions = new Map<string, McpSessionEntry>();

// Idle session cleanup interval (evict after 30 minutes of inactivity)
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [sessionId, entry] of activeStreamableSessions.entries()) {
    if (now - entry.lastActive > 30 * 60 * 1000) {
      try {
        entry.transport.close();
      } catch {}
      activeStreamableSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);
sessionCleanupInterval.unref();

// Global CORS middleware for /mcp
mcpStreamableRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, authorization, x-mcp-api-key, x-api-key, mcp-session-id, last-event-id'
  );
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

/**
 * GET /mcp
 * - If Accept header requests text/event-stream: initiates or resumes authenticated SSE stream.
 * - Otherwise: returns server status and capability metadata (for probes and health checking).
 */
mcpStreamableRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  const acceptHeader = (req.headers['accept'] || '') as string;

  if (!acceptHeader.includes('text/event-stream')) {
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const host = req.get('host') || 'www.dawnexus.in';
    const baseUrl = `${protocol}://${host}`;

    return res.status(200).json({
      status: 'ready',
      endpoint: `${baseUrl}/mcp`,
      transport: 'Streamable HTTP (MCP RFC 2024-11-05)',
      protocol: 'Model Context Protocol',
      server: 'dawnexus-mcp-server',
      version: '8.3.0',
      client_target: 'Claude Custom Connector',
      auth: {
        supported: ['bearer_token', 'x-mcp-api-key', 'oauth2_pkce'],
        oauth_authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
        oauth_token_endpoint: `${baseUrl}/api/mcp/oauth/token`
      },
      tools_count: MCP_TOOLS.length
    });
  }

  // Handle authenticated SSE stream
  mcpAuthMiddleware(req, res, async () => {
    try {
      const incomingSessionId = (req.headers['mcp-session-id'] as string) || '';
      let session = incomingSessionId ? activeStreamableSessions.get(incomingSessionId) : undefined;

      if (!session) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          enableJsonResponse: true
        });
        const server = createDawnexusMcpServer();
        await server.connect(transport);
        session = { transport, server, lastActive: Date.now() };
      }
      session.lastActive = Date.now();

      await session.transport.handleRequest(req, res);

      if (session.transport.sessionId && !activeStreamableSessions.has(session.transport.sessionId)) {
        activeStreamableSessions.set(session.transport.sessionId, session);
      }
    } catch (err: any) {
      console.error('[MCP Streamable] GET SSE Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Failed to handle SSE stream request' });
      }
    }
  });
});

/**
 * POST /mcp
 * Handles MCP JSON-RPC requests (initialize, notifications/initialized, tools/list, tools/call)
 */
mcpStreamableRouter.post('/', mcpAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await refreshFromPersistentStore();
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-streamable';
    const { jsonrpc, id, method, params } = req.body || {};

    // 1. Direct stateless handling for robust Vercel serverless execution
    if (jsonrpc === '2.0' && method === 'initialize') {
      const sessionId = (req.headers['mcp-session-id'] as string) || crypto.randomUUID();
      res.setHeader('mcp-session-id', sessionId);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'dawnexus-mcp-server', version: '8.3.0' }
        }
      });
    }

    if (jsonrpc === '2.0' && method === 'notifications/initialized') {
      return res.status(202).end();
    }

    if (jsonrpc === '2.0' && method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      });
    }

    if (jsonrpc === '2.0' && method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const resultData = await executeMcpTool(toolName, toolArgs, callerIp);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2)
              }
            ]
          }
        });
      } catch (err: any) {
        const isNotFound = err?.message?.includes('not recognized');
        return res.status(isNotFound ? 404 : 400).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: isNotFound ? -32601 : -32602,
            message: err?.message || `Execution of tool '${toolName}' failed.`
          }
        });
      }
    }

    // 2. Fallback to Streamable SDK transport for other protocols or custom methods
    const rawAccept = (req.headers['accept'] || '') as string;
    if (!rawAccept.includes('text/event-stream') || !rawAccept.includes('application/json')) {
      req.headers['accept'] = 'application/json, text/event-stream';
    }

    const incomingSessionId = (req.headers['mcp-session-id'] as string) || '';
    let session = incomingSessionId ? activeStreamableSessions.get(incomingSessionId) : undefined;

    if (!session) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true
      });
      const server = createDawnexusMcpServer();
      await server.connect(transport);
      session = {
        transport,
        server,
        lastActive: Date.now()
      };
    }
    session.lastActive = Date.now();

    // Pass pre-parsed Express body to SDK transport
    await session.transport.handleRequest(req, res, req.body);

    if (session.transport.sessionId && !activeStreamableSessions.has(session.transport.sessionId)) {
      activeStreamableSessions.set(session.transport.sessionId, session);
    }
  } catch (err: any) {
    console.error('[MCP Streamable] POST Request Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: err?.message || 'Internal Streamable HTTP transport error'
        },
        id: req.body?.id ?? null
      });
    }
  }
});

/**
 * DELETE /mcp
 * Closes an active MCP session and frees transport resources
 */
mcpStreamableRouter.delete('/', mcpAuthMiddleware, async (req: Request, res: Response) => {
  const incomingSessionId = (req.headers['mcp-session-id'] as string) || '';

  if (incomingSessionId && activeStreamableSessions.has(incomingSessionId)) {
    const entry = activeStreamableSessions.get(incomingSessionId)!;
    try {
      await entry.transport.close();
    } catch {}
    activeStreamableSessions.delete(incomingSessionId);
    return res.status(204).end();
  }

  // Idempotent 204 if session not found or already closed
  return res.status(204).end();
});

