/**
 * Tool 1: find_patterns_by_reference
 *
 * Bridge between threat-intel-mcp and STRIDE-mcp.
 * Finds STRIDE patterns linked to a CVE, ATT&CK technique, CWE, or OWASP category.
 * Auto-detects reference type from the ID prefix.
 */

import { getDatabase } from '../database/db.js';
import type { ReferenceType, ReferenceMatch, ReferenceSearchResult } from '../types/pattern.js';

/**
 * Auto-detect the reference type from an ID string.
 *
 * Rules:
 * - CVE-*        → cve
 * - CWE-*        → cwe
 * - T + digit    → mitre  (ATT&CK technique)
 * - AML.*        → mitre  (ATLAS ML technique)
 * - A + digit    → owasp  (A01:2021 style)
 * - LLM*         → owasp  (LLM02:2025 style)
 */
export function detectReferenceType(id: string): ReferenceType | null {
  const trimmed = id.trim().toUpperCase();

  if (trimmed.startsWith('CVE-')) return 'cve';
  if (trimmed.startsWith('CWE-')) return 'cwe';
  if (/^T\d/.test(trimmed) || trimmed.startsWith('AML.')) return 'mitre';
  if (/^A\d/.test(trimmed) || trimmed.startsWith('LLM')) return 'owasp';

  return null;
}

/** Table and column for each reference type */
const REFERENCE_CONFIG: Record<ReferenceType, { table: string; column: string }> = {
  cve: { table: 'cve_references', column: 'cve_id' },
  mitre: { table: 'mitre_mappings', column: 'mitre_technique' },
  cwe: { table: 'cwe_mappings', column: 'cwe_id' },
  owasp: { table: 'owasp_mappings', column: 'owasp_category' },
};

/**
 * Find STRIDE patterns linked to a specific reference ID.
 *
 * Uses prefix-match (LIKE) because the DB stores descriptive values like
 * "T1003 - OS Credential Dumping" alongside bare IDs.
 */
export function findPatternsByReference(
  referenceId: string,
  referenceType?: ReferenceType
): ReferenceSearchResult {
  const id = referenceId.trim();

  if (!id) {
    throw new Error('reference_id is required and cannot be empty');
  }

  const type = referenceType || detectReferenceType(id);

  if (!type) {
    throw new Error(
      `Cannot auto-detect reference type for "${id}". ` +
      'Provide reference_type explicitly (cve, mitre, cwe, owasp).'
    );
  }

  const config = REFERENCE_CONFIG[type];
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      p.id AS pattern_id,
      p.title,
      p.stride_category,
      p.severity,
      p.confidence_score,
      r.${config.column} AS reference_detail
    FROM ${config.table} r
    INNER JOIN patterns p ON p.id = r.pattern_id
    WHERE r.${config.column} LIKE ?
    ORDER BY p.confidence_score DESC, p.severity ASC
  `).all(`${id}%`) as ReferenceMatch[];

  return {
    reference_id: id,
    reference_type: type,
    matches: rows,
    total: rows.length,
  };
}
