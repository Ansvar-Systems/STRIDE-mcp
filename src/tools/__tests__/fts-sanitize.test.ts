import { describe, it, expect } from 'vitest';
import { sanitizeFtsQuery } from '../fts-sanitize.js';

describe('sanitizeFtsQuery', () => {
  it('should wrap a simple single word in double quotes', () => {
    expect(sanitizeFtsQuery('injection')).toBe('"injection"');
  });

  it('should join multi-word queries with FTS5 OR operator', () => {
    // Space-joined quoted tokens are implicit FTS5 AND, which forces
    // every token to appear in every matching row. For a 145-pattern
    // corpus that's too restrictive — a natural-language query like
    // "biometric spoofing attack on login" would find 0 matches even
    // though STRIDE-AUTH-BIOMETRIC-001 is exactly the pattern for it.
    // Using OR widens recall to "any token" with FTS5's BM25 ranking
    // doing the relevance ordering. Reproducible gateway probe
    // 2026-04-20: pre-fix, the gateway's search-via-STRIDE returned 0
    // for every 3+ word natural-language query; post-fix it returns
    // ranked hits.
    expect(sanitizeFtsQuery('sql injection')).toBe('"sql" OR "injection"');
    expect(sanitizeFtsQuery('biometric spoofing attack on login')).toBe(
      '"biometric" OR "spoofing" OR "attack" OR "on" OR "login"',
    );
  });

  it('should strip FTS5 operators (AND, OR, NOT, NEAR) case-insensitively', () => {
    expect(sanitizeFtsQuery('test OR drop')).toBe('"test" OR "drop"');
    expect(sanitizeFtsQuery('test AND drop')).toBe('"test" OR "drop"');
    expect(sanitizeFtsQuery('NOT something')).toBe('"something"');
    expect(sanitizeFtsQuery('NEAR test')).toBe('"test"');
    expect(sanitizeFtsQuery('test or drop')).toBe('"test" OR "drop"');
    expect(sanitizeFtsQuery('test Or drop')).toBe('"test" OR "drop"');
  });

  it('should strip special characters used by FTS5', () => {
    expect(sanitizeFtsQuery("'; DROP TABLE --")).toBe('"DROP" OR "TABLE"');
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
  });

  it('should return empty string for whitespace-only input', () => {
    expect(sanitizeFtsQuery('   ')).toBe('');
  });

  it('should return empty string for input that is only special chars', () => {
    expect(sanitizeFtsQuery('***')).toBe('');
  });

  it('should preserve hyphens inside words', () => {
    expect(sanitizeFtsQuery('cross-site scripting')).toBe('"cross-site" OR "scripting"');
  });

  it('should strip leading and trailing hyphens from words', () => {
    expect(sanitizeFtsQuery('-test-')).toBe('"test"');
    expect(sanitizeFtsQuery('--hello--')).toBe('"hello"');
  });

  it('should handle double quotes in input', () => {
    expect(sanitizeFtsQuery('"test"')).toBe('"test"');
  });

  it('should handle asterisks (FTS5 prefix operator)', () => {
    expect(sanitizeFtsQuery('test*')).toBe('"test"');
  });

  it('should handle parentheses (FTS5 grouping)', () => {
    expect(sanitizeFtsQuery('(test)')).toBe('"test"');
  });

  it('should handle complex mixed input', () => {
    expect(sanitizeFtsQuery('cross-site OR "scripting" AND (attack*)')).toBe(
      '"cross-site" OR "scripting" OR "attack"',
    );
  });

  it('should not treat AND/OR/NOT/NEAR inside words as operators', () => {
    expect(sanitizeFtsQuery('android')).toBe('"android"');
    expect(sanitizeFtsQuery('pandora')).toBe('"pandora"');
    expect(sanitizeFtsQuery('cannot')).toBe('"cannot"');
    expect(sanitizeFtsQuery('nearby')).toBe('"nearby"');
  });
});
