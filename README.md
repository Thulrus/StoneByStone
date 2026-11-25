# StoneByStone

An offline-first web app for surveying, photographing, and transcribing cemeteries, with a
focus on historic ones.

**[Open the app](https://thulrus.github.io/StoneByStone/)**

I built this to help my sister with her work documenting local cemeteries: preserving historic
records and helping families find where their ancestors are buried.

## Status

Version 2 is being rebuilt from scratch. The plan is in
[docs/OVERHAUL_PLAN.md](docs/OVERHAUL_PLAN.md), and progress is tracked in
[docs/PROGRESS.md](docs/PROGRESS.md). Version 1 is preserved at the git tag `v1-final`, and its
`.cem.json` files will be importable.

## What it will do

- Walk a row with your phone and capture a stone in a few seconds, with no signal needed.
- Place stones on aerial imagery, a plat map, or a schematic grid.
- Transcribe at a desk from the photos, with enhancement filters and fuzzy historic dates.
- Combine partial surveys from several people into one map, with no server.
- Export to CSV, GeoJSON, and GEDCOM, and publish a read-only map for visitors.

Everything stays on your device unless you export or share it. There is no account and no
telemetry.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

Default data license for published cemetery data: CC BY 4.0. The code license is not decided
yet.
