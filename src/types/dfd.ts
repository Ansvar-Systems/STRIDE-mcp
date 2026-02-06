/**
 * TypeScript types for DFD (Data Flow Diagram) elements and trust boundaries
 *
 * These types define the taxonomy used to classify technologies into
 * DFD roles (external_entity, process, data_store, data_flow) and
 * provide Mermaid diagram syntax for rendering.
 */

/**
 * DFD element roles as defined in standard DFD notation
 */
export type DfdRole =
  | 'external_entity'
  | 'process'
  | 'data_store'
  | 'data_flow';

/**
 * Technology categories for grouping DFD elements
 */
export type DfdCategory =
  | 'database'
  | 'cache'
  | 'message_broker'
  | 'api_gateway'
  | 'identity_provider'
  | 'ai_ml'
  | 'cloud_service'
  | 'web_application'
  | 'monitoring'
  | 'infrastructure'
  | 'storage'
  | 'networking'
  | 'external_entity'
  | 'data_flow';

/**
 * Mermaid shapes for DFD diagram rendering
 */
export type MermaidShape =
  | 'cylinder'       // [(label)] - data stores
  | 'rounded_rect'   // (label) - processes
  | 'rectangle'      // [label] - external entities
  | 'stadium'        // ([label]) - data flows
  | 'hexagon'        // {{label}} - infrastructure
  | 'diamond'        // {label} - decision points
  | 'circle'         // ((label)) - events
  | 'parallelogram'; // [/label/] - IO

/**
 * A DFD element represents a technology that can appear in a data flow diagram.
 * Each element has a classification (role, category) and rendering metadata.
 */
export interface DfdElement {
  id: string;
  technology: string;
  aliases: string[];
  category: DfdCategory;
  dfd_role: DfdRole;
  default_zone: string;
  mermaid_shape: MermaidShape;
  mermaid_node_syntax: string;
  typical_protocols: string[];
  related_pattern_ids: string[];
  description: string;
}

/**
 * A zone within a trust boundary template
 */
export interface TrustZone {
  name: string;
  trust_level: 'untrusted' | 'semi-trusted' | 'trusted' | 'highly-trusted';
  typical_elements: string[];
  description: string;
}

/**
 * A boundary between trust zones
 */
export interface TrustBoundary {
  name: string;
  from_zone: string;
  to_zone: string;
  controls: string[];
}

/**
 * A trust boundary template defines the standard architecture pattern
 * for a type of system (microservices, monolith, serverless, etc.)
 */
export interface TrustBoundaryTemplate {
  id: string;
  name: string;
  architecture_type: string;
  description: string;
  zones: TrustZone[];
  boundaries: TrustBoundary[];
  mermaid_template: string;
}

// --- Result Types ---

/**
 * Result of classifying a single technology
 */
export interface ClassifyTechnologyResult {
  match: DfdElement | null;
  suggestions: DfdElement[];
  query: string;
}

/**
 * DFD element type definition for taxonomy
 */
export interface DfdElementTypeInfo {
  role: DfdRole;
  mermaid_shape: MermaidShape;
  description: string;
  example_syntax: string;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  category: DfdCategory;
  count: number;
}

/**
 * Full taxonomy result
 */
export interface DfdTaxonomyResult {
  element_types: DfdElementTypeInfo[];
  categories: CategoryStats[];
  mermaid_reference: string;
  total_elements: number;
}

/**
 * A technology with its zone assignment
 */
export interface TechnologyZoneAssignment {
  technology: string;
  classified_as: DfdElement | null;
  assigned_zone: string;
}

/**
 * Result of suggesting trust boundaries
 */
export interface SuggestTrustBoundariesResult {
  template: TrustBoundaryTemplate | null;
  score: number;
  assignments: TechnologyZoneAssignment[];
  mermaid_skeleton: string;
}
