# StoneByStone

A modern, offline-first cemetery data management web application built with React, TypeScript, and Vite.

## Features

- **Offline-first PWA**: Works without internet connection using IndexedDB for local storage
- **Type-safe**: Built with TypeScript for robust code
- **Modern UI**: Styled with Tailwind CSS, responsive design
- **Data validation**: JSON Schema validation with Ajv
- **Import/Export**: Backup and restore cemetery data as JSON files
- **Change tracking**: Audit log for all data modifications
- **CI/CD**: Automated deployment to GitHub Pages

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State & Persistence**: IndexedDB (via `idb`)
- **Utilities**: UUID, date-fns, Ajv
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier
- **Deployment**: GitHub Pages

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will open at `http://localhost:3000`.

### Building

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Testing

Run tests:

```bash
npm run test
```

### Linting & Formatting

Lint code:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

## Deployment to GitHub Pages

This project is configured for automatic deployment via GitHub Actions.

### Setup

1. Push your code to the `main` branch
2. Go to your GitHub repository settings
3. Navigate to **Settings → Pages**
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically build and deploy on every push to `main`

### Manual Deployment

To deploy manually using the `gh-pages` package:

```bash
npm run build
npm run deploy
```

**Note**: Update the `base` field in `vite.config.ts` to match your repository name:

```typescript
base: '/YourRepoName/',
```

Also update the `basename` in `src/main.tsx`:

```typescript
<BrowserRouter basename="/YourRepoName">
```

## Project Structure

```
├── public/              # Static assets
│   ├── manifest.json    # PWA manifest
│   ├── service-worker.js # Service worker for offline support
│   └── robots.txt
├── schema/              # JSON Schema definitions
│   └── cemetery.schema.json
├── src/
│   ├── assets/          # Images, icons
│   ├── lib/             # Utility libraries
│   │   ├── idb.ts       # IndexedDB wrapper
│   │   ├── file.ts      # File I/O helpers
│   │   └── uuid.ts      # UUID utilities
│   ├── pages/           # Route components
│   │   ├── Home.tsx
│   │   └── ImportExport.tsx
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
├── .github/workflows/   # CI/CD configuration
└── package.json         # Dependencies and scripts
```

## Environment Configuration

This is a static site with no backend. All data is stored locally in IndexedDB.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Future Enhancements

- Detailed grave management UI
- Photo uploads and attachments
- GPS coordinates and mapping
- Multi-cemetery support
- Data synchronization between devices
- Advanced search and filtering
