import { describe, it, expect } from 'vitest';
import { sanitizeFtsQuery } from '../fts-sanitize.js';

describe('sanitizeFtsQuery', () => {
  it('should wrap a simple single word in double quotes', () => {
    expect(sanitizeFtsQuery('injection')).toBe('"injection"');
  });

  it('should wrap multiple words each in double quotes', () => {
    expect(sanitizeFtsQuery('sql injection')).toBe('"sql" "injection"');
  });

  it('should strip FTS5 operators (AND, OR, NOT, NEAR) case-insensitively', () => {
    expect(sanitizeFtsQuery('test OR drop')).toBe('"test" "drop"');
    expect(sanitizeFtsQuery('test AND drop')).toBe('"test" "drop"');
    expect(sanitizeFtsQuery('NOT something')).toBe('"something"');
    expect(sanitizeFtsQuery('NEAR test')).toBe('"test"');
    expect(sanitizeFtsQuery('test or drop')).toBe('"test" "drop"');
    expect(sanitizeFtsQuery('test Or drop')).toBe('"test" "drop"');
  });

  it('should strip special characters used by FTS5', () => {
    expect(sanitizeFtsQuery("'; DROP TABLE --")).toBe('"DROP" "TABLE"');
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
    expect(sanitizeFtsQuery('cross-site scripting')).toBe('"cross-site" "scripting"');
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
    expect(sanitizeFtsQuery('cross-site OR "scripting" AND (attack*)')).toBe('"cross-site" "scripting" "attack"');
  });

  it('should not treat AND/OR/NOT/NEAR inside words as operators', () => {
    expect(sanitizeFtsQuery('android')).toBe('"android"');
    expect(sanitizeFtsQuery('pandora')).toBe('"pandora"');
    expect(sanitizeFtsQuery('cannot')).toBe('"cannot"');
    expect(sanitizeFtsQuery('nearby')).toBe('"nearby"');
  });
});
