# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Deprecated
- 4 LINDDUN tools are now returning 410-style deprecation messages: `search_threats`, `get_threat_tree`, `get_mitigations`, `search_privacy_patterns`. These tools have moved to `privacy-patterns-mcp` and should be accessed via `gateway.ansvar.eu`. LINDDUN tables remain in the database for one release cycle; tools and tables will be removed entirely in the next release.

### Added
- LINDDUN privacy threat modeling: 4 new tools (`search_threats`, `get_threat_tree`, `get_mitigations`, `search_privacy_patterns`)
- 35 LINDDUN privacy threats across 7 categories with threat trees and mitigations
- 30 privacy design patterns with DFD annotations
- Citation-level provenance in LINDDUN tool responses (`sources` + `citations`)
- `sources.yml` data provenance metadata
- `server.json` for Official MCP Registry publishing
- `CHANGELOG.md` (this file)
- Contract tests (`fixtures/golden-tests.json`) for CI reliability
- SBOM generation (CycloneDX) in CI and release workflows
- `.github/ISSUE_TEMPLATE/data-error.md` for one-click error reports

## [0.2.0] - 2026-01-15

### Added
- 3 cross-reference tools: `find_patterns_by_reference`, `filter_by_tags`, `search_mitigations`
- Docker support with HTTP transport (Streamable HTTP on `/mcp`)
- Server instructions for agent-facing workflow guidance
- 463 framework-specific mitigations with code examples

### Changed
- Replaced `better-sqlite3` with `@ansvar/mcp-sqlite` (WASM-based, no native compilation)
- Extracted shared tool definitions to `src/tools/definitions.ts` (single source of truth)
- Fixed framework column to use comma-separated list with LIKE matching

### Fixed
- Hardened input validation for 6 tools (runtime type checks)
- LIKE queries now escape `%` and `_` via `escapeLike()` + `ESCAPE '\\'`
- SQL params typed as `(string | number)[]` instead of `any[]`
- Added `publishConfig` for scoped npm publishing

## [0.1.0] - 2025-12-20

### Added
- Initial release with 125 expert-curated STRIDE threat patterns
- 11 MCP tools: `search_patterns`, `get_pattern`, `list_patterns`, `get_database_stats`, `get_available_filters`, `classify_technology`, `get_dfd_taxonomy`, `suggest_trust_boundaries`, `find_patterns_by_reference`, `filter_by_tags`, `search_mitigations`
- 121 DFD technology elements with Mermaid shape mappings
- 12 trust boundary architecture templates
- SQLite + FTS5 full-text search with sub-50ms query latency
- Pre-built database committed to git for instant startup
- stdio and HTTP transports
- 6-layer security scanning (CodeQL, Semgrep, Trivy, Gitleaks, Socket, OSSF Scorecard)
- 236 tests with 92% code coverage
- npm provenance attestation

[Unreleased]: https://github.com/Ansvar-Systems/stride-patterns-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Ansvar-Systems/stride-patterns-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Ansvar-Systems/stride-patterns-mcp/releases/tag/v0.1.0
