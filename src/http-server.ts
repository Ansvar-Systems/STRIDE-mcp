#!/usr/bin/env node

/**
 * STRIDE Patterns MCP Server (HTTP transport)
 *
 * Provides Streamable HTTP transport for remote MCP clients.
 * Use src/index.ts for local stdio-based usage.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';

import { getDatabase, closeDatabase } from './database/db.js';
import { TOOLS, handleToolCall, SERVER_INSTRUCTIONS } from './tools/definitions.js';

// Server info
const SERVER_NAME = 'stride-patterns-mcp';
const SERVER_VERSION = '0.2.0';

// HTTP server port
const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * Create a new MCP server instance for a session.
 * Each session gets its own MCP server to avoid shared-state issues
 * when multiple transports connect concurrently.
 */
function createMcpServer(): Server {
  // Initialize database connection (singleton, safe to call multiple times)
  getDatabase();

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  // Tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!args) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Missing arguments' }) }],
          isError: true,
        };
      }

      return await handleToolCall(name, args as Record<string, unknown>);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// Start HTTP server with Streamable HTTP transport
async function main() {
  // Map to store transports and their associated MCP servers by session ID
  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION }));
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        // Reuse existing session
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res);
      } else {
        // Create new session: dedicated transport + MCP server
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        const mcpServer = createMcpServer();
        await mcpServer.connect(transport);

        // Clean up session on close
        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        // Handle the request (this assigns the session ID)
        await transport.handleRequest(req, res);

        // Store the session for future requests
        if (transport.sessionId) {
          sessions.set(transport.sessionId, { transport, server: mcpServer });
        }
      }

      return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(PORT, () => {
    console.error(`STRIDE Patterns MCP server (HTTP) listening on port ${PORT}`);
    console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.error(`Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down...');
    httpServer.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down...');
    httpServer.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
