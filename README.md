# STRIDE + LINDDUN Patterns MCP

> **Expert-curated STRIDE and LINDDUN threat knowledge with actionable mitigations**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io/)
[![Patterns](https://img.shields.io/badge/patterns-130-orange)](data/seed/patterns/)

**Security & Quality**
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue)](https://github.com/Ansvar-Systems/stride-patterns-mcp/security/code-scanning)
[![Security Scanning](https://img.shields.io/badge/security-6%20layers-blue)](https://github.com/Ansvar-Systems/stride-patterns-mcp/security)

## Overview

STRIDE + LINDDUN Patterns MCP provides AI assistants with instant access to **expert-validated threat and privacy patterns**. It includes:

- **CVE References** - Real vulnerabilities with CVSS scores
- **Real-World Evidence** - Actual breaches (Uber 2016, etc.)
- **Code Examples** - Framework-specific mitigations
- **Detection Queries** - SIEM queries for Azure Sentinel, Elastic, Splunk
- **Compliance Mappings** - ISO 27001, NIST CSF, OWASP Top 10, MITRE ATT&CK
- **DFD Classification** - 121 technology elements with Mermaid diagram generation
- **LINDDUN Privacy Catalog** - 7 privacy threat categories with threat trees, mitigations, GDPR article mappings, and privacy design patterns
- **Citation-Level Provenance** - claim-level citations returned in LINDDUN tool responses (`sources` + `citations`)

## Quick Start

### Use with Claude Code (recommended)

```bash
# Add globally — works in every project
claude mcp add stride-patterns -- npx -y @ansvar/stride-patterns-mcp
```

Or add to `.mcp.json` in your project root (project-scoped):

```json
{
  "mcpServers": {
    "stride-patterns": {
      "command": "npx",
      "args": ["-y", "@ansvar/stride-patterns-mcp"]
    }
  }
}
```

### Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "stride-patterns": {
      "command": "npx",
      "args": ["-y", "@ansvar/stride-patterns-mcp"]
    }
  }
}
```

### Docker (HTTP transport)

```bash
docker build -t stride-patterns-mcp .
docker run -p 3000:3000 stride-patterns-mcp
```

The HTTP server exposes:
- **MCP endpoint:** `http://localhost:3000/mcp` (Streamable HTTP transport)
- **Health check:** `http://localhost:3000/health`

Configure your MCP client to connect to the `/mcp` endpoint with session support (`mcp-session-id` header).

### From Source

```bash
git clone https://github.com/Ansvar-Systems/stride-patterns-mcp.git
cd stride-patterns-mcp
npm install
npm run build
npm start          # stdio transport
npm run start:http # HTTP transport (port 3000)
```


### Public Endpoint (Streamable HTTP)

Connect from any MCP client (Claude Desktop, ChatGPT, Cursor, VS Code, GitHub Copilot):

```
https://mcp.ansvar.eu/stride-patterns/mcp
```

**Claude Code:**
```bash
claude mcp add stride-patterns --transport http https://mcp.ansvar.eu/stride-patterns/mcp
```

