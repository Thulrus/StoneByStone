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

npm install
npm run dev
npm run build
npm test

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
