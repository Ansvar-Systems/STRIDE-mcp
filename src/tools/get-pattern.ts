/**
 * Get pattern by ID tool
 *
 * Retrieves complete pattern details including all mitigations, evidence, and detection info
 */

import { getDatabase } from '../database/db.js';
import { Pattern } from '../types/pattern.js';

/**
 * Get a pattern by its ID
 *
 * @param patternId - Pattern ID (e.g., "STRIDE-API-EXPRESS-001")
 * @returns Full pattern object or null if not found
 */
export function getPattern(patternId: string): Pattern | null {
  const db = getDatabase();

  const row = db
    .prepare('SELECT full_json FROM patterns WHERE id = ?')
    .get(patternId) as { full_json: string } | undefined;

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.full_json) as Pattern;
  } catch (error) {
    console.error(`Failed to parse pattern ${patternId}:`, error);
    return null;
  }
}

/**
 * Get multiple patterns by IDs
 *
 * @param patternIds - Array of pattern IDs
 * @returns Array of patterns (nulls excluded)
 */
export function getPatterns(patternIds: string[]): Pattern[] {
  const db = getDatabase();

  const placeholders = patternIds.map(() => '?').join(',');
  const sql = `SELECT full_json FROM patterns WHERE id IN (${placeholders})`;

  const rows = db.prepare(sql).all(...patternIds) as Array<{ full_json: string }>;

  return rows
    .map((row) => {
      try {
        return JSON.parse(row.full_json) as Pattern;
      } catch (error) {
        console.error('Failed to parse pattern:', error);
        return null;
      }
    })
    .filter((p): p is Pattern => p !== null);
}
