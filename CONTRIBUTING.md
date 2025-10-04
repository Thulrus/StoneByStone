# Contributing to StoneByStone

Thank you for your interest in contributing to StoneByStone! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A GitHub account

### Initial Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/StoneByStone.git
   cd StoneByStone
   ```

2. **Run Setup Script**

   ```bash
   ./setup.sh
   ```

   This will:
   - Install all dependencies
   - Set up git hooks for code quality
   - Prepare your development environment

3. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the App

```bash
npm run dev
```

Visit `http://localhost:5173` to see your changes in real-time.

### Before Committing

Our pre-commit hooks automatically run:

- **ESLint**: Checks and auto-fixes code issues
- **Prettier**: Formats code consistently
- **TypeScript**: Validates types
- **Tests**: Ensures nothing breaks

You don't need to run these manually, but you can:

```bash
npm run lint        # Check for linting errors
npm run format      # Format all files
npm test            # Run tests
npm run build       # Type check and build
```

### Commit Messages

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add support for GPS coordinates in graves"
git commit -m "fix: resolve merge conflict with deleted graves"
git commit -m "docs: update API documentation"
```

Prefixes:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `style`: Code style changes (formatting, etc.)
- `chore`: Maintenance tasks

## Code Style

### TypeScript

- Use strict mode; avoid `any` types
- Prefer interfaces for object shapes
- All functions should have explicit return types
- Use optional chaining (`?.`) for potentially undefined properties

```typescript
// Good
interface Grave {
  uuid: string;
  plot: string;
  properties: GraveProperties;
}

function getGraveName(grave: Grave): string | undefined {
  return grave.properties.name;
}

// Bad
function getGraveName(grave: any) {
  return grave.properties.name;
}
```

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Handle loading and error states explicitly

```typescript
// Good
export function GraveList({ graves }: { graves: Grave[] }): JSX.Element {
  const [filter, setFilter] = useState<string>('');

  const filtered = useMemo(
    () => graves.filter(g => g.plot.includes(filter)),
    [graves, filter]
  );

  return <div>...</div>;
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `GraveEditor.tsx`)
- Utilities: `camelCase.ts` (e.g., `merge.ts`)
- Types: `camelCase.ts` (e.g., `cemetery.ts`)
- Constants: `UPPER_SNAKE_CASE`

## Testing

### Writing Tests

- Place test files next to the code they test: `merge.test.ts` next to `merge.ts`
- Use descriptive test names
- Cover edge cases, especially for data flexibility

```typescript
describe('merge', () => {
  it('should use last-write-wins for conflicting changes', () => {
    // Test implementation
  });

  it('should handle missing optional properties', () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

## Data Model Principles

When working with the data model, remember:

1. **Only Required Fields**: `uuid`, `plot`, `grid`, `last_modified`, `modified_by`
2. **All Grave Details Optional**: Name, dates, inscription, notes can be undefined
3. **Soft Deletes**: Use `deleted: true`, never hard delete
4. **Change Tracking**: Every modification needs a change log entry
5. **Timestamps**: Always ISO8601 format
6. **Validation**: All imported data must validate against the schema

## Common Tasks

### Adding a New Field to Graves

1. Update `src/types/cemetery.ts`
2. Update `schema/cemetery.schema.json`
3. Update validation in `src/lib/validator.ts`
4. Update UI components (GraveEditor, GraveList, etc.)
5. Add tests
6. Update documentation

### Adding a New Component

1. Create file in `src/components/`
2. Use TypeScript with proper types
3. Follow React best practices
4. Add necessary tests
5. Update related components

### Fixing a Bug

1. Write a failing test that demonstrates the bug
2. Fix the bug
3. Ensure the test passes
4. Check for similar issues elsewhere

## Documentation

- Update relevant docs in `/docs/` when changing features
- Add inline comments for complex logic
- Update README if adding major features
- Update `IMPLEMENTATION.md` for completed features

## Pull Requests

1. **Ensure All Checks Pass**
   - Pre-commit hooks should catch most issues
   - CI/CD will run additional checks

2. **Update Documentation**
   - Add/update relevant documentation
   - Include screenshots for UI changes

3. **Write Clear PR Description**
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
   - Any breaking changes?

4. **Link Related Issues**
   - Reference issue numbers: "Fixes #123"

## Project Structure

```text
src/
├── components/     # React components
├── lib/           # Utilities and business logic
├── pages/         # Page components
├── types/         # TypeScript type definitions
└── assets/        # Static assets

docs/              # Documentation
schema/            # JSON Schema definitions
samples/           # Sample data files
```

## Need Help?

- Check [docs/PRE_COMMIT_SETUP.md](docs/PRE_COMMIT_SETUP.md) for git hooks
- Review [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed guidelines
- Check existing issues on GitHub
- Read the [README.md](README.md) for project overview

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Welcome newcomers
- Help others learn

Thank you for contributing to StoneByStone! 🪨
