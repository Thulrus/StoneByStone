# StoneByStone file format (version 2)

This document describes the files StoneByStone writes, so that the data stays usable
without the app. It is for anyone who wants to read, convert, or check a StoneByStone
export: researchers, genealogy societies, and developers.

The machine-readable definition is the set of JSON Schemas (draft-07) in
[`schema/v2/`](../schema/v2/). Every `.sbs` archive carries a copy of them in `schema/`.
Where this document and the schemas disagree, the schemas win.

## Two encodings, one content

| Extension   | What it is                                                 |
| ----------- | ---------------------------------------------------------- |
| `.sbs`      | A zip archive: JSON files plus photos and overlay images.  |
| `.sbs.json` | The same JSON content as one document, without any images. |

Both describe **one cemetery**.

### `.sbs` layout

```
manifest.json        what the archive holds and who made it
cemetery.json        the cemetery record
data/sections.json   one JSON array per record type (always present, possibly empty)
data/rows.json
data/monuments.json
data/persons.json
data/photos.json     photo metadata; the images are below
data/features.json
data/overlays.json
data/tags.json
data/contributors.json
data/history.json
photos/<photo id>.jpg     full-size photos (may be absent in light packets)
thumbs/<photo id>.jpg     thumbnails
overlays/<image id>.jpg   plat maps and other overlay images (Overlay.imageId)
schema/*.json        the JSON Schemas
README.txt           a short human explanation and the license
```

