/**
 * get_mitigations
 *
 * Return privacy-preserving mitigations for a specific LINDDUN threat.
 */

import { getDatabase } from '../database/db.js';
import type {
  LinddunCategory,
  LinddunCitation,
  LinddunMitigation,
  LinddunSource,
} from '../types/linddun.js';
import { getCitations, parseJsonArray, parseSources } from './linddun-provenance.js';

export interface LinddunMitigationWithCitations extends LinddunMitigation {
  citations: LinddunCitation[];
}

export interface LinddunThreatMitigations {
  threat: {
    threat_id: string;
    category: LinddunCategory;
    tree_path: string;
    description: string;
    gdpr_articles: string[];
    sources: LinddunSource[];
    citations: LinddunCitation[];
  };
  mitigations: LinddunMitigationWithCitations[];
  total_mitigations: number;
}

export function getMitigations(threatId: string): LinddunThreatMitigations | null {
  const db = getDatabase();

  const threat = db.prepare(`
    SELECT threat_id, category, tree_path, description, gdpr_articles, sources
    FROM linddun_threats
    WHERE threat_id = ?
  `).get(threatId) as {
    threat_id: string;
    category: LinddunCategory;
    tree_path: string;
    description: string;
    gdpr_articles: string;
    sources: string;
  } | undefined;

  if (!threat) return null;

  const rows = db.prepare(`
    SELECT
      mitigation_id,
      title,
      description,
      pet_type,
      implementation_hints,
      effectiveness,
      reference_links
    FROM linddun_mitigations
    WHERE threat_id = ?
    ORDER BY
      CASE effectiveness
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
        ELSE 4
      END,
      title
  `).all(threatId) as Array<{
    mitigation_id: string;
    title: string;
    description: string;
    pet_type: string | null;
    implementation_hints: string;
    effectiveness: 'High' | 'Medium' | 'Low' | null;
    reference_links: string;
  }>;

  const mitigations: LinddunMitigationWithCitations[] = rows.map((row) => {
    const mitigationEntityId = row.mitigation_id;
    return {
      id: row.mitigation_id,
      title: row.title,
      description: row.description,
      pet_type: row.pet_type ?? undefined,
      implementation_hints: parseJsonArray(row.implementation_hints),
      effectiveness: row.effectiveness ?? undefined,
      references: parseJsonArray(row.reference_links),
      citations: getCitations('mitigation', mitigationEntityId, 6),
    };
  });

  return {
    threat: {
      threat_id: threat.threat_id,
      category: threat.category,
      tree_path: threat.tree_path,
      description: threat.description,
      gdpr_articles: parseJsonArray(threat.gdpr_articles),
      sources: parseSources(threat.sources),
      citations: getCitations('threat', threat.threat_id, 8),
    },
    mitigations,
    total_mitigations: mitigations.length,
  };
}
