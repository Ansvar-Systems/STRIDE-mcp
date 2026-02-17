/**
 * list_sources tool
 *
 * Returns data provenance metadata for all sources used by this MCP server.
 * Matches sources.yml content but accessible programmatically via MCP tool call.
 */

import { getDatabaseMetadata } from '../database/db.js';

export interface SourceInfo {
  name: string;
  authority: string;
  official_portal: string;
  retrieval_method: string;
  update_frequency: string;
  last_ingested: string;
  license: string;
  coverage: string;
  limitations: string;
}

export interface ListSourcesResult {
  sources: SourceInfo[];
  schema_version: string;
  last_build: string;
  jurisdiction: string;
}

const SOURCES: SourceInfo[] = [
  {
    name: 'Ansvar Expert-Curated STRIDE Patterns',
    authority: 'Ansvar Systems Security Research',
    official_portal: 'https://github.com/Ansvar-Systems/stride-patterns-mcp',
    retrieval_method: 'MANUAL',
    update_frequency: 'on_change',
    last_ingested: '2026-02-17',
    license: 'Apache-2.0',
    coverage: '125 expert-validated threat patterns across 40+ security domains',
    limitations: 'Patterns are curated selections, not exhaustive',
  },
  {
    name: 'LINDDUN Privacy Threat Framework',
    authority: 'KU Leuven DistriNet Research Group',
    official_portal: 'https://linddun.org',
    retrieval_method: 'MANUAL',
    update_frequency: 'on_change',
    last_ingested: '2026-02-17',
    license: 'Creative Commons (Academic Research)',
    coverage: '35 privacy threats across 7 LINDDUN categories, 30 privacy design patterns',
    limitations: 'Based on published LINDDUN research; may not cover emerging privacy threats',
  },
  {
    name: 'NIST NVD (CVE References)',
    authority: 'National Institute of Standards and Technology',
    official_portal: 'https://nvd.nist.gov',
    retrieval_method: 'MANUAL',
    update_frequency: 'on_change',
    last_ingested: '2026-02-17',
    license: 'Government Open Data',
    coverage: 'CVE references embedded in threat patterns',
    limitations: 'Only CVEs referenced by curated patterns; not a full NVD mirror',
  },
  {
    name: 'MITRE ATT&CK Framework',
    authority: 'The MITRE Corporation',
    official_portal: 'https://attack.mitre.org',
    retrieval_method: 'MANUAL',
    update_frequency: 'on_change',
    last_ingested: '2026-02-17',
    license: 'Apache-2.0',
    coverage: 'ATT&CK technique mappings in threat patterns',
    limitations: 'Only techniques referenced by curated patterns; not a full ATT&CK mirror',
  },
  {
    name: 'OWASP Top 10 and LLM Top 10',
    authority: 'Open Worldwide Application Security Project',
    official_portal: 'https://owasp.org',
    retrieval_method: 'MANUAL',
    update_frequency: 'on_change',
    last_ingested: '2026-02-17',
    license: 'CC BY-SA 4.0',
    coverage: 'OWASP Top 10 (2021) and LLM Top 10 (2025) category mappings',
    limitations: 'Category mappings only; not full OWASP guidance text',
  },
];

export function listSources(): ListSourcesResult {
  const metadata = getDatabaseMetadata();
  return {
    sources: SOURCES,
    schema_version: metadata.schema_version,
    last_build: metadata.last_build,
    jurisdiction: 'International',
  };
}
