/**
 * List patterns tool
 *
 * List patterns with filtering and pagination
 */

import { getDatabase } from '../database/db.js';
import { PatternSummary } from '../types/pattern.js';

export interface ListOptions {
  stride_category?: string;
  technology?: string;
  framework?: string;
  severity?: string;
  min_confidence?: number;
  validation_status?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'confidence' | 'severity' | 'cvss' | 'created_date';
  sort_order?: 'asc' | 'desc';
}

/**
 * List patterns with filtering and sorting
 *
 * @param options - List options
 * @returns Array of pattern summaries
 */
export function listPatterns(options: ListOptions = {}): PatternSummary[] {
  const db = getDatabase();

  const {
    stride_category,
    technology,
    framework,
    severity,
    min_confidence = 0,
    validation_status,
    limit = 50,
    offset = 0,
    sort_by = 'confidence',
    sort_order = 'desc',
  } = options;

  // Build WHERE clause
  const filters: string[] = [];
  const params: (string | number)[] = [];

  if (stride_category) {
    filters.push('stride_category = ?');
    params.push(stride_category);
  }

  if (technology) {
    filters.push('technology = ?');
    params.push(technology);
  }

  if (framework) {
    filters.push("(', ' || framework || ', ') LIKE ('%, ' || ? || ', %')");
    params.push(framework);
  }

  if (severity) {
    filters.push('severity = ?');
    params.push(severity);
  }

  if (min_confidence > 0) {
    filters.push('confidence_score >= ?');
    params.push(min_confidence);
  }

  if (validation_status) {
    filters.push('validation_status = ?');
    params.push(validation_status);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  // Build ORDER BY clause
  const sortColumn = {
    confidence: 'confidence_score',
    severity: 'cvss_score',
    cvss: 'cvss_score',
    created_date: 'created_date',
  }[sort_by] || 'confidence_score'; // Default to confidence_score if invalid

  const validOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${validOrder}`;

  // Query
  const sql = `
    SELECT
      id,
      title,
      stride_category,
      severity,
      cvss_score,
      technology,
      framework,
      confidence_score,
      validation_status,
      created_date
    FROM patterns
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const results = db.prepare(sql).all(...params) as PatternSummary[];

  return results;
}

/**
 * Count patterns matching filters
 *
 * @param options - List options (without pagination)
 * @returns Total count
 */
export function countPatterns(options: Omit<ListOptions, 'limit' | 'offset' | 'sort_by' | 'sort_order'>): number {
  const db = getDatabase();

  const {
    stride_category,
    technology,
    framework,
    severity,
    min_confidence = 0,
    validation_status,
  } = options;

  const filters: string[] = [];
  const params: (string | number)[] = [];

  if (stride_category) {
    filters.push('stride_category = ?');
    params.push(stride_category);
  }

  if (technology) {
    filters.push('technology = ?');
    params.push(technology);
  }

  if (framework) {
    filters.push("(', ' || framework || ', ') LIKE ('%, ' || ? || ', %')");
    params.push(framework);
  }

  if (severity) {
    filters.push('severity = ?');
    params.push(severity);
  }

  if (min_confidence > 0) {
    filters.push('confidence_score >= ?');
    params.push(min_confidence);
  }

  if (validation_status) {
    filters.push('validation_status = ?');
    params.push(validation_status);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const sql = `SELECT COUNT(*) as count FROM patterns ${whereClause}`;

  const result = db.prepare(sql).get(...params) as { count: number };

  return result.count;
}
