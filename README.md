# STRIDE Patterns MCP

> The world's most comprehensive STRIDE threat pattern library for AI-powered threat modeling

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Patterns](https://img.shields.io/badge/patterns-1000%2B-success)](patterns/)

## 🎯 What is STRIDE Patterns MCP?

Expert-curated threat patterns for STRIDE threat modeling, delivered via Model Context Protocol (MCP). Powers AI agents with real-world, validated security knowledge.

**Features:**
- 🔒 **1000+ Expert-Curated Patterns** - Every pattern validated against real CVEs
- 🌐 **50+ Tech Stacks** - Express, Spring, Flask, AWS, Azure, Kubernetes, React, and more
- 🧠 **AI-Optimized** - Template-based patterns with intelligent matching
- 🔄 **Always Current** - Daily CVE sync, weekly bug bounty analysis
- 🏆 **World-Class Quality** - 2+ expert reviews per pattern, 8.5+/10 confidence

## 🚀 Quick Start

### Docker (Coming Soon)

```bash
docker run -p 8302:8302 ansvar/stride-patterns-mcp:latest
```

### Query API

```bash
curl -X POST http://localhost:8302/query \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search_patterns",
    "params": {
      "stride_category": "spoofing",
      "component_type": "REST API",
      "tech_stack": ["jwt", "express"]
    }
  }'
```

## 📚 Documentation

- [Design Document](docs/plans/2026-01-30-stride-patterns-mcp-design.md) - Complete specification
- Architecture (Coming Soon)
- Pattern Schema (Coming Soon)
- Integration Guide (Coming Soon)

## 🌟 Pattern Coverage (Target: 1000+)

| Domain | Patterns | Tech Stacks |
|--------|----------|-------------|
| APIs | 120 | Express, Flask, Spring Boot, FastAPI, ASP.NET |
| Web Applications | 140 | React, Vue, Angular, Django, Ruby on Rails |
| Cloud (AWS/Azure/GCP) | 150 | IAM, S3, Lambda, Kubernetes, Functions |
| Databases | 80 | PostgreSQL, MongoDB, Redis, Elasticsearch |
| Containers | 110 | Kubernetes, Docker, Istio, Linkerd |
| Mobile | 70 | iOS, Android, React Native, Flutter |
| AI/ML | 100 | LLM, RAG, Prompt Injection, Jailbreaking |
| IoT/OT | 60 | Modbus, OPC UA, MQTT, Firmware |
| Supply Chain | 50 | CI/CD, Dependencies, Third-party |
| Identity & Access | 70 | SAML, OIDC, MFA, SSO |
| Emerging Tech | 80 | Web3, Serverless, Edge, AI Agents |
| **TOTAL** | **1,090+** | **50+ Frameworks** |

## 🤝 Contributing

**Status:** Design Phase - Contributions Welcome Soon!

We will welcome expert security practitioners to contribute patterns. Requirements:
- Real-world validation (CVE, breach report, or bug bounty)
- 2+ expert reviews per pattern
- Confidence score ≥8/10

See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon) for details.

## 📝 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## 🏗️ Development Status

**Current Phase:** Design Complete ✅  
**Next Phase:** Foundation (Weeks 1-4) - MCP server + initial 100 patterns

---

**⭐ Star this repository to support the project!**
