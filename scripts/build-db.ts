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
import Database from '@ansvar/mcp-sqlite';
import { SCHEMA } from '../src/database/schema.js';
import { Pattern } from '../src/types/pattern.js';
import { DfdElement, TrustBoundaryTemplate } from '../src/types/dfd.js';
import {
  LinddunCategory,
  LinddunPattern,
  LinddunReviewDecision,
  LinddunThreat,
} from '../src/types/linddun.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const PATTERNS_DIR = join(PROJECT_ROOT, 'data/seed/patterns');
const DFD_ELEMENTS_DIR = join(PROJECT_ROOT, 'data/seed/dfd/elements');
const DFD_TEMPLATES_DIR = join(PROJECT_ROOT, 'data/seed/dfd/templates');
const LINDDUN_THREATS_DIR = join(PROJECT_ROOT, 'data/seed/linddun/threats');
const LINDDUN_PATTERNS_DIR = join(PROJECT_ROOT, 'data/seed/linddun/patterns');
const LINDDUN_REVIEWS_DIR = join(PROJECT_ROOT, 'data/seed/linddun/reviews');
const DB_PATH = join(PROJECT_ROOT, 'data/patterns.db');

const VALID_LINDDUN_CATEGORIES: LinddunCategory[] = [
  'Linking',
  'Identifying',
  'Non-repudiation',
  'Detecting',
  'Data disclosure',
  'Unawareness',
  'Non-compliance',
];

interface ValidationError {
  file: string;
  error: string;
}

type CitationEntityType = 'threat' | 'mitigation' | 'pattern';

interface CitationSeed {
  citation_id: string;
  entity_type: CitationEntityType;
  entity_id: string;
  claim_key: string;
  claim_text: string;
  source_title: string;
  source_url?: string;
  source_type?: string;
  license?: string;
  confidence: number;
}

