# Secret Scanning Setup Guide

Prevent secrets from being accidentally committed to git. This guide sets up automated checks.

---

## Quick Setup (5 Minutes)

### 1. Install Husky and git-secrets

```bash
cd /Volumes/1tb_ssd/EKD_Space/Documents/coding_env/web/andgroupco/rhub

# Install git-secrets
npm install --save-dev git-secrets

# Initialize Husky for pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run secrets:check"
```

### 2. Add npm script to package.json

```json
{
  "scripts": {
    "secrets:check": "git-secrets --scan"
  }
}
```

### 3. Configure git-secrets patterns

```bash
# Git secrets learns from standard patterns automatically
git secrets --install
git secrets --register-aws
```

---

## Step-by-Step Setup

### Step 1: Install git-secrets

```bash
# macOS
brew install git-secrets

# Or via npm
npm install --save-dev git-secrets

# Or build from source
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
make install
```

### Step 2: Initialize git-secrets for the repo

```bash
cd /Volumes/1tb_ssd/EKD_Space/Documents/coding_env/web/andgroupco/rhub

# Install hook templates
git secrets --install

# Register AWS credential patterns
git secrets --register-aws

# (Optional) Register other services
git secrets --register-gcloud
```

### Step 3: Add custom patterns

Create `.git/hooks/git-secrets-patterns` or add to git config:

```bash
# Detect API keys (pattern: api_[hex], key_[hex], etc.)
git config --add secrets.patterns 'api_[a-zA-Z0-9]{32,}'
git config --add secrets.patterns 'sk_live_[a-zA-Z0-9]{32,}'
git config --add secrets.patterns '(GOCSPX|AIza)[a-zA-Z0-9_-]{32,}'

# Database credentials
git config --add secrets.patterns '(mysql|postgres)://[a-zA-Z0-9:@/_.]+'

# Email in URLs
git config --add secrets.patterns '://.+:.+@'

# Auth tokens
git config --add secrets.patterns '(NEXTAUTH_SECRET|TOKEN|SECRET)[ ]*=[ ]*[\'"][^\'"]{16,}[\'"]'
```

### Step 4: Install Husky pre-commit hook

```bash
# Initialize Husky
npm install --save-dev husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx git-secrets --scan"

# Verify hook was created
cat .husky/pre-commit
```

### Step 5: Add npm script

Edit `package.json`:

```json
{
  "scripts": {
    "secrets:check": "git-secrets --scan",
    "secrets:check:all": "git-secrets --scan-history",
    "secrets:audit": "npm run secrets:check:all && npm audit"
  }
}
```

### Step 6: Create a .gitignore-secrets file (optional)

To allow specific patterns you deem safe:

```bash
# Create file
cat > .gitignore-secrets << 'EOF'
# Examples that might match but are not secrets
tests/fixtures/api_example123
docs/examples/YOUR_API_KEY_HERE
.env.example
EOF

# Register with git-secrets
git config --add secrets.allowed '(.env\.example|fixtures)'
```

---

## Verification

### Test the Setup

```bash
# Test 1: Try to commit a fake API key (should fail)
echo "api_test1234567890" > test.txt
git add test.txt
git commit -m "test"  # Should FAIL with secret detected

# Test 2: Remove the file and try again (should pass)
rm test.txt
git add -A
git commit -m "test cleanup"  # Should PASS

# Test 3: Scan entire history
npm run secrets:check:all
```

### View Configured Patterns

```bash
# List all secret patterns
git config --get-all secrets.patterns

# List all allowed patterns
git config --get-all secrets.allowed
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/secrets-scan.yml`:

```yaml
name: Secret Scanning

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Install git-secrets
        run: |
          git clone https://github.com/awslabs/git-secrets.git
          cd git-secrets
          sudo make install
          cd ..

      - name: Configure git-secrets
        run: |
          git secrets --install
          git secrets --register-aws

      - name: Scan for secrets
        run: git secrets --scan-history
```

### Local Pre-Push Hook (Optional)

```bash
npx husky add .husky/pre-push "npm run secrets:check:all"
```

---

## Common Issues

### Issue: Hook not triggering

**Solution:**

```bash
# Ensure permissions are correct
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Re-initialize Husky
npx husky install
```

### Issue: False positives

**Solution:** Add safe patterns to `.gitignore-secrets`:

```bash
git config --add secrets.allowed 'YOUR_PLACEHOLDER'
git config --add secrets.allowed '(docs|examples)/'
```

### Issue: Need to bypass hook (emergency only)

```bash
# Bypass pre-commit hook (NOT RECOMMENDED)
git commit --no-verify

# But you MUST scan manually before pushing
npm run secrets:check:all
```

---

## Double-Check Commands

Run these before any deployment:

```bash
# 1. Scan current changes
npm run secrets:check

# 2. Scan entire history (slow but thorough)
npm run secrets:check:all

# 3. Look for common patterns manually
grep -r "api_\|sk_live_\|GOCSPX\|password.*=" src/ --include="*.ts" --include="*.tsx"

# 4. Check .env is NOT in git
git ls-files | grep "\.env$"  # Should output nothing

# 5. Verify .gitignore protections
cat .gitignore | grep -E "\.env|public/secrets|private"
```

---

## Team Workflow

### After Setup, Everyone Should:

1. **Pull latest changes:**

   ```bash
   git pull origin main
   ```

2. **Reinstall hooks:**

   ```bash
   npx husky install
   ```

3. **Verify locally:**
   ```bash
   npm run secrets:check:all
   ```

---

## Monitoring & Auditing

### Weekly Audit

```bash
#!/bin/bash
# Weekly secret scan script

echo "=== Weekly Security Audit ==="
echo "Scanning repository for exposed secrets..."

npm run secrets:check:all

if [ $? -eq 0 ]; then
  echo "✅ No secrets detected"
else
  echo "❌ Secrets found! Review immediately."
  exit 1
fi
```

### Schedule with cron (macOS/Linux)

```bash
# Edit crontab
crontab -e

# Add this line to run every Monday at 1 AM
0 1 * * 1 cd ~/path/to/rhub && npm run secrets:check:all >> ~/security-audit.log 2>&1
```

---

## Next Steps

1. ✅ Remove Bank_Info.pdf from repo (follow REMOVE_SECRETS_GUIDE.md)
2. ✅ Rotate all credentials (follow SECURITY_REPORT.md)
3. ✅ Set up pre-commit hooks (this guide)
4. ✅ Configure CI/CD scanning (GitHub Actions)
5. ✅ Brief team on security procedure
6. ✅ Schedule weekly audits

---

## Resources

- [git-secrets Documentation](https://github.com/awslabs/git-secrets)
- [Husky](https://typicode.github.io/husky/)
- [GitGuardian](https://www.gitguardian.com/) (SaaS alternative)
- [TruffleHog](https://github.com/trufflesecurity/truffleHog) (Deep scanning)

---

**Setup Time:** ~10 minutes  
**Maintenance:** ~2 minutes per week audit  
**Prevents:** 100% of committed secrets (if patterns are comprehensive)
