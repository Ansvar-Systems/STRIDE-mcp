/**
 * search_privacy_patterns
 *
 * Search LINDDUN-aligned privacy design patterns with DFD annotations.
 */

import { getDatabase } from '../database/db.js';
import type {
  DfdAnnotations,
  LinddunCitation,
  LinddunCategory,
  LinddunPatternSearchOptions,
  LinddunPatternSearchResult,
  LinddunSource,
} from '../types/linddun.js';
import { getCitations, parseJsonArray, parseSources } from './linddun-provenance.js';

const VALID_CATEGORIES: LinddunCategory[] = [
  'Linking',
  'Identifying',
  'Non-repudiation',
  'Detecting',
  'Data disclosure',
  'Unawareness',
  'Non-compliance',
];

function parseCategories(value: unknown): LinddunCategory[] {
  const categories = parseJsonArray(value);
  return categories.filter((category): category is LinddunCategory =>
    VALID_CATEGORIES.includes(category as LinddunCategory));
}

function parseDfdAnnotations(value: unknown): DfdAnnotations {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as DfdAnnotations;
  }
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as DfdAnnotations)
      : {};
  } catch {
    return {};
  }
}

function mapPatternRow(row: {
  pattern_id: string;
  name: string;
  summary: string;
  categories: string;
  dfd_annotations: string;
  related_threat_ids: string;
  pet_family: string | null;
  sources: string;
  relevance_score?: number;
  snippet?: string;
}): LinddunPatternSearchResult {
  const sources: LinddunSource[] = parseSources(row.sources);
  const citations: LinddunCitation[] = getCitations('pattern', row.pattern_id, 8);

  return {
    pattern_id: row.pattern_id,
    name: row.name,
    summary: row.summary,
    categories: parseCategories(row.categories),
    dfd_annotations: parseDfdAnnotations(row.dfd_annotations),
    related_threat_ids: parseJsonArray(row.related_threat_ids),
    sources,
    citations,
    pet_family: row.pet_family ?? undefined,
    relevance_score: row.relevance_score,
    snippet: row.snippet,
  };
}

function validateCategory(category?: string): LinddunCategory | undefined {
  if (!category) return undefined;
  if (!VALID_CATEGORIES.includes(category as LinddunCategory)) {
    throw new Error(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return category as LinddunCategory;
}

export function searchPrivacyPatterns(
  options: LinddunPatternSearchOptions = {},
): LinddunPatternSearchResult[] {
  const db = getDatabase();
  const category = validateCategory(options.category);
  const query = options.query?.trim();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const params: Array<string | number> = [];

  if (query) {
    const filters: string[] = [];
    if (category) {
      filters.push("p.categories LIKE ('%' || ? || '%')");
      params.push(`"${category}"`);
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT
        p.pattern_id,
        p.name,
        p.summary,
        p.categories,
        p.dfd_annotations,
        p.related_threat_ids,
        p.pet_family,
        p.sources,
        fts.rank as relevance_score,
        snippet(linddun_patterns_fts, 2, '<mark>', '</mark>', '...', 20) as snippet
      FROM linddun_patterns_fts fts
      INNER JOIN linddun_patterns p ON p.rowid = fts.rowid
      WHERE linddun_patterns_fts MATCH ?
      ${whereClause}
      ORDER BY fts.rank, p.name
      LIMIT ?
    `;

    params.unshift(query);
    params.push(limit);

    try {
      const rows = db.prepare(sql).all(...params) as Array<{
        pattern_id: string;
        name: string;
        summary: string;
        categories: string;
        dfd_annotations: string;
        related_threat_ids: string;
        pet_family: string | null;
        sources: string;
        relevance_score: number;
        snippet: string;
      }>;

      return rows.map((row) => mapPatternRow(row));
    } catch (error) {
      if (error instanceof Error && error.message.includes('fts5')) {
        return [];
      }
      throw error;
    }
  }

  const filters: string[] = [];
  if (category) {
    filters.push("categories LIKE ('%' || ? || '%')");
    params.push(`"${category}"`);
  }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT
      pattern_id,
      name,
      summary,
      categories,
      dfd_annotations,
      related_threat_ids,
      pet_family,
      sources
    FROM linddun_patterns
    ${whereClause}
    ORDER BY name
    LIMIT ?
  `).all(...params, limit) as Array<{
    pattern_id: string;
    name: string;
    summary: string;
    categories: string;
    dfd_annotations: string;
    related_threat_ids: string;
    pet_family: string | null;
    sources: string;
  }>;

  return rows.map((row) => mapPatternRow(row));
}
