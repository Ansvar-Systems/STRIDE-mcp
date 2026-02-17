import { describe, expect, it } from 'vitest';
import { searchThreats, getLinddunCategories } from '../linddun-search-threats.js';

describe('searchThreats', () => {
  it('should return results for a valid query', () => {
    const results = searchThreats({ query: 'identifier' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('threat_id');
    expect(results[0]).toHaveProperty('category');
    expect(results[0]).toHaveProperty('tree_path');
    expect(Array.isArray(results[0].sources)).toBe(true);
    expect(Array.isArray(results[0].citations)).toBe(true);
    expect(results[0].citations.length).toBeGreaterThan(0);
  });

  it('should filter by valid LINDDUN category', () => {
    const results = searchThreats({
      query: 'tracking',
      category: 'Linking',
    });
    if (results.length > 0) {
      expect(results.every((item) => item.category === 'Linking')).toBe(true);
    }
  });

  it('should support category-only browsing', () => {
    const results = searchThreats({
      category: 'Data disclosure',
      limit: 10,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
    expect(results.every((item) => item.category === 'Data disclosure')).toBe(true);
  });

  it('should throw on invalid category', () => {
    expect(() => searchThreats({ category: 'Invalid' as never })).toThrow(
      /Invalid category/
    );
  });

  it('should expose all seven LINDDUN categories', () => {
    const categories = getLinddunCategories();
    expect(categories).toEqual([
      'Linking',
      'Identifying',
      'Non-repudiation',
      'Detecting',
      'Data disclosure',
      'Unawareness',
      'Non-compliance',
    ]);
  });
});
