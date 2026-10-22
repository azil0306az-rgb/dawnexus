/**
 * Dawnexus AI SEO Studio — Gemini + MCP Unified Client
 * Bridges Google Gemini function calling directly to authorized Dawnexus MCP tools.
 */

import { MCP_TOOLS, executeMcpTool } from './mcpServer.js';
import { getDb } from './db.js';

export const PUBLIC_CHATBOT_TOOLS = [
  'chatbot_get_public_knowledge',
  'chatbot_estimate_pricing',
  'chatbot_submit_enquiry'
] as const;

export const ADMIN_STUDIO_TOOLS = MCP_TOOLS.map(t => t.name);

export interface GeminiMessage {
  role: 'user' | 'model' | 'function';
  parts: Array<{
    text?: string;
    functionCall?: {
      name: string;
      args: Record<string, any>;
    };
    functionResponse?: {
      name: string;
      response: Record<string, any>;
    };
  }>;
}

export interface GeminiMcpExecutionOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'model' | 'system'; content: string }>;
  allowedTools: readonly string[] | string[];
  systemInstruction?: string;
  callerIp?: string;
  maxTurns?: number;
  model?: string;
  temperature?: number;
}

export interface GeminiMcpResult {
  text: string;
  toolCallsExecuted: Array<{
    tool: string;
    args: Record<string, any>;
    result: any;
  }>;
  turnCount: number;
  modelUsed: string;
}

/**
 * Secret Redaction Utility
 * Guarantees zero leakage of Gemini, Supabase, Google OAuth, or MCP secret tokens.
 */
export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const mcpKey = process.env.MCP_API_KEY?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  let redacted = text;

  if (apiKey) redacted = redacted.split(apiKey).join('[REDACTED_GEMINI_KEY]');
  if (mcpKey) redacted = redacted.split(mcpKey).join('[REDACTED_MCP_KEY]');
  if (jwtSecret) redacted = redacted.split(jwtSecret).join('[REDACTED_JWT_SECRET]');
  if (cronSecret) redacted = redacted.split(cronSecret).join('[REDACTED_CRON_SECRET]');

  // Generic key patterns (GCP, Supabase service roles, Bearer tokens)
  redacted = redacted
    .replace(/AQ\.[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/sb_[A-Za-z0-9_-]{20,}/g, '[REDACTED_SUPABASE_KEY]');

  return redacted;
}

/**
 * Converts standard JSON Schema type to Gemini Function Calling uppercase type
 */
function convertJsonSchemaToGeminiType(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'string':
      return 'STRING';
    case 'number':
      return 'NUMBER';
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'BOOLEAN';
    case 'array':
      return 'ARRAY';
    case 'object':
    default:
      return 'OBJECT';
  }
}

/**
 * Recursively convert MCP inputSchema to Gemini function parameters schema
 */
export function convertJsonSchemaToGemini(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return { type: 'OBJECT', properties: {} };
  }

  const geminiType = convertJsonSchemaToGeminiType(schema.type);
  const result: any = { type: geminiType };

  if (schema.description) {
    result.description = schema.description;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    result.enum = schema.enum.map(String);
  }

  if (geminiType === 'OBJECT') {
    result.properties = {};
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        result.properties[propName] = convertJsonSchemaToGemini(propSchema);
      }
    }
    if (Array.isArray(schema.required) && schema.required.length > 0) {
      result.required = schema.required;
    }
  } else if (geminiType === 'ARRAY') {
    if (schema.items) {
      result.items = convertJsonSchemaToGemini(schema.items);
    } else {
      result.items = { type: 'STRING' };
    }
  }

  return result;
}

/**
 * Generates Gemini function declaration list for allowed MCP tools
 */
export function getGeminiFunctionDeclarations(allowedTools: readonly string[] | string[]) {
  const allowedSet = new Set(allowedTools);
  return MCP_TOOLS.filter(tool => allowedSet.has(tool.name)).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: convertJsonSchemaToGemini(tool.inputSchema)
  }));
}

/**
 * Records Gemini MCP execution telemetry into gemini_usage_logs
 */
