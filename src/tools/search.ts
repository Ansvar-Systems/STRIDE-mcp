/**
 * Full-text search tool for STRIDE patterns
 *
 * Uses SQLite FTS5 for sub-50ms search across 1000+ patterns
 * Based on: EU Compliance MCP search.ts
 */

import { getDatabase } from '../database/db.js';
import { SearchResult } from '../types/pattern.js';

export interface SearchOptions {
  query: string;
  stride_category?: string;
  technology?: string;
  framework?: string;
  severity?: string;
  min_confidence?: number;
  limit?: number;
}

/**
 * Search patterns using full-text search (FTS5)
 *
 * @param options - Search options
 * @returns Array of search results with relevance scores
 */
export function searchPatterns(options: SearchOptions): SearchResult[] {
  const db = getDatabase();

  const {
    query,
    stride_category,
    technology,
    framework,
    severity,
    min_confidence = 0,
    limit = 20,
  } = options;

  // Validate query is not empty
  if (!query || query.trim() === '') {
    return [];
  }

  // Build WHERE clause for filters
  const filters: string[] = [];
  const params: (string | number)[] = [];

  if (stride_category) {
    filters.push('p.stride_category = ?');
    params.push(stride_category);
  }

  if (technology) {
    filters.push('p.technology = ?');
    params.push(technology);
  }

  if (framework) {
    filters.push("(', ' || p.framework || ', ') LIKE ('%, ' || ? || ', %')");
    params.push(framework);
  }

  if (severity) {
    filters.push('p.severity = ?');
    params.push(severity);
  }

  if (min_confidence > 0) {
    filters.push('p.confidence_score >= ?');
    params.push(min_confidence);
  }

  const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

  // FTS5 full-text search query
  const sql = `
    SELECT
      p.id,
      p.title,
      p.stride_category,
      p.severity,
      p.cvss_score,
      p.technology,
      p.framework,
      p.confidence_score,
      p.validation_status,
      fts.rank as relevance_score,
      snippet(patterns_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
    FROM patterns_fts fts
    INNER JOIN patterns p ON p.rowid = fts.rowid
    WHERE patterns_fts MATCH ?
    ${whereClause}
    ORDER BY fts.rank, p.confidence_score DESC
    LIMIT ?
  `;

  params.unshift(query); // Add query as first parameter
  params.push(limit); // Add limit as last parameter

  try {
    const results = db.prepare(sql).all(...params) as SearchResult[];
    return results;
  } catch (error) {
    // FTS5 syntax error - return empty results
    if (error instanceof Error && error.message.includes('fts5')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get available STRIDE categories
 */
export function getStrideCategories(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT DISTINCT stride_category FROM patterns ORDER BY stride_category')
    .all() as Array<{ stride_category: string }>;

  return rows.map((row) => row.stride_category);
}

/**
 * Get available technologies
 */
export function getTechnologies(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT DISTINCT technology FROM patterns ORDER BY technology')
    .all() as Array<{ technology: string }>;

  return rows.map((row) => row.technology);
}

/**
 * Get available frameworks (individual names, deduplicated)
 *
 * The framework column stores comma-separated lists like "Express.js, Node.js".
 * We split and deduplicate to return individual framework names that agents
 * can pass directly to the framework filter.
 */
export function getFrameworks(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT DISTINCT framework FROM patterns')
    .all() as Array<{ framework: string }>;

  const frameworks = new Set<string>();
  for (const row of rows) {
    for (const fw of row.framework.split(',')) {
      const trimmed = fw.trim();
      if (trimmed) frameworks.add(trimmed);
    }
  }

  return Array.from(frameworks).sort();
}

/**
 * Get severity levels
 */
export function getSeverityLevels(): string[] {
  return ['Critical', 'High', 'Medium', 'Low', 'Informational'];
}
