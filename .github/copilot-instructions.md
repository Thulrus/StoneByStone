# GitHub Copilot Instructions for StoneByStone

## Project Overview

StoneByStone is an offline-first, Progressive Web App (PWA) for cemetery documentation and data management. It's built with React 18, TypeScript, and Vite, featuring an interactive grid-based map, flexible data model, and robust merge capabilities with conflict resolution.

## Core Principles

1. **Offline-First**: All data persists in IndexedDB; the app must work completely offline
2. **Data Flexibility**: Only plot, grid position, and metadata are required; all grave details are optional
3. **Change Tracking**: Every modification creates a change log entry with timestamp and user
4. **Schema Validation**: All imported data must validate against `schema/cemetery.schema.json`
5. **Last-Write-Wins**: Merge conflicts resolve using the most recent `last_modified` timestamp

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS v3
- **Build**: Vite 5
- **Storage**: IndexedDB via `idb` library
- **Validation**: AJV (JSON Schema validator)
- **Testing**: Jest with React Testing Library
- **Deployment**: GitHub Pages

## Code Style Guidelines

### TypeScript

- Use strict mode; avoid `any` types
- Prefer interfaces for object shapes
- Use type aliases for unions and primitives
- All functions should have explicit return types
- Use optional chaining (`?.`) for potentially undefined properties

### React

- Use functional components with hooks
- Prefer named exports over default exports (except for page components)
- Keep components focused and single-purpose
- Use proper dependency arrays in `useEffect`
- Handle loading and error states explicitly

### Naming Conventions

- Files: PascalCase for components, camelCase for utilities
- Components: PascalCase (e.g., `GraveEditor.tsx`)
- Utilities: camelCase (e.g., `uuid.ts`, `merge.ts`)
- Types: PascalCase interfaces (e.g., `Cemetery`, `Grave`)
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE

### CSS/Tailwind

- Use Tailwind utility classes; avoid custom CSS when possible
- Support dark mode with `dark:` variants
- Mobile-first responsive design
- Use semantic color names from the theme

## Data Model

### Key Types (see `src/types/cemetery.ts`)

```typescript
Cemetery {
  id: string
  name: string
  grid: { rows: number, cols: number, cellSize?: number }
  last_modified: string  // ISO8601
  modified_by: string
  license?: string
}

Grave {
  uuid: string           // UUID v4
  plot: string          // Any format (e.g., "A-1", "Section B")
  grid: { row: number, col: number }
  geometry?: GeoPoint   // Optional GPS coordinates
  properties: {
    name?: string
    birth?: string      // YYYY-MM-DD or empty
    death?: string      // YYYY-MM-DD or empty
    inscription?: string
    notes?: string
    deleted?: boolean   // Soft delete flag
    last_modified: string
    modified_by: string
  }
}

ChangeLogEntry {
  id: string           // Auto-increment
  timestamp: string
  grave_uuid: string
  operation: 'set' | 'delete'
  user_id: string
  before: object
  after: object
}
```

### Important Rules

- **Required fields**: `uuid`, `plot`, `grid`, `last_modified`, `modified_by`
- **Optional fields**: ALL grave properties (name, dates, inscription, notes)
- **Soft Deletes**: Use `deleted: true` in properties, never hard delete
- **Timestamps**: Always ISO8601 format (use `new Date().toISOString()`)
- **UUIDs**: Generate with `crypto.randomUUID()` or `uuid` library

## IndexedDB Structure

Three object stores (see `src/lib/idb.ts`):

1. **cemetery**: Single entry for cemetery metadata
2. **graves**: Keyed by `uuid`, indexed by `plot`
3. **change_log**: Auto-incrementing, indexed by `grave_uuid` and `timestamp`

### Database Functions

- `initDB()`: Initialize database
- `saveCemetery()`, `getCemetery()`: Cemetery CRUD
- `saveGrave()`, `getGrave()`, `getAllGraves()`, `deleteGrave()`: Grave CRUD
- `addChangeLog()`, `getChangeLogForGrave()`: Change tracking

Always use these functions; never access IndexedDB directly.

## File Handling

### Import (see `src/lib/file.ts` and `src/lib/validator.ts`)

1. Parse JSON
2. Validate against schema with AJV
3. Check for merge conflicts
4. If conflicts → show `MergeConflictModal`
5. If no conflicts or resolved → save to IndexedDB
6. Update change log

### Export

- Export complete cemetery data as `.cem.json`
- Pretty-print with 2-space indentation
- Include all non-deleted graves
- Include cemetery metadata

### Merge Logic (see `src/lib/merge.ts`)