JSON files are deflated; images are stored uncompressed (JPEG doesn't compress further).
JSON is written with sorted keys and two-space indentation, so two exports can be diffed.
Records in each array are sorted by `id`.

### `.sbs.json` layout

```json
{
  "manifest": { ... },
  "cemetery": { ... },
  "data": { "sections": [], "rows": [], "monuments": [], "...": [] }
}
```

Validated by `schema/v2/document.json`.

## The manifest

```json
{
  "format": "stonebystone",
  "formatVersion": 2,
  "appVersion": "2.0.0",
  "kind": "full",
  "cemeteryId": "0193f1c2-…",
  "createdAt": "2026-05-01T18:22:04.512Z",
  "createdBy": { "id": "0193…", "displayName": "Jane Surveyor" },
  "counts": { "monuments": 412, "persons": 530, "photos": 801 },
  "photoQuality": 1600
}
```

- `kind`: `full` (everything), `packet` (changes since `since`, for sharing), or `publish`
  (a privacy-filtered copy for the public viewer).
- `photoQuality`: long edge in pixels of the included photos; `0` means none are included.
- A reader must refuse a `formatVersion` it doesn't know rather than guess.

## Records

Every record is a JSON object with an `id` (a UUID, normally
[version 7](https://www.rfc-editor.org/rfc/rfc9562), so ids sort by creation time). The
record types are:

| File                | Type         | Holds                                                                      |
| ------------------- | ------------ | -------------------------------------------------------------------------- |
| `cemetery.json`     | Cemetery     | Name, location, boundary, country, license, settings                       |
| `sections.json`     | Section      | Named parts of the cemetery                                                |
| `rows.json`         | Row          | Rows of stones, optionally with a line on the map                          |
| `monuments.json`    | Monument     | A stone or marker (or an unmarked grave): position, inscription, condition |
| `persons.json`      | Person       | A person named on a stone or in an index                                   |
| `photos.json`       | Photo        | Photo metadata, linked to a monument by `monumentId`                       |
| `features.json`     | MapFeature   | Paths, buildings, trees, gates, enclosures, family plots                   |
| `overlays.json`     | Overlay      | Plat maps, drone images, and the old v1 grid                               |
| `tags.json`         | TagDef       | User-defined tags (`Monument.tags` lists their ids)                        |
| `contributors.json` | Contributor  | The people who wrote data: `id`, `displayName`                             |
| `history.json`      | HistoryEntry | The change log                                                             |

Every record except contributors and history entries has a `cemeteryId`, and all of them
belong to the cemetery in `manifest.cemeteryId`.

### Change tracking: `stamps`, `deleted`, `aliases`

These fields make it possible to combine exports from several people (plan §21).

- **`stamps`** maps each top-level field name to the last write of that field:
  `{ "hlc": "<time>", "by": "<contributor id>" }`. A field that is stamped but absent was
  deliberately cleared.
- **`hlc`** is a hybrid logical clock: `"<15-digit Unix millis>-<5-digit counter>-<16 hex
device id>"`. Because every part is fixed width, comparing the strings orders the writes.
- **`createdAt`** is the HLC of the record's first write.
- **`deleted`**, when present, is the stamp of the deletion. Records are never removed, so
  that a deletion also reaches other people's copies. Skip deleted records when displaying.
- **`aliases`** lists ids that were merged into this record (and, for data imported from
  v1, the old v1 id).

**Merging two copies of the same record:** for each field keep the value with the greater
stamp (compare `hlc`, then `by`). `aliases` and `Person.sources` are merged as a set union.
The deletion stamp is the greater of the two.

### Monuments and status

`Monument.status` is one of `located`, `photographed`, `transcribed`, `verified`. It is
derived from the data (has a photo; has a person or an inscription) and stored for
convenience; readers may recompute it. `verified` holds the stamp of an explicit check.

### Dates

Dates on stones are often partial or uncertain, so they are stored as a `FuzzyDate`:

```json
{ "original": "abt. 1790", "y": 1790, "qualifier": "about" }
```

`original` is always exactly what was carved or typed. `qualifier` is `exact`, `about`,
`before`, `after`, `between` (with `y2`/`m2`/`d2` as the end), `calculated` (for example
from an age at death) or `estimated`. `dualYear` holds the old-style year of a dual date
such as "1709/10". `ambiguous` marks a numeric date like `3/4/1890` whose day/month order
is uncertain.

### Names

`PersonName.asCarved` is the name exactly as on the stone; `given`, `middle`, `surname`,
`prefix`, `suffix`, `birthSurname` and `nickname` are the parsed parts.

### Positions

`Position` is WGS 84 longitude/latitude with an optional `accuracyM` and a `source` that
says where it came from: `gps`, `gps-averaged`, `map`, `row-interpolated`, `relative`,
`overlay`, `legacy-grid`, `aligned` or `imported`. Geometries (`boundary`, `line`,
`MapFeature.geometry`) are [GeoJSON](https://www.rfc-editor.org/rfc/rfc7946) geometry
objects.

### Photos

`Photo.sha256` is the hex SHA-256 of the full-size image file, so identical photos can be
recognized across exports. Display order is by `role` (`front`, `back`, `detail`,
`context`, `other`), then `takenAt`.

## Importing v1 files

StoneByStone v1 wrote `.cem.json` files (`schema_version: "1.0.0"`). The app imports them
into this format as described in [OVERHAUL_PLAN.md §22.3](OVERHAUL_PLAN.md#223-field-mapping):

- Each grave becomes a Monument (kind `headstone`) with its grid cell in `legacyGrid` and
  its v1 UUID in `aliases`. Person data becomes one Person, alias `v1-person:<grave uuid>`.
- The grid becomes an Overlay of kind `legacy-grid` (alias `v1-grid`), to be pinned to the
  map later. Groups become tags; landmarks and roads become MapFeatures with `legacyCells`.
- Each distinct `modified_by` becomes a Contributor whose id is derived from the name, so
  every device gives it the same id. Stamps come from `last_modified`.
- The v1 `change_log` becomes history entries with `op: "import"`.

Importing the same v1 file again finds the earlier import through those aliases and
changes nothing.

## Versioning

`formatVersion` changes only when existing readers would misread the data. Adding an
optional field is not such a change, so readers should ignore fields they don't know.
