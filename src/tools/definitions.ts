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
import { findPatternsByReference } from './reference-lookup.js';
import { filterByTags } from './tag-filter.js';
import { searchMitigations } from './mitigation-search.js';
import { searchThreats, getLinddunCategories } from './linddun-search-threats.js';
import { getThreatTree } from './linddun-threat-tree.js';
import { getMitigations } from './linddun-mitigations.js';
import { searchPrivacyPatterns } from './linddun-pattern-search.js';
import { listSources } from './list-sources.js';

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

For cross-server threat intelligence lookup:
1. find_patterns_by_reference — find STRIDE patterns linked to a CVE, ATT&CK technique, CWE, or OWASP category (auto-detects reference type)

For filtering by organizational context:
1. filter_by_tags — filter patterns by industry, compliance framework, or deployment environment. Omit tag_value to list available values.

For searching mitigations directly:
1. search_mitigations — search framework-specific code mitigations by keyword, framework, effectiveness, or complexity

For privacy threat modeling with LINDDUN:
1. search_threats — search across the seven LINDDUN privacy threat categories
2. get_threat_tree — retrieve full category threat tree and leaf nodes
3. get_mitigations — retrieve privacy-preserving mitigations for a threat
4. search_privacy_patterns — search privacy design patterns with DFD annotations

All LINDDUN responses include source-backed traceability via sources and claim-level citations.

For data provenance:
1. list_sources — list all data sources with authority, update frequency, license, and known limitations

