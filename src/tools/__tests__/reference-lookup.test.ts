import { describe, it, expect } from 'vitest';
import { detectReferenceType, findPatternsByReference } from '../reference-lookup.js';

describe('detectReferenceType', () => {
  it('should detect CVE references', () => {
    expect(detectReferenceType('CVE-2021-44228')).toBe('cve');
    expect(detectReferenceType('CVE-2002-0651')).toBe('cve');
  });

  it('should detect CWE references', () => {
    expect(detectReferenceType('CWE-79')).toBe('cwe');
    expect(detectReferenceType('CWE-1035')).toBe('cwe');
  });

  it('should detect MITRE ATT&CK techniques', () => {
    expect(detectReferenceType('T1003')).toBe('mitre');
    expect(detectReferenceType('T1001.003')).toBe('mitre');
  });

  it('should detect ATLAS ML techniques', () => {
    expect(detectReferenceType('AML.T0024')).toBe('mitre');
    expect(detectReferenceType('AML.T0018')).toBe('mitre');
  });

  it('should detect OWASP categories (A-prefix)', () => {
    expect(detectReferenceType('A01:2021')).toBe('owasp');
    expect(detectReferenceType('A03:2021')).toBe('owasp');
  });

  it('should detect OWASP LLM categories', () => {
    expect(detectReferenceType('LLM02:2025')).toBe('owasp');
    expect(detectReferenceType('LLM04:2025')).toBe('owasp');
  });

  it('should be case-insensitive', () => {
    expect(detectReferenceType('cve-2021-44228')).toBe('cve');
    expect(detectReferenceType('cwe-79')).toBe('cwe');
    expect(detectReferenceType('llm02:2025')).toBe('owasp');
    expect(detectReferenceType('aml.T0024')).toBe('mitre');
  });

  it('should return null for unknown reference types', () => {
    expect(detectReferenceType('UNKNOWN-123')).toBeNull();
    expect(detectReferenceType('random text')).toBeNull();
    expect(detectReferenceType('12345')).toBeNull();
  });

  it('should handle whitespace', () => {
    expect(detectReferenceType('  CVE-2021-44228  ')).toBe('cve');
  });
});

describe('findPatternsByReference', () => {
  describe('CVE lookup', () => {
    it('should find patterns by CVE ID', () => {
      const result = findPatternsByReference('CVE-2002-0651');
      expect(result.reference_type).toBe('cve');
      expect(result.reference_id).toBe('CVE-2002-0651');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.matches.length);
    });

    it('should return correct match structure', () => {
      const result = findPatternsByReference('CVE-2002-0651');
      const match = result.matches[0];
      expect(match.pattern_id).toBeTruthy();
      expect(match.title).toBeTruthy();
      expect(match.stride_category).toBeTruthy();
      expect(match.severity).toBeTruthy();
      expect(typeof match.confidence_score).toBe('number');
      expect(match.reference_detail).toBeTruthy();
    });
  });

  describe('MITRE ATT&CK lookup', () => {
    it('should find patterns by ATT&CK technique (T-prefix)', () => {
      const result = findPatternsByReference('T1003');
      expect(result.reference_type).toBe('mitre');
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should find patterns by ATLAS technique (AML-prefix)', () => {
      const result = findPatternsByReference('AML.T0024');
      expect(result.reference_type).toBe('mitre');
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('CWE lookup', () => {
    it('should find patterns by CWE ID', () => {
      const result = findPatternsByReference('CWE-1035');
      expect(result.reference_type).toBe('cwe');
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('OWASP lookup', () => {
    it('should find patterns by OWASP category (A-prefix)', () => {
      const result = findPatternsByReference('A01:2021');
      expect(result.reference_type).toBe('owasp');
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should find patterns by OWASP LLM category', () => {
      const result = findPatternsByReference('LLM02:2025');
      expect(result.reference_type).toBe('owasp');
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('explicit type override', () => {
    it('should use explicit type even when auto-detection would work', () => {
      const result = findPatternsByReference('CVE-2002-0651', 'cve');
      expect(result.reference_type).toBe('cve');
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('result ordering', () => {
    it('should order results by confidence_score descending', () => {
      const result = findPatternsByReference('A01:2021');
      if (result.matches.length >= 2) {
        for (let i = 1; i < result.matches.length; i++) {
          expect(result.matches[i - 1].confidence_score)
            .toBeGreaterThanOrEqual(result.matches[i].confidence_score);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should return empty matches for non-existent reference', () => {
      const result = findPatternsByReference('CVE-9999-99999');
      expect(result.matches).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw on empty reference_id', () => {
      expect(() => findPatternsByReference('')).toThrow('reference_id is required');
    });

    it('should throw on whitespace-only reference_id', () => {
      expect(() => findPatternsByReference('   ')).toThrow('reference_id is required');
    });

    it('should throw on undetectable type without explicit type', () => {
      expect(() => findPatternsByReference('UNKNOWN-123')).toThrow('Cannot auto-detect');
    });

    it('should not throw on undetectable type with explicit type', () => {
      const result = findPatternsByReference('UNKNOWN-123', 'cve');
      expect(result.reference_type).toBe('cve');
      expect(result.matches).toEqual([]);
    });
  });
});
