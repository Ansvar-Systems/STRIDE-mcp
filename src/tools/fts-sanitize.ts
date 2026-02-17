/**
 * FTS5 query sanitizer
 *
 * Strips FTS5 special characters and operators from user input
 * to prevent syntax errors in MATCH queries.
 */

/** Characters that have special meaning in FTS5 and must be stripped */
const SPECIAL_CHARS = /["*^(){}[\]\\;'`~!@#$%&=+<>?,./:|]/g;

/** FTS5 boolean operators — match only whole words (case-insensitive) */
const FTS5_OPERATORS = /\b(?:AND|OR|NOT|NEAR)\b/gi;

/**
 * Sanitize raw user input for safe use in an FTS5 MATCH clause.
 *
 * - Strips FTS5 special characters
 * - Strips FTS5 operators (AND, OR, NOT, NEAR) as whole words
 * - Wraps each remaining token in double quotes
 * - Preserves internal hyphens (e.g. "cross-site") but strips leading/trailing hyphens
 * - Returns empty string for empty/whitespace-only/all-special-char input
 */
export function sanitizeFtsQuery(input: string): string {
  if (!input || !input.trim()) return '';

  let cleaned = input
    // Strip special characters
    .replace(SPECIAL_CHARS, ' ')
    // Strip FTS5 operators (whole words only)
    .replace(FTS5_OPERATORS, ' ');

  // Split into tokens, strip leading/trailing hyphens, filter empties
  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return '';

  return tokens.map((token) => `"${token}"`).join(' ');
}
