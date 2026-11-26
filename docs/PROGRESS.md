# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

Start **WP1** (M1, issues #10–#14). It is a _deep_ package, so use the strongest model. M0 is
finished and the owner has unblocked M1. Work goes in `src/domain/`, which is pure TS (ESLint
enforces the import rule).

Two M0 issues stay open for the owner. Don't work on them:

- **#9** Device check: Android (Chrome) passed on 2026-11-25 (install, offline refresh,
  relaunch). The iPhone (Safari) check is still to do.
- **#4** Still unverified: iOS Safari install, and the update banner appearing after a later
  deploy.

Notes from WP0:

- Tests: `npm test` (Vitest, dot reporter). Put `*.test.ts` next to the code. Test-only types
  (node, vitest globals) live in `tsconfig.test.json`; `tsconfig.app.json` excludes tests.
  `fast-check` (plan §25) is not installed yet, so add it when the merge property tests need it.
- Local WebKit e2e needs `sudo npx playwright install-deps` (libmanette). CI runs it fine.
- Lingui 6 uses the Vite plugin with `macroTransform: true` (no Babel, no compile step).
  Run `npm run i18n:extract` after adding UI strings. The `lingui/no-unlocalized-strings`
  lint rule covers `src/app` and `src/features`.
- UI prefs (theme, locale) live in localStorage through Zustand (`src/app/prefs.ts`), not in
  IndexedDB. Contributor settings in WP3 belong in Dexie.

## Work packages

Status values: `todo` · `in-progress` · `done` · `blocked: check-in`

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status                   |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ------------------------ |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done (owner: #9, #4 iOS) |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | todo                     |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | todo                     |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | todo                     |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | todo                     |
| WP5   | M2        | #28–#32 | Stones layer, schematic view, offline tiles, grid pinning, plat overlay                 | fast   | todo                     |
| WP6   | M3        | #33–#35 | Photo pipeline, camera, walk-a-row                                                      | deep   | todo                     |
| WP7   | M3        | #36–#42 | Row controls, GPS averaging, chips, relative placement, polish, checklist, stone detail | fast   | todo                     |
| —     | M3        | #43     | **Field trial #1** (owner)                                                              | —      | todo                     |
| WP8   | M4        | #44–#47 | Queue, photo enhancement, keyboard form, multiple people                                | fast   | todo                     |
| WP9   | M4        | #48–#51 | FuzzyDate UI, autocomplete, symbols/military, verify pass                               | fast   | todo                     |
| —     | M4        | #52     | **Field trial #2** (owner)                                                              | —      | todo                     |
| WP10  | M5        | #53–#56 | Progress, people search, CSV import, match view                                         | deep   | todo                     |
| WP11  | M5        | #57–#60 | Duplicates, exports, booklet, EXIF import                                               | fast   | todo                     |
| WP12  | M6        | #61–#64 | Packets, merge wizard, entity matching, cemetery aliasing                               | deep   | todo                     |
| WP13  | M6        | #65–#67 | Alignment, Web Share, merge e2e                                                         | deep   | todo                     |
| WP14  | M7        | #68–#72 | Privacy, publish bundle, viewer, deep links, navigation                                 | fast   | todo                     |
| —     | M7        | #73     | Code license decision (owner)                                                           | —      | todo                     |
| WP15+ | M8        | #74–#79 | One issue per session, any order                                                        | varies | todo                     |

Packages that end a milestone (WP0, WP3, WP5, WP9, WP11, WP13, WP14) finish with a check-in
before the next package starts.

## Session log

One line per session: date · WP · what was done · what's left (if anything).

- 2026-11-25 · setup · Plan finalized, 79 issues and 9 milestones created, `v1-final` tagged, handoff protocol written.
- 2026-11-25 · WP0 · Removed v1 (#1). Added the scaffold, shell, PWA, themes and primitives, Lingui, Vitest/Playwright, and CI with gated deploy (#2, #3, #5–#8). Live on Pages, CI green. Left for the owner: device check #9, then close #4.
- 2026-11-25 · WP0 check-in · Owner passed the Android device check (install, offline, relaunch) and unblocked M1. iOS check (#9) and update-banner check (#4) remain with the owner.
