import { describe, it, expect } from 'vitest';
import { listTagValues, filterByTags } from '../tag-filter.js';

describe('listTagValues', () => {
  it('should list industry tag values with counts', () => {
    const result = listTagValues('industry');
    expect(result.tag_type).toBe('industry');
    expect(result.values.length).toBeGreaterThan(0);
    expect(result.total_values).toBe(result.values.length);

    for (const item of result.values) {
      expect(item.value).toBeTruthy();
      expect(item.count).toBeGreaterThan(0);
    }
  });

  it('should list compliance tag values with counts', () => {
    const result = listTagValues('compliance');
    expect(result.tag_type).toBe('compliance');
    expect(result.values.length).toBeGreaterThan(0);
  });

  it('should list deployment tag values with counts', () => {
    const result = listTagValues('deployment');
    expect(result.tag_type).toBe('deployment');
    expect(result.values.length).toBeGreaterThan(0);
  });

  it('should order values by count descending', () => {
    const result = listTagValues('industry');
    if (result.values.length >= 2) {
      for (let i = 1; i < result.values.length; i++) {
        expect(result.values[i - 1].count).toBeGreaterThanOrEqual(result.values[i].count);
      }
    }
  });
});

describe('filterByTags', () => {
  describe('listing mode (no tag_value)', () => {
    it('should return tag values when tag_value is omitted', () => {
      const result = filterByTags('industry');
      expect('values' in result).toBe(true);
      expect('total_values' in result).toBe(true);
    });

    it('should return tag values when tag_value is empty string', () => {
      const result = filterByTags('industry', '');
      expect('values' in result).toBe(true);
    });

    it('should return tag values when tag_value is whitespace', () => {
      const result = filterByTags('industry', '   ');
      expect('values' in result).toBe(true);
    });
  });

  describe('filter mode (with tag_value)', () => {
    it('should filter patterns by industry tag', () => {
      // First list values to find a known one
      const listing = listTagValues('industry');
      const knownValue = listing.values[0].value;

      const result = filterByTags('industry', knownValue);
      expect('patterns' in result).toBe(true);

      const filterResult = result as { tag_type: string; tag_value: string; patterns: unknown[]; total: number; returned: number; offset: number };
      expect(filterResult.tag_type).toBe('industry');
      expect(filterResult.tag_value).toBe(knownValue);
      expect(filterResult.patterns.length).toBeGreaterThan(0);
      expect(filterResult.total).toBeGreaterThan(0);
      expect(filterResult.returned).toBe(filterResult.patterns.length);
      expect(filterResult.offset).toBe(0);
    });

    it('should return correct pattern structure', () => {
      const listing = listTagValues('industry');
      const knownValue = listing.values[0].value;

      const result = filterByTags('industry', knownValue) as { patterns: Array<{ pattern_id: string; title: string; stride_category: string; severity: string; confidence_score: number; tag_value: string }> };
      const pattern = result.patterns[0];

      expect(pattern.pattern_id).toBeTruthy();
      expect(pattern.title).toBeTruthy();
      expect(pattern.stride_category).toBeTruthy();
      expect(pattern.severity).toBeTruthy();
      expect(typeof pattern.confidence_score).toBe('number');
      expect(pattern.tag_value).toBe(knownValue);
    });

    it('should support compliance tag filtering', () => {
      const listing = listTagValues('compliance');
      const knownValue = listing.values[0].value;

      const result = filterByTags('compliance', knownValue);
      expect('patterns' in result).toBe(true);
    });

    it('should support deployment tag filtering', () => {
      const listing = listTagValues('deployment');
      const knownValue = listing.values[0].value;

      const result = filterByTags('deployment', knownValue);
      expect('patterns' in result).toBe(true);
    });

    it('should return empty results for non-existent tag_value', () => {
      const result = filterByTags('industry', 'NonExistentIndustry12345') as { patterns: unknown[]; total: number };
      expect(result.patterns).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', () => {
      const listing = listTagValues('industry');
      const knownValue = listing.values[0].value;

      const result = filterByTags('industry', knownValue, 2) as { patterns: unknown[]; returned: number };
      expect(result.returned).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', () => {
      const listing = listTagValues('industry');
      const knownValue = listing.values[0].value;

      const resultA = filterByTags('industry', knownValue, 1, 0) as { patterns: Array<{ pattern_id: string }> };
      const resultB = filterByTags('industry', knownValue, 1, 1) as { patterns: Array<{ pattern_id: string }>; offset: number };

      if (resultA.patterns.length > 0 && resultB.patterns.length > 0) {
        expect(resultB.patterns[0].pattern_id).not.toBe(resultA.patterns[0].pattern_id);
      }
      expect(resultB.offset).toBe(1);
    });
  });

  describe('validation', () => {
    it('should throw on invalid tag_type', () => {
      expect(() => filterByTags('invalid_type')).toThrow('Invalid tag_type');
    });

    it('should throw on data_classification tag_type', () => {
      expect(() => filterByTags('data_classification')).toThrow('Invalid tag_type');
    });

    it('should list valid tag types in error message', () => {
      expect(() => filterByTags('bad')).toThrow('industry, compliance, deployment');
    });
  });
});
