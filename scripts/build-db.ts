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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const PATTERNS_DIR = join(PROJECT_ROOT, 'data/seed/patterns');
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

  // Validate ID format
  if (pattern.id && !/^STRIDE-[A-Z]+-[A-Z0-9]+-\d+$/.test(pattern.id)) {
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
      pattern.technology.primary, // Framework same as primary for now
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

    // Insert CVE references
    for (const cve of pattern.evidence.cve_references) {
      db.prepare(`
        INSERT INTO cve_references (pattern_id, cve_id, cvss_score, published_date, description)
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

  // Update metadata
  db.prepare(`
    UPDATE metadata SET value = datetime('now'), updated_at = datetime('now')
    WHERE key = 'last_build'
  `).run();

  // Get stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_patterns,
      COUNT(DISTINCT stride_category) as stride_categories,
      COUNT(DISTINCT technology) as technologies,
      COUNT(DISTINCT framework) as frameworks,
      ROUND(AVG(confidence_score), 2) as avg_confidence
    FROM patterns
  `).get() as any;

  console.log('📊 Database Statistics:');
  console.log(`  Total Patterns: ${stats.total_patterns}`);
  console.log(`  STRIDE Categories: ${stats.stride_categories}`);
  console.log(`  Technologies: ${stats.technologies}`);
  console.log(`  Frameworks: ${stats.frameworks}`);
  console.log(`  Average Confidence: ${stats.avg_confidence}/10\n`);

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
