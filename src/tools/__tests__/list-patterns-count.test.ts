import { describe, it, expect } from 'vitest';
import { countPatterns } from '../list-patterns.js';

describe('countPatterns', () => {
  describe('basic counting', () => {
    it('should count all patterns without filters', () => {
      const count = countPatterns({});
      expect(count).toBeGreaterThan(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should return same count as unfiltered list', () => {
      const count = countPatterns({});
      expect(count).toBeGreaterThanOrEqual(4); // We have 4 patterns
    });
  });

  describe('filtering by STRIDE category', () => {
    it('should count patterns by Spoofing category', () => {
      const count = countPatterns({ stride_category: 'Spoofing' });
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should count patterns by Tampering category', () => {
      const count = countPatterns({ stride_category: 'Tampering' });
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should return 0 for non-existent category', () => {
      const count = countPatterns({ stride_category: 'NonExistentCategory' });
      expect(count).toBe(0);
    });
  });

  describe('filtering by technology', () => {
    it('should count patterns by Express.js technology', () => {
      const count = countPatterns({ technology: 'Express.js' });
      expect(count).toBeGreaterThan(0);
    });

    it('should count patterns by Flask technology', () => {
      const count = countPatterns({ technology: 'Flask' });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for non-existent technology', () => {
      const count = countPatterns({ technology: 'NonExistentTech' });
      expect(count).toBe(0);
    });
  });

  describe('filtering by framework', () => {
    it('should count patterns by Express.js framework', () => {
      const count = countPatterns({ framework: 'Express.js' });
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent framework', () => {
      const count = countPatterns({ framework: 'NonExistentFramework' });
      expect(count).toBe(0);
    });
  });

  describe('filtering by severity', () => {
    it('should count patterns by Critical severity', () => {
      const count = countPatterns({ severity: 'Critical' });
      expect(count).toBeGreaterThan(0);
    });

    it('should count patterns by High severity', () => {
      const count = countPatterns({ severity: 'High' });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for non-existent severity', () => {
      const count = countPatterns({ severity: 'NonExistent' });
      expect(count).toBe(0);
    });
  });

  describe('filtering by confidence score', () => {
    it('should count patterns above minimum confidence', () => {
      const count = countPatterns({ min_confidence: 8.5 });
      expect(count).toBeGreaterThan(0);
    });

    it('should count patterns above high confidence threshold', () => {
      const count = countPatterns({ min_confidence: 9.0 });
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for impossible confidence threshold', () => {
      const count = countPatterns({ min_confidence: 11 });
      expect(count).toBe(0);
    });

    it('should count all patterns with min_confidence 0', () => {
      const allCount = countPatterns({});
      const minCount = countPatterns({ min_confidence: 0 });
      expect(minCount).toBe(allCount);
    });
  });

  describe('filtering by validation status', () => {
    it('should count patterns by draft status', () => {
      const count = countPatterns({ validation_status: 'draft' });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count patterns by validated status', () => {
      const count = countPatterns({ validation_status: 'validated' });
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count patterns by expert-validated status', () => {
      const count = countPatterns({ validation_status: 'expert-validated' });
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters simultaneously', () => {
      const count = countPatterns({
        stride_category: 'Tampering',
        severity: 'Critical',
        min_confidence: 8.5,
      });
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should return 0 when filters match nothing', () => {
      const count = countPatterns({
        stride_category: 'Spoofing',
        severity: 'Low',
        min_confidence: 9.9,
      });
      expect(count).toBe(0);
    });

    it('should count less than or equal to total when filtered', () => {
      const totalCount = countPatterns({});
      const filteredCount = countPatterns({ severity: 'Critical' });
      expect(filteredCount).toBeLessThanOrEqual(totalCount);
    });
  });
});
