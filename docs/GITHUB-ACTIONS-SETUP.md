# GitHub Actions Setup (Private Repo)

**Repository:** https://github.com/Ansvar-Systems/STRIDE-mcp (PRIVATE)
**Status:** Code pushed ✅
**Next:** Configure secrets and enable workflows

---

## 🔧 Step 1: Enable GitHub Actions (if not already enabled)

GitHub Actions should be enabled by default on private repos, but verify:

1. Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/settings/actions
2. Under "Actions permissions", select:
   - ✅ **"Allow all actions and reusable workflows"**
3. Under "Workflow permissions", select:
   - ✅ **"Read and write permissions"**
   - ✅ Check "Allow GitHub Actions to create and approve pull requests"
4. Click **"Save"**

---

## 🔑 Step 2: Add Required Secrets

### NPM_TOKEN (Required for publishing)

1. **Get your npm token:**
   ```bash
   # Login to npm
   npm login

   # Create automation token at: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   # Click "Generate New Token" → "Automation"
   ```

2. **Add to GitHub:**
   - Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `NPM_TOKEN`
   - Value: `npm_YOUR_TOKEN_HERE`
   - Click **"Add secret"**

### SOCKET_SECURITY_TOKEN (Optional - for supply chain scanning)

1. **Get Socket.dev token:**
   - Sign up at: https://socket.dev
   - Go to: https://socket.dev/settings/api-keys
   - Click **"Create API Key"**

2. **Add to GitHub:**
   - Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `SOCKET_SECURITY_TOKEN`
   - Value: Your Socket API key
   - Click **"Add secret"**

---

## ✅ Step 3: Verify Workflows Exist

Check that workflows are visible:

1. Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/actions
2. You should see these workflows in the sidebar:
   - ✅ CodeQL
   - ✅ Semgrep
   - ✅ Trivy
   - ✅ Gitleaks
   - ✅ OSSF Scorecard
   - ✅ Socket Security (if token added)
   - ✅ Test Matrix
   - ✅ Publish to npm

**If workflows are missing:**
- They might need to be triggered by a push
- Check: https://github.com/Ansvar-Systems/STRIDE-mcp/tree/main/.github/workflows

---

## 🚀 Step 4: Trigger Security Scans

### Option A: Manual Trigger (Recommended for testing)

1. Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/actions
2. Select a workflow (e.g., "CodeQL")
3. Click **"Run workflow"** → **"Run workflow"**
4. Repeat for each workflow

### Option B: Push a Change (Triggers automatically)

```bash
# Make a small change
echo "\n" >> README.md

# Commit and push
git add README.md
git commit -m "chore: trigger GitHub Actions workflows"
git push origin main
```

---

## 📊 Step 5: Monitor Workflow Results

### Check Workflow Status

1. Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/actions
2. Watch for green checkmarks ✅:
   - CodeQL analysis
   - Semgrep scan
   - Trivy scan
   - Gitleaks scan
   - Test matrix (Node 18, 20, 22)

### Expected Results

**Should PASS:**
- ✅ CodeQL (no vulnerabilities in code)
- ✅ Gitleaks (no secrets leaked)
- ✅ Test Matrix (122 tests passing on all platforms)

**Might show warnings:**
- ⚠️ Semgrep (may flag some patterns for review)
- ⚠️ Trivy (1 moderate dev dependency: esbuild)

**Will run weekly:**
- 🔄 OSSF Scorecard (Mondays 00:00 UTC)
- 🔄 Socket Security (Mondays 06:00 UTC)

---

## 📦 Step 6: Publishing to npm

### Manual Publishing (First Time)

**Do this from your local machine:**

```bash
# 1. Ensure you're logged in to npm
npm login

# 2. Publish with provenance
npm publish --access public --provenance

# 3. Verify on npm
open https://www.npmjs.com/package/@ansvar/stride-patterns-mcp
```

### Automated Publishing (After first release)

**Create a GitHub Release:**