**Claude Desktop / Cursor** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "stride-patterns": {
      "type": "url",
      "url": "https://mcp.ansvar.eu/stride-patterns/mcp"
    }
  }
}
```

No authentication required. See [all Ansvar MCP endpoints](https://github.com/Ansvar-Systems/Ansvar-Architecture-Documentation/blob/main/docs/mcp-remote-access.md).
## MCP Tools

### `search_patterns`

Full-text search across patterns using SQLite FTS5. Searches titles, descriptions, attack scenarios, and mitigations.

```json
{
  "query": "JWT authentication bypass",
  "framework": "Express.js",
  "severity": "Critical",
  "min_confidence": 8.5,
  "limit": 20
}
```

### `get_pattern`

Get complete pattern details by ID. Returns full pattern including mitigations, evidence, detection queries, and code examples.

```json
{
  "pattern_id": "STRIDE-API-EXPRESS-001"
}
```

### `list_patterns`

List patterns with filtering, sorting, and pagination.

```json
{
  "stride_category": "Spoofing",
  "technology": "APIs",
  "min_confidence": 8.5,
  "limit": 50,
  "sort_by": "confidence"
}
```

### `get_database_stats`

Get database statistics: total pattern count, coverage by category/technology, average confidence, and severity breakdown.

### `get_available_filters`

Get available filter values: STRIDE categories, technologies, frameworks, severity levels, and validation statuses.

### `classify_technology`

Classify a technology into its DFD (Data Flow Diagram) role and Mermaid shape. Returns the DFD role, category, default trust zone, Mermaid node syntax, and related threat pattern IDs.

```json
{
  "technology": "PostgreSQL"
}
```

### `get_dfd_taxonomy`

Get the complete DFD element taxonomy with Mermaid syntax reference. Returns element type definitions (external_entity, process, data_store, data_flow), category statistics, and a Mermaid syntax guide for rendering DFDs.

### `suggest_trust_boundaries`

Suggest trust boundary templates for a set of technologies. Classifies each technology, matches against architecture templates (microservices, serverless, monolith, etc.), and returns the best-fit template with zone assignments and a Mermaid diagram skeleton.

```json
{
  "technologies": ["Kong", "Express.js", "PostgreSQL", "Redis"]
}
```

### `search_threats`

Search LINDDUN privacy threats across all 7 categories:
- Linking
- Identifying
- Non-repudiation
- Detecting
- Data disclosure
- Unawareness
- Non-compliance

```json
{
  "query": "identifier correlation",
  "category": "Linking",
  "limit": 20
}
```

### `get_threat_tree`

Get full threat tree and leaf nodes for one LINDDUN category.

```json
{
  "category": "Data disclosure"
}
```

### `get_mitigations`

Get privacy-enhancing mitigations for a specific LINDDUN threat.

```json
{
  "threat_id": "LINDDUN-LINKING-001"
}
```

### `search_privacy_patterns`

Search privacy design patterns and DFD annotations.

```json
{
  "query": "consent",
  "category": "Unawareness",
  "limit": 20
}
```

## Pattern Coverage

| Domain | Count | Key Patterns |
|--------|---------|--------------|
| **APIs** | **27** | Express, GraphQL, gRPC, WebSocket, XXE, Deserialization, SSRF, CORS |
| **Cloud** | **8** | AWS Lambda, Azure Functions, GCP, S3, DynamoDB, CloudFront, IAM |
| **Denial of Service** | **7** | Slowloris, ReDoS, XML Bomb, File Upload, gRPC, K8s Resource, WebSocket |
| **Privilege Escalation** | **6** | K8s RBAC, Service Mesh, Lambda, Azure Functions, GCP Functions |
| **Authentication/IAM** | **4** | Password, Biometric, Certificate, SAML |
| **CI/CD/Supply Chain** | **7** | Pipeline Injection, Secret Exposure, NPM Dependency Confusion |
| **Databases** | **4** | NoSQL, Elasticsearch, TimeSeries, Connection Pool |
| **DNS** | **4** | DNSSEC, Subdomain Takeover, Amplification |
| **IoT/Edge** | **5** | Firmware, BLE, MQTT, IoT, Edge Computing |
| **Logging/SIEM** | **4** | Log Injection, Tampering, Audit, SIEM Evasion |
| **AI/ML** | **3** | Prompt Injection, Model Extraction, Data Poisoning |
| **Medical Devices** | **5** | Infusion pump tampering, diagnostic data integrity, PHI exfiltration, device DoS, default credential spoofing |
| **Other** | **46** | Blockchain, Financial, Mobile, VPN, Crypto, CDN, NFC, and more |
| **TOTAL** | **130** | **40+ domains** |

## Data Sources

All data is traceable to authoritative sources. See [`sources.yml`](sources.yml) for full provenance metadata.

| Source | Type | What It Provides |
|--------|------|------------------|
| Ansvar Expert Patterns | Curated | 130 STRIDE threat patterns with CVE refs, code mitigations, detection queries |
| [LINDDUN (KU Leuven)](https://linddun.org) | Academic | 35 privacy threats, 30 privacy design patterns, threat trees |
| [MITRE/MDIC Medical Device Playbook](https://www.mitre.org/publications/technical-papers/playbook-threat-modeling-medical-devices) | Non-profit | 5 medical device threat patterns (infusion pumps, diagnostics, PHI, DoS, spoofing) |
| [NIST NVD](https://nvd.nist.gov) | Government | CVE identifiers and CVSS scores referenced in patterns |
| [MITRE ATT&CK](https://attack.mitre.org) | Non-profit | Technique IDs (T-codes) mapped to threat patterns |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | Non-profit | Risk categories mapped to patterns |

## Architecture

**Stack:** TypeScript + SQLite + FTS5 (based on [EU Compliance MCP](https://github.com/Ansvar-Systems/EU_compliance_MCP))

**Design Principles:**
- **Pre-Built Database:** SQLite database committed to git for instant startup
- **Fail-Fast:** Pattern validation at build time, not runtime
- **Quality First:** 8.5+ confidence score required for production
- **Sub-50ms Search:** SQLite FTS5 for instant pattern discovery
- **Two Transports:** stdio for Claude Desktop, HTTP for remote/Docker deployments

**Data:**
- 130 threat patterns across 40+ security domains
- 35 LINDDUN privacy threats across 7 categories
- 30 privacy design patterns with DFD annotations
- 121 DFD technology elements with Mermaid shape mappings
- 12 trust boundary architecture templates

## Documentation

- [Pattern Schema](docs/pattern-schema.md) - Complete JSON schema definition
- [LINDDUN Schema](docs/linddun-schema.md) - Privacy threat and pattern catalog schema
- [Implementation Summary](docs/IMPLEMENTATION-SUMMARY.md) - Architecture and implementation details
- [Production Readiness](docs/PRODUCTION-READINESS.md) - Quality verification checklist
- [Changelog](CHANGELOG.md) - Release history
- [Data Provenance](sources.yml) - Source metadata for all datasets
- [Contract Tests](fixtures/golden-tests.json) - Golden fixture suite for CI reliability

## Contributing

We welcome pattern contributions from security researchers, pentesters, and bug bounty hunters!

**Requirements:**
- Real-world validation (CVE, breach, or bug bounty)
- 2+ expert reviews
- Confidence score >= 8.5
- Framework-specific (not generic)

See [CONTRIBUTING.md](CONTRIBUTING.md) for submission guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE)

## Related Projects

Part of the [Ansvar MCP Suite](https://github.com/Ansvar-Systems):

- [EU Compliance MCP](https://github.com/Ansvar-Systems/EU_compliance_MCP) - 47 EU regulations (GDPR, NIS2, DORA)
- [US Compliance MCP](https://github.com/Ansvar-Systems/US_Compliance_MCP) - US federal regulations
- [OT Security MCP](https://github.com/Ansvar-Systems/ot-security-mcp) - ICS-CERT advisories
- [Security Controls MCP](https://github.com/Ansvar-Systems/security-controls-mcp) - SCF Framework

---

**Built by [Ansvar Systems](https://ansvar.eu) | Supporting world-class threat modeling**
