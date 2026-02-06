/**
 * Database build script
 *
 * Ingests STRIDE pattern JSON files into SQLite database
 * Run: npm run build:db
 *
 * Architecture: Pre-built database (fail-fast design)
 * - Validates all patterns before insertion
 * - Creates FTS5 indexes for full-text search
 * - Commits database to git for instant user startup
 */

import { readdir, readFile, stat, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { SCHEMA } from '../src/database/schema.js';
import { Pattern } from '../src/types/pattern.js';
import { DfdElement, TrustBoundaryTemplate } from '../src/types/dfd.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const PATTERNS_DIR = join(PROJECT_ROOT, 'data/seed/patterns');
const DFD_ELEMENTS_DIR = join(PROJECT_ROOT, 'data/seed/dfd/elements');
const DFD_TEMPLATES_DIR = join(PROJECT_ROOT, 'data/seed/dfd/templates');
const DB_PATH = join(PROJECT_ROOT, 'data/patterns.db');

interface ValidationError {
  file: string;
  error: string;
}

/**
 * Recursively find all JSON files in a directory
 */
async function findPatternFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findPatternFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Validate pattern schema
 */
function validatePattern(pattern: any, file: string): ValidationError | null {
  const errors: string[] = [];

  // Required fields
  if (!pattern.id) errors.push('Missing id');
  if (!pattern.version) errors.push('Missing version');
  if (!pattern.metadata) errors.push('Missing metadata');
  if (!pattern.classification) errors.push('Missing classification');
  if (!pattern.threat) errors.push('Missing threat');
  if (!pattern.technology) errors.push('Missing technology');
  if (!pattern.attack) errors.push('Missing attack');
  if (!pattern.evidence) errors.push('Missing evidence');
  if (!pattern.mitigations || pattern.mitigations.length === 0) {
    errors.push('Missing mitigations');
  }

  // Validate ID format: STRIDE-{SEGMENTS}-{NUMBER} (allows STRIDE-K8S-RBAC-001, STRIDE-API-GRAPHQL-DOS-001)
  if (pattern.id && !/^STRIDE-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+$/.test(pattern.id)) {
    errors.push(`Invalid ID format: ${pattern.id}`);
  }

  // Validate confidence score
  if (
    pattern.metadata?.confidence_score !== undefined &&
    (pattern.metadata.confidence_score < 0 || pattern.metadata.confidence_score > 10)
  ) {
    errors.push('Confidence score must be between 0 and 10');
  }

  // Validate CVSS score
  if (
    pattern.threat?.cvss_v3?.score !== undefined &&
    (pattern.threat.cvss_v3.score < 0 || pattern.threat.cvss_v3.score > 10)
  ) {
    errors.push('CVSS score must be between 0 and 10');
  }

  // Validate at least one evidence source
  const hasEvidence =
    (pattern.evidence.cve_references && pattern.evidence.cve_references.length > 0) ||
    (pattern.evidence.real_world_breaches && pattern.evidence.real_world_breaches.length > 0) ||
    (pattern.evidence.bug_bounty_reports && pattern.evidence.bug_bounty_reports.length > 0) ||
    (pattern.evidence.security_research && pattern.evidence.security_research.length > 0);

  if (!hasEvidence) {
    errors.push('At least one evidence source required (CVE, breach, bug bounty, or research)');
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }

  return null;
}

/**
 * Insert pattern into database
 */
function insertPattern(db: Database.Database, pattern: Pattern) {
  const tx = db.transaction(() => {
    // Insert main pattern
    db.prepare(`
      INSERT INTO patterns (
        id, version, title, description, stride_category, severity, cvss_score, cvss_vector,
        technology, framework, versions_affected, ecosystem, attack_scenario, attack_complexity,
        confidence_score, created_date, last_updated, validation_status, full_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pattern.id,
      pattern.version,
      pattern.threat.title,
      pattern.threat.description,
      pattern.classification.stride_category,
      pattern.threat.severity,
      pattern.threat.cvss_v3.score,
      pattern.threat.cvss_v3.vector,
      pattern.technology.primary,
      [pattern.technology.primary, ...(pattern.technology.related_frameworks || [])].join(', '),
      pattern.technology.versions_affected.join(', '),
      pattern.technology.ecosystem,
      pattern.attack.scenario,
      pattern.attack.attack_complexity,
      pattern.metadata.confidence_score,
      pattern.metadata.created_date,
      pattern.metadata.last_updated,
      pattern.metadata.validation_status,
      JSON.stringify(pattern)
    );

    // Insert CVE references (OR IGNORE handles duplicate CVE IDs within a pattern)
    for (const cve of pattern.evidence.cve_references) {
      db.prepare(`
        INSERT OR IGNORE INTO cve_references (pattern_id, cve_id, cvss_score, published_date, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        pattern.id,
        cve.cve_id,
        cve.cvss_score,
        cve.published_date,
        cve.description
      );
    }

    // Insert mitigations
    for (const mitigation of pattern.mitigations) {
      db.prepare(`
        INSERT INTO mitigations (
          id, pattern_id, title, description, effectiveness, implementation_complexity,
          code_language, code_framework, code_example
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${pattern.id}-${mitigation.control_id}`,
        pattern.id,
        mitigation.title,
        mitigation.description,
        mitigation.effectiveness,
        mitigation.implementation_complexity,
        mitigation.code_example?.language || null,
        mitigation.code_example?.framework || null,
        mitigation.code_example?.code || null
      );
    }

    // Insert OWASP mappings
    for (const owasp of pattern.classification.owasp_top10) {
      db.prepare(`
        INSERT INTO owasp_mappings (pattern_id, owasp_category)
        VALUES (?, ?)
      `).run(pattern.id, owasp);
    }

    // Insert MITRE ATT&CK mappings
    for (const mitre of pattern.classification.mitre_attack) {
      db.prepare(`
        INSERT INTO mitre_mappings (pattern_id, mitre_technique)
        VALUES (?, ?)
      `).run(pattern.id, mitre);
    }

    // Insert CWE mappings
    for (const cwe of pattern.classification.cwe) {
      db.prepare(`
        INSERT INTO cwe_mappings (pattern_id, cwe_id)
        VALUES (?, ?)
      `).run(pattern.id, cwe);
    }

    // Insert tags
    if (pattern.metadata_tags) {
      for (const industry of pattern.metadata_tags.industry || []) {
        db.prepare(`
          INSERT INTO pattern_tags (pattern_id, tag_type, tag_value)
          VALUES (?, 'industry', ?)
        `).run(pattern.id, industry);
      }

      for (const compliance of pattern.metadata_tags.compliance || []) {
        db.prepare(`
          INSERT INTO pattern_tags (pattern_id, tag_type, tag_value)
          VALUES (?, 'compliance', ?)
        `).run(pattern.id, compliance);
      }

      for (const deployment of pattern.metadata_tags.deployment || []) {
        db.prepare(`
          INSERT INTO pattern_tags (pattern_id, tag_type, tag_value)
          VALUES (?, 'deployment', ?)
        `).run(pattern.id, deployment);
      }
    }
  });

  tx();
}

const VALID_DFD_ROLES = ['external_entity', 'process', 'data_store', 'data_flow'];
const VALID_DFD_CATEGORIES = [
  'database', 'cache', 'message_broker', 'api_gateway', 'identity_provider',
  'ai_ml', 'cloud_service', 'web_application', 'monitoring', 'infrastructure',
  'storage', 'networking', 'external_entity', 'data_flow',
];

/**
 * Recursively find all JSON files in a directory (reusable)
 */
async function findJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findJsonFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist yet — that's OK for optional seed dirs
  }
  return files;
}

