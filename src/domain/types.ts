/**
 * v2 data model (plan §19, with the §2.2 resolutions applied):
 * - `Monument.photoIds` is removed; `Photo.monumentId` is the only link.
 * - `Monument.verified` is an explicit stamp; the rest of `status` is derived.
 *
 * Pure types: nothing here may import from `data/` or `features/`.
 */
import type { Geometry, LineString, MultiPolygon, Polygon } from 'geojson';

/** UUIDv7 string (see `id.ts`). */
export type ID = string;

/** `"<wallMillis>-<counter>-<nodeId>"`, fixed width so it sorts lexically (see `hlc.ts`). */
export type HLC = string;

export interface Stamp {
  hlc: HLC;
  /** Contributor.id */
  by: ID;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Stamped {
  id: ID;
  cemeteryId: ID;
  createdAt: HLC;
  /** Top-level field name -> last write (§2.2: one stamp per top-level field). */
  stamps: Record<string, Stamp>;
  /** Tombstone. */
  deleted?: Stamp;
  /** IDs merged into this record (sameAs). Merged by set union. */
  aliases?: ID[];
}

export interface Contributor {
  id: ID;
  displayName: string;
  contact?: string;
}

export type CemeteryStatus = 'active' | 'inactive' | 'abandoned' | 'unknown';

export interface CemeterySettings {
  /** Tile source id. */
  imagery?: string;
  units: 'metric' | 'imperial';
  /** BCP 47 locale used to read numeric dates such as `3/4/1890`. */
  dateLocale: string;
  transcriptionConvention: string;
  photoMaxPx: number;
}

export interface Cemetery {
  id: ID;
  aliases?: ID[];
  name: string;
  altNames?: string[];
  location?: LngLat;
  boundary?: Polygon | MultiPolygon;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  /** e.g. ["Vermont", "Windsor County", "Reading"] */
  adminAreas?: string[];
  established?: FuzzyDate;
  status?: CemeteryStatus;
  denomination?: string;
  description?: string;
  accessNotes?: string;
  /** SPDX id, e.g. "CC-BY-4.0". */
  license?: string;
  contributors: ID[];
  externalIds?: {
    gnis?: string;
    osm?: string;
    findAGrave?: string;
    [k: string]: string | undefined;
  };
  settings: CemeterySettings;
  stamps: Record<string, Stamp>;
  deleted?: Stamp;
  legacy?: { v1Id?: string };
}

export interface Section extends Stamped {
  name: string;
  order?: number;
  boundary?: Polygon;
  notes?: string;
}

export interface Row extends Stamped {
  sectionId?: ID;
  label: string;
  order?: number;
  line?: LineString;
  notes?: string;
}

export type PositionSource =
  | 'gps'
  | 'gps-averaged'
  | 'map'
  | 'row-interpolated'
  | 'relative'
  | 'overlay'
  | 'legacy-grid'
  | 'aligned'
  | 'imported';

export interface Position {
  lng: number;
  lat: number;
  accuracyM?: number;
  source: PositionSource;
}

export type MonumentStatus = 'located' | 'photographed' | 'transcribed' | 'verified';

export interface Inscription {
  text: string;
  language?: string;
  script?: string;
  convention?: string;
}

export interface MonumentAddress {
  sectionId?: ID;
  rowId?: ID;
  rowIndex?: number;
  plotLabel?: string;
}

export type MonumentRelation = 'footstone-of' | 'part-of' | 'replaces';

export interface Monument extends Stamped {
  /** headstone, footstone, ledger, fieldstone, unmarked, ... */
  kind: string;
  position?: Position;
  /** Direction the inscription faces. */
  facingDeg?: number;
  address?: MonumentAddress;
  legacyGrid?: { row: number; col: number };
  material?: string;
  condition?: string[];
  symbols?: string[];
  dimensionsCm?: { h?: number; w?: number; d?: number };
  carver?: string;
  inscription?: Inscription;
  epitaph?: string;
  // Photos: query Photo by monumentId (§2.2).
  /** Explicit; cleared when a transcription field changes afterwards (§2.2). */
  verified?: Stamp;
  /** Derived and materialized on write (§2.2). */
  status: MonumentStatus;
  /** needs-revisit, uncertain-position, illegible, relocated */
  flags?: string[];
  relatedMonuments?: { id: ID; relation: MonumentRelation }[];
  /** Family plot / enclosure. */
  featureIds?: ID[];
  tags?: string[];
  notes?: string;
}

export type DateQualifier =
  'exact' | 'about' | 'before' | 'after' | 'between' | 'calculated' | 'estimated';

export type Calendar = 'gregorian' | 'julian' | 'hebrew' | (string & {});

export interface FuzzyDate {
  /** Exactly what was carved or entered. */
  original: string;
  y?: number;
  m?: number;
  d?: number;
  qualifier?: DateQualifier;
  /** End of range for 'between'. */
  y2?: number;
  m2?: number;
  d2?: number;
  calendar?: Calendar;
  /** e.g. 1709 in "1709/10" (y holds the new-style year). */
  dualYear?: number;
  ambiguous?: boolean;
}

export interface PersonName {
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

export interface Age {
  y?: number;
  m?: number;
  d?: number;
  original: string;
}

export type PersonRelationType = 'spouse' | 'parent' | 'child' | 'sibling' | 'other';

export type SourceKind = 'stone' | 'imported-index' | 'record' | 'family' | 'ai-draft' | 'other';

export interface Source {
  kind: SourceKind;
  ref?: string;
  note?: string;
}

export interface Military {
  conflict?: string;
  rank?: string;
  unit?: string;
  notes?: string;
}

export interface Person extends Stamped {
  /** Absent = unmarked / not yet matched. */
  monumentId?: ID;
  name: PersonName;
  sex?: 'f' | 'm' | 'u';
  birth?: FuzzyDate;
  death?: FuzzyDate;
  burial?: FuzzyDate;
  age?: Age;
  /** "wife of John", "relict of", "son of J & M" */
  relationshipText?: string;
  relations?: { type: PersonRelationType; personId: ID }[];
  military?: Military;
  possiblyLiving?: boolean;
  occupation?: string;
  /** Merged by set union. */
  sources?: Source[];
  matchStatus?: 'unmatched' | 'matched' | 'no-stone-found';
  externalIds?: Record<string, string>;
  notes?: string;
}

export type PhotoRole = 'front' | 'back' | 'detail' | 'context' | 'other';

export interface Photo extends Stamped {
  monumentId: ID;
  role: PhotoRole;
  /** ISO 8601. */
  takenAt?: string;
  position?: Position;
  width: number;
  height: number;
  bytes: number;
  /** Exact-duplicate detection across merges. */
  sha256: string;
  /** Perceptual hash for match scoring. */
  phash?: string;
  // Blob and thumbnail live in separate tables keyed by id.
}

export type MapFeatureKind =
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

export interface MapFeature extends Stamped {
  kind: MapFeatureKind;
  geometry?: Geometry;
  /** v1 roads before pinning. */
  legacyCells?: { row: number; col: number }[];
  name?: string;
  notes?: string;
}

export interface ControlPoint {
  x: number;
  y: number;
  lng: number;
  lat: number;
}

export interface Overlay extends Stamped {
  kind: 'plat' | 'drone' | 'legacy-grid' | 'other';
  name: string;
  /** Blob table; absent for legacy-grid. */
  imageId?: ID;
  /** legacy-grid only. */
  grid?: { rows: number; cols: number; validCells?: string[] };
  controlPoints: ControlPoint[];
  /** Computed affine, 6 values. */
  transform?: number[];
  opacity: number;
}

export interface TagDef extends Stamped {
  name: string;
  color?: string;
  description?: string;
}

export type HistoryOp = 'create' | 'update' | 'delete' | 'merge' | 'import';

/** Append-only, compactable, for the History view. */
export interface HistoryEntry {
  id: ID;
  cemeteryId: ID;
  entityId: ID;
  entityType: string;
  at: HLC;
  by: ID;
  op: HistoryOp;
  fields?: Record<string, { from?: unknown; to?: unknown }>;
}
