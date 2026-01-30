# STRIDE Pattern Schema v1.0

**Version:** 1.0.0
**Date:** 2026-01-30
**Status:** Draft - Awaiting Validation
**Owner:** Ansvar Systems Engineering

---

## Overview

This document defines the canonical schema for STRIDE threat patterns. Each pattern represents a specific, validated cybersecurity threat with real-world evidence, CVE references, and actionable mitigations.

## Design Principles

1. **Quality Over Quantity** - Every field must be expert-validated
2. **CVE-Anchored** - Patterns must reference at least one CVE or breach
3. **Technology-Specific** - No generic patterns; frameworks/versions specified
4. **Actionable** - Mitigations include code examples and tool recommendations
5. **Evidence-Based** - Real-world breaches, bug bounties, or security research

---

## Core Pattern Schema

### JSON Structure

```json
{
  "id": "STRIDE-API-EXPRESS-001",
  "version": "1.0.0",
  "metadata": {
    "created_date": "2026-01-30",
    "last_updated": "2026-01-30",
    "reviewed_by": ["expert_id_1", "expert_id_2"],
    "confidence_score": 9.2,
    "validation_status": "validated"
  },
  "classification": {
    "stride_category": "Spoofing",
    "owasp_top10": ["A07:2021 - Identification and Authentication Failures"],
    "mitre_attack": ["T1550.001 - Application Access Token"],
    "cwe": ["CWE-798 - Use of Hard-coded Credentials"]
  },
  "threat": {
    "title": "JWT Secret Exposure via Environment Variables in Express.js",
    "description": "When JWT signing secrets are stored in .env files committed to version control, attackers can forge authentication tokens and impersonate any user.",
    "severity": "Critical",
    "cvss_v3": {
      "score": 9.8,
      "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    }
  },
  "technology": {
    "primary": "Express.js",
    "versions_affected": ["4.x", "5.x"],
    "ecosystem": "Node.js",
    "dependencies": ["jsonwebtoken", "dotenv"],
    "related_frameworks": ["Koa.js", "Fastify", "NestJS"]
  },
  "attack": {
    "scenario": "1. Attacker discovers .env file in public GitHub repository\n2. Extracts JWT_SECRET value\n3. Uses secret to sign malicious JWT tokens\n4. Gains admin access by forging user claims",
    "prerequisites": [
      "JWT secret stored in version control",
      "Repository is public or attacker has access",
      "Application uses HS256 symmetric signing"
    ],
    "attack_vector": "Remote",
    "attack_complexity": "Low",
    "privileges_required": "None",
    "user_interaction": "None"
  },
  "evidence": {
    "cve_references": [
      {
        "cve_id": "CVE-2018-1000531",
        "description": "Uber 2016 breach - JWT secret in GitHub",
        "cvss_score": 9.8,
        "published_date": "2018-06-26"
      }
    ],
    "real_world_breaches": [
      {
        "incident": "Uber 2016 Data Breach",
        "date": "2016-10-01",
        "impact": "57 million users compromised",
        "root_cause": "AWS credentials in GitHub repository",
        "source_url": "https://www.ftc.gov/news-events/news/press-releases/2018/09/uber-agrees-pay-148-million-settle-claims-covering-massive-2016-data-breach"
      }
    ],
    "bug_bounty_reports": [
      {
        "platform": "HackerOne",
        "report_id": "PLACEHOLDER",
        "bounty_amount": 5000,
        "severity": "Critical",
        "summary": "JWT secret exposure leading to account takeover"
      }
    ],
    "security_research": [
      {
        "title": "The State of Secrets Sprawl 2023",
        "authors": ["GitGuardian Research Team"],
        "published_date": "2023-03-15",
        "source_url": "https://www.gitguardian.com/state-of-secrets-sprawl-2023",
        "key_finding": "10 million secrets leaked in public GitHub repositories in 2022"
      }
    ]
  },
  "mitigations": [
    {
      "control_id": "MIT-001",
      "title": "Use Azure Key Vault for Secret Management",
      "description": "Store JWT secrets in Azure Key Vault instead of environment variables",
      "effectiveness": "High",
      "implementation_complexity": "Medium",
      "code_example": {
        "language": "javascript",
        "framework": "Express.js",
        "code": "const { SecretClient } = require('@azure/keyvault-secrets');\nconst { DefaultAzureCredential } = require('@azure/identity');\n\nconst client = new SecretClient(\n  'https://your-vault.vault.azure.net/',\n  new DefaultAzureCredential()\n);\n\nconst secret = await client.getSecret('jwt-secret');\nconst jwtSecret = secret.value;\n\n// Use for JWT signing\nconst token = jwt.sign({ userId: user.id }, jwtSecret, { algorithm: 'HS256' });"
      },
      "tools": [
        {
          "name": "Azure Key Vault",
          "type": "Secret Management",
          "cost": "~$0.03 per 10,000 operations"
        }
      ],
      "iso27001_controls": ["A.9.4.1 - Information access restriction"],
      "nist_csf": ["PR.AC-1 - Identities and credentials are managed"],
      "validation_steps": [
        "Verify no secrets in .env files",
        "Confirm Key Vault access via managed identity",
        "Test secret rotation without downtime"
      ]
    },
    {
      "control_id": "MIT-002",
      "title": "Switch to Asymmetric RS256 Signing",
      "description": "Use RS256 (RSA public/private key) instead of HS256 (symmetric secret)",
      "effectiveness": "High",
      "implementation_complexity": "Low",
      "code_example": {
        "language": "javascript",
        "framework": "Express.js",
        "code": "// Generate RSA key pair (do this ONCE, store private key securely)\nconst { generateKeyPairSync } = require('crypto');\nconst { publicKey, privateKey } = generateKeyPairSync('rsa', {\n  modulusLength: 2048,\n});\n\n// Sign with private key\nconst token = jwt.sign({ userId: user.id }, privateKey, { algorithm: 'RS256' });\n\n// Verify with public key (can be distributed safely)\nconst decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });"
      },
      "tools": [],
      "iso27001_controls": ["A.10.1.1 - Cryptographic controls"],
      "nist_csf": ["PR.DS-5 - Protections against data leaks"],
      "validation_steps": [
        "Generate 2048-bit RSA key pair",
        "Store private key in secure vault",
        "Distribute public key to verification services",
        "Update JWT middleware to use RS256"
      ]
    },
    {
      "control_id": "MIT-003",
      "title": "Implement Git Pre-Commit Hooks with Gitleaks",
      "description": "Prevent secrets from being committed to version control",
      "effectiveness": "Medium",
      "implementation_complexity": "Low",
      "code_example": {
        "language": "bash",
        "framework": "Git",
        "code": "# Install Gitleaks\nbrew install gitleaks\n\n# Add pre-commit hook\ncat > .git/hooks/pre-commit << 'EOF'\n#!/bin/sh\ngitleaks protect --staged --verbose\nEOF\n\nchmod +x .git/hooks/pre-commit\n\n# Configure .gitleaks.toml\ncat > .gitleaks.toml << 'EOF'\ntitle = \"Ansvar Gitleaks Config\"\n\n[[rules]]\nid = \"jwt-secret\"\ndescription = \"JWT Secret\"\nregex = '''(?i)(jwt[_-]?secret|jwt[_-]?key)\\s*=\\s*['\"][a-zA-Z0-9-_]{32,}['\"]'''\nEOF"
      },
      "tools": [
        {
          "name": "Gitleaks",
          "type": "Secret Detection",
          "cost": "Free (OSS)"
        }
      ],
      "iso27001_controls": ["A.12.3.1 - Information backup"],
      "nist_csf": ["PR.IP-2 - System development life cycle"],
      "validation_steps": [
        "Install Gitleaks locally and in CI/CD",
        "Test with dummy secret (should block commit)",
        "Add .gitleaks.toml to repository"
      ]
    }
  ],
  "detection": {
    "indicators": [
      "Unauthorized admin access from unknown IPs",
      "JWT tokens with suspicious user claims",
      "Multiple users sharing same session token"
    ],
    "log_queries": [
      {
        "siem": "Azure Sentinel",
        "query": "SigninLogs\n| where ResultType == '0' and UserPrincipalName contains 'admin'\n| where IPAddress !in ('trusted_ip_range')\n| summarize count() by UserPrincipalName, IPAddress, bin(TimeGenerated, 1h)"
      }
    ],
    "tools": [
      {
        "name": "TruffleHog",
        "type": "Secret Scanning",
        "usage": "Scan Git history for leaked secrets"
      },
      {
        "name": "GitGuardian",
        "type": "Real-time Secret Detection",
        "usage": "Monitor repositories for secret leaks"
      }
    ]
  },
  "metadata_tags": {
    "industry": ["Financial Services", "Healthcare", "E-commerce"],
    "compliance": ["PCI-DSS", "HIPAA", "SOC2", "ISO27001"],
    "deployment": ["Cloud", "On-Premise", "Hybrid"],
    "data_classification": ["Confidential", "Sensitive"]
  }
}
```

