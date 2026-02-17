/**
 * Shared provenance helpers for LINDDUN tool responses.
 */

import { getDatabase } from '../database/db.js';
import type { LinddunCitation, LinddunSource } from '../types/linddun.js';

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseSources(value: unknown): LinddunSource[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.title === 'string')
      .map((item) => ({
        title: String(item.title),
        url: typeof item.url === 'string' ? item.url : undefined,
        type: typeof item.type === 'string' ? item.type : undefined,
        license: typeof item.license === 'string' ? item.license : undefined,
      }));
  } catch {
    return [];
  }
}

export function getCitations(
  entityType: LinddunCitation['entity_type'],
  entityId: string,
  limit = 12,
): LinddunCitation[] {
  const db = getDatabase();
  const capped = Math.min(Math.max(limit, 1), 100);
  const rows = db.prepare(`
    SELECT
      citation_id,
      entity_type,
      entity_id,
      claim_key,
      claim_text,
      source_title,
      source_url,
      source_type,
      license,
      confidence
    FROM linddun_citations
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY confidence DESC, claim_key
    LIMIT ?
  `).all(entityType, entityId, capped) as Array<{
    citation_id: string;
    entity_type: LinddunCitation['entity_type'];
    entity_id: string;
    claim_key: string;
    claim_text: string;
    source_title: string;
    source_url: string | null;
    source_type: string | null;
    license: string | null;
    confidence: number;
  }>;

  return rows.map((row) => ({
    citation_id: row.citation_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    claim_key: row.claim_key,
    claim_text: row.claim_text,
    source_title: row.source_title,
    source_url: row.source_url ?? undefined,
    source_type: row.source_type ?? undefined,
    license: row.license ?? undefined,
    confidence: row.confidence,
  }));
}
