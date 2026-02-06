#!/usr/bin/env node

/**
 * HTTP Server Entry Point for STRIDE Patterns MCP
 *
 * This provides Streamable HTTP transport for remote MCP clients.
 * Use src/index.ts for local stdio-based usage.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';

import { getDatabase, getDatabaseStats, getDatabaseMetadata, closeDatabase } from './database/db.js';
import { searchPatterns, getStrideCategories, getTechnologies, getFrameworks, getSeverityLevels } from './tools/search.js';
import { getPattern } from './tools/get-pattern.js';
import { listPatterns, countPatterns } from './tools/list-patterns.js';
import { classifyTechnology, getDfdTaxonomy, suggestTrustBoundaries } from './tools/dfd-tools.js';

// Server info
const SERVER_NAME = 'stride-patterns-mcp';
const SERVER_VERSION = '0.2.0';

// HTTP server port
const PORT = parseInt(process.env.PORT || '3000', 10);

// MCP Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'search_patterns',
    description:
      'Search STRIDE threat patterns using full-text search (FTS5). ' +
      'Searches across pattern titles, descriptions, attack scenarios, and mitigations. ' +
      'Returns relevant patterns with snippet highlights.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "JWT authentication bypass", "SQL injection Express")',
        },
        stride_category: {
          type: 'string',
          description: 'Filter by STRIDE category',
          enum: ['Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'],
        },
        technology: {
          type: 'string',
          description: 'Filter by technology (e.g., "APIs", "Web Applications", "Cloud")',
        },
        framework: {
          type: 'string',
          description: 'Filter by framework (e.g., "Express.js", "Flask", "Spring Boot")',
        },
        severity: {
          type: 'string',
          description: 'Filter by severity',
          enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
        },
        min_confidence: {
          type: 'number',
          description: 'Minimum confidence score (0-10, default: 0). Use 8.5+ for production-ready patterns.',
          minimum: 0,
          maximum: 10,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_pattern',
    description:
      'Get complete details for a specific STRIDE pattern by ID. ' +
      'Returns full pattern including mitigations, evidence (CVEs, breaches), detection queries, and code examples.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern_id: {
          type: 'string',
          description: 'Pattern ID (e.g., "STRIDE-API-EXPRESS-001")',
        },
      },
      required: ['pattern_id'],
    },
  },
  {
    name: 'list_patterns',
    description:
      'List STRIDE patterns with filtering, sorting, and pagination. ' +
      'Returns pattern summaries (less detail than get_pattern).',
    inputSchema: {
      type: 'object',
      properties: {
        stride_category: {
          type: 'string',
          description: 'Filter by STRIDE category',
        },
        technology: {
          type: 'string',
          description: 'Filter by technology',
        },
        framework: {
          type: 'string',
          description: 'Filter by framework',
        },
        severity: {
          type: 'string',
          description: 'Filter by severity',
          enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
        },
        min_confidence: {
          type: 'number',
          description: 'Minimum confidence score (0-10)',
          minimum: 0,
          maximum: 10,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
          minimum: 1,
          maximum: 200,
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
          minimum: 0,
        },
      },
    },
  },
  {
    name: 'get_database_stats',
    description:
      'Get statistics about the STRIDE patterns database. ' +
      'Returns total pattern count, coverage by category/technology, average confidence, and severity breakdown.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_available_filters',
    description:
      'Get available filter values for searching patterns. ' +
      'Returns lists of STRIDE categories, technologies, frameworks, and severity levels.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'classify_technology',
    description:
      'Classify a technology into its DFD (Data Flow Diagram) role and Mermaid shape. ' +
      'Returns the DFD role (external_entity, process, data_store, data_flow), ' +
      'category, default trust zone, Mermaid node syntax, and related threat pattern IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: {
          type: 'string',
          description: 'Technology name to classify (e.g., "PostgreSQL", "Kong", "Redis")',
        },
      },
      required: ['technology'],
    },
  },
  {
    name: 'get_dfd_taxonomy',
    description:
      'Get the complete DFD element taxonomy with Mermaid syntax reference. ' +
      'Returns element type definitions, category statistics, and Mermaid syntax guide.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'suggest_trust_boundaries',
    description:
      'Suggest trust boundary templates for a set of technologies. ' +
      'Returns best-fit architecture template with zone assignments and Mermaid skeleton.',
    inputSchema: {
      type: 'object',
      properties: {
        technologies: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of technology names to analyze',
        },
      },
      required: ['technologies'],
    },
  },
];

// Tool handler function
async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_patterns': {
      const results = searchPatterns({
        query: args.query as string,
        stride_category: args.stride_category as string | undefined,
        technology: args.technology as string | undefined,
        framework: args.framework as string | undefined,
        severity: args.severity as string | undefined,
        min_confidence: args.min_confidence as number | undefined,
        limit: args.limit as number | undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results,
                total: results.length,
                query: args.query,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_pattern': {
      const pattern = getPattern(args.pattern_id as string);

      if (!pattern) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Pattern not found: ${args.pattern_id}` }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(pattern, null, 2),
          },
        ],
      };
    }

    case 'list_patterns': {
      const patterns = listPatterns({
        stride_category: args.stride_category as string | undefined,
        technology: args.technology as string | undefined,
        framework: args.framework as string | undefined,
        severity: args.severity as string | undefined,
        min_confidence: args.min_confidence as number | undefined,
        validation_status: args.validation_status as string | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
        sort_by: args.sort_by as any,
        sort_order: args.sort_order as any,
      });

      const total = countPatterns({
        stride_category: args.stride_category as string | undefined,
        technology: args.technology as string | undefined,
        framework: args.framework as string | undefined,
        severity: args.severity as string | undefined,
        min_confidence: args.min_confidence as number | undefined,
        validation_status: args.validation_status as string | undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                patterns,
                total,
                returned: patterns.length,
                offset: args.offset || 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_database_stats': {
      const stats = getDatabaseStats();
      const metadata = getDatabaseMetadata();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...stats,
                metadata,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_available_filters': {
      const filters = {
        stride_categories: getStrideCategories(),
        technologies: getTechnologies(),
        frameworks: getFrameworks(),
        severity_levels: getSeverityLevels(),
        validation_statuses: ['draft', 'validated', 'expert-validated'],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filters, null, 2),
          },
        ],
      };
    }

    case 'classify_technology': {
      const result = classifyTechnology(args.technology as string);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'get_dfd_taxonomy': {
      const taxonomy = getDfdTaxonomy();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(taxonomy, null, 2),
          },
        ],
      };
    }

    case 'suggest_trust_boundaries': {
      const suggestions = suggestTrustBoundaries(args.technologies as string[]);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(suggestions, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
  }
}

// Create MCP server instance
function createMcpServer(): Server {
  // Initialize database connection
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
  const mcpServer = createMcpServer();

  // Map to store transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

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
      // Get or create session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId)!;
      } else {
        // Create new transport with session ID generator
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        // Connect MCP server to transport
        await mcpServer.connect(transport);

        // Store transport by session ID once it's assigned
        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
          }
        };
      }

      // Handle the request
      await transport.handleRequest(req, res);

      // Store transport if new session was created
      if (transport.sessionId && !transports.has(transport.sessionId)) {
        transports.set(transport.sessionId, transport);
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
