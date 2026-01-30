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
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial metadata
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '1.0.0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_build', datetime('now'));
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
