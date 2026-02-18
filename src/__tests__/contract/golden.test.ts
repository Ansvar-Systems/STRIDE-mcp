/**
 * Contract tests — golden fixture suite
 *
 * Proves the MCP returns correct, stable results for known queries.
 * Runs on every PR, push-to-main, and before publish.
 *
 * Fixture format follows the Ansvar MCP Infrastructure Blueprint v1.1.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { handleToolCall } from '../../tools/definitions.js';
import { getDatabase } from '../../database/db.js';

interface GoldenTest {
  id: string;
  category: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
  assertions: Record<string, unknown>;
}

interface GoldenFixture {
  version: string;
  mcp_name: string;
  description: string;
  tests: GoldenTest[];
}

const fixtures: GoldenFixture = JSON.parse(
  readFileSync(join(__dirname, '../../../fixtures/golden-tests.json'), 'utf-8')
);

const goldenHashes = JSON.parse(
  readFileSync(join(__dirname, '../../../fixtures/golden-hashes.json'), 'utf-8')
);

describe('Contract Tests (Golden)', () => {
  for (const test of fixtures.tests) {
    it(`[${test.id}] ${test.description}`, async () => {
      const toolResult = await handleToolCall(test.tool, test.input);
      const text = toolResult.content[0].text;
      const parsed = JSON.parse(text);

      // ── result_not_empty ──────────────────────────────────────
      if (test.assertions.result_not_empty) {
        expect(parsed).toBeDefined();
        expect(parsed).not.toBeNull();
        // Must not be an error response (unless handles_gracefully is set)
        if (!test.assertions.handles_gracefully) {
          expect(toolResult.isError).toBeFalsy();
        }
      }

      // ── text_contains ─────────────────────────────────────────
      if (test.assertions.text_contains) {
        const haystack = text.toLowerCase();
        for (const needle of test.assertions.text_contains as string[]) {
          expect(haystack).toContain(needle.toLowerCase());
        }
      }

      // ── any_result_contains ───────────────────────────────────
      if (test.assertions.any_result_contains) {
        const haystack = text.toLowerCase();
        const needles = test.assertions.any_result_contains as string[];
        const found = needles.some((n) => haystack.includes(n.toLowerCase()));
        expect(found).toBe(true);
      }

      // ── fields_present ────────────────────────────────────────
      if (test.assertions.fields_present) {
        for (const field of test.assertions.fields_present as string[]) {
          expect(parsed).toHaveProperty(field);
        }
      }

      // ── min_results ───────────────────────────────────────────
      if (test.assertions.min_results) {
        const items = Array.isArray(parsed)
          ? parsed
          : parsed.results ?? parsed.patterns ?? parsed.mitigations ?? [];
        expect(items.length).toBeGreaterThanOrEqual(test.assertions.min_results as number);
      }

      // ── text_not_empty ────────────────────────────────────────
      if (test.assertions.text_not_empty) {
        expect(text.length).toBeGreaterThan(2); // not just "{}"
      }

      // ── handles_gracefully ────────────────────────────────────
      if (test.assertions.handles_gracefully) {
        // Reaching here without throwing means it handled gracefully.
        // It can either be an error response or an empty result — both are fine.
        expect(true).toBe(true);
      }
    });
  }
});

describe('Drift Detection (Golden Hashes)', () => {
  it('should have the expected number of patterns', () => {
    const db = getDatabase();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM patterns').get() as { n: number };
    expect(n).toBe(goldenHashes.hashes.patterns_count);
  });

  it('should have stable pattern identities', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT id, title, stride_category, severity, cvss_score FROM patterns ORDER BY id').all();
    const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    expect(hash).toBe(goldenHashes.hashes.patterns_hash);
  });

  it('should have the expected number of DFD elements', () => {
    const db = getDatabase();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM dfd_elements').get() as { n: number };
    expect(n).toBe(goldenHashes.hashes.dfd_elements_count);
  });

  it('should have stable DFD element identities', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT technology, dfd_role, category FROM dfd_elements ORDER BY technology').all();
    const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    expect(hash).toBe(goldenHashes.hashes.dfd_elements_hash);
  });

  it('should have the expected number of LINDDUN threats', () => {
    const db = getDatabase();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM linddun_threats').get() as { n: number };
    expect(n).toBe(goldenHashes.hashes.linddun_threats_count);
  });

  it('should have stable LINDDUN threat identities', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT threat_id, category, tree_path FROM linddun_threats ORDER BY threat_id').all();
    const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    expect(hash).toBe(goldenHashes.hashes.linddun_threats_hash);
  });

  it('should have the expected number of mitigations', () => {
    const db = getDatabase();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM mitigations').get() as { n: number };
    expect(n).toBe(goldenHashes.hashes.mitigations_count);
  });

  it('should have the expected number of trust boundaries', () => {
    const db = getDatabase();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM trust_boundary_templates').get() as { n: number };
    expect(n).toBe(goldenHashes.hashes.trust_boundaries_count);
  });
});
