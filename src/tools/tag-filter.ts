/**
 * Tool 2: filter_by_tags
 *
 * Filter patterns by industry (Banking, Healthcare...),
 * deployment (AWS, Kubernetes...), or compliance (PCI DSS, CCPA...).
 *
 * Dual-mode: omit tag_value to list available values with counts,
 * or provide tag_value to get matching pattern summaries.
 */

import { getDatabase } from '../database/db.js';
import type {
  TagType,
  TaggedPatternSummary,
  TagFilterResult,
  TagValuesResult,
} from '../types/pattern.js';

const VALID_TAG_TYPES: TagType[] = ['industry', 'compliance', 'deployment'];

/**
 * List available tag values with counts for a given tag type.
 */
export function listTagValues(tagType: TagType): TagValuesResult {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT tag_value AS value, COUNT(*) AS count
    FROM pattern_tags
    WHERE tag_type = ?
    GROUP BY tag_value
    ORDER BY count DESC
  `).all(tagType) as Array<{ value: string; count: number }>;

  return {
    tag_type: tagType,
    values: rows,
    total_values: rows.length,
  };
}

/**
 * Filter patterns by tag type and optional tag value.
 *
 * - If tag_value is omitted or empty, returns available values with counts.
 * - If tag_value is provided, returns matching pattern summaries with pagination.
 */
export function filterByTags(
  tagType: string,
  tagValue?: string,
  limit?: number,
  offset?: number
): TagFilterResult | TagValuesResult {
  if (!VALID_TAG_TYPES.includes(tagType as TagType)) {
    throw new Error(
      `Invalid tag_type "${tagType}". Must be one of: ${VALID_TAG_TYPES.join(', ')}`
    );
  }

  const validType = tagType as TagType;

  // Listing mode: no tag_value → return available values
  if (!tagValue || tagValue.trim() === '') {
    return listTagValues(validType);
  }

  const db = getDatabase();
  const effectiveLimit = Math.min(Math.max(limit || 50, 1), 200);
  const effectiveOffset = Math.max(offset || 0, 0);

  // Count total matches
  const countRow = db.prepare(`
    SELECT COUNT(*) AS total
    FROM pattern_tags pt
    INNER JOIN patterns p ON p.id = pt.pattern_id
    WHERE pt.tag_type = ? AND pt.tag_value = ?
  `).get(validType, tagValue.trim()) as { total: number };

  // Get matching patterns
  const rows = db.prepare(`
    SELECT
      p.id AS pattern_id,
      p.title,
      p.stride_category,
      p.severity,
      p.confidence_score,
      pt.tag_value
    FROM pattern_tags pt
    INNER JOIN patterns p ON p.id = pt.pattern_id
    WHERE pt.tag_type = ? AND pt.tag_value = ?
    ORDER BY p.confidence_score DESC
    LIMIT ? OFFSET ?
  `).all(validType, tagValue.trim(), effectiveLimit, effectiveOffset) as TaggedPatternSummary[];

  return {
    tag_type: validType,
    tag_value: tagValue.trim(),
    patterns: rows,
    total: countRow.total,
    returned: rows.length,
    offset: effectiveOffset,
  };
}
