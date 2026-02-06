#!/usr/bin/env node

/**
 * STRIDE Patterns MCP Server (stdio transport)
 *
 * Provides expert-curated STRIDE threat patterns with CVE validation,
 * real-world evidence, and actionable mitigations via the MCP protocol.
 *
 * Architecture: TypeScript + SQLite + FTS5
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getDatabase, closeDatabase } from './database/db.js';
import { TOOLS, handleToolCall } from './tools/definitions.js';

// Server info
const SERVER_NAME = 'stride-patterns-mcp';
const SERVER_VERSION = '0.2.0';

// Create MCP server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('\n⏹️  Shutting down STRIDE Patterns MCP server...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n⏹️  Shutting down STRIDE Patterns MCP server...');
  closeDatabase();
  process.exit(0);
});

// Start server
async function main() {
  try {
    // Initialize database connection
    getDatabase();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('✅ STRIDE Patterns MCP server started');
    console.error(`📊 Version: ${SERVER_VERSION}`);
    console.error(`🔧 Tools: ${TOOLS.length}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