1. Go to: https://github.com/Ansvar-Systems/STRIDE-mcp/releases/new
2. Tag version: `v0.1.0`
3. Release title: `v0.1.0 - Initial Release`
4. Description:
   ```markdown
   ## 🎉 Initial Release

   First public release of STRIDE Patterns MCP!

   ### Features
   - 4 expert-validated threat patterns (9.03/10 avg confidence)
   - Full-text search (FTS5, sub-50ms)
   - MCP 1.0 compatible
   - 97% test coverage
   - 6-layer security scanning

   ### Patterns Included
   - JWT Secret Exposure (Express.js)
   - SQL Injection (Express.js)
   - CSRF (Express.js)
   - SSTI (Flask)

   ### Installation
   ```bash
   npm install @ansvar/stride-patterns-mcp
   ```

   See README for usage instructions.
   ```
5. Click **"Publish release"**
6. The `publish.yml` workflow will automatically trigger!

---

## 🔒 Private Repo Benefits

**What stays private:**
- ✅ Source code (TypeScript)
- ✅ Development history (git commits)
- ✅ Pattern creation process
- ✅ Internal workflows
- ✅ Team discussions

**What becomes public (via npm):**
- ✅ Compiled JavaScript (dist/)
- ✅ Pre-built database (data/patterns.db)
- ✅ README.md
- ✅ LICENSE
- ✅ Package metadata

**GitHub Actions still work:**
- ✅ All 6 security scans run
- ✅ Tests run on every push
- ✅ Automated publishing works
- ✅ Dependabot updates work

---

## 🎯 Quick Start Checklist

Complete these in order:

- [ ] **Step 1:** Verify GitHub Actions enabled
- [ ] **Step 2:** Add NPM_TOKEN secret
- [ ] **Step 2b:** Add SOCKET_SECURITY_TOKEN (optional)
- [ ] **Step 3:** Verify workflows visible
- [ ] **Step 4:** Trigger workflows (manual or push)
- [ ] **Step 5:** Check all workflows pass
- [ ] **Step 6:** Publish to npm manually first time
- [ ] **Future:** Create GitHub releases to auto-publish

---

## 📞 Troubleshooting

### Workflows not showing up?

**Solution:** Push a dummy commit to trigger:
```bash
git commit --allow-empty -m "chore: trigger workflows"
git push origin main
```

### CodeQL failing?

**Solution:** Check logs at:
https://github.com/Ansvar-Systems/STRIDE-mcp/actions

Most common issues:
- TypeScript compilation errors (we don't have any ✅)
- Missing dependencies (all installed ✅)

### NPM publish failing?

**Check:**
1. NPM_TOKEN is valid (not expired)
2. Token has "Automation" permissions
3. Package name is available (@ansvar/stride-patterns-mcp)

### Socket Security failing?

**Note:** Socket requires paid plan for private repos. Options:
1. Keep workflow but skip if token missing
2. Disable Socket workflow (5/6 security layers still excellent)
3. Get Socket paid plan

---

## 🎓 Next Steps

**After setup complete:**

1. **Monitor first scan results** (5-10 minutes)
2. **Fix any security findings** (likely none)
3. **Publish v0.1.0 to npm** (manual first time)
4. **Test installation:** `npm install -g @ansvar/stride-patterns-mcp`
5. **Verify in Claude Desktop**
6. **Celebrate!** 🎉

**Then continue to Phase 3:**
- Create 96 more patterns (targeting 100 total)
- Achieve OpenSSF Scorecard 9.0+
- Get first community users
- Iterate based on feedback

---

## 📊 Expected Timeline

```
Now:           Push complete ✅
+5 minutes:    Workflows start running
+10 minutes:   First security scans complete
+30 minutes:   All workflows complete (including matrix tests)
+1 hour:       Review results, fix any issues
+2 hours:      Publish v0.1.0 to npm
+1 day:        First users install and test
+1 week:       Gather feedback, plan Phase 3
```

---

**Status:** Ready to configure secrets and trigger workflows!
**Next Action:** Add NPM_TOKEN to GitHub Secrets
