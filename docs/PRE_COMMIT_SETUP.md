# Pre-commit Setup Documentation

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to ensure code quality before commits.

## What Runs on Pre-commit?

When you commit changes, the following checks run automatically:

1. **lint-staged**: Runs on staged files only
   - ESLint with auto-fix for `.ts` and `.tsx` files
   - Prettier formatting for `.ts`, `.tsx`, `.css`, `.json`, and `.md` files

2. **Type checking**: Runs TypeScript compiler in check mode

3. **Tests**: Runs the full test suite with Jest

If any of these checks fail, the commit will be aborted, and you'll need to fix the issues before committing.

## First-Time Setup

### For Fresh Clones

If you're cloning this repository for the first time, run the setup script:

```bash
./setup.sh
```

Or manually:

```bash
npm install
npm run prepare
```

The `prepare` script runs automatically after `npm install`, so husky hooks should be set up automatically.

## Manual Hook Installation

If git hooks aren't working, you can manually reinstall them:

```bash
npx husky install
```

## Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass pre-commit hooks (e.g., work-in-progress commits):

```bash
git commit --no-verify -m "WIP: your message"
```

**Note**: Use this sparingly! The hooks are there to maintain code quality.

## Configuration Files

### package.json

The `lint-staged` configuration is in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{css,json,md}": [
    "prettier --write"
  ]
}
```

### .husky/pre-commit

The pre-commit hook script is in `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged on staged files
npx lint-staged

# Run type checking
npm run build -- --mode development

# Run tests
npm test
```

## Customizing the Hooks

### Adding More Checks

To add additional checks to the pre-commit hook, edit `.husky/pre-commit`:

```bash
# Example: Add a custom check
npm run custom-check
```

### Modifying lint-staged Rules

Edit the `lint-staged` section in `package.json` to change what runs on staged files.

### Creating Other Git Hooks

Husky supports all git hooks. To add a new hook:

```bash
echo "npm run some-command" > .husky/commit-msg
chmod +x .husky/commit-msg
```

## Troubleshooting

### Hooks Not Running

1. Check if `.husky/` directory exists
2. Verify hooks are executable: `ls -la .husky/`
3. Reinstall hooks: `npm run prepare`
4. Make sure you're in a git repository

### Performance Issues

If pre-commit hooks are too slow:

1. **Reduce test scope**: Consider running only affected tests
2. **Skip type checking**: Remove the build step (not recommended for production)
3. **Adjust lint-staged**: Reduce the number of operations

### Node Version Issues

Husky and lint-staged require Node.js 18+. Check your version:

```bash
node --version
```

If you're using an older version, consider using [nvm](https://github.com/nvm-sh/nvm) to upgrade.

## CI/CD Integration

These checks also run in CI/CD. The pre-commit hooks catch issues early, before pushing to the repository.

## Related Scripts

- `npm run lint` - Run ESLint on all files
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without modifying files
- `npm test` - Run all tests
- `npm run build` - Build the project with type checking

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
