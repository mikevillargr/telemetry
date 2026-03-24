# Commit & Release Workflow

## Commit Philosophy: Commit Early, Commit Often

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) with the following format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Code style changes (formatting, etc.)
- **refactor:** Code refactoring
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks, build process, dependencies
- **ci:** CI/CD changes
- **build:** Build system changes

### Examples

```bash
# New feature
git commit -m "feat(dashboard): add strategy agent analysis persistence"

# Bug fix
git commit -m "fix(api): resolve infinite loading loop on dashboard"

# Documentation
git commit -m "docs(readme): update setup instructions"

# Refactoring
git commit -m "refactor(scheduler): extract analysis generation logic"

# Performance
git commit -m "perf(embeddings): cache model after first load"

# Chore
git commit -m "chore(deps): upgrade Prisma to v6.19.2"
```

### Commit Workflow

1. **Make small, focused commits**
   - Each commit should do one thing
   - Keep commits under 100 lines of changes when possible
   - Commit frequently (every 15-30 minutes of work)

2. **Write clear commit messages**
   - Use imperative mood ("add" not "added")
   - Keep the subject line under 50 characters
   - Wrap body at 72 characters
   - Explain "why" not "what" in the body

3. **Stage changes carefully**
   ```bash
   # Stage specific files
   git add path/to/file.ts

   # Stage with patch mode (interactive)
   git add -p

   # Review before committing
   git diff --staged
   ```

## Semver Release Workflow

### Semantic Versioning (Semver)

We follow [Semver 2.0.0](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality
- **PATCH**: Backwards-compatible bug fixes

### Release Process

#### 1. Create a Release

Go to **Actions → Release → Run workflow** and provide:

- **Version**: `X.Y.Z` (e.g., `1.0.0`, `1.0.1`, `1.1.0`, `2.0.0`)
- **Prerelease**: Check if this is a beta/rc

#### 2. Release Workflow

The GitHub Action will:

1. ✅ Validate Semver format
2. 📝 Generate release notes from commits
3. 🏷️ Create Git tag `vX.Y.Z`
4. 📦 Create GitHub Release with notes

#### 3. Release Notes

Release notes are auto-generated from commit messages:

```markdown
### What's Changed

#### ✨ New Features
  feat(dashboard): add strategy agent analysis persistence (abc123)
  feat(scheduler): add daily cron job for analysis generation (def456)

#### 🐛 Bug Fixes
  fix(api): resolve infinite loading loop on dashboard (ghi789)

#### 🔧 Maintenance
  chore(deps): upgrade Prisma to v6.19.2 (jkl012)
```

### Version Increment Guidelines

#### When to increment MAJOR (X.0.0 → Y.0.0)
- Breaking changes to API routes
- Database schema migrations that require manual intervention
- Major UI redesign that breaks user workflows
- Removing deprecated features

#### When to increment MINOR (X.Y.Z → X.Y+1.0)
- New features (dashboard components, connectors, etc.)
- New API endpoints
- Enhancements to existing features
- New agent types or capabilities

#### When to increment PATCH (X.Y.Z → X.Y.Z+1)
- Bug fixes
- Performance improvements
- Documentation updates
- Small UI tweaks
- Dependency updates that don't break anything

### Pre-release Tags

For pre-releases, append to version:

- `1.0.0-alpha.1` (early internal testing)
- `1.0.0-beta.1` (public beta)
- `1.0.0-rc.1` (release candidate)

### Example Release Timeline

```
v0.1.0-alpha.1 → Initial alpha testing
v0.1.0-beta.1 → Public beta
v0.1.0-rc.1 → Release candidate
v0.1.0 → First stable release
v0.1.1 → Bug fix release
v0.2.0 → Feature release
v1.0.0 → Major release with breaking changes
```

## Branching Strategy

### Main Branches

- **main**: Production-ready code
- **develop**: Integration branch for features

### Feature Branches

```bash
# Create feature branch
git checkout -b feat/strategy-agent-persistence

# Work and commit frequently
git add .
git commit -m "feat(dashboard): add analysis persistence layer"

# Push to remote
git push -u origin feat/strategy-agent-persistence

# Create pull request to develop
```

### Release Branches

```bash
# Create release branch from develop
git checkout -b release/v1.0.0

# Finalize release
git push -u origin release/v1.0.0

# Merge to main and tag
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

## Quick Reference

### Daily Development
```bash
# Start work
git checkout -b feat/new-feature

# Commit frequently
git add .
git commit -m "feat(scope): description"

# Push often
git push
```

### Release
```bash
# Go to GitHub Actions → Release → Run workflow
# Provide version: 1.0.0
# Click "Run workflow"
# Release notes auto-generated
```

### View Release Notes
```bash
# View latest release notes
gh release view

# List all releases
gh release list
```

## Best Practices

✅ **DO**
- Commit every 15-30 minutes
- Write clear, conventional commit messages
- Keep commits focused on one change
- Review changes before committing (`git diff --staged`)
- Use feature branches for new work
- Create releases for every deploy to production

❌ **DON'T**
- Commit unrelated changes together
- Use vague commit messages ("update", "fix stuff")
- Commit broken code
- Skip writing commit messages
- Release without testing
- Break Semver rules
