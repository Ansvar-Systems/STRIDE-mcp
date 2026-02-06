# Contributing to STRIDE Patterns MCP

Thank you for your interest in contributing to the world's most comprehensive STRIDE threat pattern library.

## Tech Stack

- **Runtime:** TypeScript + Node.js (18+)
- **Database:** SQLite with FTS5 full-text search
- **Protocol:** Model Context Protocol (MCP) via `@modelcontextprotocol/sdk`
- **Testing:** Vitest with 80%+ coverage thresholds

## Getting Started

```bash
npm install
npm run build:db  # Build SQLite database from seed patterns
npm run build     # Compile TypeScript
npm test          # Run test suite
```

## Contribution Areas

### 1. New Threat Patterns
Expert-curated patterns with real-world validation (CVE, breach reports, bug bounties).

Each pattern JSON must include:
- Valid STRIDE classification
- At least one evidence source (CVE, breach, bug bounty, or research)
- Confidence score >= 8.5 for production
- Framework-specific mitigations with code examples

### 2. Pattern Reviews
Security professionals with expertise in penetration testing, bug bounties, or security research.

### 3. Tech Stack Variants
Framework-specific implementations (Express vs Flask vs Spring Boot, etc.)

### 4. DFD Elements
Add new technology classifications for Data Flow Diagram generation.

### 5. Documentation
Improving guides, examples, and integration documentation.

## Quality Standards

Every pattern requires:
- Validation against real CVE or breach report
- 2+ expert security reviews
- Confidence score >= 8/10
- Implementation guidance tested in lab

## Development Workflow

1. Fork the repository
2. Create a feature branch
3. Add/modify patterns in `data/seed/patterns/`
4. Run `npm run build:db` to validate and rebuild the database
5. Run `npm test` to ensure all tests pass
6. Submit a pull request

## Questions?

Please open a GitHub issue or discussion.