/**
 * Validate DFD element schema
 */
function validateDfdElement(element: any, file: string): ValidationError | null {
  const errors: string[] = [];

  if (!element.id) errors.push('Missing id');
  if (!element.technology) errors.push('Missing technology');
  if (!Array.isArray(element.aliases)) errors.push('aliases must be an array');
  if (!element.category || !VALID_DFD_CATEGORIES.includes(element.category)) {
    errors.push(`Invalid category: ${element.category}`);
  }
  if (!element.dfd_role || !VALID_DFD_ROLES.includes(element.dfd_role)) {
    errors.push(`Invalid dfd_role: ${element.dfd_role}`);
  }
  if (!element.default_zone) errors.push('Missing default_zone');
  if (!element.mermaid_shape) errors.push('Missing mermaid_shape');
  if (!element.mermaid_node_syntax) errors.push('Missing mermaid_node_syntax');
  if (!Array.isArray(element.typical_protocols)) errors.push('typical_protocols must be an array');
  if (!Array.isArray(element.related_pattern_ids)) errors.push('related_pattern_ids must be an array');
  if (!element.description) errors.push('Missing description');

  // Validate ID format: DFD-EL-{TECH}-001
  if (element.id && !/^DFD-EL-[A-Z0-9]+-\d+$/.test(element.id)) {
    errors.push(`Invalid ID format: ${element.id}`);
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }
  return null;
}

/**
 * Validate trust boundary template schema
 */
