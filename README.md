# StoneByStone - Cemetery Data Management

A modern, offline-first cemetery documentation web application.

## Features

- Interactive Grid Map with zoom/pan
- Full CRUD operations
- Flexible data model - all grave fields optional except plot and grid
- Smart merge with conflict resolution
- Complete change tracking
- Search functionality
- Offline PWA with IndexedDB
- JSON Schema validation

## Quick Start

### First-Time Setup

```bash
# Clone the repository
git clone <repository-url>
cd StoneByStone

# Run the setup script (installs dependencies and git hooks)
./setup.sh
```

Or manually:

```bash
npm install
npm run dev
```

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm test         # Run tests
npm run lint     # Lint code
npm run format   # Format code
```

### Pre-commit Hooks

This project uses Husky and lint-staged to ensure code quality. Before each commit:

- ESLint and Prettier run on staged files
- TypeScript type checking runs
- Tests run

See [docs/PRE_COMMIT_SETUP.md](docs/PRE_COMMIT_SETUP.md) for details.

## Import Sample Data

Import `samples/example.cem.json` via the Import/Export page.
Or try `samples/minimal-example.cem.json` for a minimal data example.

## Data Format

Graves can have minimal or complete information:

- **Required:** plot, grid position, last_modified, modified_by
- **Optional:** name, birth, death, inscription, notes

See `schema/cemetery.schema.json` for the complete specification.

## Technology

React 18, TypeScript, Vite, Tailwind CSS, IndexedDB, AJV

## License

MIT
