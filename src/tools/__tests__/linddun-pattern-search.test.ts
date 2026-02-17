import { describe, expect, it } from 'vitest';
import { searchPrivacyPatterns } from '../linddun-pattern-search.js';

describe('searchPrivacyPatterns', () => {
  it('should find privacy patterns by keyword', () => {
    const results = searchPrivacyPatterns({ query: 'consent' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('pattern_id');
    expect(results[0]).toHaveProperty('dfd_annotations');
    expect(Array.isArray(results[0].sources)).toBe(true);
    expect(Array.isArray(results[0].citations)).toBe(true);
    expect(results[0].citations.length).toBeGreaterThan(0);
  });

  it('should filter patterns by category', () => {
    const results = searchPrivacyPatterns({
      category: 'Unawareness',
      limit: 25,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(25);
    expect(results.every((item) => item.categories.includes('Unawareness'))).toBe(true);
  });

  it('should throw on invalid category', () => {
    expect(() =>
      searchPrivacyPatterns({ category: 'NotARealCategory' as never }),
    ).toThrow(/Invalid category/);
  });

  it('should return structured DFD annotations', () => {
    const results = searchPrivacyPatterns({ query: 'token' });
    if (results.length > 0) {
      expect(results[0].dfd_annotations).toBeDefined();
      expect(typeof results[0].dfd_annotations).toBe('object');
    }
  });
});
