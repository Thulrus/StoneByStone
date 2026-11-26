# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

**WP7 (M3: row controls, GPS averaging, chips, relative placement, polish, checklist, stone
detail) is `todo`.** Start with #36. WP6 is done; its device checks (below) can be tried any
time before field trial #1 (#43).

Owner device checks still open (Android, installed app):

- **#33:** a photo is ready (stone appears, "Stone N saved") within about 1 s of the shutter.
- **#34:** the in-app camera opens and shoots in the installed app; "Phone camera" switches to
  the system camera app and back.
- **#32 (from M2):** plat overlay on the phone (Setup → "Add a plat map or drone image").

Notes for WP7+:

- **Walk-a-row:** `geo/row-layout.ts` (`layoutRow`, `isotonic`, `effectiveRowLine`) is pure.
  `data/walk.ts` has `captureStone` (stone + photo + re-space, one undo step), `relayoutRow`
  (joins the current operation), `endRowHere`, and `get/setRowStart` (device setting
  `walk:start:<rowId>`). A stone's GPS fix is its first photo's `position`. Gaps are missing
  `rowIndex` values. #36 can add Gap as "skip an index", and Insert/Reverse/Reorder as
  `rowIndex` rewrites followed by `relayoutRow`, all in one `store.run`. Only `row-interpolated`
  (or missing) positions are rewritten.
- **Capture UI:** `features/capture/` has `Camera` (generic full-screen camera with roles,
  `actions` slot, `lastPhoto`, phone-camera fallback via the `systemCamera` pref),
  `walk/useWalkCapture` (a serial queue: shutter order = stone order; `generation` detaches a
  pending stone on Next stone), `WalkCamera`, `WalkPanel` (under the map via the `tool` slot,
  above the diagram), and `WalkStart`. `CemeteryTabs` holds the walk state. Toasts cover the
  shutter on phones, so the camera shows its own "Stone N saved · Undo". Keep #40's capture
  feedback in the camera too.
- **Photos:** `features/capture/pipeline.ts` (runs in `photo.worker.ts` via `process.ts`),
  `data/photos.ts` (`preparePhoto` outside a transaction, then `writePhoto` inside one, or
  `addPhoto`). `useSavePhoto` adds a photo to an existing stone (StoneSheet → Add photo).
  `PhotoStrip`/`BlobImage` show thumbnails.
- **Binary rows store bytes** (`data/blobs.ts`: `toBlobRow`, `rowBlob`, `rowSize`), so
  WebKit e2e can store photos. The overlay e2e is still skipped on WebKit, but now because a
  tap in the pin workspace times out there (not investigated).
- `quickFix()` (`features/capture/gps.ts`) is one fresh fix (`maximumAge: 0`). #37's
  averaging should build on it. Never use `watchPosition`.
- In e2e, the camera's fallback input is `getByTestId('camera-file')` after tapping
  "Phone camera". Mocked GPS: `test.use({ geolocation, permissions: ['geolocation'] })` and
  `context.setGeolocation` before each shot.

Older notes (WP6 and earlier):

- **Cemetery screen:** `app/pages/CemeteryPage.tsx` only loads data; the tabs live in
  `features/cemeteries/CemeteryTabs.tsx` (Map / Diagram / Setup + the shared `StoneSheet`), and
  `MapTab.tsx` swaps `CemeteryMap` for a pinning workspace. `CemeteryMap` takes a
  `tool={{ map, panel }}` slot for modal map sessions (pinning uses it; walk-a-row can too).
  The initial tab is Setup if empty, Map if anything has coordinates, else Diagram.
