# Publishing STRIDE Patterns MCP to npm

Complete step-by-step guide to publish v0.1.0 to npm (even though the GitHub repository is private).

## Prerequisites

- ✅ GitHub repository is private: https://github.com/Ansvar-Systems/STRIDE-mcp
- ✅ All workflows are committed and pushed
- ✅ All tests passing (97% coverage)
- ✅ Production ready (99/100 score)

---

## Step 1: Create npm Account (if needed)

### 1.1 Sign Up for npm

**URL:** https://www.npmjs.com/signup

Fill in:
- **Username:** `ansvar-systems` (or your preferred name)
- **Email:** Use your Ansvar email
- **Password:** Strong password (save in password manager)

### 1.2 Verify Email

- Check your email for verification link
- Click link to verify account

### 1.3 Enable Two-Factor Authentication (Recommended)

1. Go to: https://www.npmjs.com/settings/YOUR-USERNAME/tfa
2. Choose "Authorization and Publishing" (recommended) or "Authorization Only"
3. Scan QR code with authenticator app
4. Save backup codes in secure location

---

## Step 2: Create npm Automation Token

### 2.1 Generate Token

1. **Log in to npm:** https://www.npmjs.com/login
2. **Go to Access Tokens:** https://www.npmjs.com/settings/YOUR-USERNAME/tokens
3. **Click "Generate New Token"**
4. **Select "Automation"** (allows publishing from CI/CD)
5. **Name it:** `STRIDE-mcp-github-actions`
6. **Click "Generate Token"**

### 2.2 Copy Token

```
npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANT:** Copy this token immediately! You won't see it again.

**Save it temporarily** in a text file (you'll delete this after adding to GitHub).

---

## Step 3: Add NPM_TOKEN to GitHub Secrets

### 3.1 Navigate to Repository Secrets

**URL:** https://github.com/Ansvar-Systems/STRIDE-mcp/settings/secrets/actions

(You need admin access to the repository)

### 3.2 Add New Secret

1. **Click "New repository secret"**
2. **Name:** `NPM_TOKEN` (must be exactly this - it's in the workflow)
3. **Secret:** Paste the token from Step 2.2
4. **Click "Add secret"**

### 3.3 Verify Secret Added

You should see:
```
NPM_TOKEN  •••••••••••••••••  Updated now
```

**Delete the text file** with the token from your computer (it's now in GitHub).

---

## Step 4: Verify Package Name is Available

### 4.1 Check if Package Name Exists

Open terminal and run:

```bash
npm info @ansvar-systems/stride-patterns-mcp
```

**Expected output:**
```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@ansvar-systems%2fstride-patterns-mcp
```

This is GOOD! It means the name is available.

### 4.2 Check package.json Configuration

```bash
cat package.json | grep -A 10 '"name"'
```

**Should show:**
```json
{
  "name": "@ansvar-systems/stride-patterns-mcp",
  "version": "0.1.0",
  "publishConfig": {
    "access": "public"
  }
}
```

If version is not "0.1.0", update it:

```bash
npm version 0.1.0 --no-git-tag-version
git add package.json
git commit -m "chore: set version to 0.1.0 for initial release"
git push
```

---

## Step 5: Create Git Tag and GitHub Release

### 5.1 Create and Push Git Tag

```bash
# Make sure you're on main and up to date
git checkout main
git pull

# Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0: Initial production release

Features:
- 127 curated STRIDE security patterns
- Full-text search with FTS5
- Filter by STRIDE category, technology, framework, severity
- 97% test coverage
- 6-layer security scanning
- SLSA provenance attestation

Production ready: 99/100 quality score"

