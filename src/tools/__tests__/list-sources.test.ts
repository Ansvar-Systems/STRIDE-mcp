import { describe, it, expect } from 'vitest';
import { listSources } from '../list-sources.js';

describe('listSources', () => {
  it('should return source provenance metadata', () => {
    const result = listSources();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]).toHaveProperty('name');
    expect(result.sources[0]).toHaveProperty('authority');
    expect(result.sources[0]).toHaveProperty('last_ingested');
    expect(result.sources[0]).toHaveProperty('license');
    expect(result.sources[0]).toHaveProperty('coverage');
    expect(result.sources[0]).toHaveProperty('limitations');
  });

  it('should include all 5 data sources', () => {
    const result = listSources();
    expect(result.sources.length).toBe(5);
    const names = result.sources.map(s => s.name);
    expect(names).toContain('LINDDUN Privacy Threat Framework');
    expect(names).toContain('MITRE ATT&CK Framework');
  });

  it('should include schema version and last_build from database', () => {
    const result = listSources();
    expect(result).toHaveProperty('schema_version');
    expect(result).toHaveProperty('last_build');
    expect(result).toHaveProperty('jurisdiction');
    expect(result.jurisdiction).toBe('International');
  });
});
