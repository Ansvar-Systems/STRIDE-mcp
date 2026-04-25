/**
 * Database schema for STRIDE Patterns MCP
 *
 * Architecture: SQLite with FTS5 (Full-Text Search) for sub-50ms queries
 * Based on: EU Compliance MCP golden standard
 */

export const SCHEMA = `
-- Main patterns table
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  stride_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  cvss_score REAL,
  cvss_vector TEXT,
  technology TEXT NOT NULL,
  framework TEXT NOT NULL,
  versions_affected TEXT,
  ecosystem TEXT,
  attack_scenario TEXT,
  attack_complexity TEXT,
  confidence_score REAL NOT NULL,
  created_date TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  full_json TEXT NOT NULL,  -- Complete pattern JSON for full details
  CHECK (confidence_score >= 0 AND confidence_score <= 10),
  CHECK (cvss_score IS NULL OR (cvss_score >= 0 AND cvss_score <= 10)),
  CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  CHECK (stride_category IN ('Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege')),
  CHECK (validation_status IN ('draft', 'validated', 'expert-validated'))
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_patterns_stride ON patterns(stride_category);
CREATE INDEX IF NOT EXISTS idx_patterns_technology ON patterns(technology);
CREATE INDEX IF NOT EXISTS idx_patterns_framework ON patterns(framework);
CREATE INDEX IF NOT EXISTS idx_patterns_severity ON patterns(severity);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence_score);
CREATE INDEX IF NOT EXISTS idx_patterns_cvss ON patterns(cvss_score);
CREATE INDEX IF NOT EXISTS idx_patterns_validation ON patterns(validation_status);

-- Full-text search table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS patterns_fts USING fts5(
  id UNINDEXED,
  title,
  description,
  attack_scenario,
  technology,
  framework,
  content='patterns',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with patterns table
CREATE TRIGGER IF NOT EXISTS patterns_fts_insert AFTER INSERT ON patterns BEGIN
  INSERT INTO patterns_fts(rowid, id, title, description, attack_scenario, technology, framework)
  VALUES (
    new.rowid,
    new.id,
    new.title,
    new.description,
    new.attack_scenario,
    new.technology,
    new.framework
  );
END;

CREATE TRIGGER IF NOT EXISTS patterns_fts_delete AFTER DELETE ON patterns BEGIN
  DELETE FROM patterns_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS patterns_fts_update AFTER UPDATE ON patterns BEGIN
  DELETE FROM patterns_fts WHERE rowid = old.rowid;
  INSERT INTO patterns_fts(rowid, id, title, description, attack_scenario, technology, framework)
  VALUES (
    new.rowid,
    new.id,
    new.title,
    new.description,
    new.attack_scenario,
    new.technology,
    new.framework
  );
END;

-- CVE references table
CREATE TABLE IF NOT EXISTS cve_references (
  pattern_id TEXT NOT NULL,
  cve_id TEXT NOT NULL,
  cvss_score REAL,
  published_date TEXT,
  description TEXT,
  PRIMARY KEY (pattern_id, cve_id),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cve_id ON cve_references(cve_id);
CREATE INDEX IF NOT EXISTS idx_cve_pattern ON cve_references(pattern_id);

-- Mitigations table (for easier querying)
CREATE TABLE IF NOT EXISTS mitigations (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  effectiveness TEXT,
  implementation_complexity TEXT,
  code_language TEXT,
  code_framework TEXT,
  code_example TEXT,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  CHECK (effectiveness IN ('High', 'Medium', 'Low')),
  CHECK (implementation_complexity IN ('High', 'Medium', 'Low'))
);

CREATE INDEX IF NOT EXISTS idx_mitigations_pattern ON mitigations(pattern_id);
CREATE INDEX IF NOT EXISTS idx_mitigations_effectiveness ON mitigations(effectiveness);

-- Pattern tags table (for industry, compliance, deployment filtering)
CREATE TABLE IF NOT EXISTS pattern_tags (
  pattern_id TEXT NOT NULL,
  tag_type TEXT NOT NULL,  -- 'industry', 'compliance', 'deployment', 'data_classification'
  tag_value TEXT NOT NULL,
  PRIMARY KEY (pattern_id, tag_type, tag_value),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_type_value ON pattern_tags(tag_type, tag_value);
CREATE INDEX IF NOT EXISTS idx_tags_pattern ON pattern_tags(pattern_id);

-- OWASP Top 10 mappings
CREATE TABLE IF NOT EXISTS owasp_mappings (
  pattern_id TEXT NOT NULL,
  owasp_category TEXT NOT NULL,
  PRIMARY KEY (pattern_id, owasp_category),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_owasp_category ON owasp_mappings(owasp_category);

-- MITRE ATT&CK mappings
CREATE TABLE IF NOT EXISTS mitre_mappings (
  pattern_id TEXT NOT NULL,
  mitre_technique TEXT NOT NULL,
  PRIMARY KEY (pattern_id, mitre_technique),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mitre_technique ON mitre_mappings(mitre_technique);

-- CWE mappings
CREATE TABLE IF NOT EXISTS cwe_mappings (
  pattern_id TEXT NOT NULL,
  cwe_id TEXT NOT NULL,
  PRIMARY KEY (pattern_id, cwe_id),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cwe_id ON cwe_mappings(cwe_id);

-- Metadata table (for tracking database version, stats, etc.)
CREATE TABLE IF NOT EXISTS db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DFD Elements table (technology classification for data flow diagrams)
CREATE TABLE IF NOT EXISTS dfd_elements (
  id TEXT PRIMARY KEY,
  technology TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',  -- JSON array of alternative names
  category TEXT NOT NULL,
  dfd_role TEXT NOT NULL,
  default_zone TEXT NOT NULL,
  mermaid_shape TEXT NOT NULL,
  mermaid_node_syntax TEXT NOT NULL,
  typical_protocols TEXT NOT NULL DEFAULT '[]',  -- JSON array
  related_pattern_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array of STRIDE pattern IDs
  description TEXT NOT NULL,
  full_json TEXT NOT NULL,
  CHECK (dfd_role IN ('external_entity', 'process', 'data_store', 'data_flow')),
  CHECK (category IN ('database', 'cache', 'message_broker', 'api_gateway', 'identity_provider', 'ai_ml', 'cloud_service', 'web_application', 'monitoring', 'infrastructure', 'storage', 'networking', 'external_entity', 'data_flow'))
);

CREATE INDEX IF NOT EXISTS idx_dfd_category ON dfd_elements(category);
CREATE INDEX IF NOT EXISTS idx_dfd_role ON dfd_elements(dfd_role);
CREATE INDEX IF NOT EXISTS idx_dfd_technology ON dfd_elements(technology);

-- FTS5 for DFD elements
CREATE VIRTUAL TABLE IF NOT EXISTS dfd_elements_fts USING fts5(
  id UNINDEXED,
  technology,
  aliases,
  category,
  description,
  content='dfd_elements',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS dfd_elements_fts_insert AFTER INSERT ON dfd_elements BEGIN
  INSERT INTO dfd_elements_fts(rowid, id, technology, aliases, category, description)
  VALUES (new.rowid, new.id, new.technology, new.aliases, new.category, new.description);
END;

CREATE TRIGGER IF NOT EXISTS dfd_elements_fts_delete AFTER DELETE ON dfd_elements BEGIN
  DELETE FROM dfd_elements_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS dfd_elements_fts_update AFTER UPDATE ON dfd_elements BEGIN
  DELETE FROM dfd_elements_fts WHERE rowid = old.rowid;
  INSERT INTO dfd_elements_fts(rowid, id, technology, aliases, category, description)
  VALUES (new.rowid, new.id, new.technology, new.aliases, new.category, new.description);
END;

-- Trust Boundary Templates table
CREATE TABLE IF NOT EXISTS trust_boundary_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  architecture_type TEXT NOT NULL,
  description TEXT NOT NULL,
  zones TEXT NOT NULL DEFAULT '[]',  -- JSON array of TrustZone objects
  boundaries TEXT NOT NULL DEFAULT '[]',  -- JSON array of TrustBoundary objects
  mermaid_template TEXT NOT NULL,
  full_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tbt_architecture ON trust_boundary_templates(architecture_type);

-- FTS5 for trust boundary templates
CREATE VIRTUAL TABLE IF NOT EXISTS trust_boundary_templates_fts USING fts5(
  id UNINDEXED,
  name,
  architecture_type,
  description,
  content='trust_boundary_templates',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS tbt_fts_insert AFTER INSERT ON trust_boundary_templates BEGIN
  INSERT INTO trust_boundary_templates_fts(rowid, id, name, architecture_type, description)
  VALUES (new.rowid, new.id, new.name, new.architecture_type, new.description);
END;

CREATE TRIGGER IF NOT EXISTS tbt_fts_delete AFTER DELETE ON trust_boundary_templates BEGIN
  DELETE FROM trust_boundary_templates_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS tbt_fts_update AFTER UPDATE ON trust_boundary_templates BEGIN
  DELETE FROM trust_boundary_templates_fts WHERE rowid = old.rowid;
  INSERT INTO trust_boundary_templates_fts(rowid, id, name, architecture_type, description)
  VALUES (new.rowid, new.id, new.name, new.architecture_type, new.description);
END;

-- LINDDUN threats (privacy threat catalog)
CREATE TABLE IF NOT EXISTS linddun_threats (
  threat_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  tree_path TEXT NOT NULL,
  description TEXT NOT NULL,
  examples TEXT NOT NULL DEFAULT '[]',          -- JSON array
  mitigations TEXT NOT NULL DEFAULT '[]',       -- JSON array (embedded mitigation summaries)
  gdpr_articles TEXT NOT NULL DEFAULT '[]',     -- JSON array
  sources TEXT NOT NULL DEFAULT '[]',           -- JSON array
  full_json TEXT NOT NULL,
  CHECK (category IN (
    'Linking',
    'Identifying',
    'Non-repudiation',
    'Detecting',
    'Data disclosure',
    'Unawareness',
    'Non-compliance'
  ))
);

CREATE INDEX IF NOT EXISTS idx_linddun_threats_category ON linddun_threats(category);
CREATE INDEX IF NOT EXISTS idx_linddun_threats_tree_path ON linddun_threats(tree_path);

CREATE VIRTUAL TABLE IF NOT EXISTS linddun_threats_fts USING fts5(
  threat_id UNINDEXED,
  category,
  tree_path,
  description,
  examples,
  mitigations,
  gdpr_articles,
  content='linddun_threats',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS linddun_threats_fts_insert AFTER INSERT ON linddun_threats BEGIN
  INSERT INTO linddun_threats_fts(
    rowid, threat_id, category, tree_path, description, examples, mitigations, gdpr_articles
  )
  VALUES (
    new.rowid, new.threat_id, new.category, new.tree_path, new.description, new.examples, new.mitigations, new.gdpr_articles
  );
END;

CREATE TRIGGER IF NOT EXISTS linddun_threats_fts_delete AFTER DELETE ON linddun_threats BEGIN
  DELETE FROM linddun_threats_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS linddun_threats_fts_update AFTER UPDATE ON linddun_threats BEGIN
  DELETE FROM linddun_threats_fts WHERE rowid = old.rowid;
  INSERT INTO linddun_threats_fts(
    rowid, threat_id, category, tree_path, description, examples, mitigations, gdpr_articles
  )
  VALUES (
    new.rowid, new.threat_id, new.category, new.tree_path, new.description, new.examples, new.mitigations, new.gdpr_articles
  );
END;

-- LINDDUN mitigations (normalized for direct lookup per threat)
CREATE TABLE IF NOT EXISTS linddun_mitigations (
  mitigation_id TEXT PRIMARY KEY,
  threat_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pet_type TEXT,
  implementation_hints TEXT NOT NULL DEFAULT '[]',  -- JSON array
  effectiveness TEXT,
  reference_links TEXT NOT NULL DEFAULT '[]',       -- JSON array
  FOREIGN KEY (threat_id) REFERENCES linddun_threats(threat_id) ON DELETE CASCADE,
  CHECK (effectiveness IS NULL OR effectiveness IN ('High', 'Medium', 'Low'))
);

CREATE INDEX IF NOT EXISTS idx_linddun_mitigations_threat_id ON linddun_mitigations(threat_id);
CREATE INDEX IF NOT EXISTS idx_linddun_mitigations_effectiveness ON linddun_mitigations(effectiveness);

-- LINDDUN privacy patterns with DFD annotations
CREATE TABLE IF NOT EXISTS linddun_patterns (
  pattern_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',          -- JSON array of LINDDUN categories
  dfd_annotations TEXT NOT NULL DEFAULT '{}',     -- JSON object
  implementation_guidance TEXT NOT NULL DEFAULT '[]', -- JSON array
  related_threat_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array
  pet_family TEXT,
  sources TEXT NOT NULL DEFAULT '[]',             -- JSON array
  full_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_linddun_patterns_pet_family ON linddun_patterns(pet_family);

CREATE VIRTUAL TABLE IF NOT EXISTS linddun_patterns_fts USING fts5(
  pattern_id UNINDEXED,
  name,
  summary,
  categories,
  dfd_annotations,
  implementation_guidance,
  pet_family,
  content='linddun_patterns',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS linddun_patterns_fts_insert AFTER INSERT ON linddun_patterns BEGIN
  INSERT INTO linddun_patterns_fts(
    rowid, pattern_id, name, summary, categories, dfd_annotations, implementation_guidance, pet_family
  )
  VALUES (
    new.rowid, new.pattern_id, new.name, new.summary, new.categories, new.dfd_annotations, new.implementation_guidance, new.pet_family
  );
END;

CREATE TRIGGER IF NOT EXISTS linddun_patterns_fts_delete AFTER DELETE ON linddun_patterns BEGIN
  DELETE FROM linddun_patterns_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS linddun_patterns_fts_update AFTER UPDATE ON linddun_patterns BEGIN
  DELETE FROM linddun_patterns_fts WHERE rowid = old.rowid;
  INSERT INTO linddun_patterns_fts(
    rowid, pattern_id, name, summary, categories, dfd_annotations, implementation_guidance, pet_family
  )
  VALUES (
    new.rowid, new.pattern_id, new.name, new.summary, new.categories, new.dfd_annotations, new.implementation_guidance, new.pet_family
  );
END;

-- LINDDUN citations (claim-level provenance for threats, mitigations, and patterns)
CREATE TABLE IF NOT EXISTS linddun_citations (
  citation_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,         -- 'threat' | 'mitigation' | 'pattern'
  entity_id TEXT NOT NULL,
  claim_key TEXT NOT NULL,           -- e.g., description, example_1, mitigation_2
  claim_text TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,
  license TEXT,
  confidence REAL NOT NULL DEFAULT 0.8,
  CHECK (entity_type IN ('threat', 'mitigation', 'pattern')),
  CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_linddun_citations_entity ON linddun_citations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_linddun_citations_source_title ON linddun_citations(source_title);

-- Optional expert/editorial reviews for citation-level signoff
CREATE TABLE IF NOT EXISTS linddun_citation_reviews (
  review_id TEXT PRIMARY KEY,
  citation_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT,
  decision TEXT NOT NULL,
  comments TEXT,
  reviewed_at TEXT NOT NULL,
  FOREIGN KEY (citation_id) REFERENCES linddun_citations(citation_id) ON DELETE CASCADE,
  CHECK (decision IN ('approved', 'needs_revision', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_linddun_citation_reviews_citation ON linddun_citation_reviews(citation_id);
CREATE INDEX IF NOT EXISTS idx_linddun_citation_reviews_decision ON linddun_citation_reviews(decision);

-- Insert initial metadata
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('schema_version', '1.4.0');
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('last_build', datetime('now'));
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('linddun_categories', '7');
`;

export const INITIAL_STATS_QUERY = `
SELECT
  COUNT(*) as total_patterns,
  COUNT(DISTINCT stride_category) as stride_categories,
  COUNT(DISTINCT technology) as technologies,
  COUNT(DISTINCT framework) as frameworks,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
  SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high_count,
  SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END) as medium_count,
  SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END) as low_count
FROM patterns;
`;