# Push tag to GitHub
git push origin v0.1.0
```

**Verify tag on GitHub:**
https://github.com/Ansvar-Systems/STRIDE-mcp/tags

### 5.2 Create GitHub Release

1. **Go to releases page:**
   https://github.com/Ansvar-Systems/STRIDE-mcp/releases/new

2. **Fill in form:**
   - **Choose a tag:** `v0.1.0` (select the tag you just created)
   - **Release title:** `v0.1.0 - Initial Production Release`
   - **Description:**
     ```markdown
     # STRIDE Patterns MCP v0.1.0

     Initial production release of the STRIDE Patterns MCP server.

     ## Features

     - 🎯 **127 curated STRIDE security patterns** across Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege
     - 🔍 **Full-text search** with SQLite FTS5 for pattern discovery
     - 🏷️ **Advanced filtering** by STRIDE category, technology, framework, severity, confidence
     - 📊 **Comprehensive metadata** including CVSS scores, CWE mappings, MITRE ATT&CK techniques
     - ✅ **97% test coverage** with 122 tests
     - 🔒 **6-layer security scanning** (CodeQL, Semgrep, Trivy, Gitleaks, Socket, OSSF Scorecard)
     - 📦 **SLSA provenance attestation** for supply chain security

     ## Installation

     ```bash
     npm install @ansvar-systems/stride-patterns-mcp
     ```

     ## Documentation

     See README.md for configuration with Claude Desktop and usage examples.

     ## Quality Metrics

     - Test Coverage: 97.11%
     - Production Readiness: 99/100
     - Security Scans: All passing
     - Node.js Support: 18, 20, 22

     ## Verification

     Verify package authenticity:
     ```bash
     npm audit signatures @ansvar-systems/stride-patterns-mcp
     ```
     ```

3. **Set as latest release:** ✅ Check "Set as the latest release"

4. **Click "Publish release"**

---

## Step 6: Monitor the Publish Workflow

### 6.1 Watch Workflow Execute

1. **Go to Actions tab:**
   https://github.com/Ansvar-Systems/STRIDE-mcp/actions

2. **Look for "Publish to npm" workflow** (should start automatically)

3. **Click on the running workflow** to see logs

### 6.2 Workflow Steps (should all succeed)

```
✓ Checkout code
✓ Setup Node.js 20
✓ Install dependencies (npm ci)
✓ Build database (npm run build:db)
✓ Run tests (npm test)
✓ Build TypeScript (npm run build)
✓ Publish to npm with provenance
✓ Create GitHub deployment
```

### 6.3 Expected Success Output

In the "Publish to npm with provenance" step, you should see:

```
npm notice Publishing to https://registry.npmjs.org/ with provenance
+ @ansvar-systems/stride-patterns-mcp@0.1.0
```

**If workflow fails**, check the error message and fix the issue. Common problems:
- NPM_TOKEN not set or invalid
- Package name already taken (very unlikely)
- Tests failing
- Build errors

---

## Step 7: Verify Package is Published

### 7.1 Check npm Registry

**URL:** https://www.npmjs.com/package/@ansvar-systems/stride-patterns-mcp

You should see:
- ✅ Package name and version
- ✅ README rendered
- ✅ Installation instructions
- ✅ Version history

### 7.2 Check Provenance Badge

On the npm package page, look for:

```
✓ Provenance: This package has a verified build provenance
```

Click it to see the attestation linking to your GitHub Actions run.

### 7.3 Verify via CLI

```bash
# Check package info
npm info @ansvar-systems/stride-patterns-mcp

# Should show:
# @ansvar-systems/stride-patterns-mcp@0.1.0
# Description: STRIDE security patterns database for threat modeling
# ...
```

### 7.4 Verify Provenance Signature

```bash
npm audit signatures @ansvar-systems/stride-patterns-mcp

# Should show:
# audited 1 package in XXXms
# 1 package has a verified registry signature
```

---

## Step 8: Test Installation

### 8.1 Install in Test Directory

```bash
# Create test directory
mkdir -p /tmp/test-stride-mcp
cd /tmp/test-stride-mcp

# Initialize npm project
npm init -y

# Install the package
npm install @ansvar-systems/stride-patterns-mcp

