# Security Scanning Setup

This document explains the 6-layer security scanning infrastructure for STRIDE Patterns MCP.

## 🎯 Target: OpenSSF Scorecard 9.0+

Following the [EU Compliance MCP](https://github.com/Ansvar-Systems/EU_compliance_MCP) golden standard (8.5/10 scorecard), we aim for **9.0+** to achieve world-class security posture.

## 🔍 6-Layer Security Stack

### 1. CodeQL (Semantic SAST)

**Purpose**: Deep semantic code analysis to detect security vulnerabilities

- **Trigger**: Every push to main, every PR
- **Coverage**: TypeScript, JavaScript
- **Queries**: `security-extended` (includes CWE coverage)
- **File**: `.github/workflows/codeql.yml`

**What it detects**:
- SQL injection patterns
- XSS vulnerabilities
- Path traversal
- Command injection
- Insecure randomness
- Hard-coded credentials

### 2. Semgrep (Pattern-based SAST)

**Purpose**: Fast pattern matching for known vulnerability patterns

- **Trigger**: Every push to main, every PR
- **Coverage**: All source files
- **Rulesets**:
  - `security-audit` - OWASP Top 10 patterns
  - `secrets` - API keys, tokens, passwords
  - `owasp-top-ten` - OWASP coverage
  - `nodejs` - Node.js specific issues
  - `typescript` - TypeScript specific issues

**File**: `.github/workflows/semgrep.yml`

**What it detects**:
- Hardcoded secrets
- Insecure regex patterns
- Prototype pollution
- NoSQL injection
- SSRF vulnerabilities

### 3. Trivy (Dependency CVE Scanning)

**Purpose**: Detect known vulnerabilities in dependencies

- **Trigger**: Daily at 06:00 UTC, every PR
- **Coverage**: npm dependencies, Docker images
- **Scans**:
  - Vulnerabilities (CVE database)
  - Secrets in code
  - Misconfigurations

**File**: `.github/workflows/trivy.yml`

**What it detects**:
- Known CVEs in dependencies
- Outdated packages with fixes
- License compliance issues
- Container vulnerabilities

### 4. Gitleaks (Secret Detection)

**Purpose**: Prevent credential leaks in git history

- **Trigger**: Every push, every PR
- **Coverage**: Full git history (fetch-depth: 0)
- **Detection**: 200+ secret patterns

**File**: `.github/workflows/gitleaks.yml`

**What it detects**:
- API keys (AWS, Azure, GCP, etc.)
- Private SSH keys
- Database passwords
- OAuth tokens
- Slack webhooks

### 5. Socket Security (Supply Chain)

**Purpose**: Supply chain risk analysis for npm packages

- **Trigger**: Weekly Monday 06:00 UTC
- **Coverage**: All npm dependencies
- **Analysis**:
  - Package reputation
  - Maintainer trustworthiness
  - Install scripts
  - Typosquatting detection

**File**: `.github/workflows/socket-security.yml`

**What it detects**:
- Malicious packages
- Suspicious install scripts
- Network calls in packages
- Filesystem access in dependencies

### 6. OSSF Scorecard (Security Posture)

**Purpose**: Overall security best practices compliance

- **Trigger**: Weekly Monday 00:00 UTC
- **Coverage**: Entire repository
- **Checks**: 18 security criteria

**File**: `.github/workflows/ossf-scorecard.yml`

**What it checks**:
- Branch protection
- Code review practices
- Dependency update automation
- Security policy existence
- Signed releases
- Token permissions
- Vulnerability disclosure

## 🔐 Required Secrets

Configure these secrets in GitHub Settings → Secrets:

| Secret | Purpose | How to Get |
|--------|---------|------------|
| `NPM_TOKEN` | NPM publishing | Create at npmjs.com → Access Tokens → Automation token |
| `SOCKET_SECURITY_TOKEN` | Supply chain analysis | Create at socket.dev → Settings → API Keys |

## 📊 Security Metrics Tracked

```yaml
Coverage:
  - Code Coverage: 97%+ (Vitest)
  - Branch Coverage: 94%+
  - SAST Coverage: 100% of source files

Scanning Frequency:
  - Continuous: CodeQL, Semgrep, Gitleaks (every commit)
  - Daily: Trivy (dependency updates)
  - Weekly: Socket Security, OSSF Scorecard

Response Time:
  - Critical: < 24 hours
  - High: < 1 week
  - Medium: Next minor release
  - Low: Next major release
```

## 🚀 Quick Start

### 1. Enable GitHub Actions

All workflows are already configured. Push code to trigger:

```bash
git add .
git commit -m "feat: enable security scanning"
git push origin main
```

### 2. Configure Secrets

1. Go to GitHub Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `NPM_TOKEN` and `SOCKET_SECURITY_TOKEN`

### 3. Enable Branch Protection

1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require status checks to pass
   - ✅ Require CodeQL analysis
   - ✅ Require Semgrep scan
   - ✅ Require 1 approval for PRs

### 4. Monitor Results

- **Security Tab**: View all security alerts
- **Actions Tab**: View workflow runs
- **Dependency Graph**: View dependency vulnerabilities

## 📈 Scorecard Improvement Roadmap

Current OpenSSF Scorecard targets:

| Check | Target | Current | Action |
|-------|--------|---------|--------|
| Binary-Artifacts | 10 | ✅ | No binaries committed |
| Branch-Protection | 8 | 🔄 | Enable required reviews |
| CI-Tests | 10 | ✅ | 122 tests, 97% coverage |
| Code-Review | 8 | 🔄 | Require PR reviews |
| Dangerous-Workflow | 10 | ✅ | No unsafe patterns |
| Dependency-Update-Tool | 10 | 🔄 | Add Dependabot |
| Fuzzing | 5 | ❌ | Future: Add fuzzing |
| License | 10 | ✅ | Apache 2.0 |
| Maintained | 10 | ✅ | Active development |
| Packaging | 10 | ✅ | npm provenance |
| Pinned-Dependencies | 10 | 🔄 | Pin GitHub Actions |
| SAST | 10 | ✅ | CodeQL + Semgrep |
| Security-Policy | 10 | ✅ | SECURITY.md exists |
| Signed-Releases | 10 | ✅ | npm provenance |
| Token-Permissions | 10 | ✅ | Minimal permissions |
| Vulnerabilities | 10 | ✅ | No known CVEs |

**Target Score**: 9.0+ (World-class security)

## 🛠️ Maintenance

### Weekly Tasks
- Review OSSF Scorecard results
- Check Socket Security alerts
- Update dependencies with vulnerabilities

### Monthly Tasks
- Review and update security policies
- Audit access permissions
- Test incident response procedures

### Quarterly Tasks
- Security audit of new patterns
- Review and update threat models
- Penetration testing (if applicable)

## 📚 Resources

- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [npm Provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [SLSA Framework](https://slsa.dev/)

## 🆘 Incident Response

If a security vulnerability is discovered:

1. **Report**: Email security@ansvar.eu
2. **Assessment**: Security team evaluates severity
3. **Patch**: Fix developed and tested
4. **Release**: Security advisory published
5. **Notify**: Users informed via GitHub Security Advisories

---

**Last Updated**: 2026-01-30
**Maintained By**: Ansvar Systems Security Team