Use get_database_stats for an overview of pattern coverage and confidence scores.`;

/** MCP Tool definitions — the agent-facing API surface */
export const TOOLS: Tool[] = [
  {
    name: 'search_patterns',
    description:
      'Search STRIDE threat patterns using full-text search (FTS5). ' +
      'Searches across pattern titles, descriptions, attack scenarios, and mitigations. ' +
      'Returns a JSON object with a results array and total count. ' +
      'Use plain keywords only — FTS5 operators (AND/OR/NOT) are not supported. ' +
      'Prefer list_patterns when browsing by category without a specific keyword.',
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
      'Returns full pattern including id, threat, classification, mitigations, evidence (CVEs, breaches), detection queries, and code examples. ' +
      'Use search_patterns first to discover valid pattern IDs if you do not already have one.',
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
      'Returns pattern summaries (less detail than get_pattern) with a total count and pagination offset. ' +
      'Default sort is by confidence descending. ' +
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
      'Supports case-insensitive exact match, alias lookup, and FTS5 fallback. Unrecognized technologies return match: null with up to 2 suggestions. ' +
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
  {
    name: 'find_patterns_by_reference',
    description:
      'Find STRIDE patterns linked to a CVE, ATT&CK technique, CWE, or OWASP category. ' +
      'Auto-detects reference type from the ID prefix (e.g., CVE-2021-44228 → cve, T1003 → mitre). ' +
      'Use this to bridge threat intelligence data with STRIDE patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        reference_id: {
          type: 'string',
          description: 'Reference identifier (e.g., "CVE-2021-44228", "T1003", "CWE-79", "A01:2021", "LLM02:2025")',
        },
        reference_type: {
          type: 'string',
          description: 'Reference type (auto-detected if omitted)',
          enum: ['cve', 'mitre', 'cwe', 'owasp'],
        },
      },
      required: ['reference_id'],
    },
  },
  {
    name: 'filter_by_tags',
    description:
      'Filter patterns by industry, compliance framework, or deployment environment. ' +
      'Omit tag_value to list available values with pattern counts. ' +
      'Provide tag_value to get matching pattern summaries with pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        tag_type: {
          type: 'string',
          description: 'Type of tag to filter by',
          enum: ['industry', 'compliance', 'deployment'],
        },
        tag_value: {
          type: 'string',
          description: 'Specific tag value to filter by (omit to list available values)',
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
      required: ['tag_type'],
    },
  },
  {
    name: 'search_mitigations',
    description:
      'Search framework-specific code mitigations directly by keyword, framework, effectiveness, or complexity. ' +
      'Returns mitigation details including code examples. All filters are optional.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text search across mitigation titles and descriptions (e.g., "rate limiting", "input validation")',
        },
        framework: {
          type: 'string',
          description: 'Filter by code framework (partial match, e.g., "Express", "Flask")',
        },
        effectiveness: {
          type: 'string',
          description: 'Filter by mitigation effectiveness',
          enum: ['High', 'Medium', 'Low'],
        },
        implementation_complexity: {
          type: 'string',
          description: 'Filter by implementation complexity',
          enum: ['High', 'Medium', 'Low'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'search_threats',
    description:
      'Search LINDDUN privacy threats across Linking, Identifying, Non-repudiation, Detecting, Data disclosure, Unawareness, and Non-compliance. ' +
      'LINDDUN stands for Linking, Identifying, Non-repudiation, Detecting, Data disclosure, Unawareness, Non-compliance. ' +
      'Uses FTS search over tree paths, descriptions, examples, and mitigations. ' +
      'Returns a results array with total count.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional full-text query (e.g., "cross-context identifier", "covert tracking")',
        },
        category: {
          type: 'string',
          description: 'Optional LINDDUN category filter',
          enum: ['Linking', 'Identifying', 'Non-repudiation', 'Detecting', 'Data disclosure', 'Unawareness', 'Non-compliance'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'get_threat_tree',
    description:
      'Get the full LINDDUN threat tree for a category, including all leaf threats and their metadata. ' +
      'Returns a category object with a threats array containing tree_path, description, examples, and mitigations for each leaf.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'LINDDUN category',
          enum: ['Linking', 'Identifying', 'Non-repudiation', 'Detecting', 'Data disclosure', 'Unawareness', 'Non-compliance'],
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'get_mitigations',
    description:
      'Get privacy-enhancing mitigations for a specific LINDDUN threat ID. ' +
      'Threat IDs use the format LINDDUN-{CATEGORY}-{NUMBER} (e.g., "LINDDUN-LINKING-001"). ' +
      'Returns the threat details and its associated mitigations with source citations.',
    inputSchema: {
      type: 'object',
      properties: {
        threat_id: {
          type: 'string',
          description: 'LINDDUN threat ID (e.g., "LINDDUN-LINKING-001")',
        },
      },
      required: ['threat_id'],
    },
  },
  {
    name: 'search_privacy_patterns',
    description:
      'Search LINDDUN privacy design patterns and DFD annotations by keyword and category. ' +
      'Results include DFD element annotations showing where each pattern applies in a data flow diagram.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional full-text query (e.g., "pseudonymization", "consent flow")',
        },
        category: {
          type: 'string',
          description: 'Optional LINDDUN category filter',
          enum: ['Linking', 'Identifying', 'Non-repudiation', 'Detecting', 'Data disclosure', 'Unawareness', 'Non-compliance'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'list_sources',
    description:
      'List all data sources used by this MCP server with provenance metadata. ' +
      'Returns source names, authorities, update frequencies, licenses, coverage scope, ' +
      'known limitations, schema version, and last build timestamp.',
    inputSchema: {
      type: 'object',
      properties: {},
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
      const query = args.query;
      if (typeof query !== 'string' || !query.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'query is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
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
      const patternId = args.pattern_id;
      if (typeof patternId !== 'string' || !patternId.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'pattern_id is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      const pattern = getPattern(patternId);

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
        linddun_categories: getLinddunCategories(),
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
      const technology = args.technology;
      if (typeof technology !== 'string' || !technology.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'technology is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      const result = classifyTechnology(technology);
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
      const technologies = args.technologies;
      if (!Array.isArray(technologies)) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'technologies is required and must be an array' }) }],
          isError: true,
        };
      }
      const suggestions = suggestTrustBoundaries(technologies);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(suggestions, null, 2),
          },
        ],
      };
    }

    case 'find_patterns_by_reference': {
      const referenceId = args.reference_id;
      if (typeof referenceId !== 'string' || !referenceId.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'reference_id is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      try {
        const result = findPatternsByReference(
          referenceId,
          args.reference_type as 'cve' | 'mitre' | 'cwe' | 'owasp' | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'filter_by_tags': {
      const tagType = args.tag_type;
      if (typeof tagType !== 'string' || !tagType.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'tag_type is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      try {
        const result = filterByTags(
          tagType,
          args.tag_value as string | undefined,
          args.limit as number | undefined,
          args.offset as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'search_mitigations': {
      const result = searchMitigations({
        query: args.query as string | undefined,
        framework: args.framework as string | undefined,
        effectiveness: args.effectiveness as string | undefined,
        implementation_complexity: args.implementation_complexity as string | undefined,
        limit: args.limit as number | undefined,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'search_threats': {
      try {
        const results = searchThreats({
          query: args.query as string | undefined,
          category: args.category as import('../types/linddun.js').LinddunCategory | undefined,
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
                  query: args.query ?? null,
                  category: args.category ?? null,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'get_threat_tree': {
      const category = args.category;
      if (typeof category !== 'string' || !category.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'category is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      try {
        const tree = getThreatTree(category);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tree, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'get_mitigations': {
      const threatId = args.threat_id;
      if (typeof threatId !== 'string' || !threatId.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'threat_id is required and must be a non-empty string' }) }],
          isError: true,
        };
      }
      const result = getMitigations(threatId);
      if (!result) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Threat not found: ${threatId}` }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'search_privacy_patterns': {
      try {
        const results = searchPrivacyPatterns({
          query: args.query as string | undefined,
          category: args.category as import('../types/linddun.js').LinddunCategory | undefined,
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
                  query: args.query ?? null,
                  category: args.category ?? null,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'list_sources': {
      const result = listSources();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
