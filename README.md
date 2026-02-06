# STRIDE Patterns MCP

> **Expert-curated STRIDE threat patterns with CVE validation, real-world evidence, and actionable mitigations**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io/)
[![Patterns](https://img.shields.io/badge/patterns-125%2F1000-orange)](data/seed/patterns/)

**Security & Quality**
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue)](https://github.com/Ansvar-Systems/stride-patterns-mcp/security/code-scanning)
[![Security Scanning](https://img.shields.io/badge/security-6%20layers-blue)](https://github.com/Ansvar-Systems/stride-patterns-mcp/security)

## Overview

STRIDE Patterns MCP provides AI assistants with instant access to **expert-validated threat patterns** for security threat modeling. Each pattern includes:

- **CVE References** - Real vulnerabilities with CVSS scores
- **Real-World Evidence** - Actual breaches (Uber 2016, etc.)
- **Code Examples** - Framework-specific mitigations
- **Detection Queries** - SIEM queries for Azure Sentinel, Elastic, Splunk
- **Compliance Mappings** - ISO 27001, NIST CSF, OWASP Top 10, MITRE ATT&CK
- **DFD Classification** - 121 technology elements with Mermaid diagram generation

## Quick Start

### Installation

```bash
npm install
npm run build:db  # Build SQLite database from patterns
npm run build     # Compile TypeScript
```

### Run MCP Server

```bash
npm run dev        # stdio transport (local)
npm run dev:http   # HTTP transport (remote/Docker)
```

### Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "stride-patterns": {
      "command": "node",
      "args": ["/path/to/STRIDE-mcp/dist/index.js"]
    }
  }
}
```

### Docker

```bash
docker build -t stride-patterns-mcp .
docker run -p 3000:3000 stride-patterns-mcp
```

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

## Pattern Coverage (Target: 1000+)

| Domain | Current | Key Patterns |
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
| **Other** | **46** | Blockchain, Financial, Mobile, VPN, Crypto, CDN, NFC, and more |
| **TOTAL** | **125** | **40+ domains** |

## Architecture

**Stack:** TypeScript + SQLite + FTS5 (based on [EU Compliance MCP](https://github.com/Ansvar-Systems/EU_compliance_MCP))

**Design Principles:**
- **Pre-Built Database:** SQLite database committed to git for instant startup
- **Fail-Fast:** Pattern validation at build time, not runtime
- **Quality First:** 8.5+ confidence score required for production
- **Sub-50ms Search:** SQLite FTS5 handles 1000+ patterns instantly
- **Two Transports:** stdio for Claude Desktop, HTTP for remote/Docker deployments

**Data:**
- 125 threat patterns across 40+ security domains
- 121 DFD technology elements with Mermaid shape mappings
- 12 trust boundary architecture templates

## Documentation

- [Pattern Schema](docs/pattern-schema.md) - Complete JSON schema definition
- [Implementation Summary](docs/IMPLEMENTATION-SUMMARY.md) - Phase 0 & 1 summary
- [Design Document](docs/plans/2026-01-30-stride-patterns-mcp-design.md) - Vision & roadmap

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
