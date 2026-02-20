# Removing Sensitive Files from Git History

## Background

The file `public/secrets/Bank_Info.pdf` is currently committed to the repository and publicly accessible. Follow these steps to completely remove it from git history.

---

## Method 1: Using BFG Repo-Cleaner (Recommended - Faster)

### Prerequisites

```bash
# Install BFG (macOS)
brew install bfg

# Or download from: https://rtyley.github.io/bfg-repo-cleaner/
```

### Steps

1. **Create a backup of your repo:**

```bash
cd /Volumes/1tb_ssd/EKD_Space/Documents/coding_env/web/andgroupco
cp -r rhub rhub.backup
cd rhub
```

2. **Remove the file from all history:**

```bash
# Remove specific file
bfg --delete-files Bank_Info.pdf

# Or remove entire folder
bfg --delete-folder public/secrets
```

3. **Clean up git internals:**

```bash
git reflog expire --expire=now --all
git gc --prune=now
```

4. **Force push (⚠️ Only if you control the repo):**

```bash
git push origin --force-with-lease
```

5. **Notify all team members:**

- They must `git pull --rebase` after the push
- They cannot merge any branches without a full rebase

---

## Method 2: Using Git Filter Branch (Official but Slower)

### Steps

1. **Create a backup:**

```bash
cd /Volumes/1tb_ssd/EKD_Space/Documents/coding_env/web/andgroupco
cp -r rhub rhub.backup
cd rhub
```

2. **Remove the file from all commits:**

```bash
git filter-branch --tree-filter 'rm -f public/secrets/Bank_Info.pdf' HEAD
```

3. **Clean up references:**

```bash
git reflog expire --expire=now --all
git gc --aggressive --prune=now
```

4. **Force push:**

```bash
git push origin --force-with-lease
```

---

## Method 3: Delete from Latest Commit Only (If file is new)

If the file was just added in the latest commit:

```bash
# Delete the file
rm -rf public/secrets/Bank_Info.pdf

# Remove from staging
git rm -r --cached public/secrets/

# Amend the last commit
git commit --amend
git push origin main --force-with-lease
```

---

## After Removal

### 1. Verify Removal

```bash
# Search entire history for file references
git log --all --full-history -- "public/secrets/Bank_Info.pdf"

# Should output nothing if successfully removed
```

### 2. Update .gitignore

Already done ✅ - Added to `.public/secrets/` and `public/private/`

```bash
# Verify the entry
cat .gitignore | grep "public/secrets"
```

### 3. Create a new clean commit

```bash
git add .gitignore
git commit -m "chore: add sensitive directories to gitignore"
git push origin main
```

---

## Credential Rotation Checklist

After removing the files, rotate these credentials:

### Database

- [ ] Change MySQL password from `Kwatehekd7!`
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Test database connection: `npx prisma db execute --stdin`

### TTYD Terminal

- [ ] Regenerate API key: `api_98c15f98d934f1d7a09eef0273ee8d02a27dc527...`
- [ ] Update `TTYD_KEY` in `.env`
- [ ] Update TTYD server configuration

### NextAuth

- [ ] Regenerate: `openssl rand -base64 32`
- [ ] Update `NEXTAUTH_SECRET` in `.env`
- [ ] Deploy to clear sessions

### Google OAuth

- [ ] Revoke old credentials in Google Cloud Console
- [ ] Generate new: `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
- [ ] Update OAuth consent screen
- [ ] Test login flow

### EKDSend Email

- [ ] Regenerate API key in EKDSend dashboard
- [ ] Update `EKDSEND_API_KEY` in `.env`
- [ ] Test email sending

---

## Verification

After completing the cleanup:

```bash
# 1. Verify file is gone
git log --all --full-history -- "**Bank_Info.pdf" | wc -l
# Should output: 0

# 2. Verify .gitignore protects future files
echo "test secret" > public/secrets/test.txt
git status
# Should show: nothing to commit (file ignored)

# 3. Verify repository size reduced (optional)
git gc --aggressive --prune=now
du -sh .git
```

---

## Important Notes

⚠️ **Force Push Impact:**

- After force pushing, all collaborators need to:
  ```bash
  git fetch origin
  git rebase origin/main  # NOT git merge
  ```
- Any local branches should be rebased with: `git rebase origin/main`
- Do NOT attempt to merge after force push (will reintroduce deleted commits)

---

## Questions or Issues?

If `git filter-branch` or `bfg` doesn't work as expected:

1. Ensure no git processes are running
2. Try from a fresh checkout: `git clone https://github.com/ekddigital/rhub.git rhub-clean`
3. Run commands in `rhub-clean/`
4. Compare results before pushing

---

**Completion Time:** ~5-10 minutes per method  
**Risk Level:** Medium (force push required - coordinate with team)  
**Recommended:** Method 1 (BFG) - it's faster and cleaner