# Verify installation
ls node_modules/@ansvar-systems/stride-patterns-mcp/
# Should show: dist/ data/ package.json README.md
```

### 8.2 Verify Database Exists

```bash
ls node_modules/@ansvar-systems/stride-patterns-mcp/data/
# Should show: patterns.db
```

### 8.3 Test Basic Functionality (Optional)

```bash
node -e "
const db = require('better-sqlite3')('node_modules/@ansvar-systems/stride-patterns-mcp/data/patterns.db', {readonly: true});
const count = db.prepare('SELECT COUNT(*) as count FROM patterns').get();
console.log('Pattern count:', count.count);
db.close();
"

# Should output: Pattern count: 127
```

---

## Step 9: Announce and Document

### 9.1 Update Project README

Add installation badge to README.md:

```markdown
[![npm version](https://badge.fury.io/js/@ansvar-systems%2Fstride-patterns-mcp.svg)](https://www.npmjs.com/package/@ansvar-systems/stride-patterns-mcp)
```

### 9.2 Share with Team

- Slack/Teams announcement
- Email to stakeholders
- Update project documentation

---

## Troubleshooting

### NPM_TOKEN Invalid

**Error:** `npm error code E401: Unable to authenticate`

**Fix:**
1. Generate new token at https://www.npmjs.com/settings/YOUR-USERNAME/tokens
2. Update GitHub secret with new token
3. Re-run workflow

### Package Name Already Taken

**Error:** `npm error code E403: You do not have permission to publish`

**Fix:**
1. Choose different package name in package.json
2. Update README references
3. Commit and create new release

### Tests Failing in Workflow

**Error:** Workflow fails at "Run tests" step

**Fix:**
1. Run tests locally: `npm test`
2. Fix failing tests
3. Commit and push
4. Delete old release and tag
5. Create new release with same version

### Build Fails

**Error:** Workflow fails at "Build TypeScript" step

**Fix:**
1. Run build locally: `npm run build`
2. Fix TypeScript errors
3. Commit and push
4. Delete old release and tag
5. Create new release with same version

---

## Success Checklist

After completing all steps, verify:

- [ ] npm package page exists: https://www.npmjs.com/package/@ansvar-systems/stride-patterns-mcp
- [ ] Package shows v0.1.0
- [ ] Provenance badge visible and verifiable
- [ ] README renders correctly on npm
- [ ] `npm install @ansvar-systems/stride-patterns-mcp` works
- [ ] Database file (patterns.db) included in package
- [ ] GitHub release shows v0.1.0
- [ ] Workflow completed successfully
- [ ] Provenance signature verifies

---

## Next Steps

After successful v0.1.0 publish:

1. **Monitor usage:** Check npm download stats
2. **Watch for issues:** Monitor GitHub issues from users
3. **Plan v0.2.0:** Add features, more patterns
4. **Update OpenSSF Scorecard:** Aim for 9.0+ score
5. **Document patterns:** Add more threat patterns to database

---

## Quick Reference

| Action | URL/Command |
|--------|-------------|
| npm login | https://www.npmjs.com/login |
| Generate token | https://www.npmjs.com/settings/YOUR-USERNAME/tokens |
| Add GitHub secret | https://github.com/Ansvar-Systems/STRIDE-mcp/settings/secrets/actions |
| Create release | https://github.com/Ansvar-Systems/STRIDE-mcp/releases/new |
| View workflows | https://github.com/Ansvar-Systems/STRIDE-mcp/actions |
| npm package page | https://www.npmjs.com/package/@ansvar-systems/stride-patterns-mcp |
| Verify provenance | `npm audit signatures @ansvar-systems/stride-patterns-mcp` |
| Install package | `npm install @ansvar-systems/stride-patterns-mcp` |

---

**You're ready to publish!** 🚀

Start with Step 1 if you don't have an npm account, or jump to Step 2 if you already have one.