interface CitationReviewSeed {
  review_id: string;
  citation_id: string;
  reviewer_name: string;
  reviewer_role?: string;
  decision: LinddunReviewDecision;
  comments?: string;
  reviewed_at: string;
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
 * Load a JSON file that may contain either a single object or an array of objects.
 */
async function loadJsonRecords<T>(file: string): Promise<T[]> {
  const content = await readFile(file, 'utf-8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed as T[] : [parsed as T];
}

function sanitizeClaimText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function buildThreatCitations(threat: LinddunThreat): CitationSeed[] {
  const citations: CitationSeed[] = [];
  const sourceList = (threat.sources && threat.sources.length > 0)
    ? threat.sources
    : [{ title: 'LINDDUN catalog (source unspecified)' }];

  const addForSources = (
    entityType: CitationEntityType,
    entityId: string,
    claimKey: string,
    claimText: string,
    confidence: number,
    customSources?: Array<{ title: string; url?: string; type?: string; license?: string }>,
  ) => {
    const sources = (customSources && customSources.length > 0) ? customSources : sourceList;
    for (const source of sources) {
      const sourceTitle = sanitizeClaimText(source.title);
      const normalizedText = sanitizeClaimText(claimText);
      if (!sourceTitle || !normalizedText) continue;
      citations.push({
        citation_id: `${entityId}-${claimKey}-${sourceTitle}`
          .replace(/[^A-Za-z0-9-]+/g, '-')
          .slice(0, 220),
        entity_type: entityType,
        entity_id: entityId,
        claim_key: claimKey,
        claim_text: normalizedText,
        source_title: sourceTitle,
        source_url: source.url,
        source_type: source.type,
        license: source.license,
        confidence,
      });
    }
  };

  addForSources('threat', threat.threat_id, 'description', threat.description, 0.92);
  for (let i = 0; i < (threat.examples || []).length; i++) {
    addForSources('threat', threat.threat_id, `example_${i + 1}`, threat.examples[i], 0.88);
  }

  for (let i = 0; i < (threat.mitigations || []).length; i++) {
    const mitigation = threat.mitigations[i];
    const mitigationEntityId = `${threat.threat_id}-${mitigation.id}`;
    addForSources(
      'mitigation',
      mitigationEntityId,
      `mitigation_${i + 1}`,
      mitigation.description,
      0.86,
      (mitigation.references || []).map((title) => ({ title })),
    );
  }

  return citations;
}

function buildPatternCitations(pattern: LinddunPattern): CitationSeed[] {
  const citations: CitationSeed[] = [];
  const sources = (pattern.sources && pattern.sources.length > 0)
    ? pattern.sources
    : [{ title: 'LINDDUN patterns catalog (source unspecified)' }];

  const add = (claimKey: string, claimText: string, confidence: number) => {
    const normalizedText = sanitizeClaimText(claimText);
    if (!normalizedText) return;
    for (const source of sources) {
      const title = sanitizeClaimText(source.title);
      if (!title) continue;
      citations.push({
        citation_id: `${pattern.pattern_id}-${claimKey}-${title}`
          .replace(/[^A-Za-z0-9-]+/g, '-')
          .slice(0, 220),
        entity_type: 'pattern',
        entity_id: pattern.pattern_id,
        claim_key: claimKey,
        claim_text: normalizedText,
        source_title: title,
        source_url: source.url,
        source_type: source.type,
        license: source.license,
        confidence,
      });
    }
  };

  add('summary', pattern.summary, 0.9);
  for (let i = 0; i < (pattern.implementation_guidance || []).length; i++) {
    add(`implementation_${i + 1}`, pattern.implementation_guidance[i], 0.85);
  }

  return citations;
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
function insertPattern(db: InstanceType<typeof Database>, pattern: Pattern) {
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
      pattern.threat.cvss_v3?.score ?? null,
      pattern.threat.cvss_v3?.vector ?? null,
      pattern.technology.primary,
      [pattern.technology.primary, ...(pattern.technology.related_frameworks || [])].join(', '),
      (pattern.technology.versions_affected || []).join(', '),
      pattern.technology.ecosystem ?? null,
      pattern.attack.scenario ?? null,
      pattern.attack.attack_complexity ?? null,
      pattern.metadata.confidence_score,
      pattern.metadata.created_date,
      pattern.metadata.last_updated,
      pattern.metadata.validation_status,
      JSON.stringify(pattern)
    );

    // Insert CVE references (OR IGNORE handles duplicate CVE IDs within a pattern)
    for (const cve of pattern.evidence.cve_references || []) {
      if (!cve?.cve_id) continue;
      db.prepare(`
        INSERT OR IGNORE INTO cve_references (pattern_id, cve_id, cvss_score, published_date, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        pattern.id,
        cve.cve_id,
        cve.cvss_score ?? null,
        cve.published_date ?? null,
        cve.description ?? null
      );
    }

    // Insert mitigations
    for (const mitigation of pattern.mitigations || []) {
      db.prepare(`
        INSERT INTO mitigations (
          id, pattern_id, title, description, effectiveness, implementation_complexity,
          code_language, code_framework, code_example
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${pattern.id}-${mitigation.control_id}`,
        pattern.id,
        mitigation.title,
        mitigation.description ?? null,
        mitigation.effectiveness ?? null,
        mitigation.implementation_complexity ?? null,
        mitigation.code_example?.language || null,
        mitigation.code_example?.framework || null,
        mitigation.code_example?.code || null
      );
    }

    // Insert OWASP mappings
    for (const owasp of pattern.classification.owasp_top10 || []) {
      db.prepare(`
        INSERT INTO owasp_mappings (pattern_id, owasp_category)
        VALUES (?, ?)
      `).run(pattern.id, owasp);
    }

    // Insert MITRE ATT&CK mappings
    for (const mitre of pattern.classification.mitre_attack || []) {
      db.prepare(`
        INSERT INTO mitre_mappings (pattern_id, mitre_technique)
        VALUES (?, ?)
      `).run(pattern.id, mitre);
    }

    // Insert CWE mappings
    for (const cwe of pattern.classification.cwe || []) {
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
 * Validate LINDDUN threat schema
 */
function validateLinddunThreat(threat: any, file: string): ValidationError | null {
  const errors: string[] = [];

  if (!threat.threat_id) errors.push('Missing threat_id');
  if (!threat.category) errors.push('Missing category');
  if (!threat.tree_path) errors.push('Missing tree_path');
  if (!threat.description) errors.push('Missing description');
  if (!Array.isArray(threat.examples)) errors.push('examples must be an array');
  if (!Array.isArray(threat.mitigations) || threat.mitigations.length === 0) {
    errors.push('mitigations must be a non-empty array');
  }
  if (!Array.isArray(threat.gdpr_articles)) errors.push('gdpr_articles must be an array');

  if (
    threat.category &&
    !VALID_LINDDUN_CATEGORIES.includes(threat.category as LinddunCategory)
  ) {
    errors.push(`Invalid category: ${threat.category}`);
  }

  if (threat.threat_id && !/^LINDDUN-[A-Z0-9-]+-\d{3}$/.test(threat.threat_id)) {
    errors.push(`Invalid threat_id format: ${threat.threat_id}`);
  }

  if (
    threat.tree_path &&
    threat.category &&
    typeof threat.tree_path === 'string' &&
    !threat.tree_path.startsWith(threat.category)
  ) {
    errors.push('tree_path must start with category');
  }

  if (Array.isArray(threat.mitigations)) {
    for (const mitigation of threat.mitigations) {
      if (!mitigation?.id) errors.push('Each mitigation must include id');
      if (!mitigation?.title) errors.push('Each mitigation must include title');
      if (!mitigation?.description) errors.push('Each mitigation must include description');
      if (!Array.isArray(mitigation?.implementation_hints)) {
        errors.push(`mitigation ${mitigation?.id || 'unknown'} implementation_hints must be an array`);
      }
    }
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }
  return null;
}

/**
 * Insert LINDDUN threat and normalized mitigations into database.
 */
function insertLinddunThreat(db: InstanceType<typeof Database>, threat: LinddunThreat) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO linddun_threats (
        threat_id, category, tree_path, description, examples, mitigations, gdpr_articles, sources, full_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      threat.threat_id,
      threat.category,
      threat.tree_path,
      threat.description,
      JSON.stringify(threat.examples || []),
      JSON.stringify(threat.mitigations || []),
      JSON.stringify(threat.gdpr_articles || []),
      JSON.stringify(threat.sources || []),
      JSON.stringify(threat),
    );

    for (const mitigation of threat.mitigations || []) {
      db.prepare(`
        INSERT INTO linddun_mitigations (
          mitigation_id, threat_id, title, description, pet_type, implementation_hints, effectiveness, reference_links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${threat.threat_id}-${mitigation.id}`,
        threat.threat_id,
        mitigation.title,
        mitigation.description,
        mitigation.pet_type || null,
        JSON.stringify(mitigation.implementation_hints || []),
        mitigation.effectiveness || null,
        JSON.stringify(mitigation.references || []),
      );
    }

    const citations = buildThreatCitations(threat);
    for (const citation of citations) {
      db.prepare(`
        INSERT OR REPLACE INTO linddun_citations (
          citation_id, entity_type, entity_id, claim_key, claim_text,
          source_title, source_url, source_type, license, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        citation.citation_id,
        citation.entity_type,
        citation.entity_id,
        citation.claim_key,
        citation.claim_text,
        citation.source_title,
        citation.source_url || null,
        citation.source_type || null,
        citation.license || null,
        citation.confidence,
      );
    }
  });

  tx();
}

/**
 * Validate LINDDUN privacy pattern schema
 */
function validateLinddunPattern(pattern: any, file: string): ValidationError | null {
  const errors: string[] = [];

  if (!pattern.pattern_id) errors.push('Missing pattern_id');
  if (!pattern.name) errors.push('Missing name');
  if (!pattern.summary) errors.push('Missing summary');
  if (!Array.isArray(pattern.categories) || pattern.categories.length === 0) {
    errors.push('categories must be a non-empty array');
  }
  if (!pattern.dfd_annotations || typeof pattern.dfd_annotations !== 'object' || Array.isArray(pattern.dfd_annotations)) {
    errors.push('dfd_annotations must be an object');
  }
  if (!Array.isArray(pattern.implementation_guidance)) {
    errors.push('implementation_guidance must be an array');
  }
  if (!Array.isArray(pattern.related_threat_ids)) {
    errors.push('related_threat_ids must be an array');
  }

  if (pattern.pattern_id && !/^LINDDUN-PATTERN-\d{3}$/.test(pattern.pattern_id)) {
    errors.push(`Invalid pattern_id format: ${pattern.pattern_id}`);
  }

  if (Array.isArray(pattern.categories)) {
    for (const category of pattern.categories) {
      if (!VALID_LINDDUN_CATEGORIES.includes(category as LinddunCategory)) {
        errors.push(`Invalid LINDDUN category in pattern: ${category}`);
      }
    }
  }

  if (Array.isArray(pattern.related_threat_ids)) {
    for (const threatId of pattern.related_threat_ids) {
      if (typeof threatId !== 'string' || !/^LINDDUN-[A-Z0-9-]+-\d{3}$/.test(threatId)) {
        errors.push(`Invalid related_threat_id: ${String(threatId)}`);
      }
    }
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }
  return null;
}

/**
 * Insert LINDDUN privacy pattern into database
 */
function insertLinddunPattern(db: InstanceType<typeof Database>, pattern: LinddunPattern) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO linddun_patterns (
        pattern_id, name, summary, categories, dfd_annotations, implementation_guidance,
        related_threat_ids, pet_family, sources, full_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pattern.pattern_id,
      pattern.name,
      pattern.summary,
      JSON.stringify(pattern.categories || []),
      JSON.stringify(pattern.dfd_annotations || {}),
      JSON.stringify(pattern.implementation_guidance || []),
      JSON.stringify(pattern.related_threat_ids || []),
      pattern.pet_family || null,
      JSON.stringify(pattern.sources || []),
      JSON.stringify(pattern),
    );

    const citations = buildPatternCitations(pattern);
    for (const citation of citations) {
      db.prepare(`
        INSERT OR REPLACE INTO linddun_citations (
          citation_id, entity_type, entity_id, claim_key, claim_text,
          source_title, source_url, source_type, license, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        citation.citation_id,
        citation.entity_type,
        citation.entity_id,
        citation.claim_key,
        citation.claim_text,
        citation.source_title,
        citation.source_url || null,
        citation.source_type || null,
        citation.license || null,
        citation.confidence,
      );
    }
  });

  tx();
}

function validateCitationReview(review: any, file: string): ValidationError | null {
  const errors: string[] = [];
  const decisions: LinddunReviewDecision[] = ['approved', 'needs_revision', 'rejected'];

  if (!review.review_id) errors.push('Missing review_id');
  if (!review.citation_id) errors.push('Missing citation_id');
  if (!review.reviewer_name) errors.push('Missing reviewer_name');
  if (!review.decision) errors.push('Missing decision');
  if (!review.reviewed_at) errors.push('Missing reviewed_at');

  if (review.decision && !decisions.includes(review.decision as LinddunReviewDecision)) {
    errors.push(`Invalid decision: ${review.decision}`);
  }

  if (review.reviewed_at && Number.isNaN(new Date(review.reviewed_at).getTime())) {
    errors.push(`Invalid reviewed_at timestamp: ${review.reviewed_at}`);
  }

  if (errors.length > 0) {
    return { file, error: errors.join('; ') };
  }
  return null;
}

function insertCitationReview(db: InstanceType<typeof Database>, review: CitationReviewSeed) {
  db.prepare(`
    INSERT OR REPLACE INTO linddun_citation_reviews (
      review_id, citation_id, reviewer_name, reviewer_role, decision, comments, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    review.review_id,
    review.citation_id,
    review.reviewer_name,
    review.reviewer_role || null,
    review.decision,
    review.comments || null,
    review.reviewed_at,
  );
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
function insertDfdElement(db: InstanceType<typeof Database>, element: DfdElement) {
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
function insertTrustBoundaryTemplate(db: InstanceType<typeof Database>, template: TrustBoundaryTemplate) {
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
  console.log('🔨 Building STRIDE + LINDDUN database...\n');

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
  } catch {
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

  // --- LINDDUN Threat Catalog ---
  console.log(`📂 Scanning for LINDDUN threats in: ${LINDDUN_THREATS_DIR}`);
  const linddunThreatFiles = await findJsonFiles(LINDDUN_THREATS_DIR);
  console.log(`✅ Found ${linddunThreatFiles.length} LINDDUN threat seed files\n`);

  const linddunThreats: LinddunThreat[] = [];
  const linddunThreatErrors: ValidationError[] = [];

  for (const file of linddunThreatFiles) {
    try {
      const records = await loadJsonRecords<LinddunThreat>(file);
      for (const threat of records) {
        const error = validateLinddunThreat(threat, file);
        if (error) {
          linddunThreatErrors.push(error);
        } else {
          linddunThreats.push(threat);
        }
      }
    } catch (error) {
      linddunThreatErrors.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (linddunThreatErrors.length > 0) {
    console.error('\n❌ LINDDUN threat validation errors:\n');
    for (const error of linddunThreatErrors) {
      console.error(`  ${error.file}: ${error.error}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${linddunThreats.length} LINDDUN threats validated\n`);

  console.log('💾 Inserting LINDDUN threats...');
  let linddunThreatInserted = 0;
  for (const threat of linddunThreats) {
    try {
      insertLinddunThreat(db, threat);
      linddunThreatInserted++;
    } catch (error) {
      console.error(`❌ Failed to insert LINDDUN threat ${threat.threat_id}:`, error);
      process.exit(1);
    }
  }
  console.log(`✅ Inserted ${linddunThreatInserted} LINDDUN threats\n`);

  // --- LINDDUN Privacy Patterns ---
  console.log(`📂 Scanning for LINDDUN privacy patterns in: ${LINDDUN_PATTERNS_DIR}`);
  const linddunPatternFiles = await findJsonFiles(LINDDUN_PATTERNS_DIR);
  console.log(`✅ Found ${linddunPatternFiles.length} LINDDUN pattern seed files\n`);

  const linddunPatterns: LinddunPattern[] = [];
  const linddunPatternErrors: ValidationError[] = [];

  for (const file of linddunPatternFiles) {
    try {
      const records = await loadJsonRecords<LinddunPattern>(file);
      for (const pattern of records) {
        const error = validateLinddunPattern(pattern, file);
        if (error) {
          linddunPatternErrors.push(error);
        } else {
          linddunPatterns.push(pattern);
        }
      }
    } catch (error) {
      linddunPatternErrors.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (linddunPatternErrors.length > 0) {
    console.error('\n❌ LINDDUN pattern validation errors:\n');
    for (const error of linddunPatternErrors) {
      console.error(`  ${error.file}: ${error.error}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${linddunPatterns.length} LINDDUN patterns validated\n`);

  console.log('💾 Inserting LINDDUN patterns...');
  let linddunPatternInserted = 0;
  for (const pattern of linddunPatterns) {
    try {
      insertLinddunPattern(db, pattern);
      linddunPatternInserted++;
    } catch (error) {
      console.error(`❌ Failed to insert LINDDUN pattern ${pattern.pattern_id}:`, error);
      process.exit(1);
    }
  }
  console.log(`✅ Inserted ${linddunPatternInserted} LINDDUN patterns\n`);

  // --- LINDDUN citation reviews (optional expert/editorial signoff) ---
  console.log(`📂 Scanning for LINDDUN citation reviews in: ${LINDDUN_REVIEWS_DIR}`);
  const linddunReviewFiles = await findJsonFiles(LINDDUN_REVIEWS_DIR);
  console.log(`✅ Found ${linddunReviewFiles.length} LINDDUN review seed files\n`);

  if (linddunReviewFiles.length > 0) {
    const linddunReviews: CitationReviewSeed[] = [];
    const linddunReviewErrors: ValidationError[] = [];

    for (const file of linddunReviewFiles) {
      try {
        const records = await loadJsonRecords<CitationReviewSeed>(file);
        for (const review of records) {
          const error = validateCitationReview(review, file);
          if (error) {
            linddunReviewErrors.push(error);
          } else {
            linddunReviews.push(review);
          }
        }
      } catch (error) {
        linddunReviewErrors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (linddunReviewErrors.length > 0) {
      console.error('\n❌ LINDDUN review validation errors:\n');
      for (const error of linddunReviewErrors) {
        console.error(`  ${error.file}: ${error.error}`);
      }
      process.exit(1);
    }

    console.log(`✅ All ${linddunReviews.length} LINDDUN reviews validated\n`);
    console.log('💾 Inserting LINDDUN citation reviews...');
    let linddunReviewInserted = 0;
    for (const review of linddunReviews) {
      try {
        insertCitationReview(db, review);
        linddunReviewInserted++;
      } catch (error) {
        console.error(`❌ Failed to insert citation review ${review.review_id}:`, error);
        process.exit(1);
      }
    }
    console.log(`✅ Inserted ${linddunReviewInserted} LINDDUN citation reviews\n`);
  }

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
    UPDATE db_metadata SET value = datetime('now'), updated_at = datetime('now')
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

  const linddunThreatStats = db.prepare(`
    SELECT
      COUNT(*) as total_threats,
      COUNT(DISTINCT category) as categories
    FROM linddun_threats
  `).get() as any;

  const linddunMitigationStats = db.prepare(`
    SELECT COUNT(*) as total_mitigations
    FROM linddun_mitigations
  `).get() as any;

  const linddunPatternStats = db.prepare(`
    SELECT COUNT(*) as total_patterns
    FROM linddun_patterns
  `).get() as any;

  const linddunCitationStats = db.prepare(`
    SELECT COUNT(*) as total_citations
    FROM linddun_citations
  `).get() as any;

  const linddunReviewStats = db.prepare(`
    SELECT
      COUNT(*) as total_reviews,
      COUNT(DISTINCT citation_id) as reviewed_citations
    FROM linddun_citation_reviews
  `).get() as any;

  db.prepare("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('tier', 'free')").run();
  db.prepare("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('jurisdiction', 'International')").run();

  db.prepare(`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run('linddun_categories', String(linddunThreatStats.categories));
  db.prepare(`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run('linddun_total_threats', String(linddunThreatStats.total_threats));
  db.prepare(`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run('linddun_total_patterns', String(linddunPatternStats.total_patterns));
  db.prepare(`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run('linddun_total_citations', String(linddunCitationStats.total_citations));
  db.prepare(`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run('linddun_total_reviews', String(linddunReviewStats.total_reviews));

  console.log('📊 Database Statistics:');
  console.log(`  Threat Patterns: ${stats.total_patterns}`);
  console.log(`  STRIDE Categories: ${stats.stride_categories}`);
  console.log(`  Technologies: ${stats.technologies}`);
  console.log(`  Frameworks: ${stats.frameworks}`);
  console.log(`  Average Confidence: ${stats.avg_confidence}/10`);
  console.log(`  LINDDUN Threats: ${linddunThreatStats.total_threats}`);
  console.log(`  LINDDUN Categories: ${linddunThreatStats.categories}`);
  console.log(`  LINDDUN Mitigations: ${linddunMitigationStats.total_mitigations}`);
  console.log(`  LINDDUN Privacy Patterns: ${linddunPatternStats.total_patterns}`);
  console.log(`  LINDDUN Citations: ${linddunCitationStats.total_citations}`);
  console.log(`  LINDDUN Citation Reviews: ${linddunReviewStats.total_reviews} (${linddunReviewStats.reviewed_citations} citations reviewed)`);
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
