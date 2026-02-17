import { describe, it, expect } from 'vitest';
import { getPattern, getPatterns } from '../get-pattern.js';

describe('getPattern', () => {
  describe('basic functionality', () => {
    it('should retrieve pattern by valid ID', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();
      expect(pattern).not.toBeNull();
      expect(pattern?.id).toBe('STRIDE-API-EXPRESS-001');
    });

    it('should return null for non-existent ID', () => {
      const pattern = getPattern('NONEXISTENT-ID-999');
      expect(pattern).toBeNull();
    });
  });

  describe('pattern structure validation', () => {
    it('should return complete pattern with all required fields', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern) {
        // Metadata
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.created_date).toBeTruthy();
        expect(pattern.metadata.confidence_score).toBeGreaterThan(0);
        expect(pattern.metadata.validation_status).toBeTruthy();

        // Classification
        expect(pattern.classification).toBeDefined();
        expect(pattern.classification.stride_category).toBeTruthy();
        expect(Array.isArray(pattern.classification.owasp_top10)).toBe(true);

        // Threat
        expect(pattern.threat).toBeDefined();
        expect(pattern.threat.title).toBeTruthy();
        expect(pattern.threat.description).toBeTruthy();
        expect(pattern.threat.severity).toBeTruthy();
        expect(pattern.threat.cvss_v3).toBeDefined();

        // Technology
        expect(pattern.technology).toBeDefined();
        expect(pattern.technology.primary).toBeTruthy();
        expect(pattern.technology.ecosystem).toBeTruthy();

        // Attack
        expect(pattern.attack).toBeDefined();
        expect(pattern.attack.scenario).toBeTruthy();
        expect(Array.isArray(pattern.attack.prerequisites)).toBe(true);

        // Evidence
        expect(pattern.evidence).toBeDefined();

        // Mitigations
        expect(pattern.mitigations).toBeDefined();
        expect(Array.isArray(pattern.mitigations)).toBe(true);
        expect(pattern.mitigations.length).toBeGreaterThan(0);

        // Detection
        expect(pattern.detection).toBeDefined();
        expect(Array.isArray(pattern.detection.indicators)).toBe(true);

        // Metadata tags
        expect(pattern.metadata_tags).toBeDefined();
      }
    });

    it('should return mitigations with code examples', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern && pattern.mitigations.length > 0) {
        const mitigation = pattern.mitigations[0];
        expect(mitigation.control_id).toBeTruthy();
        expect(mitigation.title).toBeTruthy();
        expect(mitigation.effectiveness).toBeTruthy();
        expect(mitigation.code_example).toBeDefined();
        expect(mitigation.code_example.language).toBeTruthy();
        expect(mitigation.code_example.code).toBeTruthy();
      }
    });

    it('should return valid CVSS score', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern) {
        expect(pattern.threat.cvss_v3.score).toBeGreaterThanOrEqual(0);
        expect(pattern.threat.cvss_v3.score).toBeLessThanOrEqual(10);
        expect(pattern.threat.cvss_v3.vector).toMatch(/^CVSS:3\.[01]\//);
      }
    });
  });

  describe('confidence score validation', () => {
    it('should return patterns with confidence >= 8.5', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern) {
        expect(pattern.metadata.confidence_score).toBeGreaterThanOrEqual(8.5);
      }
    });
  });

  describe('evidence validation', () => {
    it('should include at least one evidence source', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern) {
        const hasEvidence =
          (pattern.evidence.cve_references && pattern.evidence.cve_references.length > 0) ||
          (pattern.evidence.real_world_breaches && pattern.evidence.real_world_breaches.length > 0) ||
          (pattern.evidence.bug_bounty_reports && pattern.evidence.bug_bounty_reports.length > 0) ||
          (pattern.evidence.security_research && pattern.evidence.security_research.length > 0);

        expect(hasEvidence).toBe(true);
      }
    });

    it('should have CVE references with proper format', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001');
      expect(pattern).toBeDefined();

      if (pattern && pattern.evidence.cve_references && pattern.evidence.cve_references.length > 0) {
        const cve = pattern.evidence.cve_references[0];
        expect(cve.cve_id).toMatch(/^CVE-\d{4}-\d+$/);
        expect(cve.cvss_score).toBeGreaterThanOrEqual(0);
        expect(cve.cvss_score).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string ID', () => {
      const pattern = getPattern('');
      expect(pattern).toBeNull();
    });

    it('should handle ID with special characters', () => {
      const pattern = getPattern('STRIDE-API-EXPRESS-001; DROP TABLE patterns;');
      expect(pattern).toBeNull();
    });

    it('should handle very long ID strings', () => {
      const longId = 'STRIDE-' + 'A'.repeat(1000);
      const pattern = getPattern(longId);
      expect(pattern).toBeNull();
    });

    it('should be case-sensitive for IDs', () => {
      const pattern = getPattern('stride-api-express-001');
      expect(pattern).toBeNull();
    });
  });
});

describe('getPatterns', () => {
  describe('basic functionality', () => {
    it('should retrieve multiple patterns by IDs', () => {
      const patterns = getPatterns(['STRIDE-API-EXPRESS-001', 'STRIDE-API-EXPRESS-002']);
      expect(patterns.length).toBe(2);
      expect(patterns[0].id).toBe('STRIDE-API-EXPRESS-001');
      expect(patterns[1].id).toBe('STRIDE-API-EXPRESS-002');
    });

    it('should return empty array for empty input', () => {
      const patterns = getPatterns([]);
      expect(patterns).toEqual([]);
    });

    it('should skip non-existent IDs', () => {
      const patterns = getPatterns(['STRIDE-API-EXPRESS-001', 'NONEXISTENT-ID']);
      expect(patterns.length).toBe(1);
      expect(patterns[0].id).toBe('STRIDE-API-EXPRESS-001');
    });

    it('should return all valid patterns when some IDs are invalid', () => {
      const patterns = getPatterns([
        'STRIDE-API-EXPRESS-001',
        'INVALID',
        'STRIDE-API-EXPRESS-002',
        'ALSO-INVALID'
      ]);
      expect(patterns.length).toBe(2);
      expect(patterns.map(p => p.id)).toContain('STRIDE-API-EXPRESS-001');
      expect(patterns.map(p => p.id)).toContain('STRIDE-API-EXPRESS-002');
    });
  });

  describe('pattern validation', () => {
    it('should return complete pattern objects', () => {
      const patterns = getPatterns(['STRIDE-API-EXPRESS-001']);
      expect(patterns.length).toBe(1);

      const pattern = patterns[0];
      expect(pattern.metadata).toBeDefined();
      expect(pattern.classification).toBeDefined();
      expect(pattern.threat).toBeDefined();
      expect(pattern.technology).toBeDefined();
      expect(pattern.mitigations).toBeDefined();
    });
  });

  describe('deduplication', () => {
    it('should handle duplicate IDs gracefully', () => {
      const patterns = getPatterns([
        'STRIDE-API-EXPRESS-001',
        'STRIDE-API-EXPRESS-001',
        'STRIDE-API-EXPRESS-002'
      ]);
      // Should return all requested (database may return duplicates)
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });
  });
});
