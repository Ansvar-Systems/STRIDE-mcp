import { describe, it, expect } from 'vitest';
import { classifyTechnology, getDfdTaxonomy, suggestTrustBoundaries } from '../dfd-tools.js';

describe('classifyTechnology', () => {
  describe('exact match', () => {
    it('should classify a known technology by exact name', () => {
      const result = classifyTechnology('PostgreSQL');
      expect(result.match).not.toBeNull();
      expect(result.match!.technology).toBe('PostgreSQL');
      expect(result.match!.dfd_role).toBe('data_store');
      expect(result.match!.mermaid_shape).toBe('cylinder');
      expect(result.query).toBe('PostgreSQL');
    });

    it('should be case-insensitive for exact match', () => {
      const result = classifyTechnology('postgresql');
      expect(result.match).not.toBeNull();
      expect(result.match!.technology).toBe('PostgreSQL');
    });

    it('should return all required DFD element fields', () => {
      const result = classifyTechnology('Redis');
      expect(result.match).not.toBeNull();

      const match = result.match!;
      expect(match.id).toBeTruthy();
      expect(match.technology).toBeTruthy();
      expect(Array.isArray(match.aliases)).toBe(true);
      expect(match.category).toBeTruthy();
      expect(match.dfd_role).toBeTruthy();
      expect(match.default_zone).toBeTruthy();
      expect(match.mermaid_shape).toBeTruthy();
      expect(match.mermaid_node_syntax).toBeTruthy();
      expect(Array.isArray(match.typical_protocols)).toBe(true);
      expect(Array.isArray(match.related_pattern_ids)).toBe(true);
      expect(match.description).toBeTruthy();
    });
  });

  describe('alias match', () => {
    it('should find technologies by alias', () => {
      // Most DFD elements have aliases; try a common one
      const result = classifyTechnology('Postgres');
      expect(result.match).not.toBeNull();
      expect(result.match!.technology).toBe('PostgreSQL');
    });
  });

  describe('fuzzy and fallback matching', () => {
    it('should return suggestions for partial matches', () => {
      const result = classifyTechnology('database');
      // Should find something via FTS or LIKE
      expect(result.match !== null || result.suggestions.length > 0).toBe(true);
    });

    it('should return null match for completely unknown technology', () => {
      const result = classifyTechnology('xyznonexistent12345');
      expect(result.match).toBeNull();
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string input', () => {
      const result = classifyTechnology('');
      expect(result.match).toBeNull();
      expect(result.suggestions).toEqual([]);
      expect(result.query).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = classifyTechnology('   ');
      expect(result.match).toBeNull();
    });

    it('should trim input', () => {
      const result = classifyTechnology('  Redis  ');
      expect(result.match).not.toBeNull();
      expect(result.match!.technology).toBe('Redis');
    });
  });
});

describe('getDfdTaxonomy', () => {
  it('should return the complete taxonomy structure', () => {
    const taxonomy = getDfdTaxonomy();

    expect(taxonomy.element_types).toBeDefined();
    expect(Array.isArray(taxonomy.element_types)).toBe(true);
    expect(taxonomy.element_types.length).toBe(4); // external_entity, process, data_store, data_flow

    expect(taxonomy.categories).toBeDefined();
    expect(Array.isArray(taxonomy.categories)).toBe(true);
    expect(taxonomy.categories.length).toBeGreaterThan(0);

    expect(taxonomy.mermaid_reference).toBeDefined();
    expect(typeof taxonomy.mermaid_reference).toBe('string');
    expect(taxonomy.mermaid_reference.length).toBeGreaterThan(0);

    expect(taxonomy.total_elements).toBeGreaterThan(0);
  });

  it('should include all 4 DFD element types', () => {
    const taxonomy = getDfdTaxonomy();
    const roles = taxonomy.element_types.map(t => t.role);

    expect(roles).toContain('external_entity');
    expect(roles).toContain('process');
    expect(roles).toContain('data_store');
    expect(roles).toContain('data_flow');
  });

  it('should have valid element type info', () => {
    const taxonomy = getDfdTaxonomy();

    for (const elementType of taxonomy.element_types) {
      expect(elementType.role).toBeTruthy();
      expect(elementType.mermaid_shape).toBeTruthy();
      expect(elementType.description).toBeTruthy();
      expect(elementType.example_syntax).toBeTruthy();
    }
  });

  it('should have category statistics with counts', () => {
    const taxonomy = getDfdTaxonomy();

    for (const cat of taxonomy.categories) {
      expect(cat.category).toBeTruthy();
      expect(cat.count).toBeGreaterThan(0);
    }

    // Total elements should equal the sum of category counts
    const sumOfCategories = taxonomy.categories.reduce((sum, c) => sum + c.count, 0);
    expect(sumOfCategories).toBe(taxonomy.total_elements);
  });

  it('should include Mermaid syntax reference with key sections', () => {
    const taxonomy = getDfdTaxonomy();

    expect(taxonomy.mermaid_reference).toContain('Mermaid');
    expect(taxonomy.mermaid_reference).toContain('Data Store');
    expect(taxonomy.mermaid_reference).toContain('Process');
    expect(taxonomy.mermaid_reference).toContain('External Entity');
    expect(taxonomy.mermaid_reference).toContain('subgraph');
  });
});

