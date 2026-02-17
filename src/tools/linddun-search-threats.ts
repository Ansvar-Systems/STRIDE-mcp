/**
 * search_threats
 *
 * Full-text and filtered search over LINDDUN threats.
 */

import { getDatabase } from '../database/db.js';
import type {
  LinddunCitation,
  LinddunCategory,
  LinddunSource,
  LinddunThreatSearchOptions,
  LinddunThreatSearchResult,
  LinddunThreat,
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

function parseMitigations(value: unknown): LinddunThreat['mitigations'] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as LinddunThreat['mitigations']) : [];
  } catch {
    return [];
  }
}

function validateCategory(category?: string): LinddunCategory | undefined {
  if (!category) return undefined;
  if (!VALID_CATEGORIES.includes(category as LinddunCategory)) {
    throw new Error(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return category as LinddunCategory;
}

function mapResultRow(row: {
  threat_id: string;
  category: LinddunCategory;
  tree_path: string;
  description: string;
  examples: string;
  mitigations: string;
  gdpr_articles: string;
  sources: string;
  relevance_score?: number;
  snippet?: string;
}): LinddunThreatSearchResult {
  const mitigations = parseMitigations(row.mitigations);
  const sources: LinddunSource[] = parseSources(row.sources);
  const citations: LinddunCitation[] = getCitations('threat', row.threat_id, 8);

  return {
    threat_id: row.threat_id,
    category: row.category,
    tree_path: row.tree_path,
    description: row.description,
    examples: parseJsonArray(row.examples),
    gdpr_articles: parseJsonArray(row.gdpr_articles),
    mitigations_count: mitigations.length,
    sources,
    citations,
    relevance_score: row.relevance_score,
    snippet: row.snippet,
  };
}

export function searchThreats(options: LinddunThreatSearchOptions = {}): LinddunThreatSearchResult[] {
  const db = getDatabase();
  const category = validateCategory(options.category);
  const query = options.query?.trim();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const params: Array<string | number> = [];

  if (query) {
    const filters: string[] = [];
    if (category) {
      filters.push('t.category = ?');
      params.push(category);
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT
        t.threat_id,
        t.category,
        t.tree_path,
        t.description,
        t.examples,
        t.mitigations,
        t.gdpr_articles,
        t.sources,
        fts.rank as relevance_score,
        snippet(linddun_threats_fts, 3, '<mark>', '</mark>', '...', 24) as snippet
      FROM linddun_threats_fts fts
      INNER JOIN linddun_threats t ON t.rowid = fts.rowid
      WHERE linddun_threats_fts MATCH ?
      ${whereClause}
      ORDER BY fts.rank, t.tree_path
      LIMIT ?
    `;

    params.unshift(query);
    params.push(limit);

    try {
      const rows = db.prepare(sql).all(...params) as Array<{
        threat_id: string;
        category: LinddunCategory;
        tree_path: string;
        description: string;
        examples: string;
        mitigations: string;
        gdpr_articles: string;
        sources: string;
        relevance_score: number;
        snippet: string;
      }>;

      return rows.map((row) => mapResultRow(row));
    } catch (error) {
      if (error instanceof Error && error.message.includes('fts5')) {
        return [];
      }
      throw error;
    }
  }

  const filters: string[] = [];
  if (category) {
    filters.push('category = ?');
    params.push(category);
  }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT
      threat_id,
      category,
      tree_path,
      description,
      examples,
      mitigations,
      gdpr_articles,
      sources
    FROM linddun_threats
    ${whereClause}
    ORDER BY tree_path
    LIMIT ?
  `).all(...params, limit) as Array<{
    threat_id: string;
    category: LinddunCategory;
    tree_path: string;
    description: string;
    examples: string;
    mitigations: string;
    gdpr_articles: string;
    sources: string;
  }>;

  return rows.map((row) => mapResultRow(row));
}

export function getLinddunCategories(): LinddunCategory[] {
  return [...VALID_CATEGORIES];
}
