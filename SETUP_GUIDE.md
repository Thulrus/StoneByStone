# Quick Setup Guide

## For New Contributors

### One-Line Setup

```bash
./setup.sh
```

### Manual Setup

```bash
npm install
npm run prepare
```

## What Gets Installed

- All project dependencies
- Husky git hooks
- Pre-commit automation

## What Runs Before Each Commit

✅ **Lint-staged** - Auto-fixes ESLint and Prettier on staged files  
✅ **Type Check** - Validates TypeScript types  
✅ **Tests** - Runs full test suite

## Useful Commands

```bash
npm run dev          # Start development server
npm test             # Run tests
npm run lint         # Check for linting errors
npm run format       # Format all files
npm run build        # Build for production
```

## Bypassing Pre-commit (Emergency Only!)

```bash
git commit --no-verify -m "WIP: message"
```

⚠️ **Warning**: Only use this for work-in-progress commits. All code should pass checks before merging.

## Troubleshooting

**Hooks not running?**

```bash
npm run prepare
```

**Need more details?**
See [docs/PRE_COMMIT_SETUP.md](docs/PRE_COMMIT_SETUP.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.
