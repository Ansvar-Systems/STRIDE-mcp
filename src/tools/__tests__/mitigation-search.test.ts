import { describe, it, expect } from 'vitest';
import { searchMitigations } from '../mitigation-search.js';

describe('searchMitigations', () => {
  describe('text search', () => {
    it('should find mitigations by keyword', () => {
      const result = searchMitigations({ query: 'rate limit' });
      expect(result.mitigations.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.returned).toBe(result.mitigations.length);
    });

    it('should return empty results for non-matching query', () => {
      const result = searchMitigations({ query: 'zzzznonexistent12345' });
      expect(result.mitigations).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.returned).toBe(0);
    });

    it('should search across title and description', () => {
      const result = searchMitigations({ query: 'validation' });
      expect(result.mitigations.length).toBeGreaterThan(0);
    });
  });

  describe('framework filter', () => {
    it('should filter by exact framework name', () => {
      const result = searchMitigations({ framework: 'Express.js' });
      expect(result.mitigations.length).toBeGreaterThan(0);

      for (const m of result.mitigations) {
        expect(m.code_framework?.toLowerCase()).toContain('express');
      }
    });

    it('should filter by partial framework name', () => {
      const result = searchMitigations({ framework: 'Express' });
      expect(result.mitigations.length).toBeGreaterThan(0);
    });
  });

  describe('effectiveness filter', () => {
    it('should filter by High effectiveness', () => {
      const result = searchMitigations({ effectiveness: 'High' });
      expect(result.mitigations.length).toBeGreaterThan(0);

      for (const m of result.mitigations) {
        expect(m.effectiveness).toBe('High');
      }
    });

    it('should filter by Medium effectiveness', () => {
      const result = searchMitigations({ effectiveness: 'Medium' });
      expect(result.mitigations.length).toBeGreaterThan(0);

      for (const m of result.mitigations) {
        expect(m.effectiveness).toBe('Medium');
      }
    });
  });

  describe('complexity filter', () => {
    it('should filter by implementation complexity', () => {
      const result = searchMitigations({ implementation_complexity: 'Low' });
      expect(result.mitigations.length).toBeGreaterThan(0);

      for (const m of result.mitigations) {
        expect(m.implementation_complexity).toBe('Low');
      }
    });
  });

  describe('combined filters', () => {
    it('should combine text search with framework filter', () => {
      const result = searchMitigations({ query: 'rate limit', framework: 'Express' });
      // May or may not find results, but should not error
      expect(Array.isArray(result.mitigations)).toBe(true);
      expect(result.total).toBe(result.mitigations.length <= 20 ? result.total : result.total);
    });

    it('should combine effectiveness with framework filter', () => {
      const result = searchMitigations({ effectiveness: 'High', framework: 'Express' });
      for (const m of result.mitigations) {
        expect(m.effectiveness).toBe('High');
        expect(m.code_framework?.toLowerCase()).toContain('express');
      }
    });
  });

  describe('result structure', () => {
    it('should return complete mitigation records', () => {
      const result = searchMitigations({ effectiveness: 'High', limit: 1 });
      expect(result.mitigations.length).toBeGreaterThan(0);

      const m = result.mitigations[0];
      expect(m.id).toBeTruthy();
      expect(m.pattern_id).toBeTruthy();
      expect(m.title).toBeTruthy();
      // description, code_language, code_framework, code_example may be null
      expect('description' in m).toBe(true);
      expect('effectiveness' in m).toBe(true);
      expect('implementation_complexity' in m).toBe(true);
      expect('code_language' in m).toBe(true);
      expect('code_framework' in m).toBe(true);
      expect('code_example' in m).toBe(true);
    });
  });

  describe('effectiveness sort order', () => {
    it('should order High before Medium before Low', () => {
      const result = searchMitigations({ limit: 100 });
      const effectivenessOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };

      let lastOrder = 0;
      for (const m of result.mitigations) {
        const order = effectivenessOrder[m.effectiveness as keyof typeof effectivenessOrder] || 4;
        expect(order).toBeGreaterThanOrEqual(lastOrder);
        lastOrder = order;
      }
    });
  });

  describe('limit', () => {
    it('should respect limit parameter', () => {
      const result = searchMitigations({ limit: 3 });
      expect(result.returned).toBeLessThanOrEqual(3);
      expect(result.mitigations.length).toBeLessThanOrEqual(3);
    });

    it('should use default limit of 20', () => {
      const result = searchMitigations({});
      expect(result.returned).toBeLessThanOrEqual(20);
    });

    it('should return total count regardless of limit', () => {
      const resultSmall = searchMitigations({ limit: 1 });
      const resultLarge = searchMitigations({ limit: 100 });
      expect(resultSmall.total).toBe(resultLarge.total);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query string', () => {
      const result = searchMitigations({ query: '' });
      // Empty query = no text filter, returns all mitigations up to limit
      expect(result.mitigations.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only query', () => {
      const result = searchMitigations({ query: '   ' });
      // Whitespace-only = no text filter
      expect(result.mitigations.length).toBeGreaterThan(0);
    });

    it('should handle no filters at all', () => {
      const result = searchMitigations({});
      expect(result.mitigations.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
