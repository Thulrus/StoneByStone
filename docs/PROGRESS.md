# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

**Start WP5** (M2, issues #28–#32: stones layer, schematic view, offline tiles, grid pinning,
plat overlay). It's a _fast_ package and it ends M2, so finish with a check-in: mark WP6
`blocked: check-in`.

iPhone testing is now an optional M8 nice-to-have (**#80**) because the owner has no iPhone.
Don't block on it, and don't plan check-ins around it. CI's WebKit run stands in for iOS Safari.

Notes for WP5+:

- **Map** (`src/features/map/`): `LazyMap` is the only entry point; never import `MapView`
  or `maplibre-gl` elsewhere. Layer components use `useMap()` → `{ map, lib }` (the MapLibre
  module comes through context). Building blocks in `layers.tsx`: `GeoJsonLayer` (fill/line/
  circle paint), `Pin` (HTML marker, draggable, label), `MapTap`. Paint constants go in
  `map-style.ts` (the lingui lint rule flags colour strings in `.tsx`). No glyphs are loaded
  (offline), so text labels are HTML markers, not symbol layers.
- `CemeteryMap` composes imagery, boundary, `RowsLayer`, `MapToolbar` (imagery picker,
  rows horizontal) and `RowDrawer`. Add the stones layer (#28) there.
- MapLibre 6 needs `setWorkerUrl` (done in `MapView.tsx`) and its CSS beats Tailwind's layered
  utilities (`.maplibregl-map { position: relative }`): style the container inline.
- **Imagery** (`imagery.ts`): `PRESETS`, `resolveProvider`, `ImageryProvider.allowsOffline`.
  Only USGS and user-flagged custom sources may be downloaded for offline (#30); OSM and Esri
  must not. Keys and custom sources are device settings (`imagery-settings.ts`), never
  exported. The map chunk and worker (`.mjs`) are precached by Workbox.
- **Geo** (`src/geo/`): `localProjection`, `distanceM`, `bearingDeg`, `projectOntoLine`,
  `pointAlong`, `lineLength`, `fitAffine` / `fitSimilarity` (with residuals), `invertAffine`,
  `bboxOf`, `pointInPolygon`, `rowsHorizontalBearing`. Use `fitAffine` in a local metric
  frame for plat overlays (#32) and legacy-grid pinning (#31).
- **Layout** (`data/layout.ts`): `listSections`, `listRows`, `addRows`, `moveRow`, etc.;
  `useLayout(cemeteryId)` in `features/cemeteries/` gives sections, ordered rows, per-row stone
  counts and `labelOf`. Row labels: `nextLabel` / `labelSeries` in `domain/labels.ts`.
- `CemeteryPage` has Map / Setup tabs (`role="tab"`); add Survey etc. there later.
- `createCemetery(store, name, place?)` takes location/boundary/country/adminAreas/externalIds.
  OSM lookups live in `features/cemeteries/create/` (`osm.ts` pure, `osm-client.ts` network).
- `scripts/check-bundle.mjs` runs in CI after build: shell ≤ 250 KB gzip (now ~177 KB) and no
  MapLibre in it.
- e2e map tests stub tile hosts with `page.route` and must wait for the attribution text and
  scroll the canvas into view before tapping (see `tests/e2e/setup.spec.ts`).
- Still true: `renderWithStore` / `testStore` for component tests (mock `../../map/LazyMap`
  in jsdom: no WebGL); Lingui `t` only from `useLingui()` in scope; data tests storing Blobs
  need `// @vitest-environment node`; locally run Playwright with
  `--project=desktop-chromium --project=mobile-chromium` (WebKit fails to launch here).

## Work packages

Status values: `todo` · `in-progress` · `done` · `blocked: check-in`

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ------ |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done   |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | done   |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | done   |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | done   |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | done   |
| WP5   | M2        | #28–#32 | Stones layer, schematic view, offline tiles, grid pinning, plat overlay                 | fast   | todo   |
| WP6   | M3        | #33–#35 | Photo pipeline, camera, walk-a-row                                                      | deep   | todo   |
| WP7   | M3        | #36–#42 | Row controls, GPS averaging, chips, relative placement, polish, checklist, stone detail | fast   | todo   |
| —     | M3        | #43     | **Field trial #1** (owner)                                                              | —      | todo   |
| WP8   | M4        | #44–#47 | Queue, photo enhancement, keyboard form, multiple people                                | fast   | todo   |
| WP9   | M4        | #48–#51 | FuzzyDate UI, autocomplete, symbols/military, verify pass                               | fast   | todo   |
| —     | M4        | #52     | **Field trial #2** (owner)                                                              | —      | todo   |
| WP10  | M5        | #53–#56 | Progress, people search, CSV import, match view                                         | deep   | todo   |
| WP11  | M5        | #57–#60 | Duplicates, exports, booklet, EXIF import                                               | fast   | todo   |
| WP12  | M6        | #61–#64 | Packets, merge wizard, entity matching, cemetery aliasing                               | deep   | todo   |
| WP13  | M6        | #65–#67 | Alignment, Web Share, merge e2e                                                         | deep   | todo   |
| WP14  | M7        | #68–#72 | Privacy, publish bundle, viewer, deep links, navigation                                 | fast   | todo   |
| —     | M7        | #73     | Code license decision (owner)                                                           | —      | todo   |
| WP15+ | M8        | #74–#79 | One issue per session, any order                                                        | varies | todo   |

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
- 2026-11-25 · WP4 · Geo module (#23), lazy MapLibre wrapper with rotation (#24), imagery presets + custom XYZ/WMS with terms checked into §24 and the non-US default resolved (#25), create by search / near me with OSM boundary / pin (#26), sections and rows with drawn row lines (#27). 670 tests + Chromium e2e green; setup e2e runs in ~5 s.
- 2026-11-25 · housekeeping · Owner saw the update banner in the installed Android app after a deploy; closed #4. M0 has no open owner items.