---

## Field Definitions

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Unique pattern identifier (format: `STRIDE-{DOMAIN}-{TECH}-{NUM}`) |
| `version` | String | ✅ | Semantic version (e.g., "1.0.0") |
| `metadata` | Object | ✅ | Pattern metadata (created date, reviewers, confidence score) |
| `classification` | Object | ✅ | STRIDE, OWASP, MITRE, CWE classifications |
| `threat` | Object | ✅ | Threat description, severity, CVSS score |
| `technology` | Object | ✅ | Primary framework, versions, ecosystem |
| `attack` | Object | ✅ | Attack scenario, prerequisites, complexity |
| `evidence` | Object | ✅ | CVE references, breaches, bug bounties, research |
| `mitigations` | Array | ✅ | Mitigation strategies with code examples |
| `detection` | Object | ❌ | Detection indicators, SIEM queries, tools |
| `metadata_tags` | Object | ❌ | Industry, compliance, deployment context |

### Confidence Score Calculation

**Formula:**
```
confidence_score = (
  cve_validated * 3.0 +       // 0-3 points (CVE exists and matches pattern)
  breach_validated * 2.5 +    // 0-2.5 points (Real-world breach evidence)
  expert_reviewed * 2.0 +     // 0-2 points (2+ experts reviewed)
  code_tested * 1.5 +         // 0-1.5 points (Mitigation code tested in lab)
  bug_bounty_confirmed * 1.0  // 0-1 point (Bug bounty report exists)
) / 10 * 10  // Scale to 0-10
```

