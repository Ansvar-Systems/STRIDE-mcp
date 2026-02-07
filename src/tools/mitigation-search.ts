/**
 * Tool 3: search_mitigations
 *
 * Search 463 framework-specific code mitigations directly,
 * without going through patterns first.
 *
 * Uses LIKE-based text search (no FTS5 — 463 rows is fine for LIKE).
 * Orders by effectiveness (High first), then by title.
 */

import { getDatabase } from '../database/db.js';
import type { MitigationRecord, MitigationSearchResult } from '../types/pattern.js';

export interface MitigationSearchOptions {
  query?: string;
  framework?: string;
  effectiveness?: string;
  implementation_complexity?: string;
  limit?: number;
}

/**
 * Search mitigations by keyword, framework, effectiveness, or complexity.
 *
 * All filters are optional — omitting all returns mitigations ordered by effectiveness.
 */
export function searchMitigations(options: MitigationSearchOptions): MitigationSearchResult {
  const db = getDatabase();

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Text search on title + description
  if (options.query && options.query.trim()) {
    conditions.push('(m.title LIKE ? OR m.description LIKE ?)');
    const term = `%${options.query.trim()}%`;
    params.push(term, term);
  }

  // Framework filter (partial match for flexibility)
  if (options.framework && options.framework.trim()) {
    conditions.push('m.code_framework LIKE ?');
    params.push(`%${options.framework.trim()}%`);
  }

  // Effectiveness filter (exact match)
  if (options.effectiveness && options.effectiveness.trim()) {
    conditions.push('m.effectiveness = ?');
    params.push(options.effectiveness.trim());
  }

  // Implementation complexity filter (exact match)
  if (options.implementation_complexity && options.implementation_complexity.trim()) {
    conditions.push('m.implementation_complexity = ?');
    params.push(options.implementation_complexity.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const effectiveLimit = Math.min(Math.max(options.limit || 20, 1), 100);

  // Count total matches
  const countRow = db.prepare(
    `SELECT COUNT(*) AS total FROM mitigations m ${whereClause}`
  ).get(...params) as { total: number };

  // Get matching mitigations — order by effectiveness (High first), then title
  const rows = db.prepare(`
    SELECT
      m.id,
      m.pattern_id,
      m.title,
      m.description,
      m.effectiveness,
      m.implementation_complexity,
      m.code_language,
      m.code_framework,
      m.code_example
    FROM mitigations m
    ${whereClause}
    ORDER BY
      CASE m.effectiveness
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
        ELSE 4
      END,
      m.title
    LIMIT ?
  `).all(...params, effectiveLimit) as MitigationRecord[];

  return {
    mitigations: rows,
    total: countRow.total,
    returned: rows.length,
  };
}