describe('suggestTrustBoundaries', () => {
  describe('basic functionality', () => {
    it('should suggest a template for a set of known technologies', () => {
      const result = suggestTrustBoundaries(['PostgreSQL', 'Redis', 'Kong']);

      expect(result.template).not.toBeNull();
      expect(result.score).toBeGreaterThan(0);
      expect(result.assignments).toHaveLength(3);
      expect(result.mermaid_skeleton).toBeTruthy();
    });

    it('should classify each technology in the assignments', () => {
      const result = suggestTrustBoundaries(['PostgreSQL', 'Redis']);

      for (const assignment of result.assignments) {
        expect(assignment.technology).toBeTruthy();
        expect(assignment.assigned_zone).toBeTruthy();
        // classified_as may be null for unknown technologies
      }
    });

    it('should return valid Mermaid diagram skeleton', () => {
      const result = suggestTrustBoundaries(['PostgreSQL', 'Redis', 'Kong']);

      expect(result.mermaid_skeleton).toContain('flowchart TB');
      expect(result.mermaid_skeleton).toContain('subgraph');
    });
  });

  describe('template matching', () => {
    it('should return the best-fit template with highest score', () => {
      const result = suggestTrustBoundaries([
        'Kong', 'Express.js', 'PostgreSQL', 'Redis', 'RabbitMQ',
      ]);

      expect(result.template).not.toBeNull();
      expect(result.template!.id).toBeTruthy();
      expect(result.template!.name).toBeTruthy();
      expect(result.template!.architecture_type).toBeTruthy();
      expect(result.template!.zones.length).toBeGreaterThan(0);
      expect(result.template!.boundaries.length).toBeGreaterThan(0);
    });

    it('should assign technologies to template zones', () => {
      const result = suggestTrustBoundaries(['PostgreSQL', 'Kong']);

      for (const assignment of result.assignments) {
        // Each assignment should have a zone from the template
        if (result.template) {
          const templateZoneNames = result.template.zones.map(z => z.name);
          expect(templateZoneNames).toContain(assignment.assigned_zone);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty technologies array', () => {
      const result = suggestTrustBoundaries([]);

      expect(result.template).toBeNull();
      expect(result.score).toBe(0);
      expect(result.assignments).toEqual([]);
      expect(result.mermaid_skeleton).toBe('');
    });

    it('should handle unknown technologies gracefully', () => {
      const result = suggestTrustBoundaries(['UnknownTech123', 'AnotherFake']);

      // Should still return a result (fallback behavior)
      expect(result.assignments).toHaveLength(2);
      for (const assignment of result.assignments) {
        expect(assignment.technology).toBeTruthy();
        expect(assignment.assigned_zone).toBeTruthy();
      }
    });

    it('should handle a mix of known and unknown technologies', () => {
      const result = suggestTrustBoundaries(['PostgreSQL', 'UnknownTech']);

      expect(result.assignments).toHaveLength(2);
      // PostgreSQL should be classified
      const pgAssignment = result.assignments.find(a => a.technology === 'PostgreSQL');
      expect(pgAssignment?.classified_as).not.toBeNull();
    });

    it('should handle single technology', () => {
      const result = suggestTrustBoundaries(['PostgreSQL']);

      expect(result.assignments).toHaveLength(1);
      expect(result.mermaid_skeleton).toContain('flowchart TB');
    });
  });
});