- **Stones:** `features/stones/` holds `status-style.ts` (colour + SVG path per status, shared
  by map icons and the diagram), `StatusIcon`, `StatusLegend`, `StoneSheet` (summary only; full
  stone detail is #42), `useStones`. `StonesLayer` is one GeoJSON source + symbol layer; icons
  are canvas-drawn (`stone-icons.ts`). New stones only need `position` to appear.
- **Diagram:** `features/schematic/` (`groupStones` orders by `rowIndex` with gap slots;
  `LegacyGridView` shows unpinned v1 grids). Walk-a-row should render there too (plan §7.5).
- **Overlays:** `geo/pin.ts` `fitPins` (y-down source → lng/lat; 2 pts similarity, 3+ affine,
  residuals in m), `geo/cells.ts` (cell unions). Data: `data/legacy-grid.ts`
  (`pinLegacyGrid`, `gridRowsToRows`), `data/overlays.ts`. UI: `features/overlays/`
  (`usePins`, `PinPanel`, `PinMapLayer`, grid/image pickers and workspaces, `OverlayImages`,
  `PlaceOnOverlay`). `LocateButton` (one GPS fix) is in `features/map/`.
- **Offline tiles:** `features/map/offline.ts` + `data/tiles.ts` (`tileMeta` rows). Plan §24
  describes the `sbs-tile://` protocol. The §8 field checklist (#41) can read
  `getTileDownload` for "tiles cached".
- **CI must be green to deploy.** It was red from WP4 until this fix (mobile WebKit only), so
  the owner's phone stayed on the M1 build. After every push, run `gh run watch` and fix
  failures before ending the session. Run WebKit locally in Docker (host lacks its deps):
  `docker run --rm --ipc=host --user $(id -u):$(id -g) -e HOME=/tmp -e CI=1 -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.1-noble npx playwright test`
  (match the image tag to the installed `@playwright/test`).
- Settings → "About this app" shows the version, build commit and build time, and has a
  "Check for updates" button (`__BUILD_SHA__` / `__BUILD_TIME__` come from `vite.config.ts`).
- Playwright's WebKit is ephemeral (like private browsing) and refuses Blobs in IndexedDB, so
  the overlay e2e skips WebKit. WP6 photos hit the same limit: consider storing bytes
  (ArrayBuffer + type) instead of Blobs, which would also make private Safari tabs work.
- Toasts: after a tap on a toast button, the Toaster drops focus so remaining toasts still time
  out. In e2e, use `importFile` / `dismissToasts` from the helpers, because a hovering mouse
  pauses toasts.
- **Tests:** e2e helpers are in `tests/e2e/helpers.ts` (`stubTiles`, `tapMap`, `TILE`,
  `skipWelcome`). Always use `skipWelcome`: a bare "Not now" clashes with the install prompt
  on mobile. `tests/fixtures/stones.ts` makes schema-valid `.sbs.json` files of any size.
  Taps that depend on the GeoJSON worker need `expect(...).toPass()`. Run
  `npm run i18n:extract` before e2e, or new strings show as message ids.
- `Setup.test.tsx` "deletes a row with undo" failed once under full-suite load and then passed
  three runs in a row. Watch it.
- Still true: `LazyMap` is the only map entry point; colour strings go in `.ts` files, not
  `.tsx`; mock `../map/LazyMap` in jsdom; locally run Playwright with
  `--project=desktop-chromium --project=mobile-chromium`.

## Work packages

Status values: `todo` · `in-progress` · `done` · `blocked: check-in`

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status      |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ----------- |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done        |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | done        |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | done        |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | done        |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | done        |
| WP5   | M2        | #28–#32 | Stones layer, schematic view, offline tiles, grid pinning, plat overlay                 | fast   | done        |
| WP6   | M3        | #33–#35 | Photo pipeline, camera, walk-a-row                                                      | deep   | done        |
| WP7   | M3        | #36–#42 | Row controls, GPS averaging, chips, relative placement, polish, checklist, stone detail | fast   | in-progress |
| —     | M3        | #43     | **Field trial #1** (owner)                                                              | —      | todo        |
| WP8   | M4        | #44–#47 | Queue, photo enhancement, keyboard form, multiple people                                | fast   | todo        |
| WP9   | M4        | #48–#51 | FuzzyDate UI, autocomplete, symbols/military, verify pass                               | fast   | todo        |
| —     | M4        | #52     | **Field trial #2** (owner)                                                              | —      | todo        |
| WP10  | M5        | #53–#56 | Progress, people search, CSV import, match view                                         | deep   | todo        |
| WP11  | M5        | #57–#60 | Duplicates, exports, booklet, EXIF import                                               | fast   | todo        |
| WP12  | M6        | #61–#64 | Packets, merge wizard, entity matching, cemetery aliasing                               | deep   | todo        |
| WP13  | M6        | #65–#67 | Alignment, Web Share, merge e2e                                                         | deep   | todo        |
| WP14  | M7        | #68–#72 | Privacy, publish bundle, viewer, deep links, navigation                                 | fast   | todo        |
| —     | M7        | #73     | Code license decision (owner)                                                           | —      | todo        |
| WP15+ | M8        | #74–#79 | One issue per session, any order                                                        | varies | todo        |

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
- 2026-11-25 · WP5 · Stones layer with shape+colour status and a bottom sheet (#28), Diagram tab with v1 grid view (#29), offline tile download via cache-first `sbs-tile://` protocol (#30), v1 grid pinning + grid rows → rows (#31), plat/drone image overlays with residuals, opacity, place-stones (#32). 695 tests + 20 Chromium e2e green. M2 complete; WP6 blocked on check-in (device checks for #28 smoothness and #30 airplane mode).
- 2026-11-25 · WP5 fix · Owner's phone was still on M1: CI (mobile WebKit) had failed since WP4, so nothing deployed. Fixed: map panel overlapped the phone bottom bar; toasts stayed paused after Dismiss; e2e toast handling; overlay e2e skipped on ephemeral WebKit. Added Settings → About (version, build, Check for updates). All 3 e2e projects green in the Playwright Docker image.
- 2026-11-25 · M2 check-in (partial) · Owner on Android: 10k stones smooth (#28), offline map works in airplane mode (#30), Willow Creek grid pinned on a real map (#31). Plat overlay (#32) not tried (no image). Fixed two bugs the owner found: map controls drew over the stone sheet (dialogs now z-40), and the row ⋯ menu opened off screen on phones (now a bottom sheet). Owner to confirm unblocking WP6.
- 2026-11-26 · M2 check-in · Owner unblocked WP6. Plat overlay (#32) device check deferred; still open with the owner.
- 2026-11-26 · WP6 · Photo pipeline in a worker: resize, ≤20 KB thumbnail, sha256, pHash, EXIF time/GPS (#33). In-app camera with roles, haptics, phone-camera fallback, Add photo on the stone sheet (#34). Walk-a-row: start by GPS/draw/name, Next stone → photo → next rowIndex, isotonic GPS fit, Row end re-spacing, in-camera Undo (#35). Binary rows now store bytes, so WebKit can store photos. 725 unit + 33 e2e (all 3 projects) green. Owner device checks for #33/#34 open.
