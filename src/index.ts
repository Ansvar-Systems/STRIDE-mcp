#!/usr/bin/env node

/**
 * STRIDE Patterns MCP Server
 *
 * Provides 1000+ expert-curated STRIDE threat patterns with CVE validation,
 * real-world evidence, and actionable mitigations.
 *
 * Architecture: TypeScript + SQLite + FTS5 (based on EU Compliance MCP)
 * Quality: 8.5+ confidence score, CVE-validated, expert-reviewed
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { getDatabase, getDatabaseStats, getDatabaseMetadata, closeDatabase } from './database/db.js';
import { searchPatterns, getStrideCategories, getTechnologies, getFrameworks, getSeverityLevels } from './tools/search.js';
import { getPattern } from './tools/get-pattern.js';
import { listPatterns, countPatterns } from './tools/list-patterns.js';
import { classifyTechnology, getDfdTaxonomy, suggestTrustBoundaries } from './tools/dfd-tools.js';

// Server info
const SERVER_NAME = 'stride-patterns-mcp';
const SERVER_VERSION = '0.2.0';

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
        validation_status: {
          type: 'string',
          description: 'Filter by validation status',
          enum: ['draft', 'validated', 'expert-validated'],
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
        sort_by: {
          type: 'string',
          description: 'Sort by field (default: confidence)',
          enum: ['confidence', 'severity', 'cvss', 'created_date'],
        },
        sort_order: {
          type: 'string',
          description: 'Sort order (default: desc)',
          enum: ['asc', 'desc'],
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
      'category, default trust zone, Mermaid node syntax, and related threat pattern IDs. ' +
      'Use this to correctly place technologies in data flow diagrams.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: {
          type: 'string',
          description: 'Technology name to classify (e.g., "PostgreSQL", "Kong", "Redis", "AWS Lambda")',
        },
      },
      required: ['technology'],
    },
  },
  {
    name: 'get_dfd_taxonomy',
    description:
      'Get the complete DFD element taxonomy with Mermaid syntax reference. ' +
      'Returns DFD element type definitions (external_entity, process, data_store, data_flow), ' +
      'category statistics, and a comprehensive Mermaid syntax guide for rendering DFDs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'suggest_trust_boundaries',
    description:
      'Suggest trust boundary templates for a set of technologies. ' +
      'Classifies each technology, matches against architecture templates ' +
      '(microservices, serverless, monolith, etc.), and returns the best-fit template ' +
      'with per-technology zone assignments and a Mermaid diagram skeleton.',
    inputSchema: {
      type: 'object',
      properties: {
        technologies: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of technology names to analyze (e.g., ["Kong", "Express.js", "PostgreSQL", "Redis"])',
        },
      },
      required: ['technologies'],
    },
  },
];

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
  console.error('\\n⏹️  Shutting down STRIDE Patterns MCP server...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\\n⏹️  Shutting down STRIDE Patterns MCP server...');
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
