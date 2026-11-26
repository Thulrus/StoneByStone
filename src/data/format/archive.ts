/**
 * In-memory form of a v2 archive (plan §20). `.sbs` and `.sbs.json` are two encodings of it.
 */
import type {
  Cemetery,
  Contributor,
  HistoryEntry,
  HLC,
  ID,
  MapFeature,
  Monument,
  Overlay,
  Person,
  Photo,
  Row,
  Section,
  TagDef,
} from '../../domain';
import { version } from '../../../package.json';

export const FORMAT = 'stonebystone';
export const FORMAT_VERSION = 2;
export const APP_VERSION: string = version;

export interface ArchiveData {
  sections: Section[];
  rows: Row[];
  monuments: Monument[];
  persons: Person[];
  photos: Photo[];
  features: MapFeature[];
  overlays: Overlay[];
  tags: TagDef[];
  contributors: Contributor[];
  history: HistoryEntry[];
}

export type ArchiveKind = 'full' | 'packet' | 'publish';

export interface Manifest {
  format: typeof FORMAT;
  formatVersion: typeof FORMAT_VERSION;
  appVersion: string;
  kind: ArchiveKind;
  cemeteryId: ID;
  /** ISO 8601. */
  createdAt: string;
  createdBy: Contributor;
  since?: HLC;
  counts: Partial<Record<keyof ArchiveData, number>>;
  /** Long edge (px) of included photos; 0 when photos are left out. */
  photoQuality?: number;
}

export interface Archive {
  manifest: Manifest;
  cemetery: Cemetery;
  data: ArchiveData;
}

/** Binary parts of a `.sbs` archive, keyed by record id. */
export interface Binaries {
  photos: Map<ID, Blob>;
  thumbs: Map<ID, Blob>;
  overlays: Map<ID, Blob>;
}

export const COLLECTION_NAMES: readonly (keyof ArchiveData)[] = [
  'sections',
  'rows',
  'monuments',
  'persons',
  'photos',
  'features',
  'overlays',
  'tags',
  'contributors',
  'history',
];

export function emptyBinaries(): Binaries {
  return { photos: new Map(), thumbs: new Map(), overlays: new Map() };
}
