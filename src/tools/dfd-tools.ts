/**
 * DFD (Data Flow Diagram) tools for STRIDE MCP
 *
 * Provides technology classification, DFD taxonomy, and trust boundary
 * suggestions to ground Steps 1-4 of STRIDE workflows with real data.
 */

import { getDatabase } from '../database/db.js';
import type {
  DfdElement,
  TrustBoundaryTemplate,
  ClassifyTechnologyResult,
  DfdTaxonomyResult,
  DfdElementTypeInfo,
  CategoryStats,
  SuggestTrustBoundariesResult,
  TechnologyZoneAssignment,
} from '../types/dfd.js';

/** Escape SQL LIKE special characters */
function escapeLike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Classify a technology into its DFD role, category, and Mermaid shape.
 *
 * Search strategy:
 * 1. Exact match on technology name (case-insensitive)
 * 2. FTS5 full-text search on technology + aliases + description
 * 3. LIKE fallback on aliases JSON column
 * 4. Returns top 3 fuzzy suggestions if no exact match
 */
export function classifyTechnology(technology: string): ClassifyTechnologyResult {
  const db = getDatabase();
  const query = technology.trim();

  if (!query) {
    return { match: null, suggestions: [], query };
  }

  // 1. Exact match on technology name (case-insensitive)
  const exactMatch = db.prepare(`
    SELECT full_json FROM dfd_elements
    WHERE LOWER(technology) = LOWER(?)
    LIMIT 1
  `).get(query) as { full_json: string } | undefined;

  if (exactMatch) {
    return {
      match: JSON.parse(exactMatch.full_json) as DfdElement,
      suggestions: [],
      query,
    };
  }

  // 2. Alias match (search within JSON array text, case-insensitive)
  const aliasMatch = db.prepare(`
    SELECT full_json FROM dfd_elements
    WHERE LOWER(aliases) LIKE ? ESCAPE '\\'
    LIMIT 1
  `).get(`%${escapeLike(query.toLowerCase())}%`) as { full_json: string } | undefined;

  if (aliasMatch) {
    return {
      match: JSON.parse(aliasMatch.full_json) as DfdElement,
      suggestions: [],
      query,
    };
  }

  // 3. FTS5 full-text search for fuzzy matching
  try {
    const ftsResults = db.prepare(`
      SELECT d.full_json, fts.rank
      FROM dfd_elements_fts fts
      INNER JOIN dfd_elements d ON d.rowid = fts.rowid
      WHERE dfd_elements_fts MATCH ?
      ORDER BY fts.rank
      LIMIT 3
    `).all(query) as Array<{ full_json: string; rank: number }>;

    if (ftsResults.length > 0) {
      const elements = ftsResults.map(r => JSON.parse(r.full_json) as DfdElement);
      return {
        match: elements[0],
        suggestions: elements.slice(1),
        query,
      };
    }
  } catch {
    // FTS5 syntax error — fall through to LIKE search
  }

  // 4. Broad LIKE fallback on technology and description
  const escapedQuery = `%${escapeLike(query.toLowerCase())}%`;
  const likeResults = db.prepare(`
    SELECT full_json FROM dfd_elements
    WHERE LOWER(technology) LIKE ? ESCAPE '\\' OR LOWER(description) LIKE ? ESCAPE '\\'
    LIMIT 3
  `).all(escapedQuery, escapedQuery) as Array<{ full_json: string }>;

  const suggestions = likeResults.map(r => JSON.parse(r.full_json) as DfdElement);

  return {
    match: suggestions.length > 0 ? suggestions[0] : null,
    suggestions: suggestions.slice(1),
    query,
  };
}

/**
 * Mermaid syntax reference (hardcoded — this is the spec, not data)
 */
const MERMAID_REFERENCE = `## Mermaid DFD Syntax Reference

### Node Shapes (use these for DFD elements)
- **Data Store (cylinder)**: \`db[(Database Name)]\`
- **Process (rounded rect)**: \`svc(Service Name)\`
- **External Entity (rectangle)**: \`user[User Name]\`
- **Data Flow (stadium)**: \`flow([Flow Name])\`
- **Infrastructure (hexagon)**: \`infra{{Infra Name}}\`

### Edge Labels (data flow annotations)
- \`A -->|HTTPS/TLS| B\` — labeled arrow
- \`A -.->|async| B\` — dotted arrow (async)
- \`A ==>|mTLS| B\` — thick arrow (encrypted)

### Trust Boundary Subgraphs
\`\`\`mermaid
flowchart TB
    subgraph external["External (Untrusted)"]
        user[End User]
        browser[Web Browser]
    end
    subgraph dmz["DMZ (Semi-Trusted)"]
        waf{{WAF}}
        gw(API Gateway)
    end
    subgraph app["Application Tier (Trusted)"]
        svc1(Service A)
        svc2(Service B)
    end
    subgraph data["Data Tier (Highly Trusted)"]
        db[(Primary DB)]
        cache[(Cache)]
    end
    user -->|HTTPS| waf
    waf -->|filtered| gw
    gw -->|JWT auth| svc1
    gw -->|JWT auth| svc2
    svc1 -->|SQL/TLS| db
    svc2 -->|Redis protocol| cache
\`\`\`

### Style Classes
- \`classDef external fill:#ff6b6b,stroke:#c0392b,color:#fff\`
- \`classDef dmz fill:#feca57,stroke:#f39c12,color:#333\`
- \`classDef trusted fill:#48dbfb,stroke:#0abde3,color:#333\`
- \`classDef highlyTrusted fill:#55efc4,stroke:#00b894,color:#333\`
`;

