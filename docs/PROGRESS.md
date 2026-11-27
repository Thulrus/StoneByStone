# v2 progress and handoff

Protocol: [OVERHAUL_PLAN.md §2.1.1](OVERHAUL_PLAN.md#211-agent-sessions-and-handoff).
Update this file at the end of every session.

## Next session starts here

**WP11 is done** (#57–#60 closed). **M5 (Corpus tools) is complete. WP12 is blocked on the
M5 check-in**: the owner tries the items below, then unblocks WP12 (M6: packets, merge
wizard, entity matching, cemetery aliasing).

What the owner can try (cemetery header → **More**):

- **Possible duplicates** (#57): people with alike names and dates, stones closer than 1 m
  with alike text. Nothing is changed; "Not duplicates" hides a pair (device setting).
- **Export and print** (#58): CSV (open it in a spreadsheet), GeoJSON, KML (**open it in
  Google Earth**: #58's acceptance check was verified by parsing only).
- **Export and print → Open booklet** (#59): Print or save as PDF. Try it on a real cemetery
  with photos; the e2e only prints a 200-stone fixture without photos.
- **Import photos** (#60): pick 100+ photos taken with the phone's own camera app; try both
  "every photo is a stone" and "within 10 seconds", with and without a row.
- Still open from WP10: **#55** (a real historical-society CSV through People → Import).

Owner device checks still open (Android, installed app):

- **#33:** a photo is ready (stone appears, "Stone N saved") within about 1 s of the shutter.
- **#34:** the in-app camera opens and shoots; "Phone camera" switches to the system camera
  app and back.
- **#32 (from M2):** plat overlay on the phone (Setup → "Add a plat map or drone image").

Notes for WP12+ (from WP11, plan §11, §13.1, §20.3):

- **More sheet** (`CemeteryMore.tsx`) now has 7 pages; new cemetery pages go there too. If it
  grows further, group the links.
- **Flat formats:** `data/format/flat.ts` (`flatStones` = live stones with people, section,
  row, 1-based place, in walking order; `flatName`; `peopleCsv`, `stonesGeoJson`,
  `stonesKml`). Headers/keys are fixed English on purpose. The M7 publish bundle can reuse
  `flatStones`.
- **Duplicates:** `domain/duplicates.ts` (`findDuplicatePeople`, `findDuplicateStones`,
  `pairKey`). Dismissals: `data/duplicates.ts`, settings key `duplicates:dismissed:<id>`.
  #63 entity matching (across datasets) is a different problem but can reuse the stone text
  similarity and `dateScore` (now exported from `domain/index-match.ts`).
- **Booklet:** `features/booklet/` (`buildBooklet`, `planMap` → `PlanMapSvg`), loader data
  in `data/booklet.ts` (`coverPhotos`, `namedContributors`). Print CSS is in `index.css`
  under `.sbs-booklet`. `ConventionReference` is exported from `ConventionsDialog.tsx`.
- **Photo import:** `domain/photo/import-plan.ts` (`planPhotoStones`), `data/photo-import.ts`
  (`importPhotoStones`, `cemeteryPhotoHashes`), UI `features/photo-import/`.
  `tests/fixtures/exif.ts` (`withExif`) writes Exif time + GPS into a JPEG for tests.
- The booklet e2e writes `booklet.pdf` to its test output (Chromium only); look at it after
  layout changes.
- **CI was red from WP10 to here**, so WP10/WP11 never deployed until 2026-11-27. Fixed: the
  service worker is blocked in e2e (its toast covered phone layouts), CI runs 2 workers with
  longer WebKit timeouts, failed runs now upload the HTML report and `test-results/`, and the
  cemetery header keeps to two lines on phones ("More" is "⋯" there). Plan §2.1.1 now
  requires a green CI run before a session ends.
- Known flaky on WebKit in Docker: walk-controls "quick chips" (flaky again this session).

Notes for WP11+ (from WP10, plan §11):

- **Pages:** Progress, People and Match are routes (`cemetery/:id/progress|people|match`),
  reached from the cemetery header's **More** sheet (`CemeteryMore.tsx`). Add new cemetery
  pages there, not as header buttons: a fourth header line squeezed the map on phones and
  broke the map-tap e2e. `app/pages/CemeteryGate.tsx` loads `:cemeteryId` for a page.
- **CSV:** `data/format/csv.ts` (`parseCsv`, `csvLine`). #58 CSV export should use
  `csvLine`, and `ui/download.ts` (`download`, `fileSlug`).
- **People:** `features/people/search.ts` (`buildPeopleIndex`, `personName`,
  `compareByName`). #57 duplicates can reuse `nameScore`/`yearScore` from
  `domain/index-match.ts`.
- **Index records:** `Source.location` is new (schema, FORMAT.md, plan updated).
  `isIndexRecord(p)`. Merged records are tombstones named in a live person's `aliases`
  (`matchedItems` reads people with deleted ones). Imported names have no `asCarved`.
- **Not built:** the desk-mode matching panel (plan §9); the Match view covers matching.
- **WebKit layout:** a visually hidden (`sr-only`, absolute) element inside an
  `overflow-x-auto` box let the whole page slide sideways on WebKit only. Make such
  scrollers `relative`. The progress e2e checks this with `window.scrollTo`.
- Generated `src/i18n/locales/en/messages.ts` (from `i18n:compile`) is not tracked;
  delete it after compiling. `i18n:extract` is what the commits need.
- Known flaky on WebKit in Docker: stone-detail, walk-controls, transcribe "couple" tests
  (pass on retry); `Setup.test.tsx` row test (unit) once more this session.

Notes for WP10+ (from WP9, plan §9, §10.1, §10.4, §10.5):

- **Dates:** `features/transcribe/date-preview.ts` (`describeDate`, `readPerson`) puts parser
  output into words; `Input.tsx` shows it under the field. A blank Born is saved as the
  calculated birth (`qualifier: 'calculated'`) and shows blank in the form, so it follows Died
  and Age (`personDraft` / `personPatch` in `data/transcribe.ts`).
- **Autocomplete:** `name-index.ts` (pure; `buildNameIndex`, `suggestNames`),
  `useNameSuggestions` (live over `persons.listByCemetery`), `NameInput` (combobox). The
  WP10 people search could reuse the index's normalisation.
- **Stone fields:** `StoneFields` (symbols `SYMBOLS` + free text, carver, language, script),
  `MilitaryFields` (`Military.marker` is new; schema and FORMAT.md updated).
  `TranscriptionDraft` now carries `symbols`, `carver`, `language`, `script`; build one with
  `transcriptionDraft(m, people, newId)`.
- **Conventions:** `domain/conventions.ts` (`CONVENTIONS`, `conventionOf`),
  `ConventionsDialog.tsx` (reference + preset, also `ShortcutHelp`). `Inscription.convention`
  is set when the text changes. The `.sbs` README has a "Transcription convention" line. WP11
  exports (#58 CSV etc.) should carry it too.
- **Verify:** `verifyStone` / `unverifyStone` in `data/transcribe.ts`, `VerifyBar` in the
  desk header. Ctrl+Shift+Enter is caught by a wrapper in `TranscribeView`.
- `TranscribeForm.tsx` is 262 lines. Split it before adding more (the key handler is the
  obvious piece).
- The name-index timing test uses medians, because a single sample under full-suite load once
  went over 50 ms. `Setup.test.tsx` "deletes a row with undo" failed once again this session
  (then passed 3 in a row).

Notes for WP9+ (desk mode, plan §9, §10.3):

- **Desk mode** lives in `features/transcribe/` (route `cemetery/:id/transcribe?stone=`).
  `TranscribeView` holds the queue snapshot (`queue.ts`) and the open stone's draft in a ref;
  every move saves it via `data/transcribe.ts` `saveTranscription` without waiting.
  `TranscribeForm` + `PersonFields` are the form. The date fields are plain text parsed on save
  (`parseDate`, cemetery `dateLocale`); #48 adds the live parsed preview there (inputs carry
  `data-kind="date"`, which Ctrl+. also uses). #49 autocomplete goes on the name input.
- **People:** draft ids are made up front; a person removed then retyped gets a fresh id
  (`saveTranscription` returns renames). Links: `data/people.ts`, `domain/relations.ts`,
  `features/people/` (dialog, list, ranking).
- **Viewer:** `features/transcribe/viewer/`. 60 fps check:
  `VIEWER_FPS_MIN=55 npx playwright test -c playwright.gpu.config.ts photo-viewer` on a
  machine with a GPU (CI is software GL).

Notes for WP8+:

- **Row controls** (plan §7.2): `data/row-controls.ts` (`reverseRow`, `moveStone`).
  `captureStone` takes `at` (insert, shifting later stones unless the slot is a gap), `gaps`
  and `flags` (Skip = `needs-revisit`, no photo). `useWalkCapture` reads placement (insert
  point, reversed walk, pending gaps) at the shutter press. Reverse renumbers the row and
  reverses its line, so nothing moves. After it, new stones in that walk go before stone 1, and
  "Row end here" moves the line start (`endRowHere(..., { atStart })`).
- **Undo:** `store.run(..., { undoable: 'join' })` adds to the latest undo step. Quick chips
  and quick name use it (`data/quick.ts`), so the in-camera Undo removes the stone with its
  details.
- **Placement:** `data/placement.ts` `placeStone` (one undo step; the row is re-spaced with
  the stone as an anchor). `data/stone-edit.ts` `moveToRow`, `clearPosition`. `geo/average.ts`
  (hold still: `averageFixes`, `snapToLine`, `circleRing`); `geo/relative.ts`. The
  hold-still time is a pref (`holdStillSeconds`, Settings). `StonesLayer` draws the
  selected stone's accuracy circle.
- **Attributes:** vocabularies in `domain/attributes.ts`, labels in
  `features/stones/attribute-labels.ts`, one chip group component `AttributeChips` (camera
  tray `QuickTray` uses `tone="dark"`). M4's keyboard form (#46) can reuse it.
- **Stone detail:** route `cemetery/:id/stone/:stoneId` (`stonePath`), `StonePage` →
  `features/stones/detail/*`. People are names only. The full person form is M4 (#46/#48).
  "Place on the map" is `?place=<stoneId>` on the cemetery route (`usePlaceOnMap` tool in
  `CemeteryTabs`).
- **Field:** `useWakeLock(active)` (`features/capture/`), `WalkSummary` (`data/walk-summary.ts`),
  `FieldChecklist` + pure `field-checklist.ts` in Setup.
- **Tests:** `tests/e2e/walk-controls.spec.ts` (all controls, chips, hold still with a 5 s
  pref, relative, summary, a fake wake lock) and `stone-detail.spec.ts`. The checklist is
  checked in `offline.spec.ts` (fake `getBattery`). A modal sheet hides the toast region from
  the accessibility tree, so check the sheet's own text instead of a toast.
- All three e2e projects passed locally in the Playwright Docker image (41 passed, 1 skipped).
- `Setup.test.tsx` "deletes a row with undo" failed 2 of 5 full runs this session, then
  passed 6 in a row. It now has 5 s timeouts. If it still fails, look at the ⋯ menu sheet.

Notes from WP6 (still true):

- **Walk-a-row core:** `geo/row-layout.ts` (`layoutRow`, `isotonic`, `effectiveRowLine`) is
  pure. A stone's GPS fix is its first photo's `position`. Only `row-interpolated` (or
  missing) positions are rewritten by `relayoutRow`.
- **Capture UI:** `Camera` (roles, `actions` and `tray` slots, phone-camera fallback via the
  `systemCamera` pref), `useWalkCapture` (serial queue: shutter order = stone order). Toasts
  cover the shutter on phones, so the camera shows its own feedback.
- **Photos:** `features/capture/pipeline.ts` in a worker; `data/photos.ts` (`preparePhoto`,
  `writePhoto`, `addPhoto`); binary rows store bytes (`data/blobs.ts`).
- `quickFix()` is one fresh fix; `holdStill()` loops it. Never use `watchPosition`.
- In e2e, the camera's fallback input is `getByTestId('camera-file')` after tapping
  "Phone camera". Mocked GPS: `test.use({ geolocation, permissions: ['geolocation'] })`.

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
  `docker run --rm --cpus=4 --ipc=host --user $(id -u):$(id -g) -e HOME=/tmp -e CI=1 -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.1-noble npx playwright test`
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

| WP    | Milestone | Issues  | Scope                                                                                   | Model  | Status            |
| ----- | --------- | ------- | --------------------------------------------------------------------------------------- | ------ | ----------------- |
| WP0   | M0        | #1–#9   | Repo reset, scaffold, shell, PWA, UI primitives, i18n, tests, CI, device check-in       | fast   | done              |
| WP1   | M1        | #10–#14 | Domain types, HLC, FuzzyDate, names, stamps + merge                                     | deep   | done              |
| WP2   | M1        | #15–#19 | Dexie + repositories, history/undo, schemas, .sbs, v1 importer                          | deep   | done              |
| WP3   | M1        | #20–#22 | Contributor/settings, Home, data safety                                                 | fast   | done              |
| WP4   | M2        | #23–#27 | Geo module, map, imagery, create cemetery, sections/rows                                | deep   | done              |
| WP5   | M2        | #28–#32 | Stones layer, schematic view, offline tiles, grid pinning, plat overlay                 | fast   | done              |
| WP6   | M3        | #33–#35 | Photo pipeline, camera, walk-a-row                                                      | deep   | done              |
| WP7   | M3        | #36–#42 | Row controls, GPS averaging, chips, relative placement, polish, checklist, stone detail | fast   | done              |
| —     | M3        | #43     | **Field trial #1** (owner)                                                              | —      | done              |
| WP8   | M4        | #44–#47 | Queue, photo enhancement, keyboard form, multiple people                                | fast   | done              |
| WP9   | M4        | #48–#51 | FuzzyDate UI, autocomplete, symbols/military, verify pass                               | fast   | done              |
| —     | M4        | #52     | **Field trial #2** (owner)                                                              | —      | todo              |
| WP10  | M5        | #53–#56 | Progress, people search, CSV import, match view                                         | deep   | done              |
| WP11  | M5        | #57–#60 | Duplicates, exports, booklet, EXIF import                                               | fast   | done              |
| WP12  | M6        | #61–#64 | Packets, merge wizard, entity matching, cemetery aliasing                               | deep   | blocked: check-in |
| WP13  | M6        | #65–#67 | Alignment, Share button, merge e2e                                                      | deep   | todo              |
| WP14  | M7        | #68–#72 | Privacy, publish bundle, viewer, deep links, navigation                                 | fast   | todo              |
| —     | M7        | #73     | Code license decision (owner)                                                           | —      | todo              |
| WP15+ | M8        | #74–#79 | One issue per session, any order                                                        | varies | todo              |

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
- 2026-11-26 · WP7 · Row controls: gap, skip, insert, reverse, reorder (#36). GPS hold-still averaging with outlier rejection, row snapping and accuracy circle (#37). Quick chips and quick name with surname carry-over (#38). Relative placement (#39). Wake lock, haptics, end-of-walk summary with backup (#40). Field prep checklist (#41). Stone detail screen (#42). 762 unit + 41 e2e (all 3 projects) green. M3 complete; WP8 blocked on field trial #1 (#43).
- 2026-11-26 · M3 check-in · Owner ran a row test on Android (fast, smooth) and unblocked WP8. Fixed two findings: the pause before the quick tray (stone record now made at the shutter press) and the bottom bar scrolling away on Setup. #33, #34, #32 still open.
- 2026-11-26 · WP8 · Desk-mode queue with save & next ≤100 ms (#44). WebGL photo viewer: zoom/pan, tone, levels, unsharp, local contrast, raking light, straighten, perspective, presets; 60 fps on a GPU at 2× (#45). Keyboard-first form with people, Ctrl+Enter/./I shortcuts (#46). Multiple people and two-sided relationship links with carved-phrase suggestions (#47). 786 unit + 58 e2e green.
- 2026-11-26 · WP9 · Live date/age readings with ambiguity warnings and calculated birth (#48). Name autocomplete from the cemetery's people, abbreviation-aware, <50 ms (#49). Symbols, carver, language/script, military with marker, three convention presets with in-app reference, recorded per inscription and in the README (#50). Verify pass with Ctrl+Shift+Enter, tested transitions (#51). 819 unit + 64 e2e (all 3 projects) green. M4 complete; WP10 blocked on field trial #2 (#52).
- 2026-11-26 · M4 check-in · Owner transcribed the trial cemetery; all well. Fixed the one finding: the neighbour strip held only ±2 stones so it never scrolled (touch or wheel); it now shows the whole row, centred, with wheel scrolling. #52 closed; WP10 unblocked.
- 2026-11-26 · WP10 · Progress dashboard with per-section/row status and a printable/CSV revisit checklist (#53). People index with MiniSearch: accent/abbreviation-aware, Soundex+D–M surnames, filters, collated order (#54). Burial-index CSV import: header guessing, column mapper with preview, presets, one-step undo; new `Source.location` (#55, open for a real society CSV). Match view: ranked stones, same person / on this stone / no stone found, unlink, all undoable (#56). Cemetery pages moved behind a More sheet. 851 unit + 78 e2e (all 3 projects) green.
- 2026-11-26 · WP11 · Duplicate review: alike people (Soundex blocks, compatible dates) and stones <1 m with alike text, review only (#57). CSV/GeoJSON/KML exports on a new Export and print page (#58). Printable booklet: title, SVG plan maps, A–Z index, row listings with thumbnails, convention, contributors, license (#59). Bulk photo import ordered/placed by EXIF, optional grouping and row, one undo step; 121-photo e2e (#60). 873 unit + 90 e2e (all 3 projects) green. M5 complete; WP12 blocked on the M5 check-in.
- 2026-11-27 · CI fix · CI had been red since WP10 (WebKit only), so nothing deployed. Blocked the service worker in e2e, 2 CI workers and longer WebKit timeouts, HTML report + traces uploaded on failure, cemetery header kept to two lines on phones, row-drawing card compacted, "Importing…" status on photo import, 5 s Testing Library waits. Plan §2.1.1 and CLAUDE.md now require green CI. CI green (91 e2e, no retries) and deployed.