function validateTrustBoundaryTemplate(template: any, file: string): ValidationError | null {
  const errors: string[] = [];

  if (!template.id) errors.push('Missing id');
  if (!template.name) errors.push('Missing name');
  if (!template.architecture_type) errors.push('Missing architecture_type');
  if (!template.description) errors.push('Missing description');
  if (!Array.isArray(template.zones) || template.zones.length === 0) {
    errors.push('zones must be a non-empty array');
  }
  if (!Array.isArray(template.boundaries) || template.boundaries.length === 0) {
    errors.push('boundaries must be a non-empty array');
  }
  if (!template.mermaid_template) errors.push('Missing mermaid_template');

  // Validate ID format: TB-TMPL-{ARCH}-001
  if (template.id && !/^TB-TMPL-[A-Z0-9]+-\d+$/.test(template.id)) {
    errors.push(`Invalid ID format: ${template.id}`);
  }

  // Validate zone structure
  if (Array.isArray(template.zones)) {
    for (const zone of template.zones) {
      if (!zone.name || !zone.trust_level || !zone.description) {
        errors.push(`Zone missing required fields: ${JSON.stringify(zone)}`);
      }
    }
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }
  return null;
}

/**
 * Insert DFD element into database
 */
function insertDfdElement(db: Database.Database, element: DfdElement) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO dfd_elements (
        id, technology, aliases, category, dfd_role, default_zone,
        mermaid_shape, mermaid_node_syntax, typical_protocols,
        related_pattern_ids, description, full_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      element.id,
      element.technology,
      JSON.stringify(element.aliases),
      element.category,
      element.dfd_role,
      element.default_zone,
      element.mermaid_shape,
      element.mermaid_node_syntax,
      JSON.stringify(element.typical_protocols),
      JSON.stringify(element.related_pattern_ids),
      element.description,
      JSON.stringify(element),
    );
  });
  tx();
}

/**
 * Insert trust boundary template into database
 */
function insertTrustBoundaryTemplate(db: Database.Database, template: TrustBoundaryTemplate) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO trust_boundary_templates (
        id, name, architecture_type, description,
        zones, boundaries, mermaid_template, full_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      template.id,
      template.name,
      template.architecture_type,
      template.description,
      JSON.stringify(template.zones),
      JSON.stringify(template.boundaries),
      template.mermaid_template,
      JSON.stringify(template),
    );
  });
  tx();
}

/**
 * Main build function
 */