/**
 * Get the complete DFD taxonomy: element type definitions, category stats,
 * and Mermaid syntax reference.
 */
export function getDfdTaxonomy(): DfdTaxonomyResult {
  const db = getDatabase();

  // Element type definitions (static — these are the DFD spec)
  const elementTypes: DfdElementTypeInfo[] = [
    {
      role: 'external_entity',
      mermaid_shape: 'rectangle',
      description: 'Actors or systems outside the trust boundary that interact with the system. Examples: users, third-party APIs, partner services.',
      example_syntax: 'user[End User]',
    },
    {
      role: 'process',
      mermaid_shape: 'rounded_rect',
      description: 'Components that transform, route, or process data. Examples: API gateways, microservices, message brokers, serverless functions.',
      example_syntax: 'api(API Gateway)',
    },
    {
      role: 'data_store',
      mermaid_shape: 'cylinder',
      description: 'Persistent or temporary storage of data. Examples: databases, caches, file systems, object storage, vector databases.',
      example_syntax: 'db[(PostgreSQL)]',
    },
    {
      role: 'data_flow',
      mermaid_shape: 'stadium',
      description: 'Communication protocols and data transfer mechanisms between components. Examples: HTTPS, gRPC, WebSocket, MQTT.',
      example_syntax: 'flow([HTTPS/TLS])',
    },
  ];

  // Category statistics from the database
  const categoryRows = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM dfd_elements
    GROUP BY category
    ORDER BY count DESC
  `).all() as CategoryStats[];

  // Total element count
  const totalRow = db.prepare(
    'SELECT COUNT(*) as total FROM dfd_elements'
  ).get() as { total: number };

  return {
    element_types: elementTypes,
    categories: categoryRows,
    mermaid_reference: MERMAID_REFERENCE,
    total_elements: totalRow.total,
  };
}

/**
 * Suggest trust boundaries for a set of technologies.
 *
 * Strategy:
 * 1. Classify each technology via classifyTechnology()
 * 2. Collect the categories and zones of classified elements
 * 3. Score each trust_boundary_templates by how well it covers the zones
 * 4. Return best template + per-technology zone assignments + Mermaid skeleton
 */
export function suggestTrustBoundaries(
  technologies: string[]
): SuggestTrustBoundariesResult {
  const db = getDatabase();

  if (!technologies || technologies.length === 0) {
    return { template: null, score: 0, assignments: [], mermaid_skeleton: '' };
  }

  // Classify each technology
  const assignments: TechnologyZoneAssignment[] = technologies.map(tech => {
    const result = classifyTechnology(tech);
    const element = result.match;
    return {
      technology: tech,
      classified_as: element,
      assigned_zone: element?.default_zone || 'application-tier',
    };
  });

  // Get all templates
  const templateRows = db.prepare(
    'SELECT full_json FROM trust_boundary_templates'
  ).all() as Array<{ full_json: string }>;

  if (templateRows.length === 0) {
    return {
      template: null,
      score: 0,
      assignments,
      mermaid_skeleton: buildFallbackMermaid(assignments),
    };
  }

  const templates = templateRows.map(
    r => JSON.parse(r.full_json) as TrustBoundaryTemplate
  );

  // Score each template: how many assigned zones match template zones?
  const assignedZones = new Set(assignments.map(a => a.assigned_zone));
  const classifiedCategories = new Set(
    assignments
      .filter(a => a.classified_as)
      .map(a => a.classified_as!.category)
  );

  let bestTemplate: TrustBoundaryTemplate = templates[0];
  let bestScore = 0;

  for (const template of templates) {
    const templateZoneNames = new Set(template.zones.map(z => z.name));

    // Zone overlap score
    let zoneOverlap = 0;
    for (const zone of assignedZones) {
      if (templateZoneNames.has(zone)) zoneOverlap++;
    }

    // Category coverage: check if template zone typical_elements mention our categories
    let categoryCoverage = 0;
    for (const zone of template.zones) {
      for (const cat of classifiedCategories) {
        if (zone.typical_elements.some(
          te => te.toLowerCase().includes(cat.replace('_', ' '))
            || te.toLowerCase().includes(cat.replace('_', '-'))
            || te.toLowerCase().includes(cat)
        )) {
          categoryCoverage++;
        }
      }
    }

    const score = zoneOverlap * 2 + categoryCoverage;
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  // Re-assign zones to match the best template's zone names
  const templateZoneNames = bestTemplate.zones.map(z => z.name);
  for (const assignment of assignments) {
    if (!templateZoneNames.includes(assignment.assigned_zone)) {
      // Map to closest template zone
      assignment.assigned_zone = findClosestZone(
        assignment.assigned_zone,
        templateZoneNames
      );
    }
  }

  // Build Mermaid skeleton from template + assignments
  const mermaidSkeleton = buildMermaidSkeleton(bestTemplate, assignments);

  return {
    template: bestTemplate,
    score: bestScore,
    assignments,
    mermaid_skeleton: mermaidSkeleton,
  };
}

/**
 * Find closest matching zone name from available template zones
 */
function findClosestZone(zone: string, templateZones: string[]): string {
  // Direct mapping of common zone aliases
  const zoneAliases: Record<string, string[]> = {
    'application-tier': ['app', 'compute', 'backend-services', 'processors', 'inference', 'workloads'],
    'data-tier': ['data', 'warehouse', 'data-lake', 'tenant-data', 'shared-data', 'model-store'],
    'dmz': ['edge', 'ingestion', 'api-tier', 'api-gateway', 'cloud-dmz'],
    'external': ['tenants', 'mobile-clients', 'field-devices', 'data-sources', 'untrusted-network'],
    'management': ['platform-management', 'management-network', 'identity-plane', 'policy-engine'],
  };

  // Try alias matching
  for (const templateZone of templateZones) {
    if (templateZone === zone) return templateZone;
    const aliases = zoneAliases[zone] || [];
    if (aliases.some(a => templateZone.includes(a))) return templateZone;
  }

  // Fallback: return the zone with the most generic name
  return templateZones.find(z => z.includes('app')) || templateZones[0];
}

/**
 * Build a Mermaid diagram skeleton from template and assignments
 */
function buildMermaidSkeleton(
  template: TrustBoundaryTemplate,
  assignments: TechnologyZoneAssignment[]
): string {
  const lines: string[] = ['flowchart TB'];

  // Group assignments by zone
  const zoneGroups = new Map<string, TechnologyZoneAssignment[]>();
  for (const a of assignments) {
    const group = zoneGroups.get(a.assigned_zone) || [];
    group.push(a);
    zoneGroups.set(a.assigned_zone, group);
  }

  // Generate subgraph for each template zone
  for (const zone of template.zones) {
    const trustLabel = zone.trust_level.replace('-', ' ');
    lines.push(`    subgraph ${sanitizeId(zone.name)}["${zone.name} (${trustLabel})"]`);

    const assigned = zoneGroups.get(zone.name) || [];
    for (const a of assigned) {
      const nodeId = sanitizeId(a.technology);
      const shape = a.classified_as?.mermaid_shape || 'rounded_rect';
      lines.push(`        ${formatMermaidNode(nodeId, a.technology, shape)}`);
    }

    // Add placeholder if zone is empty
    if (assigned.length === 0) {
      lines.push(`        %% Add ${zone.name} components here`);
    }

    lines.push('    end');
  }

  // Add example connections
  lines.push('');
  lines.push('    %% Add data flow connections below');
  lines.push('    %% Example: user -->|HTTPS| gateway');

  return lines.join('\n');
}

/**
 * Build a fallback Mermaid diagram when no templates are available
 */
function buildFallbackMermaid(assignments: TechnologyZoneAssignment[]): string {
  const lines: string[] = ['flowchart TB'];

  // Group by zone
  const zoneGroups = new Map<string, TechnologyZoneAssignment[]>();
  for (const a of assignments) {
    const group = zoneGroups.get(a.assigned_zone) || [];
    group.push(a);
    zoneGroups.set(a.assigned_zone, group);
  }

  for (const [zone, elements] of zoneGroups) {
    lines.push(`    subgraph ${sanitizeId(zone)}["${zone}"]`);
    for (const a of elements) {
      const nodeId = sanitizeId(a.technology);
      const shape = a.classified_as?.mermaid_shape || 'rounded_rect';
      lines.push(`        ${formatMermaidNode(nodeId, a.technology, shape)}`);
    }
    lines.push('    end');
  }

  return lines.join('\n');
}

/**
 * Format a Mermaid node with the correct shape syntax
 */
function formatMermaidNode(id: string, label: string, shape: string): string {
  switch (shape) {
    case 'cylinder':
      return `${id}[(${label})]`;
    case 'rounded_rect':
      return `${id}(${label})`;
    case 'rectangle':
      return `${id}[${label}]`;
    case 'stadium':
      return `${id}([${label}])`;
    case 'hexagon':
      return `${id}{{${label}}}`;
    case 'diamond':
      return `${id}{${label}}`;
    case 'circle':
      return `${id}((${label}))`;
    default:
      return `${id}(${label})`;
  }
}

/**
 * Sanitize a string for use as a Mermaid node ID
 */
function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
