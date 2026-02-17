/**
 * get_threat_tree
 *
 * Build the complete LINDDUN threat tree for a single category.
 */

import { getDatabase } from '../database/db.js';
import type { LinddunCategory, LinddunTreeNode } from '../types/linddun.js';
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

function ensureChild(parent: LinddunTreeNode, segment: string): LinddunTreeNode {
  let child = parent.children.find((node) => node.name === segment);
  if (!child) {
    const path = parent.path ? `${parent.path} > ${segment}` : segment;
    child = { name: segment, path, children: [] };
    parent.children.push(child);
  }
  return child;
}

export function getThreatTree(category: string): {
  category: LinddunCategory;
  total_threats: number;
  tree: LinddunTreeNode;
} {
  if (!VALID_CATEGORIES.includes(category as LinddunCategory)) {
    throw new Error(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  const validCategory = category as LinddunCategory;

  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      threat_id,
      tree_path,
      description,
      examples,
      gdpr_articles,
      sources
    FROM linddun_threats
    WHERE category = ?
    ORDER BY tree_path
  `).all(validCategory) as Array<{
    threat_id: string;
    tree_path: string;
    description: string;
    examples: string;
    gdpr_articles: string;
    sources: string;
  }>;

  const root: LinddunTreeNode = {
    name: validCategory,
    path: validCategory,
    children: [],
  };

  for (const row of rows) {
    const rawSegments = row.tree_path
      .split('>')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const segments = rawSegments[0] === validCategory
      ? rawSegments
      : [validCategory, ...rawSegments];

    let current = root;

    for (let i = 1; i < segments.length; i++) {
      current = ensureChild(current, segments[i]);
    }

    current.threat = {
      threat_id: row.threat_id,
      description: row.description,
      examples: parseJsonArray(row.examples),
      gdpr_articles: parseJsonArray(row.gdpr_articles),
      sources: parseSources(row.sources),
      citations: getCitations('threat', row.threat_id, 8),
    };
  }

  return {
    category: validCategory,
    total_threats: rows.length,
    tree: root,
  };
}
