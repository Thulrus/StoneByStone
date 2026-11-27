# StoneByStone v2 — Overhaul Plan

> Status: **Accepted** · Written: 2026-11-18 · Decisions finalized: 2026-11-25 · Scope: full rebuild, hosted on GitHub Pages
>
> This document is the single source of truth for the v2 rebuild. It covers the product
> vision, the user experience, the data model, the architecture, migration from v1, and a
> phased roadmap with acceptance criteria. It is written so that someone starting fresh in a
> new development environment can pick it up and begin work at Milestone 0.

---

## Table of contents

1. [Summary](#1-summary)
2. [Decisions already made](#2-decisions-already-made)
3. [Who this is for](#3-who-this-is-for)
4. [What went wrong in v1](#4-what-went-wrong-in-v1)
5. [Design principles](#5-design-principles)
6. [The core workflow: capture in the field, transcribe at the desk](#6-the-core-workflow)
7. [Placing graves accurately](#7-placing-graves-accurately)
8. [Field mode in detail](#8-field-mode-in-detail)
9. [Desk mode (transcription) in detail](#9-desk-mode-in-detail)
10. [Historic cemetery specifics](#10-historic-cemetery-specifics)
11. [Building the corpus](#11-building-the-corpus)
12. [Sharing and combining partial datasets](#12-sharing-and-combining-partial-datasets)
13. [Export, publishing, and visitor mode](#13-export-publishing-and-visitor-mode)
14. [Data safety](#14-data-safety)
15. [International support](#15-international-support)
16. [Privacy, ethics, and stone care](#16-privacy-ethics-and-stone-care)
17. [Outdoor usability and accessibility](#17-outdoor-usability-and-accessibility)
18. [AI-assisted transcription (later)](#18-ai-assisted-transcription-later)
19. [Data model](#19-data-model)
20. [File formats](#20-file-formats)
21. [Sync and merge algorithm](#21-sync-and-merge-algorithm)
22. [Migration from v1](#22-migration-from-v1)
23. [Architecture and tech stack](#23-architecture-and-tech-stack)
24. [Map imagery and tile sources](#24-map-imagery-and-tile-sources)
25. [Quality: testing, performance, CI](#25-quality-testing-performance-ci)
26. [Roadmap and milestones](#26-roadmap-and-milestones)
27. [Risks and open questions](#27-risks-and-open-questions)
28. [Glossary](#28-glossary)

---

## 1. Summary

StoneByStone exists to make documenting a cemetery, grave by grave, simple enough that a
single motivated person can finish a whole historic cemetery, and good enough that the
result is a lasting, shareable record.

v1 asked the user to design an abstract grid first and then type into a form per cell. That
is a spreadsheet with a map skin, and it does not match the physical reality of a cemetery
or the conditions of fieldwork. v2 is rebuilt around three ideas:

1. **Split capture from transcription.** In the field you only _locate_ and _photograph_
   each stone (~5 seconds per stone, no typing). At a desk you transcribe from the photos
   with a keyboard-first workflow (~30 seconds per stone).
2. **Real geography, many placement aids.** A real map with aerial imagery, a
   "walk-a-row" capture flow that gets ordering right automatically, GPS averaging, plat
   map overlays, and a schematic (grid) view for places where imagery is useless (tree canopy).
3. **A corpus, not a list.** Track every stone through located → photographed →
   transcribed → verified; import existing burial indexes and match them to stones; merge
   partial surveys from different people into one complete map.

It stays a static, offline-first PWA on GitHub Pages. No backend is required for any core
feature.

---

## 2. Decisions already made

| Question             | Decision                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary use          | **Historic cemeteries**, but must work for any cemetery (modern, active, rural, urban).                                                                                                                            |
| Geography            | **US first**, designed for **international** use from day one (data model, dates, names, imagery).                                                                                                                 |
| Collaboration        | **Mostly solo.** Must be able to **combine partial datasets** from different people into a more complete map. Real-time multi-user sync is _not_ required.                                                         |
| AI transcription     | Acceptable, **low priority**, opt-in, bring-your-own key.                                                                                                                                                          |
| Rebuild vs refactor  | **Full rebuild.** No v1 code needs to be preserved. v1 _data_ must be importable.                                                                                                                                  |
| Hosting              | **GitHub Pages** (static).                                                                                                                                                                                         |
| v1 in production?    | **No real user data in v1.** v2 is built on `master` and replaces the live site from M0.                                                                                                                           |
| v1 IndexedDB import  | **Dropped.** Only the `.cem.json` file importer is built (§22). v1 stays recoverable at tag `v1-final`.                                                                                                            |
| Field devices        | **iOS and Android are both first-class.** Real-device tests run on Android at the end of M0 and during M3. iPhone testing is optional (#80) because the owner has no iPhone, and CI's WebKit run stands in for it. |
| Default data license | **CC BY 4.0.**                                                                                                                                                                                                     |
| i18n library         | **Lingui.**                                                                                                                                                                                                        |

### 2.1 Execution workflow

- Each milestone M0–M8 is a GitHub milestone, and each task is an issue with acceptance criteria.
- Work is mostly autonomous: commits go to `master` (or short-lived branches) with CI green.
  Check-ins happen at each milestone boundary and before each field trial.
- This document is the spec. When a decision changes during implementation, update it here in
  the same commit.

### 2.1.1 Agent sessions and handoff

To keep token use low, the work is done in short, fresh agent sessions rather than one long
one. Each session completes one **work package** (a few related issues), then hands off in
writing. No session relies on memory of an earlier conversation; everything the next session
needs lives in the repo and the issues.

- **`docs/PROGRESS.md`** is the handoff file. It holds the work-package table with each
  package's status, a "Next session starts here" block, and a one-line-per-session log.
- **Picking a task:** take the first package in `PROGRESS.md` whose status is `todo` (or
  `in-progress` with handoff notes). Read `CLAUDE.md`, `PROGRESS.md`, the package's issues, and
  only the plan sections those issues cite. Don't read the whole plan.
- **Claiming it:** set the package to `in-progress` and commit that before starting the work.
  Sessions run one at a time.
- **Scope:** stay inside the package. If you find work that belongs elsewhere, file an issue
  or add a line to the relevant issue instead of doing it.
- **Finishing:** close the completed issues (`Closes #N` in commits) and check off their
  acceptance criteria. Then update `PROGRESS.md`: set the package status, rewrite the "Next
  session starts here" block, and append a log line. Commit and push.
- **Stopping partway:** if the session runs long or gets stuck, stop at a green commit. Leave
  the package `in-progress`. Comment on the open issue with what's done, what's left, and any
  traps you hit. Then update `PROGRESS.md` as above.
- **Check-ins:** when a package finishes a milestone or comes right before a field trial,
  mark the next package `blocked: check-in` and stop. The owner unblocks it.
- **Model choice:** packages marked _deep_ in `PROGRESS.md` (merge rules, parsers, matching)
  should use the strongest model. The others are fine on a faster model.
- **Keep output small:** run tests with terse reporters, don't dump whole files or logs into
  the conversation, and keep commit hooks quiet.

### 2.2 Technical resolutions (ambiguities closed before M0)

| Topic                           | Resolution                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stamp granularity               | One stamp per **top-level field**. Object-valued fields (`name`, `position`, `address`, `inscription`, `age`, `military`, `dimensionsCm`) are atomic, so their parts never mix between writers.                                                                                                                                            |
| Arrays under merge              | `aliases` and `sources` merge by **set union**, stored in canonical sorted order (sorted by canonical JSON) so the union stays associative. They are grow-only under merge. All other arrays (`condition`, `symbols`, `flags`, `tags`, `relations`, ...) are last-writer-wins as a whole value, and concurrent edits surface as conflicts. |
| Monument → photos               | `Monument.photoIds` is **removed**, and `Photo.monumentId` is the only link. This avoids losing a photo when two devices add one concurrently. Display order is by role, then `takenAt`.                                                                                                                                                   |
| Monument status                 | `located` / `photographed` / `transcribed` are **derived** (has a photo; has a person or inscription) and materialized on write so they can be indexed. `verified` is explicit (`verified?: Stamp`) and is cleared automatically when a transcription field changes afterwards.                                                            |
| History volume                  | Consecutive edits to the same entity by the same contributor within 30 s are coalesced into one `HistoryEntry`.                                                                                                                                                                                                                            |
| Undo                            | A session undo stack of inverse patches. A merge or import records a pre-change snapshot of every record it touched, under one history group, so it can be undone as a single operation.                                                                                                                                                   |
| "Byte-for-byte equivalent" (M1) | Deep-equal after canonical JSON serialization (sorted keys). Photos compare by `sha256`.                                                                                                                                                                                                                                                   |
| Node / CI                       | Node 22 LTS. Playwright runs Chromium and WebKit (as a stand-in for iOS Safari) in CI.                                                                                                                                                                                                                                                     |
| Code license                    | Open: the repo has no LICENSE file yet. Needs an owner decision before M7 publishing.                                                                                                                                                                                                                                                      |

---

## 3. Who this is for

**Primary persona — the solo documenter.** Volunteer or family historian documenting local
historic cemeteries, often 50–2,000 stones each. Works weekends, on a phone, often with no
cell signal, in sun, cold, or rain. Many stones are weathered marble or slate. Has some
existing records (a typed list from a historical society, an old plat map, a WPA survey).
Wants a complete, accurate, durable record and to share it.

**Secondary — the collaborator.** Someone who surveyed part of the same cemetery (or the
same cemetery years ago) and wants to combine efforts.

**Secondary — the consumer.** A genealogist or descendant who wants to find a person and
stand at their grave; a historical society or library that wants a printable index and map.

**Design target:** the primary persona should be able to survey a 300-stone cemetery in one
or two field sessions and transcribe it over a few evenings, without ever feeling the app is
in the way.

---

## 4. What went wrong in v1

An audit of the v1 code base (commit `72ab0cb`) found the following. These inform v2 and
the migration in §22.

**Concept problems**

- The cemetery is an abstract `rows × cols` grid whose shape must be designed before data
  entry. Real rows curve, spacing varies, sections sit at angles. The grid never matches the
  ground, and building it is upfront work with no payoff.
- Data entry is form-first, in the field, on a phone — the slowest and most error-prone
  possible place to type.
- No photos. In cemetery documentation, the photo _is_ the primary record.
- One person per grave. Couples' stones, family monuments, and footstones can't be modeled.
- Dates are `<input type="date">`, so `1887`, `abt 1900`, `Feb 10, 1709/10`, or
  `aged 72y 3m 5d` can't be recorded.
- No notion of progress or completeness.

**Implementation problems**

- **Offline/PWA never worked on GitHub Pages.** `src/main.tsx` registers
  `/service-worker.js` (origin root) instead of `/StoneByStone/service-worker.js`, and the
  worker caches `/` and `/index.html` rather than the base path.
- `BrowserRouter` with no `404.html` fallback: refreshing any non-root route 404s on Pages.
- Exactly **one cemetery per device**: stored under the hard-coded key `"current"`; the
  Willow Creek sample also uses `"id": "current"`, so cemetery-ID matching for merges is
  meaningless.
- Merge handles graves only; landmarks, roads, and groups are silently dropped.
- The Willow Creek sample stores its shape as `grid.shape: [{row, col}]` while the app
  reads `grid.validCells: ["row,col"]`; the importer ignores `shape`.
- IndexedDB database is named `cemetery-db` on the `thulrus.github.io` origin, which is
  **shared by every GitHub Pages project under that account** — a collision risk.
- Two ~1,300-line components (`CemeteryView.tsx`, `MapGrid.tsx`) hold most UI logic, which
  made each new feature harder than the last.

---

## 5. Design principles

1. **Never make the user type in the field.** Typing is optional everywhere in field mode.
2. **A photo is a complete record.** Everything else can be filled in later.
3. **Order beats precision.** Knowing that stone #14 sits between #13 and #15 in Row 4 is
   more valuable and more achievable than sub-meter coordinates.
4. **Every coordinate knows where it came from** (GPS, map tap, row interpolation, legacy
   grid, overlay, alignment) and how much to trust it.
5. **Transcribe as carved; normalize separately.** Preserve the stone's spelling,
   abbreviations, and line breaks; store searchable normalized values alongside.
6. **Uncertainty is first-class.** `[?]`, `[illegible]`, `about`, `before`, `between`.
7. **No save buttons, no "are you sure?"** Autosave everything; undo everything.
8. **Offline is the default state**, not a fallback.
9. **Data outlives the app.** Open, documented, versioned formats; easy full export.
10. **One-handed, gloved, sunlit.** Field UI is designed for the worst conditions.

---

## 6. The core workflow

```
          FIELD (phone, offline)                       DESK (laptop/tablet)
 ┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
 │ 1. Open cemetery (pre-downloaded map) │     │ 5. Transcription queue               │
 │ 2. Start a row ("Section B, Row 4")   │ ──▶ │    photo + enhance filters | form    │
 │ 3. Tap "Next stone" → photo → done    │     │    Enter = save & next               │
 │    (position auto-assigned in order)  │     │ 6. Review flagged / uncertain        │
 │ 4. Quick chips: material, condition   │     │ 7. Match imported index records      │
 └──────────────────────────────────────┘     │ 8. Export / share / publish          │
                                              └──────────────────────────────────────┘
```

Either mode works on any device; the split is about _what the UI optimizes for_. A user
with good weather and a clear stone can transcribe on the spot. A user at a desk can place
stones on aerial imagery without ever visiting.

### Main screens (information architecture)

- **Home** — list of cemeteries on this device, with progress rings; "New cemetery";
  "Import"; backup status banner.
- **Cemetery** — the map (or schematic view), with status coloring and a bottom sheet.
  Tabs/modes: _Survey_ (field capture), _Transcribe_, _People_ (searchable index),
  _Progress_, _Setup_ (sections, rows, overlays, imagery, offline download), _Share/Export_.
- **Stone detail** — photos, people on the stone, attributes, history, position editor.
  (M3: `#/cemetery/:id/stone/:stoneId`, opened from the stone sheet's "All details". Photos:
  add, change type, delete. People: names only until the M4 form. Attributes: the same chip
  groups as the camera, as normal undoable edits. Row: change row, move earlier or later.
  Position: hold still, relative, "Place on the map" (a tap tool on the cemetery map via
  `?place=<stoneId>`, source `map`), and back to its row position. History: entries for the
  stone, its people and its photos.)
- **Person detail** — names, dates, relationships, sources, which stone.
- **Merge review** — side-by-side candidate matches when combining datasets.
- **Settings** — contributor name, units, language, photo quality, storage usage, AI key.

---

## 7. Placing graves accurately

Consumer phone GPS is typically accurate to 3–10 m (worse under trees or near buildings);
graves are ~1 m apart. GPS alone cannot place individual stones. v2 combines several
methods; each produces a `position.source` and an `accuracyM` estimate.

### 7.1 Aerial imagery + direct placement

A real map (MapLibre GL) with aerial imagery (see §24). Rows, paths, and sometimes
individual stones are visible. The user can place or drag any stone on the map. The map can
be **rotated** so rows run horizontally on screen, which makes placement far easier.

### 7.2 Walk-a-row (the primary capture method)

1. User defines a row: draw a line on the map, _or_ stand at the row start and tap
   "Row start here" (GPS), _or_ just name it ("Row 4") and set geometry later.
2. User walks the row. Each **Next stone** opens the camera; one shot (optionally a second
   for the back) creates a Monument with `address.rowId` and an incrementing `rowIndex`.
3. Position is computed along the row line:
   - With no GPS, stones are distributed evenly between start and end
     (`source: 'row-interpolated'`).
   - With GPS fixes, each fix is projected onto the line and the result is constrained to be
     monotonic in `rowIndex` (stones can't swap order because of GPS noise).
   - "Row end here" re-spaces everything.
4. Controls: **Gap** (empty plot / missing stone), **Skip** (come back later),
   **Insert** (between two existing stones), **Reverse direction**, drag to reorder.
5. Rows belong to optional **Sections**. Row labels can be numeric, alphabetic, or free text.

This gets ordering right automatically, which is the hardest thing to recover later and the
thing visitors most need ("third stone from the oak in Row 4").

Implementation notes (M3, `geo/row-layout.ts`, `data/walk.ts`): a row is slots `0…K-1`
(missing indices are gaps and keep their slot). Each stone's GPS fix is the `position` of its
first photo that has one (one fresh fix, `maximumAge: 0`, taken at the shutter press while the
photo is processed), so the row can be re-laid out at any time. Fixes more than 25 m off the
line are ignored. The rest are projected and fitted with weighted isotonic regression
(weight 1/accuracy²), slots without a fix are interpolated between their neighbours and the
row ends, and neighbours are kept ≥ 0.5 m apart (less if the row is short). Only positions
that are absent or `row-interpolated` are rewritten. Stones placed some other way are kept and
act as strong anchors. The line is the drawn line, else "Row start here" → "Row end here",
else start → the fix farthest from it. Until the row end, the start fix is a device setting
(`walk:start:<rowId>`). "Row end here" then writes `Row.line`. Each capture (stone + photo +
re-spacing) is one undo step. The stone's record is made at the shutter press, before its
photo is processed and its fix arrives, so the quick tray opens at once (field trial #1); the
photo then joins that stone's undo step (`attachCapturePhoto`, `undoable: { join: id }`, which
only joins the latest step if it created that stone). Inside the camera, feedback and Undo show in the camera itself,
because a toast would cover the shutter on a phone.

Row controls (M3, `data/row-controls.ts` and `captureStone` options), each one undo step that
re-spaces the row. **Gap** adds an empty slot before the next stone (pending in the walk until
that stone is shot, and removable until then; a trailing gap with no stone after it is
dropped). **Skip** makes a stone without a photo in the next slot, flagged `needs-revisit`.
**Insert** puts new stones after a chosen one, shifting later stones up unless the slot is a
gap, and keeps inserting after each new stone until the camera closes. **Reverse direction**
numbers the row from the other end (index i → last − i, gaps mirrored) and reverses the row
line too (a row without a drawn line gets its current line, reversed), so nothing moves on
the map. For the rest of that walk, new stones go before stone 1 and "Row end here" moves the
line's start. **Reorder** moves a stone one slot earlier or later (swapping with a neighbour or
sliding into a gap). It uses buttons, not drag, so it works with gloves and a keyboard.

### 7.3 GPS averaging

"Hold still" mode collects fixes for ~10 s (configurable), discards outliers, and stores the
mean with an accuracy estimate. Shown as a circle. Used as a hint, snapped to the active row
line where one exists. GPS is never run continuously (battery).

Implementation (M3, `geo/average.ts`, `features/capture/gps.ts` `holdStill`, `HoldStill`): one
fresh one-off fix after another (never `watchPosition`) for the Settings time (5/10/20/30 s,
default 10). Fixes reporting over twice the median accuracy, or farther from the median point
than max(3 × median distance, median accuracy), are dropped. The rest get a 1/accuracy²
weighted mean. Fixes seconds apart have correlated errors, so the accuracy is the larger of
the RMS scatter and the typical single-fix accuracy divided by at most 2. The result is snapped
onto the stone's row line when within 25 m and stored as `gps-averaged`. That makes it an
anchor when the row is re-spaced. The stone sheet has "Hold still here (GPS)", and the map
draws the selected stone's accuracy circle.

### 7.4 Plat map / image overlays

Many historic cemeteries have a hand-drawn plat map. The user photographs or uploads it,
then pins ≥3 control points (image point ↔ map point). The app computes an affine transform
(least-squares, with residuals shown) and draws the image over the map with an opacity
slider. Stones can be placed by tapping the plat. Same mechanism supports **drone
orthophotos** (a big upgrade where canopy allows) and pinning the **v1 legacy grid** (§22).

### 7.5 Schematic view (no imagery)

Under heavy tree canopy (common in New England and Southern historic cemeteries), aerial
imagery shows only treetops. The schematic view lays out Sections → Rows → stones in order
as a clean diagram, needing no coordinates at all. Walk-a-row works identically in it.
This view is also how v1 grid data is shown before it is pinned to the map.

### 7.6 Relative placement

"Place relative to…" an existing stone or landmark: e.g. "2 m behind stone #14". Useful for
filling gaps and for small family plots.

Implementation (M3, `geo/relative.ts`, `features/stones/RelativePlacer`): the stone sheet's
"Place relative to…" picks a reference (any placed stone, its row neighbours first, or a map
feature's point or vertex mean). It picks a distance from chips and −/+ in the cemetery's
units, and a direction: 8 compass points, or along, back, left or right of the reference's
row line. The position is stored as `relative`. Its accuracy is the root sum of squares of
the reference's accuracy (3 m if unknown), 10% of the distance, and distance × sin(direction
error), with 22.5° for compass points and 15° for row directions. A stone in a row becomes an
anchor when the row is re-spaced.

### 7.7 Alignment of whole datasets

When two people's surveys of the same cemetery are combined, their coordinates may be
systematically offset (different GPS days, different methods). Matched pairs of stones are
used to compute a similarity transform and re-align the incoming dataset (§21.4).

---

## 8. Field mode in detail

- **Before going out:** "Prepare for offline" downloads map tiles for the cemetery's
  boundary at zooms ~15–20 (where the provider's terms allow; §24), and confirms storage
  is persisted. A checklist screen: battery, storage free, tiles cached, rows planned.
  Implementation (M3): "Before you go out" in the Setup tab
  (`features/cemeteries/field-checklist.ts` for the rules). It covers battery (Battery Status
  API where it exists; ≥ 50% or charging), free storage (quota − usage ≥ 500 MB), tiles saved
  for the cemetery's current imagery, persisted storage (with a "Protect data" button), and
  rows planned. Anything the browser can't report shows as "can't check", not as a failure.
  The same goes for imagery whose terms forbid offline use, because the diagram works offline.
- **In-app camera** (`getUserMedia`), large shutter at thumb height, haptic confirm, instant
  return to the map with the new stone highlighted. Falls back to
  `<input type="file" accept="image/*" capture="environment">` on browsers where the in-app
  camera is unreliable.
- **Photo roles:** front, back, detail (carver signature, symbol), context (wide shot showing
  neighbors — invaluable for later placement).
- **Quick chips** under the photo, all optional, one tap each:
  - Type: headstone, footstone, tablet, obelisk, ledger, table/altar, box tomb, cross,
    flat marker, pedestal/die-on-base, fieldstone, government/military, temporary marker,
    fragment, other.
  - Material: marble, granite, slate, sandstone, brownstone, limestone, zinc ("white
    bronze"), cast iron, wood, concrete, fieldstone, other.
  - Condition: good, weathered, lichen/biological growth, cracked, broken, fallen, sunken,
    tilted, illegible, repaired, missing.
  - Flags: needs revisit, uncertain position, veteran marker/flag holder.
- **Optional quick name** field with on-device keyboard dictation; surname carried over from
  the previous stone as a suggestion.
- Implementation (M3): vocabularies are stable ids in `domain/attributes.ts`. Type and
  material are single choice, condition and flags multiple. In the walk camera, a tray with
  one group tab at a time sits above the photo types. Chip and name edits join the stone's
  capture undo step, so the in-camera Undo removes the stone with its details. A quick name
  makes or renames the stone's first person (source `stone`). The surname suggestion stores a
  surname-only name.
- **Undo toast** after every capture ("Stone #15 added · Undo").
- **Session summary** at the end: stones captured, rows completed, photos, storage used,
  reminder to back up.
- Implementation (M3): a walk-a-row is the session. The screen wake lock (`useWakeLock`) is
  held from the start of the walk until "End walk", and asked for again when the app returns
  to the foreground. "End walk" opens the summary for that walk: stones and photos since it
  started, skipped stones, whether the row end was set, device storage used, and the
  one-tap backup banner. Inside the camera, capture feedback and Undo stay in the camera.
  Toasts are for actions taken with the camera closed. Shutter, Gap, Skip, Next stone,
  Reverse and row start/end vibrate.

---

## 9. Desk mode in detail

- **Queue** of stones filtered by status (default: photographed but not transcribed),
  ordered by section/row/index so families stay together.
- **Layout:** large zoomable/pannable photo (left or top) and form (right or bottom).
  Thumbnails of the whole row for context, scrolled to the current stone.
- **Photo enhancement** (non-destructive, client-side canvas/WebGL): brightness, contrast,
  levels, grayscale, invert, unsharp mask, CLAHE-style local contrast, emboss/"raking
  light" simulation, rotate/straighten, perspective correct. Weathered marble that is
  unreadable in the raw photo is often readable with local contrast + emboss.
- **Form, keyboard-first:**
  - `Tab` through fields, `Enter` = save & next, `Ctrl+Enter` = save & add another person on
    this stone, `Ctrl+.` = mark uncertain, `Ctrl+I` = insert `[illegible]`.
  - **Inscription** box preserves line breaks, entered _as carved_.
  - **People on this stone**: each with names, dates, age-at-death, relationship text.
  - **Smart date fields** accept free text and show the parsed interpretation live (§10.1).
  - **Name autocomplete** from names already in this cemetery and the imported index.
- **Matching panel:** if the cemetery has imported index records, likely matches for the
  current stone are listed (name similarity + dates + row) — one click to link.
- **Verify pass:** a second, faster pass (by the same or another person) that confirms each
  transcription against the photo; moves status to _verified_.

Implementation notes (M4, `features/transcribe/`, route `cemetery/:id/transcribe?stone=`): the
queue is a snapshot taken when the list is chosen, so a stone saved as transcribed keeps its
place (Previous goes back to it). Stones outside any row follow the rows, by v1 grid cell,
then plot label. Every move (Save & next, Previous, a neighbour, changing the list) saves what
was typed, and the move doesn't wait for the write. Opening one stone that isn't in the
default list (from the stone sheet's "Transcribe") widens the list to all stones.

Photo viewer (M4, `features/transcribe/viewer/`): one WebGL2 fragment pass. Zoom, pan,
straighten and perspective (two keystone amounts) are a single canvas-pixel → source-uv 3×3
matrix, so the original photo is sampled once, sharply, at any zoom. Local contrast is
contrast-limited detail around a local mean read from the mipmap chain (a wide blur at
constant cost); raking light is a directional derivative with a choosable light direction.
Presets: weathered marble, faint lettering, raking light. Tone settings carry across stones
for the session (consecutive stones usually need the same treatment); geometry resets per
photo. Nothing is saved to the photo. Canvas density is capped at 2×. Without WebGL2: a plain
image with the CSS-filter subset (brightness, contrast, grey, invert, rotate). 60 fps is
checked on a real GPU with `playwright.gpu.config.ts` (CI's software GL can't measure it).

Form (M4, `TranscribeForm`, `data/transcribe.ts` `saveTranscription`): inscription, one block
per person (name as carved, born, died, age, relationship), epitaph. **Enter** is Save & next
in one-line fields only; in the inscription and epitaph it's a real line break (§10.5), so
Tab out first. **Ctrl+.** puts `[?]` after the word at the caret (or the selection); in a
date or age it adds a trailing `?`, which the parser reads as "about". **Ctrl+I** inserts
`[illegible]`. Both edit through the browser, so its own undo works. **Ctrl+Enter** saves
and adds a person. People get their ids up front, so saving again never duplicates them; a
person emptied out is removed, and one typed again afterwards gets a new id (a tombstone
always wins on merge, §21.2).

Name autocomplete (M4, `features/transcribe/name-index.ts`): an in-memory index of the
cemetery's people (imported index records are people too), rebuilt when they change. A
suggestion is a whole name whose words start with every typed word (carved abbreviations
match both ways, `Wm` ↔ `William`; accents ignored), most used first; when none fits, the last
word is completed to a known surname (`Sarah Whit` → `Sarah Whitcomb`). Arrow keys pick one
and Enter takes it; with nothing picked, Enter is still Save & next.

Verify pass (M4, `data/transcribe.ts` `verifyStone`): on a transcribed or verified stone the
desk header has **Verified & next** (Ctrl+Shift+Enter). It saves any edits and sets
`verified` in one undo step, then moves on without waiting. A stone with nothing transcribed
isn't verified (a toast says so). The "Transcribed, not verified" list is the verify queue.
Any later change to a transcription field clears the mark (§2.2); saving unchanged text
doesn't. "Unmark verified" takes it off by hand.

---

## 10. Historic cemetery specifics

### 10.1 Dates

A `FuzzyDate` (§19) stores structured parts plus the original text. The parser must handle:

- Partial: `1887`, `Mar 1887`, `March 1887`, `3/1887`.
- Qualified: `abt`, `about`, `c.`, `ca.`, `circa`, `bef`, `aft`, `bet 1880 and 1885`, `1880–85`.
- Ordinals and archaic forms: `12th`, `ye 3d of May`, `Febry`, `Sept`, `inst.` (this month),
  `ult.` (last month) — stored with original text; resolved only when context allows.
- **Dual dating** (Julian/Gregorian transition, pre-1752 British colonies):
  `Feb 10, 1709/10` → year 1710 (new style), dual year preserved.
- **Age at death:** `aged 72y 3m 5d`, `Æ 72`, `AE. 72 yrs`, `in his 73rd year`
  (= age 72 — a classic transcription error). Birth date is **calculated** from death date
  and age, and marked `qualifier: 'calculated'`. The 19th-century convention of computing
  age by subtracting y/m/d (not day counts) should be used and documented.
- **Other calendars** (international, §15): Hebrew dates on Jewish stones (convert with
  `@hebcal/core`), others later.
- Numeric ambiguity (`3/4/1890`) resolves by the cemetery's locale setting, with the
  ambiguity flagged.

Implementation notes (M1, `src/domain/dates/`):

- Birth from age uses the carver's arithmetic (the "8870 rule"): subtract y/m/d separately,
  borrowing 30 days per month and 12 months per year, then clamp the day to the month's
  length. Precision follows the inputs (age in years only gives a birth year only).
- Quaker month numbers (`3rd mo.`) are read directly from 1752 on. Before 1752, month 1 is
  March, the date is marked `julian`, and Jan–Mar are flagged `ambiguous` (old-style year).
- `formatDate` writes a canonical, GEDCOM-like English form (`abt 10 Mar 1887`,
  `bet 1880 and 1885`, `10 Feb 1709/10`, `1790 O.S.`) that `parseDate` reads back to the same
  parts. Localized display is the UI's job.

Implementation notes (M4, `features/transcribe/date-preview.ts`): under each Born / Died / Age
field the desk form shows how the text was read, in the UI language (`about March 3, 1850`,
`between 1880 and 1885`, `… · dual dated 1709/10`), with a warning when day and month could
swap (the other reading is shown; the cemetery's `dateLocale` decides), for old-style Jan–Mar
years, and for `inst.`/`ult.` without a month. With Born blank, the birth calculated from Died
and Age is shown under Born and saved (`qualifier: 'calculated'`). It stays blank in the form
and is recalculated whenever Died or Age changes; typing a Born replaces it.

### 10.2 Names

Structured name parts **plus** an `asCarved` string: given, middle, surname, maiden/birth
surname, prefix (Rev., Dr., Capt.), suffix (Jr., Sr., 2d, III), nickname. Common
abbreviations are recognized for search but preserved in display: `Wm.` William,
`Jno.` John, `Chas.` Charles, `Thos.` Thomas, `Geo.` George, `Jas.` James, `Benj.`
Benjamin, `Saml.` Samuel, `Eliz.` Elizabeth. Search uses phonetic matching (Soundex and
Daitch–Mokotoff) so `Schmidt`/`Smith`/`Smyth` cluster.

### 10.3 Relationships carved on stones

Store the carved phrase verbatim (`wife of`, `consort of`, `relict of` (= widow),
`son of John & Mary`, `dau. of`) **and** structured links between Person records on the
same or different stones.

Implementation notes (M4, `domain/relations.ts`, `data/people.ts`): `Person.relations`
entries read "personId is my <type>" and are stored on both people with inverse types
(parent ↔ child; spouse, sibling, other are symmetric), so linking, unlinking and removing a
person are one undo step each and never leave one side dangling. "Link to a person…" (desk
form, per person) preselects the type from the carved phrase and lists people on the same
stone first, then those matching the names after "of" (given names expanded, surnames by
Soundex; a shared surname carries to each name, else the person's own), then the rest by
name. The stone detail screen shows the carved phrase and the links, and removes people
with their links.

### 10.4 Stone types and features worth capturing

- Headstone/footstone pairs (footstones often bear only initials) — linked monuments.
- Family plots, curbing, enclosures, fences, gates — map features that group stones.
- Fieldstones (uninscribed) and depressions — real burials with no inscription.
- Unmarked burials known from records — Person with no Monument, optional approximate area.
- Relocated stones (stone not over the burial), fragments, stones in walls.
- **Symbols:** willow & urn, death's head, winged soul effigy/cherub, lamb (child),
  clasped hands, hand pointing up/down, broken column, draped urn, IHS, cross, Star of
  David, Masonic square & compass, Odd Fellows three links, Woodmen of the World tree stump,
  GAR star, and free text.
- **Carver signatures** (often at the base) — historians value these highly.
- **Military:** conflict, rank, unit (`Co. B, 12th Vt. Inf.`), government-issue marker type.
- Epitaph, inscription language, script.

### 10.5 Transcription conventions

Documented in-app and stored per cemetery: `[illegible]`, `[?]` after an uncertain
character/word, `[broken]`, `/` or real line breaks, `[on back]`. Users can choose a
convention preset; the export notes which convention was used.

Implementation notes (M4, `domain/conventions.ts`, `features/transcribe/`): three presets,
`as-carved` (default: `[illegible]`, `[?]`, `[broken]`, `[on back]`, real line breaks),
`slash-lines` (the same marks, `/` between lines) and `dashes` (`---` and `(?)`). Desk
mode's "Conventions" button shows what each mark means and sets the cemetery's preset;
Ctrl+I and Ctrl+. type that preset's marks. A saved inscription records the convention it was
typed in (`Inscription.convention`): a changed text takes the cemetery's current one, so
changing the preset never relabels text already typed. The `.sbs` README states the
cemetery's convention with its marks. The desk form also has the §10.4 fields: symbol chips
(`SYMBOLS`) plus free-text symbols, carver, inscription language (BCP 47) and script
(ISO 15924, Fraktur = `Latf`), and per person a "Military service" section (conflict, rank,
unit, `marker` for the government-issue or society marker).

---

## 11. Building the corpus

- **Status lifecycle per stone:** `located` → `photographed` → `transcribed` → `verified`,
  plus flags (`needs-revisit`, `uncertain-position`, `illegible`). Map coloring by status.
- **Progress dashboard:** per section and row, percent at each status; list of
  needs-revisit items for the next field trip (exportable as a field checklist).
  (M5, `features/progress/`, route `cemetery/:id/progress`, linked from the cemetery header:
  counts by status for the cemetery, each section and row, and stones in no row; percentages
  round down, so 100% means every stone. The checklist lists stones flagged `needs-revisit`
  in walking order with their other flags and notes; it prints, or downloads as CSV.)
- **Import existing indexes** (high value for historic cemeteries): CSV / spreadsheet from a
  historical society, WPA/DAR survey, church register, interment card file. A column-mapping
  UI (with saved presets) creates Person records with `source: imported-index` and no stone.
  During transcription and in a dedicated **Match** view, these are matched to stones. The
  survey becomes _verify and place_ instead of _start from nothing_, and index records with
  no stone highlight probable unmarked or lost graves.
  (M5 import: `data/format/csv.ts` reads CSV (BOM, `,` `;` or tab, quoted line breaks);
  `data/format/index-csv.ts` guesses the column fields from headers and builds people;
  `data/index-import.ts` writes them as one undo step and keeps presets (by folded header,
  with header-row flag and date order) in device settings. The UI is on the People page.
  Imported people get no `asCarved` (that is the stone's spelling), `matchStatus: unmatched`,
  and one source `{ kind: 'imported-index', ref: '<file>, <record no. or line N>', location }`.
  A blank Born with Died + Age becomes the calculated birth, as in desk mode.)
  (M5 Match view, route `cemetery/:id/match`, linked from More and from People: scoring in
  `domain/index-match.ts` (name against the stone's people or its inscription words, death
  and birth years, index section / row / plot against the stone's; a clear date conflict
  sinks a candidate, place alone never makes one). Writes in `data/index-match.ts`, each one
  undo step: **Same person** merges the record into the stone's person (keeps the carved
  name, fills blank fields, adds the source and the record's id to `aliases`, tombstones the
  record); **On this stone** attaches the record; **No stone found** sets
  `matchStatus: no-stone-found` (likely unmarked or lost graves). **Unlink** detaches, or
  splits a merge back out as a new record and clears the fields the merge filled (those
  stamped with the merge). The desk-mode matching panel (§9) is not built yet.)
- **Duplicate detection** within a dataset: same/similar name + compatible dates, or two
  stones within ~1 m with similar transcriptions. Reviewed, never auto-merged.
- **Search:** full-text over names (normalized, abbreviation-aware, phonetic), inscriptions,
  notes; filters by date range, section, status, symbol, material, veteran.
  (M5, `features/people/search.ts`, route `cemetery/:id/people`: MiniSearch over name text,
  surname sound keys (Soundex + Daitch–Mokotoff) and stone/person text. Every query word must
  match by spelling, prefix (or 1-edit fuzz from 5 letters) or, for surnames, by sound.
  "Date range" is the death year, falling back to burial then birth. With no query, results
  are in `Intl.Collator` order by surname, given names, death year.)
- **Multiple cemeteries per device**, each with a globally unique ID.
- **Cemetery setup shortcuts:** search by name/place (Nominatim geocoder), or "cemeteries
  near me" via the OpenStreetMap Overpass API (`landuse=cemetery`, `amenity=grave_yard`),
  which can **prefill the name and boundary polygon**. US cemeteries can also reference
  their USGS GNIS feature ID.

---

## 12. Sharing and combining partial datasets

The explicit goal: _"if you had done part of a cemetery, you could combine that with
someone else's partial data to make a more complete map."_

### 12.1 Mechanism (no server)

- **Full export** (`.sbs` zip, §20): everything including photos.
- **Share packet**: only records changed since a chosen point (or since last shared with a
  given person), optionally without full-res photos. Small enough to email or message.
- Import of either into an existing cemetery triggers the merge flow; into no cemetery
  creates a new one.
- Optional later: share via Web Share API / QR code for small packets; cloud sync (§27).

### 12.2 What makes merging hard and how v2 handles it

1. **Same record edited in two places** → per-field Hybrid Logical Clock stamps give a
   deterministic last-writer-wins result for each field independently; true conflicts
   (both changed the same field since their common ancestor) are surfaced for review.
2. **Same stone recorded independently by two people** (different IDs) → entity matching:
   candidates scored by distance (scaled by both accuracies), row/plot address, name
   similarity, date compatibility, and photo similarity (perceptual hash). The user reviews
   matches side by side with photos and accepts/rejects. Accepted matches are merged and an
   alias (`sameAs`) is recorded so future packets from the same partner merge automatically.
3. **Same cemetery created independently** (different cemetery IDs) → the import flow
   suggests "this looks like _Oak Hill Cemetery_ on this device" by name similarity and
   boundary overlap; the user confirms, and the cemetery IDs are aliased.
4. **Coordinates systematically offset** → dataset alignment using accepted matched pairs
   (§21.4), previewed before applying.
5. **Different row/section naming** → section/row mapping step in the merge wizard.

### 12.3 Merge wizard UX

Summary first ("142 new stones, 37 likely duplicates, 4 conflicts"), then focused review
queues, then apply. Every merge is a single undoable operation and is logged in history.

---

## 13. Export, publishing, and visitor mode

### 13.1 Exports

- `.sbs` (native, lossless, includes photos) and `.sbs.json` (no photos).
- **CSV** (one row per person, with stone/position columns) for spreadsheets.
- **GeoJSON** and **KML** for GIS / Google Earth.
- **Printable booklet** via print CSS (no heavy PDF library): title page, cemetery
  description and map, section maps, alphabetical index (surname, given, dates, location),
  per-row listings with thumbnails, transcription conventions, contributors and license.
- Optional later: GEDCOM 7 (people + burial facts) for genealogy software.

### 13.2 Publishing

Finished (or partial) cemeteries can be published as read-only datasets on the same GitHub
Pages site: `public/data/<country>/<state>/<slug>/` containing the JSON and downscaled
photos, plus a catalog index. Initially this is a documented manual step (export a
"publish bundle", commit via PR). The app renders published cemeteries at a stable URL
(`#/c/<slug>`). Watch GitHub repo size limits (keep published photos ≤ ~200 KB and
consider a separate data repository if it grows).

### 13.3 Visitor mode

Search a name → see the stone on the map → **"Take me there"**: live GPS position,
compass bearing (DeviceOrientation; iOS requires an explicit permission prompt), distance,
and plain-language hints ("Section B, Row 4, 6th stone from the east path"). Shareable link
to a specific grave. Works offline once the cemetery is cached.

---

## 14. Data safety

Losing a weekend of fieldwork must be nearly impossible.

- **iOS Safari evicts all script-writable storage after 7 days without user interaction**
  for sites not added to the home screen. Mitigations: prominent "Install app" prompt with
  per-platform instructions; `navigator.storage.persist()`; a persistent **"N stones not
  backed up"** indicator; backup reminders after each session and every few days.
- **Backups:** one-tap full export; on Chromium, optionally write to a user-chosen folder via
  the File System Access API; on mobile, the Web Share API to send to Files/Drive/email.
- **Storage dashboard:** usage per cemetery, photos vs data, quota estimate
  (`navigator.storage.estimate()`), warnings at 80%.
- **Photo sizing:** default long edge 1600 px JPEG (~300–500 KB). A 2,000-stone cemetery
  with front+back photos is ~1–2 GB, so: configurable size (1200/1600/2400/original),
  thumbnails stored separately (~20 KB), per-section export to keep files manageable.
- **Never destructive:** deletes are tombstones; history per record; merges undoable.
- **Schema migrations** are versioned and tested; the app refuses to open data from a newer
  schema version rather than corrupting it.
- **Implementation notes (M1):** a backup stores `backup:<cemeteryId>` = `{ hlc, at }` in
  `settings`, with the HLC taken _before_ the export is collected. A stone is "not backed up"
  when it, or a person or photo linked to it, has a stamp (or `createdAt`/tombstone) newer
  than that HLC; imported records keep their original stamps, so they only count when newer.
  The reminder is a toast on app start when unsaved work exists, the affected cemetery's last
  backup is ≥ 3 days old (or missing), and no reminder was shown in the last 24 h. One tap
  exports every live cemetery as its own `.sbs`: Web Share on coarse-pointer devices, else a
  remembered folder (`backupFolder` handle) via File System Access, else a download. If the
  export outlasts the tap's user activation, a toast offers a fresh tap to deliver it.
  `navigator.storage.persist()` is requested once a cemetery exists (and after create/import).
- **DB namespacing:** v2's IndexedDB is named `stonebystone` (not generic), because all
  GitHub Pages projects under `thulrus.github.io` share one origin.

---

## 15. International support

Built in from the start even though the first users are in the US.

- **UI translation** with ICU message format (Lingui); English first; RTL layout
  support (logical CSS properties) for Hebrew/Arabic.
- **Names:** flexible parts (multiple surnames, patronymics, family-name-first order);
  original script plus optional romanization; Unicode-aware search and sort (`Intl.Collator`).
- **Dates:** locale-aware numeric parsing; Julian/Gregorian dual dating; Hebrew calendar;
  extensible `calendar` field for others (Islamic/Hijri, etc.).
- **Inscriptions:** language and script per inscription; mixed-language stones common.
- **Units:** metric/imperial setting for distances and dimensions.
- **Imagery:** global sources plus custom tile URLs (§24); placement never depends on a
  US-only service.
- **Addresses/admin areas:** country + free-form admin hierarchy, not US state fields.

---

## 16. Privacy, ethics, and stone care

- **Living people:** stones often have a surviving spouse's name and birth year pre-carved.
  The app flags persons with a birth date and no death date within the last ~100 years as
  _possibly living_; they're excluded from public exports and published data by default.
- **Recent burials** (configurable, e.g. last 25 years) can be excluded from publishing.
- **Permission:** a setup note about getting owner/sexton permission for active or private
  cemeteries; publishing asks the user to confirm they have the right to share.
- **Licensing:** each cemetery has a license (default suggestion CC BY 4.0) and a
  contributor list, carried through all exports.
- **Stone care guidance in-app:** do not use chalk, shaving cream, flour, wire brushes, or
  rubbings on fragile stones; use a mirror/reflector for raking light, a soft brush and plain
  water at most; shoot straight-on; avoid midday flat light. Respect for the dead and for
  fragile historic material is part of the product's character.
- **Telemetry:** none. No analytics, no third-party calls except map tiles, geocoding when
  the user searches, and (opt-in) the AI provider.

---

## 17. Outdoor usability and accessibility

- **Sunlight theme:** high contrast, large type, no thin grays; plus normal light/dark.
- **Thumb zone:** primary actions in a bottom bar/bottom sheet; minimum 48×48 px targets,
  larger for the shutter and "Next stone"; works with gloves (no precise taps required).
- **Haptics** on capture and row actions (`navigator.vibrate` where supported).
- **Battery:** GPS on demand, screen-awake only during an active capture session
  (Screen Wake Lock API), no background polling.
- **Accessibility:** WCAG 2.2 AA; full keyboard support in desk mode; screen-reader labels;
  reduced-motion support; color is never the only status indicator (icons + labels).
- **Performance:** instant capture loop; map stays smooth with 10,000 stones.

---

## 18. AI-assisted transcription (later)

Low priority, opt-in, bring-your-own API key stored only in the browser.

- "Draft transcription" sends the (enhanced) photo to a vision-capable model and returns a
  structured draft: inscription as carved, people, dates, relationships, symbols. The user
  always reviews; drafts are marked `source: ai-draft` until accepted.
- Batch mode over the transcription queue with a cost estimate shown first.
- Provider-agnostic adapter interface; start with one provider.
- Clear disclosure that photos leave the device when this is enabled.
- On-device OCR (e.g. Tesseract.js) was considered; it performs poorly on carved,
  weathered stone and is not planned.

---

## 19. Data model

All entities use **UUIDv7** (time-sortable, globally unique). Every mutable field carries a
**stamp** (Hybrid Logical Clock + contributor) for merging. Shown in TypeScript.

```ts
type ID = string; // UUIDv7
type HLC = string; // "<wallMillis>-<counter>-<nodeId>", lexically sortable
interface Stamp {
  hlc: HLC;
  by: ID;
} // by = Contributor.id

interface Stamped {
  id: ID;
  cemeteryId: ID;
  createdAt: HLC;
  stamps: Record<string, Stamp>; // field path -> last write
  deleted?: Stamp; // tombstone
  aliases?: ID[]; // IDs merged into this record (sameAs)
}

interface Contributor {
  id: ID;
  displayName: string;
  contact?: string;
}

interface Cemetery {
  id: ID;
  aliases?: ID[];
  name: string;
  altNames?: string[];
  location?: LngLat;
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  country?: string; // ISO 3166-1 alpha-2
  adminAreas?: string[]; // e.g. ["Vermont", "Windsor County", "Reading"]
  established?: FuzzyDate;
  status?: 'active' | 'inactive' | 'abandoned' | 'unknown';
  denomination?: string;
  description?: string;
  accessNotes?: string;
  license?: string; // SPDX id, e.g. "CC-BY-4.0"
  contributors: ID[];
  externalIds?: {
    gnis?: string;
    osm?: string;
    findAGrave?: string;
    [k: string]: string | undefined;
  };
  settings: {
    imagery?: string; // tile source id
    units: 'metric' | 'imperial';
    dateLocale: string; // for numeric date parsing
    transcriptionConvention: string;
    photoMaxPx: number;
  };
  stamps: Record<string, Stamp>;
  legacy?: { v1Id?: string };
}

interface Section extends Stamped {
  name: string;
  order?: number;
  boundary?: GeoJSON.Polygon;
  notes?: string;
}

interface Row extends Stamped {
  sectionId?: ID;
  label: string;
  order?: number;
  line?: GeoJSON.LineString; // optional geometry
  notes?: string;
}

type PositionSource =
  | 'gps'
  | 'gps-averaged'
  | 'map'
  | 'row-interpolated'
  | 'relative'
  | 'overlay'
  | 'legacy-grid'
  | 'aligned'
  | 'imported';

interface Position {
  lng: number;
  lat: number;
  accuracyM?: number;
  source: PositionSource;
}

type MonumentStatus = 'located' | 'photographed' | 'transcribed' | 'verified';

interface Monument extends Stamped {
  kind: string; // headstone, footstone, ledger, fieldstone, unmarked, ...
  position?: Position;
  facingDeg?: number; // direction the inscription faces
  address?: {
    sectionId?: ID;
    rowId?: ID;
    rowIndex?: number;
    plotLabel?: string;
  };
  legacyGrid?: { row: number; col: number };
  material?: string;
  condition?: string[];
  symbols?: string[];
  dimensionsCm?: { h?: number; w?: number; d?: number };
  carver?: string;
  inscription?: {
    text: string;
    language?: string;
    script?: string;
    convention?: string;
  };
  epitaph?: string;
  // photos: query Photo by monumentId (see §2.2)
  verified?: Stamp; // explicit; status is otherwise derived (§2.2)
  status: MonumentStatus;
  flags?: string[]; // needs-revisit, uncertain-position, illegible, relocated
  relatedMonuments?: {
    id: ID;
    relation: 'footstone-of' | 'part-of' | 'replaces';
  }[];
  featureIds?: ID[]; // family plot / enclosure
  tags?: string[];
  notes?: string;
}

interface FuzzyDate {
  original: string; // exactly what was carved/entered
  y?: number;
  m?: number;
  d?: number;
  qualifier?: 'exact' | 'about' | 'before' | 'after' | 'between' | 'calculated' | 'estimated';
  y2?: number;
  m2?: number;
  d2?: number; // end of range for 'between'
  calendar?: 'gregorian' | 'julian' | 'hebrew' | string;
  dualYear?: number; // e.g. 1709 in "1709/10"
  ambiguous?: boolean;
}

interface PersonName {
  asCarved?: string;
  prefix?: string;
  given?: string;
  middle?: string;
  surname?: string;
  birthSurname?: string;
  suffix?: string;
  nickname?: string;
  script?: string;
  romanized?: string;
}

interface Person extends Stamped {
  monumentId?: ID; // absent = unmarked / not yet matched
  name: PersonName;
  sex?: 'f' | 'm' | 'u';
  birth?: FuzzyDate;
  death?: FuzzyDate;
  burial?: FuzzyDate;
  age?: { y?: number; m?: number; d?: number; original: string };
  relationshipText?: string; // "wife of John", "relict of", "son of J & M"
  relations?: {
    type: 'spouse' | 'parent' | 'child' | 'sibling' | 'other';
    personId: ID;
  }[];
  military?: {
    conflict?: string;
    rank?: string;
    unit?: string;
    notes?: string;
  };
  possiblyLiving?: boolean;
  occupation?: string;
  sources?: {
    kind: 'stone' | 'imported-index' | 'record' | 'family' | 'ai-draft' | 'other';
    ref?: string;
    note?: string;
    /** Where the source puts the burial, as written there (index section / row / plot). */
    location?: { section?: string; row?: string; plot?: string };
  }[];
  matchStatus?: 'unmatched' | 'matched' | 'no-stone-found';
  externalIds?: Record<string, string>;
  notes?: string;
}

interface Photo extends Stamped {
  monumentId: ID;
  role: 'front' | 'back' | 'detail' | 'context' | 'other';
  takenAt?: string; // ISO 8601
  position?: Position;
  width: number;
  height: number;
  bytes: number;
  sha256: string; // exact-duplicate detection across merges
  phash?: string; // perceptual hash for match scoring
  // blob + thumbnail stored in separate tables keyed by id
}

interface MapFeature extends Stamped {
  kind:
    | 'path'
    | 'road'
    | 'building'
    | 'tree'
    | 'gate'
    | 'fence'
    | 'wall'
    | 'enclosure'
    | 'family-plot'
    | 'water'
    | 'large-monument'
    | 'bench'
    | 'other';
  geometry?: GeoJSON.Geometry;
  legacyCells?: { row: number; col: number }[]; // v1 roads before pinning
  name?: string;
  notes?: string;
  tags?: ID[]; // TagDef ids (v1 pines get "conifer")
  style?: { color?: string }; // v1 road colors
}

interface Overlay extends Stamped {
  kind: 'plat' | 'drone' | 'legacy-grid' | 'other';
  name: string;
  imageId?: ID; // blob table; absent for legacy-grid
  grid?: { rows: number; cols: number; validCells?: string[] }; // legacy-grid only
  controlPoints: { x: number; y: number; lng: number; lat: number }[];
  transform?: number[]; // computed affine, 6 values
  opacity: number;
}

interface TagDef extends Stamped {
  name: string;
  color?: string;
  description?: string;
}

interface HistoryEntry {
  // append-only, compactable, for the History view
  id: ID;
  cemeteryId: ID;
  entityId: ID;
  entityType: string;
  at: HLC;
  by: ID;
  op: 'create' | 'update' | 'delete' | 'merge' | 'import';
  fields?: Record<string, { from?: unknown; to?: unknown }>;
  group?: ID; // shared by all entries of one import/merge (undone as one step)
}
```

**Storage (Dexie / IndexedDB, DB name `stonebystone`):** tables `cemeteries`, `sections`,
`rows`, `monuments`, `persons`, `photos`, `photoBlobs`, `photoThumbs`, `overlayBlobs`,
`features`, `overlays`, `tags`, `contributors`, `history`, `settings`, `tileMeta`.
Compound indexes on `[cemeteryId+status]`, `[cemeteryId+address.rowId+address.rowIndex]`,
`[cemeteryId+name.surname]`. Map tiles live in Cache Storage, not IndexedDB.

Implementation notes (M1): `settings` holds `nodeId`, `clock` (HLC state), `contributorId`,
`lastSeen` (per-contributor max HLC) and `schemaVersion`; WP3 added `cemeteryDefaults`
(`units`, `photoMaxPx` copied into new cemeteries), `onboarded` (first-launch name prompt
answered or skipped), `backup:<cemeteryId>`, `backupRemindedAt` and `backupFolder` (§14).
"Original" photo quality is stored as `photoMaxPx: 1000000` (`PHOTO_ORIGINAL_PX`) so the
schema's integer ≥ 1 rule holds and nothing is ever downscaled. Dexie 4 will open a database whose
version is newer than the code declares, so `openDatabase()` first probes the raw IndexedDB
version and the stored `schemaVersion` and refuses (`NewerSchemaError`) before Dexie touches
it. `status` is materialized but never stamped. Undo of an edit writes the old values back as
new stamped writes; undo of a create is a tombstone; undo of a delete removes the local
tombstone; undo of an import/merge group restores snapshots exactly and drops the group's
history entries.

Implementation notes (M3): rows in `photoBlobs`, `photoThumbs` and `overlayBlobs` store
`{ id, bytes: ArrayBuffer, type }`, not a `Blob`, because WebKit refuses Blobs in IndexedDB in
private/ephemeral sessions (`data/blobs.ts`; rows stored as `{ id, blob }` by M2 builds are
still read, so no migration is needed). Bytes are read before the transaction opens. The photo
pipeline (`features/capture/pipeline.ts`) runs in a module worker when `OffscreenCanvas`
exists, else inline: decode with EXIF orientation applied, scale to `photoMaxPx` at JPEG 0.85
(an upright JPEG already within the limit is kept byte-for-byte), thumbnail ≤ 320 px and
≤ 20 KB (quality, then size, steps down), `sha256` of the stored bytes, and a 64-bit DCT
`phash` (16 hex chars) from a 32×32 luma image. EXIF `DateTimeOriginal` (+ `OffsetTimeOriginal`,
else device zone) becomes `takenAt` (else capture time), and EXIF GPS becomes `Photo.position`
with `source: 'gps'`. The "use the phone's camera app" choice is a device preference
(`systemCamera`), not survey data.

---

## 20. File formats

### 20.1 `.sbs` — StoneByStone archive (zip, via `fflate`, streamed)

```
manifest.json      { "format": "stonebystone", "formatVersion": 2, "appVersion": "...",
                     "kind": "full" | "packet" | "publish",
                     "cemeteryId": "...", "createdAt": "...", "createdBy": {contributor},
                     "since"?: "<HLC>", "counts": {...}, "photoQuality": 1600 }
cemetery.json      the Cemetery record
data/sections.json, rows.json, monuments.json, persons.json, features.json,
     overlays.json, tags.json, contributors.json, history.json
photos/<id>.jpg    full-size (omitted or downscaled in light packets)
thumbs/<id>.jpg
overlays/<id>.jpg
schema/            JSON Schemas for the above (self-describing archives)
README.txt         human explanation of the format and license
```

### 20.2 `.sbs.json` — same content as one JSON document, no binaries.

### 20.3 Imports accepted

`.sbs`, `.sbs.json`, v1 `.cem.json` (§22), CSV (with column mapper), GeoJSON (points →
monuments with properties mapped), images (bulk photo import: EXIF GPS/time used to place
and order stones — useful for people who photographed a cemetery with a normal camera app).

JSON Schemas (draft-07) live in `schema/v2/` (one per entity, plus `manifest.json`,
`common.json` and `document.json` for `.sbs.json`) and are validated with Ajv on import.
In `.sbs` zips, JSON is deflated and images are stored uncompressed. An import merges every
record by id as one undoable group, skips photos whose bytes don't match `sha256`, and
detects the file type by content (`data/import.ts`). The format is
documented in `docs/FORMAT.md` (to be written in M1).

---

## 21. Sync and merge algorithm

### 21.1 Clocks

Each device generates a stable `nodeId`. Every write gets an HLC timestamp (max of wall
clock and last seen HLC, plus counter). HLCs are carried in exports, so later merges
compare causally sensible timestamps even with skewed device clocks.

### 21.2 Same-ID merge (deterministic)

For every entity present on both sides, for every field: keep the value with the greater
stamp (ties broken by `nodeId`). Tombstones are stamps too. This is commutative,
associative, and idempotent — merging A into B and B into A yields the same result, and
re-importing the same packet is a no-op. A field is flagged as a **conflict** for optional
review when both sides changed it after the last known common sync with that contributor
(tracked per contributor as the max HLC seen from them).

### 21.3 Cross-ID entity matching (different people, same stone)

For incoming monuments without an ID/alias match, find local candidates within a radius
`r = 3 m + 2 × (accA + accB)` and/or same section+row:
`score = w1·spatial + w2·address + w3·nameSim + w4·dateCompat + w5·photoSim`
where `nameSim` uses Jaro–Winkler over normalized names plus phonetic codes, `dateCompat`
checks FuzzyDate overlap, `photoSim` uses perceptual-hash distance. Thresholds produce
_likely_, _possible_, and _new_. Nothing is auto-merged without user confirmation in v2.0
(an "accept all likely" button is fine). Accepted pairs merge field-wise (as §21.2, with the
incoming record's stamps) and record `aliases`. Persons are matched similarly within the
matched monuments.

### 21.4 Dataset alignment

Given ≥2 accepted matched pairs with coordinates from different sources, compute a
similarity transform (translation, rotation, uniform scale; least-squares, Umeyama method)
from incoming → local; show residuals and a before/after preview; apply to all incoming
positions not already matched (`source: 'aligned'`). Optional; skipped when residuals
suggest no systematic offset.

### 21.5 Cemetery matching

If the incoming cemetery ID is unknown, suggest local cemeteries by name similarity and
boundary/centroid distance (< 1 km). On confirmation, the IDs are aliased.

---

## 22. Migration from v1

v1 users (if any) must not lose data. v2 deploys at the same URL and origin, so it can
read v1's IndexedDB directly.

### 22.1 Sources

- **Files only:** `.cem.json`, `schema_version: "1.0.0"`, optional `landmarks`, `roads`, `groups`,
  `change_log`. Grid shape may appear as `grid.validCells: string[]` ("row,col") **or**
  `grid.shape: {row, col}[]` (Willow Creek sample). Sets were serialized as arrays.
- Reading v1's IndexedDB (`cemetery-db`) directly was **dropped** (§2): v1 holds no real user
  data. Anyone who has v1 data exports a `.cem.json` from the `v1-final` build.

### 22.2 Flow

The Import screen detects a v1 file by `schema_version` and runs the converter. The result is a
new cemetery (or a merge, if its aliased v1 ID already exists on the device).

### 22.3 Field mapping

| v1                                                      | v2                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cemetery.id`                                           | New UUIDv7; original stored in `legacy.v1Id` (needed because v1 ids like `"current"` are not unique).                                                                                                              |
| `cemetery.name`, `license`                              | Same.                                                                                                                                                                                                              |
| `cemetery.grid` (`rows`, `cols`, `validCells`/`shape`)  | `Overlay { kind: 'legacy-grid', grid }`, unpinned. Cemetery opens in schematic view.                                                                                                                               |
| `modified_by` strings                                   | `Contributor` records (one per distinct string; `"anonymous"` → "Unknown (v1)").                                                                                                                                   |
| `grave`                                                 | `Monument { kind: 'headstone' (default), legacyGrid, address.plotLabel = plot }`, status `transcribed` if any person data, else `located`.                                                                         |
| `grave.properties.name/birth/death`                     | One `Person` on that monument. Name split heuristically (prefix/suffix tokens recognized; last remaining token = surname), `asCarved` = original string. ISO dates → `FuzzyDate { qualifier: 'exact', original }`. |
| `inscription`                                           | `monument.inscription.text`.                                                                                                                                                                                       |
| `notes`                                                 | `monument.notes`.                                                                                                                                                                                                  |
| `deleted`                                               | Tombstone.                                                                                                                                                                                                         |
| `group_ids`                                             | `TagDef` per group (name, color, description) and `monument.tags`.                                                                                                                                                 |
| `geometry` (GeoPoint, if any)                           | `position { source: 'imported' }`.                                                                                                                                                                                 |
| `last_modified` / `modified_by`                         | Stamps for all migrated fields, HLC derived from `last_modified`.                                                                                                                                                  |
| `landmark` (bench, tree, pine, building, statue, other) | `MapFeature` with `legacyCells: [grid]`; statue → `large-monument`, pine → `tree` (+ tag "conifer").                                                                                                               |
| `road.cells`, `color`                                   | `MapFeature { kind: 'path', legacyCells }`, color kept as a style property.                                                                                                                                        |
| `change_log`                                            | `HistoryEntry` records with `op: 'import'` context, read-only.                                                                                                                                                     |

Identity rules (settled in M1): monuments, tags and features keep their v1 UUID in
`aliases`; persons get `v1-person:<grave uuid>`, the grid overlay `v1-grid`, the pine tag
`v1-tag:conifer`. Re-import first looks for a monument holding one of the file's grave UUIDs
(then `legacy.v1Id` + name) and reuses the ids it finds, so the same-ID merge is a no-op.
Contributors and history entries get deterministic UUIDv8 ids (SHA-256 of the name, or of
the change-log entry), so every device derives the same ones. The converted data is
validated against the v2 schemas before it is written.

### 22.4 Pinning the legacy grid to the map

"Place this grid on the map": the user taps 2 cells and the matching real-world spots
(similarity transform), or 3+ (affine), with live preview over imagery and residuals. On
apply: every monument with `legacyGrid` gets `position { source: 'legacy-grid',
accuracyM ≈ residual + cell size }`; `legacyCells` features become polygons (union of cell
squares) or lines. Users can also convert grid rows into `Row` records ("treat each grid
row as a cemetery row") so walk-a-row and the schematic view work immediately.

### 22.5 Tests

All four files in `samples/` become fixtures in `tests/fixtures/v1/`, . Tests assert counts, field mapping, tags,
`shape`/`validCells` handling, deleted records, and idempotency (importing twice does not
duplicate — keyed by v1 UUIDs, which are preserved as v2 aliases).

---

## 23. Architecture and tech stack

### 23.1 Stack

| Concern     | Choice                                                                                  | Notes                                                             |
| ----------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Language/UI | TypeScript (strict), React 19                                                           | Familiar; large ecosystem.                                        |
| Build       | Vite                                                                                    | `base: '/StoneByStone/'`.                                         |
| Styling     | Tailwind CSS v4 + a small component layer (Radix primitives for dialogs, sheets, menus) | Accessible primitives.                                            |
| Routing     | React Router with **hash routing**                                                      | Avoids GitHub Pages deep-link 404s entirely.                      |
| Storage     | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`)                                          | Reactive queries; UI state in Zustand.                            |
| PWA         | `vite-plugin-pwa` (Workbox), `registerType: 'prompt'`                                   | Correct scope under base path; update prompt.                     |
| Map         | MapLibre GL JS                                                                          | Rotation, WebGL performance, raster + image sources. Lazy-loaded. |
| Geo math    | Small in-house module + selected `@turf/*` packages                                     | Projection onto lines, distances, transforms.                     |
| Zip         | `fflate`                                                                                | Streaming, small.                                                 |
| Validation  | Ajv (JSON Schema) for files; Zod optional for forms                                     |                                                                   |
| Search      | MiniSearch + custom normalizers (abbreviations, phonetics)                              |                                                                   |
| Dates       | Custom FuzzyDate parser (heavily tested); `@hebcal/core` for Hebrew                     |                                                                   |
| IDs         | `uuid` v7                                                                               |                                                                   |
| i18n        | Lingui (ICU messages, compile-time extraction)                                          |                                                                   |
| Images      | Canvas/OffscreenCanvas for resize; WebGL for enhancement filters                        |                                                                   |
| Testing     | Vitest + Testing Library; Playwright for e2e                                            | Replaces Jest.                                                    |
| Lint/format | ESLint (flat config) + Prettier; Husky + lint-staged                                    |                                                                   |

### 23.2 Source layout

```
src/
  app/            shell, routing, providers, update prompt, install prompt
  domain/         pure TS: types, FuzzyDate parser, name parsing, HLC, merge, matching,
                  alignment, status rules — no React, no IndexedDB, 100% unit-tested
  data/           Dexie schema, repositories, migrations, v1 importer, file formats (sbs, csv, geojson)
  geo/            projections, row interpolation, affine/similarity transforms, tile caching
  features/
    cemeteries/   home list, create (geocoder/Overpass), setup
    map/          MapLibre wrapper, layers (stones, rows, features, overlays), schematic view
    capture/      camera, walk-a-row session, quick chips, GPS averaging
    transcribe/   queue, photo viewer + enhancement, forms, matching panel
    people/       index, search, person detail
    progress/     dashboards, revisit checklist
    share/        export, packets, import, merge wizard
    publish/      publish bundle, read-only viewer, visitor navigation
    settings/     contributor, storage, language, AI
  ui/             design-system components (Button, Sheet, Chip, Field, Toast, ...)
  i18n/
tests/
  fixtures/v1/    the four v1 sample files
  e2e/
schema/v2/        JSON Schemas
docs/             this plan, FORMAT.md, CONTRIBUTING.md
```

Rule: `domain/` never imports from `data/` or `features/`; features talk to data through
repositories. No component file over ~300 lines.

### 23.3 Repo reset (M0)

Delete v1 `src/`, the v1 `docs/*.md` feature notes, Jest config, and the old hand-written
service worker. Keep `samples/` (moved to `tests/fixtures/v1/`), icons/branding assets,
the GitHub Actions deploy workflow (updated), and `LICENSE` if present. Tag the last v1
commit (`v1-final`) so it can always be recovered.

Concretely, these are removed: `src/`, `dist/`, `schema/` (v1), the `docs/*.md` feature notes
(this plan stays), `IMPLEMENTATION.md`, `PROJECT_SCAFFOLD.md`, `SETUP_GUIDE.md`, `TODO.md`,
`setup.sh`, `.github/copilot-instructions.md`, `jest.config.cjs`, `.eslintrc.cjs`,
`.eslintignore`, `public/service-worker.js`, `public/manifest.json` (now generated by
vite-plugin-pwa), and the landmark PNGs in `public/`. These are kept: the icons and favicon, and
`.github/workflows/deploy.yml` (updated). `README.md` and `CONTRIBUTING.md` are rewritten for v2.

---

## 24. Map imagery and tile sources

Licensing and usage terms vary. Terms were **checked on 2026-11-25** (WP4, #25) and the
presets in `src/features/map/imagery.ts` follow the table below. Re-check before each release
that changes imagery.

| Source                                           | Coverage                       | Use                                                      | Offline caching                                                                |
| ------------------------------------------------ | ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| USGS National Map `USGSImageryOnly` (NAIP-based) | US                             | **Default inside the US**                                | Public domain; the service allows tile export. Caching the cemetery area is OK |
| Esri World Imagery                               | Global, high-res in many areas | Optional, **needs the user's own ArcGIS API key**        | No. Online only (the terms don't grant offline storage)                        |
| OpenStreetMap standard tiles                     | Global                         | **Default outside the US** (street context only)         | **No.** The OSM tile policy forbids "download for offline" and prefetching     |
| EOX Sentinel-2 cloudless                         | Global, ~10 m                  | Not offered: too coarse for stones; 2018+ is NC-licensed | —                                                                              |
| Custom XYZ / WMS URL                             | Any                            | Local government orthophotos, national mapping agencies  | Only when the user states the provider's terms allow it                        |
| User image overlays (plat, drone)                | Any                            | Placement                                                | Stored locally (it's the user's file)                                          |

What the checks found:

- **USGS** (`basemap.nationalmap.gov/.../USGSImageryOnly/MapServer`): USDA NAIP orthoimagery
  (0.6–1 m), credited "USGS The National Map: Orthoimagery". The cache is built to 1:9,028
  (about z16), so the preset sets `maxzoom: 16` and MapLibre over-zooms. Alaska uses 10 m SPOT
  imagery, which is coarse.
- **Esri**: the keyless `server.arcgisonline.com` URLs are licensed only with Esri software or
  an ArcGIS subscription, so a public app can't use them anonymously. The preset uses the
  ArcGIS Static Basemap Tiles service (`arcgis/imagery`, 512 px tiles) with a key the user
  enters. The key stays in the device `settings` table and never goes into exports. Attribution:
  "Powered by Esri" plus the data credits.
- **OSM**: attribution must always be visible; browsers must send a valid Referer (we set no
  restrictive `Referrer-Policy`); no bulk or offline download.
- **Nominatim**: at most 1 request/s; identify via Referer; cache results; **no autocomplete**
  (search runs only on submit).
- **Overpass** (`overpass-api.de`): fine for occasional interactive queries; run only on an
  explicit tap.

**Non-US default (resolves the §27 open question):** no global aerial source we checked allows
keyless use in a public app. Outside the US the default is OpenStreetMap for context. If the
user has entered an Esri key, Esri imagery becomes the default instead. Users can also add their
national mapping agency's orthophoto WMS/XYZ service, and the schematic view (§7.5) needs no
imagery at all. The US check uses coarse bounding boxes (CONUS, Alaska, Hawaii, territories),
so a cemetery just over the Canadian border may default to USGS; the user can switch.

Offline download is limited to the cemetery bounding box + small buffer, zoom ~15–20,
with a size estimate before downloading and per-cemetery deletion. Tiles go in Cache
Storage keyed per source. Attribution is always displayed.

How it works (WP5, #30): offline-capable sources (`allowsOffline`) are given to MapLibre as
`sbs-tile://<source>/{z}/{x}/{y}`, and an `addProtocol` loader reads the source's cache
(`sbs-tiles-<source>`, keys `z/x/y`) before the network. Other sources load directly, so OSM
and Esri tiles never touch a cache, and the service worker needs no tile route. Downloads
cover zoom 15 up to the source's own max (USGS: 16; MapLibre over-zooms), at most 4,000
tiles. The device-only `tileMeta` table records which tiles each cemetery downloaded, so
deleting one cemetery's download keeps tiles another still uses.

Geocoding uses Nominatim (1 request/second, only on explicit search, cached); cemetery
discovery uses the Overpass API (on explicit request). Both are optional conveniences.

---

## 25. Quality: testing, performance, CI

- **Unit tests** (Vitest) for everything in `domain/` and `geo/`: FuzzyDate parser
  (hundreds of real-world strings as table tests), name parser, HLC, merge properties
  (commutativity/idempotency via property-based tests with `fast-check`), matching scores,
  transforms, row interpolation.
- **Integration tests** for repositories, migrations, the v1 importer, `.sbs` round-trip.
- **E2E** (Playwright, mobile viewport + desktop): create cemetery → walk a row with a fake
  camera stream and mocked geolocation → transcribe → export → import into a fresh profile →
  merge with a second partial dataset. Offline test with the network disabled.
- **Performance budgets:** app shell JS ≤ 250 KB gzip excluding the lazily loaded map;
  capture-to-ready-for-next ≤ 1 s on a mid-range phone; map interactive with 10,000 stones;
  transcription "save & next" ≤ 100 ms.
- **CI:** lint, typecheck, unit, e2e (Chromium + WebKit) on every PR; deploy to Pages on
  merge to `master`. Preview builds optional.
- **Field trials:** after M3 and M4, a real survey of a real cemetery by the primary user,
  with notes captured as issues. This is the most important test.

---

## 26. Roadmap and milestones

Each milestone ends in a deployable, usable state. Sizes are relative, not estimates.

### M0 — Reset & foundation (S)

Tag `v1-final`; clear the repo per §23.3; scaffold Vite/React/TS/Tailwind/Dexie/Router
(hash)/vite-plugin-pwa/Vitest/Playwright/Lingui; app shell, design tokens (incl. sunlight
theme), bottom-sheet and toast components; CI.
**Done when:** the empty shell installs as a PWA from GitHub Pages, works offline, survives
refresh on any route, and CI is green.

### M1 — Data core & v1 import (M)

Domain types, HLC, FuzzyDate and name parsers, Dexie schema and repositories, history,
`.sbs`/`.sbs.json` read/write with JSON Schemas, v1 importer (`.cem.json`), backup
indicator and storage persistence, multiple cemeteries on Home.
**Done when:** all four v1 samples import with correct counts and fields; full export →
wipe → import round-trips byte-for-byte equivalent data; date parser passes the test table.

### M2 — Map & cemetery setup (M)

MapLibre map with imagery presets and custom sources; create cemetery by search / near me
(Overpass boundary prefill) / drop pin; sections and rows (draw lines); stones layer with
status colors; schematic view; offline tile download; legacy-grid pinning (§22.4); plat
overlay with control points.
**Done when:** a v1 cemetery can be pinned onto imagery; a new cemetery can be set up with
sections/rows in under 5 minutes; the map works offline after download.

### M3 — Field capture (L) → **first field trial**

In-app camera with fallback, photo pipeline (resize, thumbnail, hashes), walk-a-row
sessions (gap/skip/insert/reverse/reorder), GPS averaging, quick chips, relative placement,
undo, session summary, wake lock, haptics, field checklist.
**Done when:** a user can capture a 30-stone row one-handed in under 5 minutes, offline,
with correct ordering, and nothing is lost after closing the app.

### M4 — Desk transcription (L) → **second field trial**

Transcription queue, photo viewer with enhancement filters, keyboard-first form, multiple
people per stone, FuzzyDate UI with live interpretation and age calculation, name
autocomplete, relationships, symbols, military, conventions, verify pass.
**Done when:** an experienced user averages ≤ 30 s per simple stone; all historic date
forms in §10.1 are enterable.

### M5 — Corpus tools (M)

Progress dashboard and revisit checklist; People index with search (abbreviation +
phonetic); CSV import with column mapper and matching view; in-dataset duplicate detection;
exports: CSV, GeoJSON, KML, printable booklet; bulk photo import using EXIF.
**Done when:** an imported historical-society list can be matched to surveyed stones, and a
printable booklet is produced for a full cemetery.

### M6 — Sharing & merging (M)

Share packets; merge wizard (summary → matches → conflicts → apply); cross-ID entity
matching with photo/name/spatial scoring; cemetery aliasing; dataset alignment; undoable
merges; Web Share integration.
**Done when:** two people's overlapping partial surveys (different IDs, offset coordinates)
combine into one dataset with duplicates resolved and positions aligned, and re-importing
is a no-op.

### M7 — Publishing & visitor mode (M)

Publish bundle (privacy filters for possibly-living/recent), read-only published cemetery
viewer and catalog, grave deep links, "take me there" navigation with compass.
**Done when:** a published cemetery is browsable by URL on a phone with no app data, and a
visitor can navigate to a specific grave.

### M8 — Extras (ongoing)

AI-assisted transcription (BYO key); additional UI translations; RTL polish; Hebrew and
other calendars; GEDCOM export; drone orthophoto (GeoTIFF) import; optional cloud sync
exploration (§27).

Recommended order is as listed. M2's plat overlay may slip to M5 if M2 runs long; legacy
grid pinning should not slip (it's what makes v1 data useful).

---

## 27. Risks and open questions

| Risk / question                                                             | Mitigation / next step                                                                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS camera and storage quirks (in-app camera reliability, eviction, quotas) | Fallback to file input; install prompt; persistence; WebKit in CI; real-iPhone testing is optional (#80), since no iPhone is available.         |
| Photo storage volume on phones                                              | Configurable quality, thumbnails, per-section export, storage dashboard.                                                                        |
| Imagery terms change or forbid caching                                      | Provider abstraction, public-domain US default, custom sources, schematic view needs none.                                                      |
| GPS too poor under canopy to help at all                                    | Walk-a-row ordering + schematic view are designed to work with zero GPS.                                                                        |
| FuzzyDate parsing edge cases                                                | Large, real-world test table; always store `original`; never discard input.                                                                     |
| Merge matching false positives                                              | Never auto-merge without confirmation in v2.0; aliases make merges reversible.                                                                  |
| GitHub repo size for published data                                         | Downscaled photos; separate data repo if needed.                                                                                                |
| Scope is large                                                              | Milestones are independently useful; field trials after M3/M4 gate further work.                                                                |
| **Open:** cloud sync for real-time collaboration?                           | Not needed now. If it becomes needed, evaluate a hosted backend (e.g. Supabase) or a CRDT relay; the HLC/field-stamp model already supports it. |
| **Open:** integrate with Find a Grave / BillionGraves / FamilySearch?       | No open write APIs; store external IDs/links only. Do not scrape.                                                                               |
| ~~Open: default license for published data~~                                | **Resolved:** CC BY 4.0 (§2).                                                                                                                   |
| **Open:** license for the app's source code                                 | No LICENSE file exists. The owner decides before M7.                                                                                            |
| ~~Open: which imagery default outside the US~~                              | **Resolved (M2):** OpenStreetMap context, or Esri with the user's key; custom national sources. See §24.                                        |

---

## 28. Glossary

- **Monument / stone** — a physical marker (or a marker-less burial location). May name
  zero or more people.
- **Person** — an individual buried (or commemorated) in the cemetery. May have no
  monument (unmarked, or not yet matched).
- **Section / Row / Row index** — the logical address of a stone, mirroring how cemetery
  records are kept.
- **Walk-a-row** — the capture flow where stones are recorded in order along a row.
- **Schematic view** — the coordinate-free diagram of sections and rows.
- **Plat** — a surveyed or hand-drawn map of the cemetery's lots.
- **Overlay** — an image (plat, drone) or the v1 grid, georeferenced onto the map with
  control points.
- **FuzzyDate** — a date that may be partial, approximate, ranged, calculated, or in
  another calendar, always preserving the original text.
- **HLC** — Hybrid Logical Clock; a timestamp that orders edits across devices for merging.
- **Share packet** — an export containing only changes since a point, for combining work.
- **Alias / sameAs** — a record of IDs that were merged, so future merges recognize them.
- **Possibly living** — a person who may still be alive; excluded from public output.
