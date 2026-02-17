import { describe, expect, it } from 'vitest';
import { getMitigations } from '../linddun-mitigations.js';

describe('getMitigations', () => {
  it('should return mitigations for a known threat', () => {
    const result = getMitigations('LINDDUN-LINKING-001');
    expect(result).not.toBeNull();
    expect(result?.threat.threat_id).toBe('LINDDUN-LINKING-001');
    expect(result?.mitigations.length).toBeGreaterThan(0);
    expect(result?.total_mitigations).toBe(result?.mitigations.length);
    expect(Array.isArray(result?.threat.sources)).toBe(true);
    expect(Array.isArray(result?.threat.citations)).toBe(true);
    expect(result?.threat.citations.length).toBeGreaterThan(0);
    expect(Array.isArray(result?.mitigations[0].citations)).toBe(true);
  });

  it('should include GDPR mapping context', () => {
    const result = getMitigations('LINDDUN-DATA-DISCLOSURE-001');
    expect(result).not.toBeNull();
    expect(result?.threat.gdpr_articles.length).toBeGreaterThan(0);
  });

  it('should return null for unknown threat', () => {
    const result = getMitigations('LINDDUN-UNKNOWN-999');
    expect(result).toBeNull();
  });
});
