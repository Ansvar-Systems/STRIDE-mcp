import { describe, expect, it } from 'vitest';
import { getThreatTree } from '../linddun-threat-tree.js';

function collectLeafThreatIds(node: any, acc: string[] = []): string[] {
  if (node.threat?.threat_id) acc.push(node.threat.threat_id);
  for (const child of node.children || []) {
    collectLeafThreatIds(child, acc);
  }
  return acc;
}

describe('getThreatTree', () => {
  it('should build a full tree for a valid category', () => {
    const result = getThreatTree('Linking');
    expect(result.category).toBe('Linking');
    expect(result.total_threats).toBeGreaterThan(0);
    expect(result.tree.name).toBe('Linking');
    expect(Array.isArray(result.tree.children)).toBe(true);
  });

  it('should include all leaf threat IDs', () => {
    const result = getThreatTree('Non-compliance');
    const ids = collectLeafThreatIds(result.tree);
    expect(ids.length).toBe(result.total_threats);
    expect(ids.some((id) => id.startsWith('LINDDUN-NON-COMPLIANCE-'))).toBe(true);
  });

  it('should include provenance on leaf threats', () => {
    const result = getThreatTree('Identifying');
    const ids = collectLeafThreatIds(result.tree);
    expect(ids.length).toBeGreaterThan(0);

    const findLeaf = (node: any): any => {
      if (node.threat) return node;
      for (const child of node.children || []) {
        const hit = findLeaf(child);
        if (hit) return hit;
      }
      return null;
    };

    const leaf = findLeaf(result.tree);
    expect(leaf).toBeTruthy();
    expect(Array.isArray(leaf.threat.sources)).toBe(true);
    expect(Array.isArray(leaf.threat.citations)).toBe(true);
    expect(leaf.threat.citations.length).toBeGreaterThan(0);
  });

  it('should throw on invalid category', () => {
    expect(() => getThreatTree('Unknown')).toThrow(/Invalid category/);
  });
});