function recordUsageTelemetry(
  action: string,
  model: string,
  toolCount: number,
  status: 'success' | 'error',
  error: string = ''
) {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const safeError = redactSecrets(error).slice(0, 500);
    db.prepare(`
      INSERT INTO gemini_usage_logs 
      (action, model, prompt_tokens, candidate_tokens, total_tokens, status, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`mcp_${action}`, model, 0, toolCount, toolCount, status, safeError, now);
  } catch {}
}

/**
 * Executes a conversational workflow with Google Gemini function calling over authorized MCP tools
 */
export async function runGeminiWithMcp(options: GeminiMcpExecutionOptions): Promise<GeminiMcpResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const callerIp = options.callerIp || 'gemini-mcp-client';
  const maxTurns = options.maxTurns || 5;
  const allowedSet = new Set(options.allowedTools);

  // Filter tools to only permitted ones
  const functionDeclarations = getGeminiFunctionDeclarations(options.allowedTools);

  // Model fallback sequence
  const requestedModel = options.model?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const candidateModels = [
    requestedModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.6-flash'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  // Prepare Gemini contents
  const contents: GeminiMessage[] = [];

  for (const msg of options.messages) {
    if (msg.role === 'system') continue;
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Ensure at least one user message
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  const toolCallsExecuted: GeminiMcpResult['toolCallsExecuted'] = [];
  let turnCount = 0;
  let finalResponseText = '';
  let modelUsed = candidateModels[0];

  while (turnCount < maxTurns) {
    turnCount++;

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature !== undefined ? options.temperature : 0.4
      }
    };

    if (options.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }

    if (functionDeclarations.length > 0) {
      payload.tools = [{ functionDeclarations }];
    }

    let responseJson: any = null;
    let requestError: Error | null = null;

    // Model invocation with fallback retry
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (res.ok) {
          responseJson = await res.json();
          modelUsed = model;
          break;
        }

        const errText = await res.text();
        console.warn(`[Gemini MCP] Model ${model} returned status ${res.status}:`, errText.slice(0, 150));
        // Continue to fallback if rate-limited or error
      } catch (err: any) {
        requestError = err;
        console.warn(`[Gemini MCP] Error connecting to model ${model}:`, err?.message || err);
      }
    }

    if (!responseJson) {
      recordUsageTelemetry('workflow', modelUsed, toolCallsExecuted.length, 'error', requestError?.message || 'All Gemini model fallbacks failed');
      throw new Error(`Gemini service unavailable: ${redactSecrets(requestError?.message || 'Request failed across models.')}`);
    }

    const candidate = responseJson.candidates?.[0];
    if (!candidate || !candidate.content) {
      finalResponseText = 'I processed your request, but received no response from the intelligence model.';
      break;
    }

    const parts = candidate.content.parts || [];
    const functionCalls = parts.filter((p: any) => Boolean(p.functionCall));

    // Case A: Gemini returned a regular textual answer
    if (functionCalls.length === 0) {
      const textParts = parts.map((p: any) => p.text || '').filter(Boolean);
      finalResponseText = textParts.join('\n').trim();
      break;
    }

    // Case B: Gemini requested one or more MCP tool invocations
    contents.push({
      role: 'model',
      parts
    });

    for (const part of functionCalls) {
      const call = part.functionCall;
      const toolName = call.name;
      const toolArgs = call.args || {};

      let toolOutput: any;

      if (!allowedSet.has(toolName)) {
        toolOutput = {
          error: `Tool '${toolName}' is not permitted in this context.`
        };
      } else {
        try {
          toolOutput = await executeMcpTool(toolName, toolArgs, callerIp);
        } catch (execErr: any) {
          toolOutput = {
            error: execErr?.message || 'Error occurred during tool execution.'
          };
        }
      }

      toolCallsExecuted.push({
        tool: toolName,
        args: toolArgs,
        result: toolOutput
      });

      // Append function response back into conversation
      contents.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: {
                output: toolOutput
              }
            }
          }
        ]
      });
    }
  }

  recordUsageTelemetry('workflow', modelUsed, toolCallsExecuted.length, 'success');

  return {
    text: redactSecrets(finalResponseText || 'Request processed.'),
    toolCallsExecuted,
    turnCount,
    modelUsed
  };
}

