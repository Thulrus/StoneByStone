# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

**Start WP4** (M2, issues #23–#27: geo module, map, imagery, create cemetery, sections/rows).
It's a _deep_ package. The owner passed the M1 check-in on 2026-11-25.

One M0 issue stays open for the owner. Don't work on it:

- **#4** Still unverified: the update banner appearing after a later deploy. This can be checked
  on Android or desktop.

iPhone testing is now an optional M8 nice-to-have (**#80**) because the owner has no iPhone.
Don't block on it, and don't plan check-ins around it. CI's WebKit run stands in for iOS Safari.

Notes for WP4+ (data layer is in `src/data/`, see also WP2 notes in git history of this file):

- `useStore()` gives the `Store` below `<StoreGate>`. Use repos (`store.monuments` etc.) and
  `useLiveQuery`. `store.undo()` / `store.group()` as before.
- New in WP3: `data/cemeteries.ts` (`createCemetery`, `listCemeteries`, `cemeteryProgress`),
  `data/settings.ts` (device settings, `currentContributor`, `updateContributor`,
  `getCemeteryDefaults`), `data/backup.ts` (backup marks, `unbackedStones`, reminders),
  `data/usage.ts` (per-cemetery bytes). Link to a cemetery with `cemeteryPath(id)` from
  `app/paths.ts`. `CemeteryPage` is still a placeholder showing the name; M2 replaces it.
- `features/share/backup.ts` has `prepareBackup` / `finishBackup` / `deliverFiles`; reuse
  `deliverFiles` for packets (M6). It is lazy-loaded; keep heavy format code out of the shell
  (main chunk is ~167 KB gzip against the 250 KB budget).
- Backup reminders run on app start only. A reminder at the end of a walk-a-row session is
  part of WP6 (#35): call `backupStatus` + `reminderDue` there.
- Component tests: `renderWithStore(ui, store?)` and `testStore()` in `src/test/render.tsx`.
  Lingui's `t` macro only works on a `t` from `useLingui()` in scope (or `@lingui/core/macro`);
  passing `t` into a helper function yields empty strings.
- Data tests need `// @vitest-environment node` when they store Blobs.
- Locally, Playwright's WebKit fails to launch on this machine; run
  `--project=desktop-chromium --project=mobile-chromium`. CI runs WebKit.

## Work packages

Status values: `todo` · `in-progress` · `done` · `blocked: check-in`

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status           |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ---------------- |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done (owner: #4) |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | done             |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | done             |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | done             |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | in-progress      |
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
- 2026-11-25 · WP3 · Contributor name prompt + Settings (#20), Home with progress rings, create/import/delete+undo (#21), backup indicator/reminder, one-tap backup, persist(), storage dashboard (#22). Import/export lazy-loaded. 595 tests + Chromium e2e green. M1 complete; WP4 blocked on check-in.
- 2026-11-25 · WP3 check-in · Owner passed the M1 checks on Android (Home, import, backup, Settings) and unblocked M2.