**Quality Gates:**
- **< 7.0** - Draft (not published)
- **7.0-8.4** - Validated (published with disclaimer)
- **8.5+** - Expert-Validated (production-ready)

### Validation Rules

1. **At least ONE evidence source required:**
   - CVE reference, OR
   - Real-world breach, OR
   - Bug bounty report, OR
   - Security research paper

2. **Technology specificity:**
   - Framework name + version range
   - No generic "JavaScript" or "Web Application" patterns

3. **Mitigation code:**
   - Must be syntactically valid (linted)
   - Must include framework version
   - Must be tested (manual or automated)

4. **CVSS score:**
   - Must match pattern severity
   - Vector string required for Critical/High severity

---

## Pattern ID Format

### Structure
```
STRIDE-{DOMAIN}-{TECH}-{NUMBER}
```

### Domain Codes

| Domain | Code | Examples |
|--------|------|----------|
| APIs | `API` | REST, GraphQL, gRPC |
| Web Applications | `WEB` | React, Vue, Angular |
| Cloud | `CLOUD` | AWS, Azure, GCP |
| Databases | `DB` | PostgreSQL, MongoDB, Redis |
| Containers | `CONTAINER` | Docker, Kubernetes |
| Mobile | `MOBILE` | iOS, Android, React Native |
| AI/ML | `AI` | TensorFlow, PyTorch, Hugging Face |
| IoT/OT | `IOT` | ICS, SCADA, embedded systems |
| Supply Chain | `SUPPLY` | npm, PyPI, Maven |
| IAM | `IAM` | OAuth, SAML, SSO |
| Emerging | `EMERGING` | Blockchain, quantum, edge computing |

### Technology Codes

| Technology | Code | Examples |
|------------|------|----------|
| Express.js | `EXPRESS` | Node.js API framework |
| Flask | `FLASK` | Python web framework |
| Spring Boot | `SPRING` | Java enterprise framework |
| React | `REACT` | Frontend library |
| AWS Lambda | `LAMBDA` | Serverless compute |
| Kubernetes | `K8S` | Container orchestration |

### Example IDs

```
STRIDE-API-EXPRESS-001  // JWT secret exposure in Express.js
STRIDE-API-EXPRESS-002  // SQL injection in Express.js
STRIDE-WEB-REACT-001    // XSS via innerHTML in React
STRIDE-CLOUD-LAMBDA-001 // IAM role over-privilege in Lambda
STRIDE-DB-POSTGRES-001  // SQL injection via unparameterized queries
```

---

## Database Schema (SQLite)

### Table: `patterns`

```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  stride_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  cvss_score REAL,
  technology TEXT NOT NULL,
  framework TEXT NOT NULL,
  versions_affected TEXT,
  attack_scenario TEXT,
  confidence_score REAL NOT NULL,
  created_date TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  full_json TEXT NOT NULL  -- Complete pattern JSON
);

CREATE INDEX idx_patterns_stride ON patterns(stride_category);
CREATE INDEX idx_patterns_technology ON patterns(technology);
CREATE INDEX idx_patterns_framework ON patterns(framework);
CREATE INDEX idx_patterns_severity ON patterns(severity);
CREATE INDEX idx_patterns_confidence ON patterns(confidence_score);
```

### Table: `patterns_fts` (Full-Text Search)

