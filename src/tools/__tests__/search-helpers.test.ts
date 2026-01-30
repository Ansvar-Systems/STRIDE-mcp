import { describe, it, expect } from 'vitest';
import { getStrideCategories, getTechnologies, getFrameworks, getSeverityLevels } from '../search.js';

describe('Search Helper Functions', () => {
  describe('getStrideCategories', () => {
    it('should return array of STRIDE categories', () => {
      const categories = getStrideCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should return valid STRIDE category names', () => {
      const categories = getStrideCategories();
      const validCategories = [
        'Spoofing',
        'Tampering',
        'Repudiation',
        'Information Disclosure',
        'Denial of Service',
        'Elevation of Privilege',
      ];

      categories.forEach(category => {
        expect(validCategories).toContain(category);
      });
    });

    it('should return sorted categories', () => {
      const categories = getStrideCategories();
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });

    it('should not have duplicates', () => {
      const categories = getStrideCategories();
      const unique = new Set(categories);
      expect(unique.size).toBe(categories.length);
    });
  });

  describe('getTechnologies', () => {
    it('should return array of technologies', () => {
      const technologies = getTechnologies();
      expect(Array.isArray(technologies)).toBe(true);
      expect(technologies.length).toBeGreaterThan(0);
    });

    it('should include Express.js as a technology', () => {
      const technologies = getTechnologies();
      expect(technologies).toContain('Express.js');
    });

    it('should return sorted technologies', () => {
      const technologies = getTechnologies();
      const sorted = [...technologies].sort();
      expect(technologies).toEqual(sorted);
    });

    it('should not have duplicates', () => {
      const technologies = getTechnologies();
      const unique = new Set(technologies);
      expect(unique.size).toBe(technologies.length);
    });

    it('should return only non-empty strings', () => {
      const technologies = getTechnologies();
      technologies.forEach(tech => {
        expect(tech).toBeTruthy();
        expect(typeof tech).toBe('string');
        expect(tech.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFrameworks', () => {
    it('should return array of frameworks', () => {
      const frameworks = getFrameworks();
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks.length).toBeGreaterThan(0);
    });

    it('should include Express.js as a framework', () => {
      const frameworks = getFrameworks();
      expect(frameworks).toContain('Express.js');
    });

    it('should return sorted frameworks', () => {
      const frameworks = getFrameworks();
      const sorted = [...frameworks].sort();
      expect(frameworks).toEqual(sorted);
    });

    it('should not have duplicates', () => {
      const frameworks = getFrameworks();
      const unique = new Set(frameworks);
      expect(unique.size).toBe(frameworks.length);
    });

    it('should return only non-empty strings', () => {
      const frameworks = getFrameworks();
      frameworks.forEach(framework => {
        expect(framework).toBeTruthy();
        expect(typeof framework).toBe('string');
        expect(framework.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSeverityLevels', () => {
    it('should return array of severity levels', () => {
      const severities = getSeverityLevels();
      expect(Array.isArray(severities)).toBe(true);
      expect(severities.length).toBe(5);
    });

    it('should include all standard severity levels', () => {
      const severities = getSeverityLevels();
      expect(severities).toContain('Critical');
      expect(severities).toContain('High');
      expect(severities).toContain('Medium');
      expect(severities).toContain('Low');
      expect(severities).toContain('Informational');
    });

    it('should be in order from most to least severe', () => {
      const severities = getSeverityLevels();
      expect(severities).toEqual(['Critical', 'High', 'Medium', 'Low', 'Informational']);
    });
  });
});
