import { describe, it, expect } from 'vitest';
import { searchPatterns } from '../search.js';

describe('searchPatterns', () => {
  describe('basic search functionality', () => {
    it('should find patterns by technology keyword', () => {
      const results = searchPatterns({ query: 'Express' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('relevance_score');
    });

    it('should find patterns by vulnerability type', () => {
      const results = searchPatterns({ query: 'SQL injection' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.title.includes('SQL'))).toBe(true);
    });

    it('should find patterns by STRIDE category', () => {
      const results = searchPatterns({ query: 'authentication' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching query', () => {
      const results = searchPatterns({ query: 'nonexistent-technology-xyz123' });
      expect(results).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should filter by framework', () => {
      const results = searchPatterns({
        query: 'authentication',
        framework: 'Express.js',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.framework === 'Express.js')).toBe(true);
    });

    it('should filter by severity', () => {
      const results = searchPatterns({
        query: 'injection',
        severity: 'Critical',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.severity === 'Critical')).toBe(true);
    });

    it('should filter by minimum confidence score', () => {
      const results = searchPatterns({
        query: 'injection',
        min_confidence: 9.0,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.confidence_score >= 9.0)).toBe(true);
    });

    it('should filter by STRIDE category', () => {
      const results = searchPatterns({
        query: 'injection',
        stride_category: 'Tampering',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.stride_category === 'Tampering')).toBe(true);
    });

    it('should combine multiple filters', () => {
      const results = searchPatterns({
        query: 'Express',
        framework: 'Express.js',
        severity: 'Critical',
        min_confidence: 8.5,
      });
      if (results.length > 0) {
        expect(results.every(r =>
          r.framework === 'Express.js' &&
          r.severity === 'Critical' &&
          r.confidence_score >= 8.5
        )).toBe(true);
      }
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', () => {
      const results = searchPatterns({ query: 'Express', limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should default to 20 results when limit not specified', () => {
      const results = searchPatterns({ query: 'security' });
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should handle limit with multiple results', () => {
      // Search should respect limit even when more results exist
      const allResults = searchPatterns({ query: 'Express' });
      const limitedResults = searchPatterns({ query: 'Express', limit: 2 });

      if (allResults.length > 2) {
        expect(limitedResults.length).toBe(2);
      } else {
        expect(limitedResults.length).toBe(allResults.length);
      }
    });
  });

  describe('search quality', () => {
    it('should return results sorted by relevance', () => {
      const results = searchPatterns({ query: 'JWT secret' });
      if (results.length > 1) {
        // Lower rank values = better match in SQLite FTS5
        expect(results[0].relevance_score).toBeLessThanOrEqual(results[1].relevance_score);
      }
    });

    it('should include snippet with search term highlighted', () => {
      const results = searchPatterns({ query: 'Express' });
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('snippet');
        expect(results[0].snippet).toBeTruthy();
      }
    });

    it('should find patterns with partial matches', () => {
      const results = searchPatterns({ query: 'inject' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.title.toLowerCase().includes('injection') ||
        r.snippet.toLowerCase().includes('injection')
      )).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query string', () => {
      const results = searchPatterns({ query: '' });
      expect(results).toEqual([]);
    });

    it('should handle special characters in query', () => {
      const results = searchPatterns({ query: 'SQL "injection"' });
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long query strings', () => {
      const longQuery = 'a'.repeat(1000);
      const results = searchPatterns({ query: longQuery });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle negative confidence scores gracefully', () => {
      const results = searchPatterns({ query: 'Express', min_confidence: -1 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle confidence scores above 10 gracefully', () => {
      const results = searchPatterns({ query: 'Express', min_confidence: 15 });
      expect(results).toEqual([]);
    });
  });
});