async function buildDatabase() {
  console.log('🔨 Building STRIDE Patterns database...\n');

  // Find all pattern files
  console.log(`📂 Scanning for patterns in: ${PATTERNS_DIR}`);
  const patternFiles = await findPatternFiles(PATTERNS_DIR);
  console.log(`✅ Found ${patternFiles.length} pattern files\n`);

  // Load and validate patterns
  console.log('🔍 Validating patterns...');
  const patterns: Pattern[] = [];
  const validationErrors: ValidationError[] = [];

  for (const file of patternFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const pattern = JSON.parse(content) as Pattern;

      const error = validatePattern(pattern, file);
      if (error) {
        validationErrors.push(error);
      } else {
        patterns.push(pattern);
      }
    } catch (error) {
      validationErrors.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (validationErrors.length > 0) {
    console.error('\n❌ Validation errors:\n');
    for (const error of validationErrors) {
      console.error(`  ${error.file}: ${error.error}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${patterns.length} patterns validated\n`);

  // Delete old database if it exists
  try {
    await unlink(DB_PATH);
    console.log('🗑️  Deleted old database\n');
  } catch (error) {
    // Ignore error if file doesn't exist
  }

  // Create database
  console.log(`📦 Creating database: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  // Create schema (use exec for multiple statements)
  console.log('📋 Creating schema...');
  db.exec(SCHEMA);
  console.log('✅ Schema created\n');

  // Insert patterns
  console.log('💾 Inserting patterns...');
  let inserted = 0;
  for (const pattern of patterns) {
    try {
      insertPattern(db, pattern);
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`  Inserted ${inserted}/${patterns.length} patterns...`);
      }
    } catch (error) {
      console.error(`❌ Failed to insert pattern ${pattern.id}:`, error);
      process.exit(1);
    }
  }

  console.log(`✅ Inserted ${inserted} patterns\n`);

  // --- DFD Elements ---
  console.log(`📂 Scanning for DFD elements in: ${DFD_ELEMENTS_DIR}`);
  const dfdElementFiles = await findJsonFiles(DFD_ELEMENTS_DIR);
  console.log(`✅ Found ${dfdElementFiles.length} DFD element files\n`);

  if (dfdElementFiles.length > 0) {
    console.log('🔍 Validating DFD elements...');
    const dfdElements: DfdElement[] = [];
    const dfdErrors: ValidationError[] = [];

    for (const file of dfdElementFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const element = JSON.parse(content) as DfdElement;
        const error = validateDfdElement(element, file);
        if (error) {
          dfdErrors.push(error);
        } else {
          dfdElements.push(element);
        }
      } catch (error) {
        dfdErrors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (dfdErrors.length > 0) {
      console.error('\n❌ DFD element validation errors:\n');
      for (const error of dfdErrors) {
        console.error(`  ${error.file}: ${error.error}`);
      }
      process.exit(1);
    }

    console.log(`✅ All ${dfdElements.length} DFD elements validated\n`);

    console.log('💾 Inserting DFD elements...');
    let dfdInserted = 0;
    for (const element of dfdElements) {
      try {
        insertDfdElement(db, element);
        dfdInserted++;
      } catch (error) {
        console.error(`❌ Failed to insert DFD element ${element.id}:`, error);
        process.exit(1);
      }
    }
    console.log(`✅ Inserted ${dfdInserted} DFD elements\n`);
  }

  // --- Trust Boundary Templates ---
  console.log(`📂 Scanning for trust boundary templates in: ${DFD_TEMPLATES_DIR}`);
  const templateFiles = await findJsonFiles(DFD_TEMPLATES_DIR);
  console.log(`✅ Found ${templateFiles.length} template files\n`);

  if (templateFiles.length > 0) {
    console.log('🔍 Validating trust boundary templates...');
    const templates: TrustBoundaryTemplate[] = [];
    const templateErrors: ValidationError[] = [];

    for (const file of templateFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const template = JSON.parse(content) as TrustBoundaryTemplate;
        const error = validateTrustBoundaryTemplate(template, file);
        if (error) {
          templateErrors.push(error);
        } else {
          templates.push(template);
        }
      } catch (error) {
        templateErrors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (templateErrors.length > 0) {
      console.error('\n❌ Template validation errors:\n');
      for (const error of templateErrors) {
        console.error(`  ${error.file}: ${error.error}`);
      }
      process.exit(1);
    }

    console.log(`✅ All ${templates.length} templates validated\n`);

    console.log('💾 Inserting trust boundary templates...');
    let tbtInserted = 0;
    for (const template of templates) {
      try {
        insertTrustBoundaryTemplate(db, template);
        tbtInserted++;
      } catch (error) {
        console.error(`❌ Failed to insert template ${template.id}:`, error);
        process.exit(1);
      }
    }
    console.log(`✅ Inserted ${tbtInserted} trust boundary templates\n`);
  }

  // Update metadata
  db.prepare(`
    UPDATE metadata SET value = datetime('now'), updated_at = datetime('now')
    WHERE key = 'last_build'
  `).run();

  // Get pattern stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_patterns,
      COUNT(DISTINCT stride_category) as stride_categories,
      COUNT(DISTINCT technology) as technologies,
      COUNT(DISTINCT framework) as frameworks,
      ROUND(AVG(confidence_score), 2) as avg_confidence
    FROM patterns
  `).get() as any;

  // Get DFD stats
  const dfdStats = db.prepare(`
    SELECT
      COUNT(*) as total_elements,
      COUNT(DISTINCT category) as categories,
      COUNT(DISTINCT dfd_role) as roles
    FROM dfd_elements
  `).get() as any;

  const tbtStats = db.prepare(`
    SELECT COUNT(*) as total_templates FROM trust_boundary_templates
  `).get() as any;

  console.log('📊 Database Statistics:');
  console.log(`  Threat Patterns: ${stats.total_patterns}`);
  console.log(`  STRIDE Categories: ${stats.stride_categories}`);
  console.log(`  Technologies: ${stats.technologies}`);
  console.log(`  Frameworks: ${stats.frameworks}`);
  console.log(`  Average Confidence: ${stats.avg_confidence}/10`);
  console.log(`  DFD Elements: ${dfdStats.total_elements} (${dfdStats.categories} categories, ${dfdStats.roles} roles)`);
  console.log(`  Trust Boundary Templates: ${tbtStats.total_templates}\n`);

  // Optimize database
  console.log('⚡ Optimizing database...');
  db.pragma('optimize');
  db.exec('VACUUM');
  console.log('✅ Database optimized\n');

  db.close();

  // Get database size
  const dbStats = await stat(DB_PATH);
  const sizeInMB = (dbStats.size / 1024 / 1024).toFixed(2);

  console.log('🎉 Database build complete!');
  console.log(`📁 Database size: ${sizeInMB} MB\n`);
}

// Run build
buildDatabase().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