- Compare `last_modified` timestamps
- Newer timestamp wins (last-write-wins)
- Track conflicts for manual resolution
- Support property-level merging

## Component Architecture

### Pages

- `Home.tsx`: Landing page with stats
- `CemeteryView.tsx`: Main cemetery view with map and grave list
- `ImportExport.tsx`: File import/export interface

### Components

- `MapGrid.tsx`: Interactive SVG grid with zoom/pan
- `GraveList.tsx`: Searchable list of graves
- `GraveEditor.tsx`: Form for creating/editing graves
- `MergeConflictModal.tsx`: Conflict resolution UI

### Utilities

- `file.ts`: Import/export functions
- `idb.ts`: IndexedDB wrapper
- `merge.ts`: Merge algorithm with tests
- `validator.ts`: JSON Schema validation
- `user.ts`: User identifier management
- `uuid.ts`: UUID generation

## Testing

- Use Jest with `@testing-library/react`
- Test files: `*.test.ts` or `*.test.tsx`
- Focus on merge logic, validators, and critical paths
- Mock IndexedDB operations
- Run tests with `npm test`

### Test Commands

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:coverage # Coverage report (when configured)
```

## Common Patterns

### Adding a New Grave

```typescript
const grave: Grave = {
  uuid: crypto.randomUUID(),
  plot: plotInput,
  grid: { row: rowNum, col: colNum },
  properties: {
    name: nameInput || undefined, // Optional fields
    birth: birthInput || undefined,
    death: deathInput || undefined,
    last_modified: new Date().toISOString(),
    modified_by: getUserId(),
  },
};
await saveGrave(grave);
await addChangeLog('set', grave.uuid, getUserId(), null, grave);
```

### Displaying Optional Data

```typescript
// Show placeholder for missing data
<span>{grave.properties.name || <em>No name</em>}</span>
<span>{grave.properties.birth || '?'} - {grave.properties.death || '?'}</span>
```

### Handling Soft Deletes

```typescript
// Mark as deleted
grave.properties.deleted = true;
grave.properties.last_modified = new Date().toISOString();
await saveGrave(grave);

// Filter out deleted graves in queries
const activeGraves = allGraves.filter((g) => !g.properties.deleted);
```

## PWA & Deployment

- Service worker in `public/service-worker.js`
- Manifest in `public/manifest.json`
- Deploy to GitHub Pages: `npm run deploy`
- Base URL configured in `vite.config.ts` for GH Pages

## When Making Changes

### Before Modifying Data Model

1. Update TypeScript types in `src/types/cemetery.ts`
2. Update JSON Schema in `schema/cemetery.schema.json`
3. Update validation logic in `src/lib/validator.ts`
4. Update tests

### Before Adding Features

1. Check if it affects merge logic → update `merge.ts` and tests
2. Consider IndexedDB schema changes (may need version bump)
3. Check if PWA assets need updating
4. Consider offline behavior

### Before Committing

Pre-commit hooks automatically run these checks (via Husky + lint-staged):

1. ESLint with auto-fix on staged files
2. Prettier formatting on staged files
3. TypeScript type checking
4. Full test suite

You can also run manually:

- `npm run lint` - Check for linting errors
- `npm run format` - Format all files
- `npm test` - Run all tests
- `npm run build` - Type check and build
- Test in browser (especially IndexedDB operations)

**Note**: Pre-commit hooks will prevent commits if checks fail. See `docs/PRE_COMMIT_SETUP.md` for details.

## Common Pitfalls to Avoid

1. **Don't hard delete graves** - Always use `deleted: true` flag
2. **Don't skip change log entries** - Every modification needs a log
3. **Don't assume optional fields exist** - Always check or use optional chaining
4. **Don't use `any` type** - Be explicit with types
5. **Don't forget timestamps** - All changes need `last_modified` updates
6. **Don't bypass validation** - Always validate imported data
7. **Don't ignore merge conflicts** - Present conflicts to user
8. **Don't break offline functionality** - No network-dependent features

## Helpful Resources

- Project docs in `/docs/` folder
- Sample data in `/samples/` folder
- JSON Schema spec in `/schema/cemetery.schema.json`
- Implementation status in `IMPLEMENTATION.md`
- TODO items in `TODO.md`

## Questions to Ask

When uncertain about a change, consider:

- Does this work offline?
- Will this handle missing/optional data gracefully?
- Does this affect the merge algorithm?
- Is validation still correct?
- Are change logs properly tracked?
- Is the IndexedDB schema impacted?
- Does this maintain backward compatibility?
