/**
 * TypeScript types for LINDDUN privacy threat catalog and patterns.
 */

export type LinddunCategory =
  | 'Linking'
  | 'Identifying'
  | 'Non-repudiation'
  | 'Detecting'
  | 'Data disclosure'
  | 'Unawareness'
  | 'Non-compliance';

export type MitigationEffectiveness = 'High' | 'Medium' | 'Low';

export interface LinddunSource {
  title: string;
  url?: string;
  type?: string;
  license?: string;
}

export interface LinddunCitation {
  citation_id: string;
  entity_type: 'threat' | 'pattern' | 'mitigation';
  entity_id: string;
  claim_key: string;
  claim_text: string;
  source_title: string;
  source_url?: string;
  source_type?: string;
  license?: string;
  confidence: number;
}

export type LinddunReviewDecision = 'approved' | 'needs_revision' | 'rejected';

export interface LinddunCitationReview {
  review_id: string;
  citation_id: string;
  reviewer_name: string;
  reviewer_role?: string;
  decision: LinddunReviewDecision;
  comments?: string;
  reviewed_at: string;
}

export interface LinddunMitigation {
  id: string;
  title: string;
  description: string;
  pet_type?: string;
  implementation_hints: string[];
  effectiveness?: MitigationEffectiveness;
  references?: string[];
}

export interface LinddunThreat {
  threat_id: string;
  category: LinddunCategory;
  tree_path: string;
  description: string;
  examples: string[];
  mitigations: LinddunMitigation[];
  gdpr_articles: string[];
  sources?: LinddunSource[];
  citations?: LinddunCitation[];
}

export interface DfdAnnotations {
  elements?: string[];
  trust_boundary_notes?: string[];
  data_flow_constraints?: string[];
  logging_guidance?: string[];
}

export interface LinddunPattern {
  pattern_id: string;
  name: string;
  summary: string;
  categories: LinddunCategory[];
  dfd_annotations: DfdAnnotations;
  implementation_guidance: string[];
  related_threat_ids: string[];
  pet_family?: string;
  sources?: LinddunSource[];
  citations?: LinddunCitation[];
}

export interface LinddunThreatSearchOptions {
  query?: string;
  category?: LinddunCategory;
  limit?: number;
}

export interface LinddunThreatSearchResult {
  threat_id: string;
  category: LinddunCategory;
  tree_path: string;
  description: string;
  examples: string[];
  gdpr_articles: string[];
  mitigations_count: number;
  sources: LinddunSource[];
  citations: LinddunCitation[];
  relevance_score?: number;
  snippet?: string;
}

export interface LinddunTreeNode {
  name: string;
  path: string;
  children: LinddunTreeNode[];
  threat?: {
    threat_id: string;
    description: string;
    examples: string[];
    gdpr_articles: string[];
    sources: LinddunSource[];
    citations: LinddunCitation[];
  };
}

export interface LinddunPatternSearchOptions {
  query?: string;
  category?: LinddunCategory;
  limit?: number;
}

export interface LinddunPatternSearchResult {
  pattern_id: string;
  name: string;
  summary: string;
  categories: LinddunCategory[];
  dfd_annotations: DfdAnnotations;
  related_threat_ids: string[];
  sources: LinddunSource[];
  citations: LinddunCitation[];
  pet_family?: string;
  relevance_score?: number;
  snippet?: string;
}
