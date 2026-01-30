# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@ansvar.eu**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

- Type of issue (e.g., SQL injection, pattern data tampering, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Features

This project implements the following security measures:

### 🔒 Supply Chain Security

- **Provenance Attestation** - All npm packages are published with cryptographic proof of origin
- **Dependency Scanning** - Trivy scans for known CVEs in dependencies (daily)
- **Socket Security** - Supply chain risk analysis for all npm packages

### 🔍 Code Security

- **CodeQL Analysis** - Semantic SAST scanning with security-extended queries
- **Semgrep** - Pattern-based SAST (security-audit, secrets, OWASP Top 10)
- **Gitleaks** - Secret detection in git history (full scan)

### 📊 Security Posture

- **OpenSSF Scorecard** - Weekly security posture metrics (target: 9.0+)
- **Test Coverage** - 97%+ code coverage with comprehensive test suite
- **Database Validation** - All patterns validated at build time (fail-fast)

### 🛡️ Runtime Security

- **Read-Only Database** - SQLite database opened in read-only mode
- **Input Validation** - All user inputs validated before SQL queries
- **Parameterized Queries** - No SQL injection risk (prepared statements only)
- **FTS5 Error Handling** - Graceful handling of malformed search queries

## Security Scanning Schedule

- **CodeQL**: On every push to main and pull request
- **Semgrep**: On every push to main and pull request
- **Trivy**: Daily at 06:00 UTC
- **Gitleaks**: On every push and pull request
- **Socket Security**: Weekly on Monday at 06:00 UTC
- **OSSF Scorecard**: Weekly on Monday at 00:00 UTC

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release patched versions as soon as possible

## Security Updates

Security updates will be published as:

- **Critical**: Patched within 24 hours
- **High**: Patched within 1 week
- **Medium**: Patched in next minor release
- **Low**: Patched in next major release

## Hall of Fame

We maintain a Hall of Fame for security researchers who responsibly disclose vulnerabilities:

<!-- Security researchers will be listed here -->
_No security vulnerabilities have been reported yet._

## Contact

- **Security Team**: security@ansvar.eu
- **Project Maintainer**: Ansvar Systems
- **Response Time**: < 48 hours

## Attribution

This security policy is based on the [GitHub Security Policy Template](https://github.com/github/security-policy-templates) and [OpenSSF Security Best Practices](https://github.com/ossf/scorecard).
