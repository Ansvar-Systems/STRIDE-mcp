# LINDDUN Catalog Schema

This document defines the LINDDUN privacy threat catalog and privacy pattern schema used in the SQLite build artifact.

## Threat fields

Each LINDDUN threat record includes:

- `threat_id` (TEXT, primary key)
- `category` (TEXT, one of the seven LINDDUN categories)
- `tree_path` (TEXT, full category path to a leaf threat)
- `description` (TEXT)
- `examples` (JSON array of strings)
- `mitigations` (JSON array of mitigation summaries)
- `gdpr_articles` (JSON array of strings)
- `sources` (JSON array of source metadata)

The normalized mitigation table stores:

- `mitigation_id`
- `threat_id`
- `title`
- `description`
- `pet_type`
- `implementation_hints` (JSON array)
- `effectiveness` (`High` | `Medium` | `Low`)
- `references` (JSON array)

## Privacy pattern fields

Each privacy design pattern includes:

- `pattern_id` (TEXT, primary key)
- `name`
- `summary`
- `categories` (JSON array of LINDDUN categories)
- `dfd_annotations` (JSON object)
- `implementation_guidance` (JSON array)
- `related_threat_ids` (JSON array)
- `pet_family`
- `sources` (JSON array)

## Supported categories

- `Linking`
- `Identifying`
- `Non-repudiation`
- `Detecting`
- `Data disclosure`
- `Unawareness`
- `Non-compliance`

## Tool mapping

- `search_threats` searches `linddun_threats` and `linddun_threats_fts`.
- `get_threat_tree` reconstructs the category tree from `tree_path`.
- `get_mitigations` resolves normalized records from `linddun_mitigations`.
- `search_privacy_patterns` searches `linddun_patterns` and `linddun_patterns_fts`.

## Citation provenance

Claim-level provenance is stored in `linddun_citations`:

- `citation_id` (stable id)
- `entity_type` (`threat`, `mitigation`, `pattern`)
- `entity_id` (e.g., `LINDDUN-LINKING-001`, `LINDDUN-LINKING-001-MIT-01`)
- `claim_key` (e.g., `description`, `example_1`, `implementation_2`)
- `claim_text` (the exact claim text supported by the source)
- `source_title`, `source_url`, `source_type`, `license`
- `confidence` (0-1)

All LINDDUN tools include provenance (`sources` + `citations`) in their responses.
