# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

Start **WP3** (M1, issues #20–#22: contributor/settings, Home, data safety). It's a _fast_
package and the last one in M1, so mark WP4 `blocked: check-in` when it's finished.
WP2 (the data layer) is done.

One M0 issue stays open for the owner. Don't work on it:

- **#4** Still unverified: the update banner appearing after a later deploy. This can be checked
  on Android or desktop.

iPhone testing is now an optional M8 nice-to-have (**#80**) because the owner has no iPhone.
Don't block on it, and don't plan check-ins around it. CI's WebKit run stands in for iOS Safari.

Notes from WP2 (`src/data/`):

- `useStore()` (`src/app/store-context.ts`) gives the `Store` below `<StoreGate>`, which wraps
  the router in `App.tsx`. Features use `store.monuments`, `store.persons`, and the other repos
  (`create` / `update(id, patch)` / `delete` / `get` / `resolve` / `listByCemetery`). In a
  patch, a key set to `undefined` clears that field. Don't write to Dexie tables directly.
- Use `useLiveQuery` with the repos' read methods for reactive UI.
- `store.undo()` undoes the last operation. `store.undoStack.subscribe()` drives an Undo
  button. `store.group(label, 'import' | 'merge', fn)` makes any multi-record change one undo
  step.
- First run creates a contributor with `displayName: ''` and saves its id in settings
  (`contributorId`). WP3's contributor screen should rename it with `store.putContributor()`.
- Settings keys: `nodeId`, `clock`, `contributorId`, `lastSeen`, `schemaVersion`. Put new
  device-level settings in the same table.
- Backups: `collectArchive(store, cemeteryId)` → `writeSbs(archive, binaries)` returns a
  `Blob`. `importFile(store, blob)` handles `.sbs`, `.sbs.json`, and v1. Errors are
  `FormatError` with readable `problems[]`.
- Data tests need `// @vitest-environment node`, because fake-indexeddb can't clone jsdom
  Blobs. The polyfill is loaded in `src/test/setup.ts`. `src/data/test/helpers.ts` has
  `freshStore()` (with a controllable clock) and `dump()`.
- Locally, Playwright's WebKit fails to launch (`browserType.launch`) on this machine. That's
  an environment problem; Chromium passes, and CI runs WebKit.

## Work packages

Status values: `todo` · `in-progress` · `done` · `blocked: check-in`

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status           |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ---------------- |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done (owner: #4) |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | done             |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | in-progress      |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | todo             |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | todo             |
| WP5   | M2        | #28–#32 | Stones layer, schematic view, offline tiles, grid pinning, plat overlay                 | fast   | todo             |
| WP6   | M3        | #33–#35 | Photo pipeline, camera, walk-a-row                                                      | deep   | todo             |
| WP7   | M3        | #36–#42 | Row controls, GPS averaging, chips, relative placement, polish, checklist, stone detail | fast   | todo             |
| —     | M3        | #43     | **Field trial #1** (owner)                                                              | —      | todo             |
| WP8   | M4        | #44–#47 | Queue, photo enhancement, keyboard form, multiple people                                | fast   | todo             |
| WP9   | M4        | #48–#51 | FuzzyDate UI, autocomplete, symbols/military, verify pass                               | fast   | todo             |
| —     | M4        | #52     | **Field trial #2** (owner)                                                              | —      | todo             |
| WP10  | M5        | #53–#56 | Progress, people search, CSV import, match view                                         | deep   | todo             |
| WP11  | M5        | #57–#60 | Duplicates, exports, booklet, EXIF import                                               | fast   | todo             |
| WP12  | M6        | #61–#64 | Packets, merge wizard, entity matching, cemetery aliasing                               | deep   | todo             |
| WP13  | M6        | #65–#67 | Alignment, Web Share, merge e2e                                                         | deep   | todo             |
| WP14  | M7        | #68–#72 | Privacy, publish bundle, viewer, deep links, navigation                                 | fast   | todo             |
| —     | M7        | #73     | Code license decision (owner)                                                           | —      | todo             |
| WP15+ | M8        | #74–#79 | One issue per session, any order                                                        | varies | todo             |

Packages that end a milestone (WP0, WP3, WP5, WP9, WP11, WP13, WP14) finish with a check-in
before the next package starts.

## Session log

One line per session: date · WP · what was done · what's left (if anything).

- 2026-11-25 · setup · Plan finalized, 79 issues and 9 milestones created, `v1-final` tagged, handoff protocol written.
- 2026-11-25 · WP0 · Removed v1 (#1). Added the scaffold, shell, PWA, themes and primitives, Lingui, Vitest/Playwright, and CI with gated deploy (#2, #3, #5–#8). Live on Pages, CI green. Left for the owner: device check #9, then close #4.
- 2026-11-25 · WP0 check-in · Owner passed the Android device check (install, offline, relaunch) and unblocked M1. iOS check (#9) and update-banner check (#4) remain with the owner.
- 2026-11-25 · WP1 · Domain types + UUIDv7 (#10), HLC (#11), FuzzyDate parser/formatter/age (#12, 230+ table cases), name parser + Soundex/D–M (#13), field-stamp merge with fast-check properties (#14). 531 tests green.
- 2026-11-25 · housekeeping · Owner has no iPhone: closed #9 (Android passed), moved all iOS checks to optional #80 (M8), and left #4 open only for the update-banner check.
- 2026-11-25 · WP2 · Dexie schema + stamped repositories + newer-schema refusal (#15), history coalescing + undo (#16), v2 JSON Schemas + Ajv + FORMAT.md (#17), `.sbs`/`.sbs.json` read/write with streamed fflate (#18), idempotent v1 importer (#19). 575 tests green.
