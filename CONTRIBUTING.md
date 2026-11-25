# Contributing to StoneByStone

## Setup

Requires Node 22 (see `.nvmrc`).

```sh
npm install
npx playwright install chromium webkit   # for e2e; WebKit may need `npx playwright install-deps`
npm run dev                              # http://localhost:5173/StoneByStone/
```

## Scripts

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                 |
| `npm run build`        | Production build with service worker, into `dist/`              |
| `npm run preview`      | Serve `dist/`                                                   |
| `npm run lint`         | ESLint (includes the Lingui "no unlocalized strings" rule)      |
| `npm run typecheck`    | TypeScript project build, no emit                               |
| `npm test`             | Vitest unit and component tests                                 |
| `npm run e2e`          | Playwright: desktop Chromium, Pixel (Chromium), iPhone (WebKit) |
| `npm run i18n:extract` | Update `src/i18n/locales/*/messages.po` from the source         |

The pre-commit hook runs lint-staged only (ESLint and Prettier on staged files). CI runs lint,
typecheck, unit tests, format check, and e2e on every push and PR, and deploys `master` to
GitHub Pages only when they all pass.

## Architecture

The layout and rules are in [docs/OVERHAUL_PLAN.md §23](docs/OVERHAUL_PLAN.md#23-architecture-and-tech-stack).
In short:

- `src/domain/` is pure TypeScript: no React, no Dexie, no imports from `data/`, `features/`,
  `ui/` or `app/`. ESLint enforces this.
- Features reach storage only through the repositories in `src/data/`.
- Keep component files under about 300 lines.
- Routing is hash-based. The Vite `base` is `/StoneByStone/`. The IndexedDB name is
  `stonebystone`.

## UI conventions

- Every user-visible string goes through Lingui (`<Trans>` or `` t`...` `` from
  `@lingui/react/macro`). Run `npm run i18n:extract` after adding strings.
- Use logical CSS properties (`ms-`, `pe-`, `start-`, ...) so layouts work right-to-left.
- Interactive targets are at least 48 px (`min-h-12`). Never use color as the only signal.
- Colors come from the theme tokens in `src/ui/theme.css` (`bg-surface`, `text-fg-muted`, ...).
  `src/ui/theme.test.ts` checks WCAG AA contrast for every theme, so add new token pairs there.

## Commits

Conventional-style messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), with `Closes #N`
when a commit finishes an issue.
