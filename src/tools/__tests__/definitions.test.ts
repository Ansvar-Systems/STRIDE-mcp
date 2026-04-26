import { describe, it, expect } from 'vitest';
import { handleToolCall } from '../definitions.js';

describe('handleToolCall', () => {
  describe('tool dispatch', () => {
    it('should dispatch search_patterns with valid query', async () => {
      const result = await handleToolCall('search_patterns', { query: 'JWT' });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeTruthy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toBeDefined();
      expect(parsed.total).toBeDefined();
      expect(parsed._query).toBe('JWT');
    });

    it('should dispatch get_pattern with valid pattern_id', async () => {
      // First, get a valid pattern ID from search
      const searchResult = await handleToolCall('search_patterns', { query: 'authentication' });
      const searchData = JSON.parse(searchResult.content[0].text);
      const patternId = searchData.results[0]?.id;

      if (!patternId) {
        // Fallback if search doesn't return results
        console.warn('No pattern found in search, skipping get_pattern test');
        return;
      }

      const result = await handleToolCall('get_pattern', { pattern_id: patternId });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(patternId);
      expect(parsed.threat.title).toBeDefined();
    });

    it('should dispatch list_patterns with no required args', async () => {
      const result = await handleToolCall('list_patterns', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.patterns).toBeDefined();
      expect(Array.isArray(parsed.patterns)).toBe(true);
      expect(parsed.total).toBeDefined();
      expect(parsed.returned).toBeDefined();
      expect(parsed.offset).toBeDefined();
    });

    it('should dispatch get_database_stats with no args', async () => {
      const result = await handleToolCall('get_database_stats', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_patterns).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });

    it('should dispatch get_available_filters with no args', async () => {
      const result = await handleToolCall('get_available_filters', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.stride_categories).toBeDefined();
      expect(parsed.linddun_categories).toBeDefined();
      expect(parsed.technologies).toBeDefined();
      expect(parsed.frameworks).toBeDefined();
      expect(parsed.severity_levels).toBeDefined();
      expect(parsed.validation_statuses).toBeDefined();
    });

    it('should dispatch classify_technology with technology name', async () => {
      const result = await handleToolCall('classify_technology', { technology: 'PostgreSQL' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.query).toBe('PostgreSQL');
      expect(parsed.match).toBeDefined();
    });

    it('should dispatch get_dfd_taxonomy with no args', async () => {
      const result = await handleToolCall('get_dfd_taxonomy', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.element_types).toBeDefined();
      expect(Array.isArray(parsed.element_types)).toBe(true);
      expect(parsed.categories).toBeDefined();
      expect(parsed.mermaid_reference).toBeDefined();
      expect(parsed.total_elements).toBeDefined();
    });

    it('should dispatch suggest_trust_boundaries with technologies array', async () => {
      const result = await handleToolCall('suggest_trust_boundaries', {
        technologies: ['PostgreSQL', 'Redis'],
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.template).toBeDefined();
      expect(parsed.score).toBeDefined();
      expect(parsed.assignments).toBeDefined();
      expect(Array.isArray(parsed.assignments)).toBe(true);
      expect(parsed.mermaid_skeleton).toBeDefined();
    });

    it('should dispatch find_patterns_by_reference with reference_id', async () => {
      const result = await handleToolCall('find_patterns_by_reference', {
        reference_id: 'CVE-2021-44228',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.reference_id).toBe('CVE-2021-44228');
      expect(parsed.reference_type).toBeDefined();
      expect(parsed.matches).toBeDefined();
      expect(Array.isArray(parsed.matches)).toBe(true);
    });

    it('should dispatch filter_by_tags with tag_type', async () => {
      const result = await handleToolCall('filter_by_tags', { tag_type: 'industry' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      // Without tag_value, should list available values
      expect(parsed.tag_type).toBe('industry');
      expect(parsed.values).toBeDefined();
      expect(Array.isArray(parsed.values)).toBe(true);
    });

    it('should dispatch search_mitigations with no required args', async () => {
      const result = await handleToolCall('search_mitigations', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.mitigations).toBeDefined();
      expect(Array.isArray(parsed.mitigations)).toBe(true);
      expect(parsed.total).toBeDefined();
    });

    it('should dispatch search_threats with deprecation message', async () => {
      const result = await handleToolCall('search_threats', {
        category: 'Linking',
        limit: 5,
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
      expect(parsed.status).toBe(410);
      expect(parsed.moved_to).toBe('privacy-patterns-mcp');
    });

    it('should dispatch get_threat_tree with deprecation message', async () => {
      const result = await handleToolCall('get_threat_tree', {
        category: 'Detecting',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
      expect(parsed.status).toBe(410);
      expect(parsed.moved_to).toBe('privacy-patterns-mcp');
    });

    it('should dispatch get_mitigations with deprecation message', async () => {
      const result = await handleToolCall('get_mitigations', {
        threat_id: 'LINDDUN-LINKING-001',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
      expect(parsed.status).toBe(410);
      expect(parsed.moved_to).toBe('privacy-patterns-mcp');
    });

    it('should dispatch search_privacy_patterns with deprecation message', async () => {
      const result = await handleToolCall('search_privacy_patterns', {
        query: 'consent',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
      expect(parsed.status).toBe(410);
      expect(parsed.moved_to).toBe('privacy-patterns-mcp');
    });
  });

  describe('error handling', () => {
    it('should return error for unknown tool name', async () => {
      const result = await handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('Unknown tool');
    });

    it('should handle get_pattern with non-existent pattern_id', async () => {
      const result = await handleToolCall('get_pattern', {
        pattern_id: 'NONEXISTENT-PATTERN-999',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('Pattern not found');
    });

    it('should handle find_patterns_by_reference with invalid reference format', async () => {
      const result = await handleToolCall('find_patterns_by_reference', {
        reference_id: 'invalid-format',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBeDefined();
    });

    it('should handle filter_by_tags with invalid tag_type', async () => {
      const result = await handleToolCall('filter_by_tags', { tag_type: 'invalid_type' });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBeDefined();
    });

    it('should handle get_mitigations with deprecation message', async () => {
      const result = await handleToolCall('get_mitigations', {
        threat_id: 'LINDDUN-DOES-NOT-EXIST-999',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
    });

    it('should handle get_threat_tree with deprecation message', async () => {
      const result = await handleToolCall('get_threat_tree', {});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
    });
  });

  describe('response structure', () => {
    it('should return content array with text type for all successful calls', async () => {
      const tools = [
        { name: 'search_patterns', args: { query: 'test' } },
        { name: 'list_patterns', args: {} },
        { name: 'get_database_stats', args: {} },
        { name: 'get_available_filters', args: {} },
        { name: 'classify_technology', args: { technology: 'Redis' } },
        { name: 'get_dfd_taxonomy', args: {} },
        { name: 'suggest_trust_boundaries', args: { technologies: ['Redis'] } },
        { name: 'filter_by_tags', args: { tag_type: 'compliance' } },
        { name: 'search_mitigations', args: {} },
      ];

      for (const tool of tools) {
        const result = await handleToolCall(tool.name, tool.args);

        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].type).toBe('text');
        expect(typeof result.content[0].text).toBe('string');

        // Verify it's valid JSON
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });

    it('should return deprecation responses for LINDDUN tools', async () => {
      const linddunTools = [
        { name: 'search_threats', args: { category: 'Linking' } },
        { name: 'get_threat_tree', args: { category: 'Linking' } },
        { name: 'get_mitigations', args: { threat_id: 'LINDDUN-LINKING-001' } },
        { name: 'search_privacy_patterns', args: { query: 'privacy' } },
      ];

      for (const tool of linddunTools) {
        const result = await handleToolCall(tool.name, tool.args);

        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].type).toBe('text');
        expect(typeof result.content[0].text).toBe('string');
        expect(result.isError).toBe(true);

        // Verify it's valid JSON with deprecation message
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
        expect(parsed.status).toBe(410);
        expect(parsed.moved_to).toBe('privacy-patterns-mcp');
      }
    });

    it('should have isError flag only on error responses', async () => {
      const successResult = await handleToolCall('get_database_stats', {});
      expect(successResult.isError).toBeUndefined();

      const errorResult = await handleToolCall('unknown_tool', {});
      expect(errorResult.isError).toBe(true);
    });
  });

  describe('tool-specific behavior', () => {
    it('should support filtering in search_patterns', async () => {
      const result = await handleToolCall('search_patterns', {
        query: 'authentication',
        severity: 'Critical',
        min_confidence: 8,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toBeDefined();
      expect(parsed._query).toBe('authentication');
    });

    it('should support sorting and pagination in list_patterns', async () => {
      const result = await handleToolCall('list_patterns', {
        limit: 10,
        offset: 0,
        sort_by: 'confidence',
        sort_order: 'desc',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.patterns).toBeDefined();
      expect(parsed.patterns.length).toBeLessThanOrEqual(10);
      expect(parsed.offset).toBe(0);
    });

    it('should support optional filters in search_mitigations', async () => {
      const result = await handleToolCall('search_mitigations', {
        query: 'validation',
        effectiveness: 'High',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.mitigations).toBeDefined();
      expect(Array.isArray(parsed.mitigations)).toBe(true);
    });

    it('should support auto-detection of reference type in find_patterns_by_reference', async () => {
      // CVE format should auto-detect as 'cve'
      const cveResult = await handleToolCall('find_patterns_by_reference', {
        reference_id: 'CVE-2024-1234',
      });
      const cveParsed = JSON.parse(cveResult.content[0].text);
      expect(cveParsed.reference_type).toBe('cve');

      // T-prefix should auto-detect as 'mitre'
      const mitreResult = await handleToolCall('find_patterns_by_reference', {
        reference_id: 'T1078',
      });
      const mitreParsed = JSON.parse(mitreResult.content[0].text);
      expect(mitreParsed.reference_type).toBe('mitre');
    });

    it('should return deprecation for search_threats category filtering', async () => {
      const result = await handleToolCall('search_threats', {
        query: 'identifier',
        category: 'Identifying',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
    });

    it('should return deprecation for search_privacy_patterns category filtering', async () => {
      const result = await handleToolCall('search_privacy_patterns', {
        category: 'Unawareness',
        limit: 10,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('LINDDUN tools moved to privacy-patterns-mcp');
    });

    it('should list available tag values when tag_value is omitted in filter_by_tags', async () => {
      const result = await handleToolCall('filter_by_tags', { tag_type: 'deployment' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.values).toBeDefined();
      expect(Array.isArray(parsed.values)).toBe(true);
    });

    it('should return patterns when tag_value is provided in filter_by_tags', async () => {
      // First get available values
      const listResult = await handleToolCall('filter_by_tags', { tag_type: 'industry' });
      const listParsed = JSON.parse(listResult.content[0].text);

      if (listParsed.values && listParsed.values.length > 0) {
        const tagValue = listParsed.values[0].value;

        // Then filter by that value
        const filterResult = await handleToolCall('filter_by_tags', {
          tag_type: 'industry',
          tag_value: tagValue,
        });

        const filterParsed = JSON.parse(filterResult.content[0].text);
        expect(filterParsed.patterns).toBeDefined();
        expect(Array.isArray(filterParsed.patterns)).toBe(true);
      }
    });
  });
});
