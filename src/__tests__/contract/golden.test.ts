/**
 * Contract tests — golden fixture suite
 *
 * Proves the MCP returns correct, stable results for known queries.
 * Runs on every PR, push-to-main, and before publish.
 *
 * Fixture format follows the Ansvar MCP Infrastructure Blueprint v1.1.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { handleToolCall } from '../../tools/definitions.js';

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
