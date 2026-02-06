/**
 * Shared MCP tool definitions and dispatch handler
 *
 * Single source of truth for all tool definitions and their dispatch logic.
 * Used by both stdio (index.ts) and HTTP (http-server.ts) entry points.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

import { getDatabaseStats, getDatabaseMetadata } from '../database/db.js';
import { searchPatterns, getStrideCategories, getTechnologies, getFrameworks, getSeverityLevels } from './search.js';
import { getPattern } from './get-pattern.js';
import { listPatterns, countPatterns } from './list-patterns.js';
import { classifyTechnology, getDfdTaxonomy, suggestTrustBoundaries } from './dfd-tools.js';

/**
 * Server instructions — sent to agents during MCP initialization.
 * This is the agent-facing "README" that explains what this server does
 * and the recommended workflow for using its tools.
 */
export const SERVER_INSTRUCTIONS = `STRIDE Patterns MCP provides expert-curated threat patterns for security threat modeling using the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

Database: 125 threat patterns across 40+ security domains, 121 DFD technology elements, 12 trust boundary architecture templates. Each pattern includes CVE references, real-world breach evidence, framework-specific code mitigations, SIEM detection queries, and compliance mappings (ISO 27001, NIST, OWASP, MITRE ATT&CK).

Recommended workflow:
1. get_available_filters — discover available STRIDE categories, technologies, frameworks, and severity levels
2. search_patterns — full-text search to find relevant threats (use filters to narrow results)
3. get_pattern — retrieve full details for a specific pattern including mitigations and code examples
4. list_patterns — browse patterns with sorting and pagination when search is too narrow

For Data Flow Diagram (DFD) generation:
1. classify_technology — classify each technology into its DFD role (external_entity, process, data_store, data_flow) with Mermaid syntax
2. suggest_trust_boundaries — provide a list of technologies to get architecture-matched trust boundary templates with Mermaid diagram skeletons
3. get_dfd_taxonomy — reference for all DFD element types and Mermaid syntax conventions

Use get_database_stats for an overview of pattern coverage and confidence scores.`;

/** MCP Tool definitions — the agent-facing API surface */
export const TOOLS: Tool[] = [
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
      'Returns pattern summaries (less detail than get_pattern). ' +
      'Use get_available_filters to discover valid technology and framework values.',
    inputSchema: {
      type: 'object',
      properties: {
        stride_category: {
          type: 'string',
          description: 'Filter by STRIDE category',
          enum: ['Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'],
        },
        technology: {
          type: 'string',
          description: 'Filter by technology (use get_available_filters to see valid values)',
        },
        framework: {
          type: 'string',
          description: 'Filter by framework (use get_available_filters to see valid values)',
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

/** Tool dispatch result — index signature required by MCP SDK's ServerResult type */
interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Dispatch a tool call to the appropriate handler.
 * Single source of truth for all tool routing logic.
 */
export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
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
        sort_by: args.sort_by as 'confidence' | 'severity' | 'cvss' | 'created_date' | undefined,
        sort_order: args.sort_order as 'asc' | 'desc' | undefined,
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
