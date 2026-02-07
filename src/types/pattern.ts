/**
 * TypeScript types for STRIDE threat patterns
 *
 * These types match the JSON schema defined in docs/pattern-schema.md
 */

export type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'Information Disclosure'
  | 'Denial of Service'
  | 'Elevation of Privilege';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export type ValidationStatus = 'draft' | 'validated' | 'expert-validated';

export type Effectiveness = 'High' | 'Medium' | 'Low';

export type ImplementationComplexity = 'High' | 'Medium' | 'Low';

export interface Pattern {
  id: string;
  version: string;
  metadata: PatternMetadata;
  classification: PatternClassification;
  threat: ThreatInfo;
  technology: TechnologyInfo;
  attack: AttackInfo;
  evidence: Evidence;
  mitigations: Mitigation[];
  detection?: Detection;
  metadata_tags?: MetadataTags;
}

export interface PatternMetadata {
  created_date: string;
  last_updated: string;
  reviewed_by: string[];
  confidence_score: number;
  validation_status: ValidationStatus;
}

export interface PatternClassification {
  stride_category: StrideCategory;
  owasp_top10: string[];
  mitre_attack: string[];
  cwe: string[];
}

export interface ThreatInfo {
  title: string;
  description: string;
  severity: Severity;
  cvss_v3: {
    score: number;
    vector: string;
  };
}

export interface TechnologyInfo {
  primary: string;
  versions_affected: string[];
  ecosystem: string;
  dependencies: string[];
  related_frameworks: string[];
}

export interface AttackInfo {
  scenario: string;
  prerequisites: string[];
  attack_vector: string;
  attack_complexity: string;
  privileges_required: string;
  user_interaction: string;
}

export interface Evidence {
  cve_references: CVEReference[];
  real_world_breaches: Breach[];
  bug_bounty_reports: BugBountyReport[];
  security_research: SecurityResearch[];
}

export interface CVEReference {
  cve_id: string;
  description: string;
  cvss_score: number;
  published_date: string;
}

export interface Breach {
  incident: string;
  date: string;
  impact: string;
  root_cause: string;
  source_url: string;
}

export interface BugBountyReport {
  platform: string;
  report_id: string;
  bounty_amount: number;
  severity: string;
  summary: string;
}

export interface SecurityResearch {
  title: string;
  authors: string[];
  published_date: string;
  source_url: string;
  key_finding: string;
}

export interface Mitigation {
  control_id: string;
  title: string;
  description: string;
  effectiveness: Effectiveness;
  implementation_complexity: ImplementationComplexity;
  code_example: CodeExample;
  tools: Tool[];
  iso27001_controls: string[];
  nist_csf: string[];
  validation_steps: string[];
}

export interface CodeExample {
  language: string;
  framework: string;
  code: string;
}

export interface Tool {
  name: string;
  type: string;
  cost?: string;
  usage?: string;
}

export interface Detection {
  indicators: string[];
  log_queries: LogQuery[];
  tools: Tool[];
}

export interface LogQuery {
  siem: string;
  query: string;
}

export interface MetadataTags {
  industry: string[];
  compliance: string[];
  deployment: string[];
  data_classification: string[];
}

/**
 * Simplified pattern for list results (less detail)
 */
export interface PatternSummary {
  id: string;
  title: string;
  stride_category: StrideCategory;
  severity: Severity;
  cvss_score: number;
  technology: string;
  framework: string;
  confidence_score: number;
  validation_status: ValidationStatus;
}

/**
 * Search result with relevance score
 */
export interface SearchResult extends PatternSummary {
  relevance_score: number;
  snippet: string;
}

// --- Cross-reference tool types ---

export type ReferenceType = 'cve' | 'mitre' | 'cwe' | 'owasp';

export interface ReferenceMatch {
  pattern_id: string;
  title: string;
  stride_category: string;
  severity: string;
  confidence_score: number;
  reference_detail: string;
}

export interface ReferenceSearchResult {
  reference_id: string;
  reference_type: ReferenceType;
  matches: ReferenceMatch[];
  total: number;
}

// --- Tag filter types ---

export type TagType = 'industry' | 'compliance' | 'deployment';

export interface TaggedPatternSummary {
  pattern_id: string;
  title: string;
  stride_category: string;
  severity: string;
  confidence_score: number;
  tag_value: string;
}

export interface TagFilterResult {
  tag_type: TagType;
  tag_value: string;
  patterns: TaggedPatternSummary[];
  total: number;
  returned: number;
  offset: number;
}

export interface TagValuesResult {
  tag_type: TagType;
  values: Array<{ value: string; count: number }>;
  total_values: number;
}

// --- Mitigation search types ---

export interface MitigationRecord {
  id: string;
  pattern_id: string;
  title: string;
  description: string | null;
  effectiveness: string | null;
  implementation_complexity: string | null;
  code_language: string | null;
  code_framework: string | null;
  code_example: string | null;
}

export interface MitigationSearchResult {
  mitigations: MitigationRecord[];
  total: number;
  returned: number;
}
