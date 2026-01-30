import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, getDatabaseStats, getDatabaseMetadata, closeDatabase } from '../db.js';

describe('Database Module', () => {
  beforeAll(() => {
    // Ensure database is initialized
    getDatabase();
  });

  afterAll(() => {
    // Clean up
    closeDatabase();
  });

  describe('getDatabase', () => {
    it('should return database instance', () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(db.prepare).toBeDefined();
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', () => {
      const stats = getDatabaseStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total_patterns');
      expect(stats).toHaveProperty('stride_categories');
      expect(stats).toHaveProperty('technologies');
      expect(stats).toHaveProperty('frameworks');
      expect(stats).toHaveProperty('avg_confidence');
      expect(stats).toHaveProperty('critical_count');
      expect(stats).toHaveProperty('high_count');
      expect(stats).toHaveProperty('medium_count');
      expect(stats).toHaveProperty('low_count');
    });

    it('should have valid total patterns count', () => {
      const stats = getDatabaseStats();
      expect(stats.total_patterns).toBeGreaterThan(0);
      expect(Number.isInteger(stats.total_patterns)).toBe(true);
    });

    it('should have valid STRIDE categories count', () => {
      const stats = getDatabaseStats();
      expect(stats.stride_categories).toBeGreaterThan(0);
      expect(stats.stride_categories).toBeLessThanOrEqual(6); // Max 6 STRIDE categories
      expect(Number.isInteger(stats.stride_categories)).toBe(true);
    });

    it('should have valid technologies count', () => {
      const stats = getDatabaseStats();
      expect(stats.technologies).toBeGreaterThan(0);
      expect(Number.isInteger(stats.technologies)).toBe(true);
    });

    it('should have valid frameworks count', () => {
      const stats = getDatabaseStats();
      expect(stats.frameworks).toBeGreaterThan(0);
      expect(Number.isInteger(stats.frameworks)).toBe(true);
    });

    it('should have valid average confidence score', () => {
      const stats = getDatabaseStats();
      expect(stats.avg_confidence).toBeGreaterThan(0);
      expect(stats.avg_confidence).toBeLessThanOrEqual(10);
    });

    it('should have non-negative severity counts', () => {
      const stats = getDatabaseStats();
      expect(stats.critical_count).toBeGreaterThanOrEqual(0);
      expect(stats.high_count).toBeGreaterThanOrEqual(0);
      expect(stats.medium_count).toBeGreaterThanOrEqual(0);
      expect(stats.low_count).toBeGreaterThanOrEqual(0);
    });

    it('should have severity counts sum to total patterns', () => {
      const stats = getDatabaseStats();
      const severitySum = stats.critical_count + stats.high_count + stats.medium_count + stats.low_count;
      expect(severitySum).toBe(stats.total_patterns);
    });
  });

  describe('getDatabaseMetadata', () => {
    it('should return database metadata', () => {
      const metadata = getDatabaseMetadata();

      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('schema_version');
      expect(metadata).toHaveProperty('last_build');
    });

    it('should have valid schema version', () => {
      const metadata = getDatabaseMetadata();
      expect(metadata.schema_version).toBeTruthy();
      expect(typeof metadata.schema_version).toBe('string');
      expect(metadata.schema_version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should have valid last build timestamp', () => {
      const metadata = getDatabaseMetadata();
      expect(metadata.last_build).toBeTruthy();
      expect(typeof metadata.last_build).toBe('string');
      // Verify it's a valid date
      expect(new Date(metadata.last_build).toString()).not.toBe('Invalid Date');
    });
  });

  describe('closeDatabase', () => {
    it('should close database without error', () => {
      // This test will run after all others due to afterAll
      expect(() => closeDatabase()).not.toThrow();
    });
  });
});