```sql
CREATE VIRTUAL TABLE patterns_fts USING fts5(
  id,
  title,
  description,
  attack_scenario,
  mitigation_summary,
  content='patterns',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER patterns_fts_insert AFTER INSERT ON patterns BEGIN
  INSERT INTO patterns_fts(rowid, id, title, description, attack_scenario, mitigation_summary)
  VALUES (new.rowid, new.id, new.title, new.description, new.attack_scenario,
          (SELECT group_concat(title, ' | ') FROM json_each(new.full_json, '$.mitigations')));
END;
```

### Table: `cve_references`

```sql
CREATE TABLE cve_references (
  pattern_id TEXT NOT NULL,
  cve_id TEXT NOT NULL,
  cvss_score REAL,
  published_date TEXT,
  description TEXT,
  PRIMARY KEY (pattern_id, cve_id),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE INDEX idx_cve_id ON cve_references(cve_id);
```

### Table: `mitigations`

```sql
CREATE TABLE mitigations (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  effectiveness TEXT,
  implementation_complexity TEXT,
  code_language TEXT,
  code_framework TEXT,
  code_example TEXT,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE INDEX idx_mitigations_pattern ON mitigations(pattern_id);
```

### Table: `pattern_tags`

```sql
CREATE TABLE pattern_tags (
  pattern_id TEXT NOT NULL,
  tag_type TEXT NOT NULL,  -- 'industry', 'compliance', 'deployment'
  tag_value TEXT NOT NULL,
  PRIMARY KEY (pattern_id, tag_type, tag_value),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE INDEX idx_tags_type_value ON pattern_tags(tag_type, tag_value);
```

---

## Quality Validation Checklist

### Pattern Submission Checklist

- [ ] **ID Format Valid** - Matches `STRIDE-{DOMAIN}-{TECH}-{NUM}` format
- [ ] **Confidence Score ≥ 8.5** - Meets expert-validation threshold
- [ ] **At Least 1 CVE Reference** - Or real-world breach/bug bounty
- [ ] **Technology Specific** - Framework + version range specified
- [ ] **Mitigation Code Tested** - At least one mitigation code example validated
- [ ] **2+ Expert Reviews** - Reviewed by penetration testers or security researchers
- [ ] **CVSS Vector Valid** - Calculated and matches severity
- [ ] **No Duplicate Patterns** - Search existing patterns for overlap
- [ ] **Evidence Links Valid** - All URLs return 200 OK
- [ ] **JSON Schema Valid** - Passes schema validation

### Review Process

1. **Initial Submission** - Pattern curator creates JSON file
2. **Automated Validation** - Schema validation + link checking
3. **Expert Review 1** - Pentester validates attack scenario
4. **Expert Review 2** - Security researcher validates evidence
5. **Code Testing** - Mitigation code tested in lab environment
6. **Quality Gate** - Confidence score ≥ 8.5 required for approval
7. **Database Ingestion** - Pattern added to SQLite database
8. **Publish** - Rebuild MCP package, publish to npm

---

## Example Pattern Files

### Directory Structure

```
data/seed/patterns/
├── api/
│   ├── express/
│   │   ├── STRIDE-API-EXPRESS-001.json  // JWT secret exposure
│   │   ├── STRIDE-API-EXPRESS-002.json  // SQL injection
│   │   └── STRIDE-API-EXPRESS-003.json  // CSRF in REST API
│   ├── flask/
│   │   ├── STRIDE-API-FLASK-001.json    // SQL injection via raw queries
│   │   └── STRIDE-API-FLASK-002.json    // Jinja2 SSTI
│   └── spring/
│       └── STRIDE-API-SPRING-001.json   // Spring4Shell RCE
├── web/
│   └── react/
│       ├── STRIDE-WEB-REACT-001.json    // XSS via innerHTML
│       └── STRIDE-WEB-REACT-002.json    // Client-side routing bypass
├── cloud/
│   └── aws/
│       ├── STRIDE-CLOUD-LAMBDA-001.json // IAM over-privilege
│       └── STRIDE-CLOUD-S3-001.json     // Public S3 bucket exposure
└── containers/
    └── docker/
        └── STRIDE-CONTAINER-DOCKER-001.json  // Privileged container escape
```

---

## Next Steps

1. **Validate This Schema** - Review with security experts
2. **Create 10 Example Patterns** - Test schema with real threats
3. **Build Database Ingestion Script** - Convert JSON to SQLite
4. **Implement MCP Tools** - Search, list, get_pattern, find_mitigations

---

**Document Version:** 1.0.0
**Status:** Draft - Awaiting Validation
**Author:** Claude Sonnet 4.5 (AI Assistant)
**Human Review Required:** YES
