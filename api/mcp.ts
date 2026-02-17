import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { createRequire } from 'node:module';

import { getDatabase, getDatabaseStats, getDatabaseMetadata } from '../src/database/db.js';
import { TOOLS, handleToolCall, SERVER_INSTRUCTIONS } from '../src/tools/definitions.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const SERVER_NAME = 'stride-patterns-mcp';
const SERVER_VERSION = pkg.version;

// Session store (persists across warm invocations)
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

function createMcpServer(): Server {
  getDatabase();
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      if (!args) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing arguments' }) }], isError: true };
      }
      return await handleToolCall(name, args as Record<string, unknown>);
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
        isError: true,
      };
    }
  });

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Health check
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  if (url.pathname === '/health' || (url.pathname === '/api/mcp' && req.method === 'GET')) {
    try {
      const stats = getDatabaseStats();
      const metadata = getDatabaseMetadata();
      return res.status(200).json({
        status: 'ok',
        server: SERVER_NAME,
        version: SERVER_VERSION,
        db_status: 'connected',
        total_patterns: stats.total_patterns,
        schema_version: metadata.schema_version,
        last_build: metadata.last_build,
      });
    } catch {
      return res.status(503).json({
        status: 'degraded',
        server: SERVER_NAME,
        version: SERVER_VERSION,
        db_status: 'error',
      });
    }
  }

  // MCP endpoint
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  } else {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    await transport.handleRequest(req, res);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, { transport, server: mcpServer });
    }
  }
}
