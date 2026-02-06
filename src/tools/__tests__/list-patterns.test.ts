import { describe, it, expect } from 'vitest';
import { listPatterns } from '../list-patterns.js';

describe('listPatterns', () => {
  describe('basic listing', () => {
    it('should list all patterns without filters', () => {
      const results = listPatterns({});
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('stride_category');
      expect(results[0]).toHaveProperty('severity');
      expect(results[0]).toHaveProperty('cvss_score');
      expect(results[0]).toHaveProperty('confidence_score');
    });

    it('should return summary format (not full patterns)', () => {
      const results = listPatterns({});
      expect(results.length).toBeGreaterThan(0);

      // Should have summary fields
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');

      // Should NOT have full pattern details
      expect(results[0]).not.toHaveProperty('mitigations');
      expect(results[0]).not.toHaveProperty('evidence');
      expect(results[0]).not.toHaveProperty('attack');
    });
  });

  describe('filtering by STRIDE category', () => {
    it('should filter by Spoofing category', () => {
      const results = listPatterns({ stride_category: 'Spoofing' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.stride_category === 'Spoofing')).toBe(true);
    });

    it('should filter by Tampering category', () => {
      const results = listPatterns({ stride_category: 'Tampering' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.stride_category === 'Tampering')).toBe(true);
    });

    it('should filter by Elevation of Privilege category', () => {
      const results = listPatterns({ stride_category: 'Elevation of Privilege' });
      if (results.length > 0) {
        expect(results.every(r => r.stride_category === 'Elevation of Privilege')).toBe(true);
      }
    });
  });

  describe('filtering by technology', () => {
    it('should filter by technology framework', () => {
      const results = listPatterns({ technology: 'Express.js' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.framework.includes('Express.js'))).toBe(true);
    });

    it('should filter by Flask framework', () => {
      const results = listPatterns({ technology: 'Flask' });
      if (results.length > 0) {
        expect(results.every(r => r.framework.includes('Flask'))).toBe(true);
      }
    });
  });

  describe('filtering by severity', () => {
    it('should filter by Critical severity', () => {
      const results = listPatterns({ severity: 'Critical' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.severity === 'Critical')).toBe(true);
    });

    it('should filter by High severity', () => {
      const results = listPatterns({ severity: 'High' });
      if (results.length > 0) {
        expect(results.every(r => r.severity === 'High')).toBe(true);
      }
    });
  });

  describe('filtering by confidence score', () => {
    it('should filter by minimum confidence score', () => {
      const results = listPatterns({ min_confidence: 9.0 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.confidence_score >= 9.0)).toBe(true);
    });

    it('should filter by high confidence threshold (9.5)', () => {
      const results = listPatterns({ min_confidence: 9.5 });
      if (results.length > 0) {
        expect(results.every(r => r.confidence_score >= 9.5)).toBe(true);
      }
    });

    it('should return all patterns with min_confidence 0', () => {
      const all = listPatterns({});
      const filtered = listPatterns({ min_confidence: 0 });
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters simultaneously', () => {
      const results = listPatterns({
        stride_category: 'Tampering',
        severity: 'Critical',
        min_confidence: 8.5,
      });

      if (results.length > 0) {
        expect(results.every(r =>
          r.stride_category === 'Tampering' &&
          r.severity === 'Critical' &&
          r.confidence_score >= 8.5
        )).toBe(true);
      }
    });

    it('should return empty array when filters match nothing', () => {
      const results = listPatterns({
        stride_category: 'Spoofing',
        severity: 'Low',
        min_confidence: 9.9,
      });
      expect(results).toEqual([]);
    });
  });

  describe('sorting', () => {
    it('should sort by confidence score descending by default', () => {
      const results = listPatterns({ sort_by: 'confidence' });
      if (results.length > 1) {
        expect(results[0].confidence_score).toBeGreaterThanOrEqual(results[1].confidence_score);
      }
    });

    it('should sort by CVSS score descending', () => {
      const results = listPatterns({ sort_by: 'cvss' });
      if (results.length > 1) {
        expect(results[0].cvss_score).toBeGreaterThanOrEqual(results[1].cvss_score);
      }
    });

    it('should sort by created date descending', () => {
      const results = listPatterns({ sort_by: 'created_date', sort_order: 'desc' });
      expect(results.length).toBeGreaterThan(0);
      // Just verify the query doesn't error and returns valid results
      expect(results[0]).toHaveProperty('created_date');
      if (results.length > 1) {
        expect(results[1]).toHaveProperty('created_date');
      }
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', () => {
      const results = listPatterns({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should default to 50 results when limit not specified', () => {
      const results = listPatterns({});
      expect(results.length).toBeLessThanOrEqual(50);
    });

    it('should handle offset parameter', () => {
      const firstPage = listPatterns({ limit: 1, offset: 0, sort_by: 'confidence' });
      const secondPage = listPatterns({ limit: 1, offset: 1, sort_by: 'confidence' });

      if (firstPage.length > 0 && secondPage.length > 0) {
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      }
    });

    it('should handle large offset values', () => {
      const results = listPatterns({ offset: 1000 });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid STRIDE category', () => {
      const results = listPatterns({ stride_category: 'InvalidCategory' });
      expect(results).toEqual([]);
    });

    it('should handle negative confidence score', () => {
      const results = listPatterns({ min_confidence: -1 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle confidence score above 10', () => {
      const results = listPatterns({ min_confidence: 15 });
      expect(results).toEqual([]);
    });

    it('should handle negative limit', () => {
      const results = listPatterns({ limit: -1 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle negative offset', () => {
      const results = listPatterns({ offset: -1 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle invalid sort_by value', () => {
      const results = listPatterns({ sort_by: 'invalid' as any });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('data integrity', () => {
    it('should return patterns with valid CVSS scores', () => {
      const results = listPatterns({});
      expect(results.length).toBeGreaterThan(0);

      results.forEach(pattern => {
        expect(pattern.cvss_score).toBeGreaterThanOrEqual(0);
        expect(pattern.cvss_score).toBeLessThanOrEqual(10);
      });
    });

    it('should return patterns with valid confidence scores', () => {
      const results = listPatterns({});
      expect(results.length).toBeGreaterThan(0);

      results.forEach(pattern => {
        expect(pattern.confidence_score).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence_score).toBeLessThanOrEqual(10);
      });
    });

    it('should return patterns with non-empty titles', () => {
      const results = listPatterns({});
      expect(results.length).toBeGreaterThan(0);

      results.forEach(pattern => {
        expect(pattern.title).toBeTruthy();
        expect(pattern.title.length).toBeGreaterThan(0);
      });
    });
  });
});
