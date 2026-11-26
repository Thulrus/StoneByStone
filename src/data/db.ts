/**
 * The IndexedDB database (plan §19). Features never touch this directly; they go through the
 * repositories in `store.ts`.
 */
import Dexie, { type Table } from 'dexie';
import type {
  Cemetery,
  Contributor,
  HistoryEntry,
  MapFeature,
  Monument,
  Overlay,
  Person,
  Photo,
  Row,
  Section,
  TagDef,
} from '../domain';
import { MIGRATIONS, SCHEMA_VERSION } from './migrations';

/** All GitHub Pages projects share one origin, so the name must be specific (plan §14). */
export const DB_NAME = 'stonebystone';

export interface BlobRow {
  id: string;
  blob: Blob;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface TileMetaRow {
  id: string;
  [k: string]: unknown;
}

export class StoneDB extends Dexie {
  cemeteries!: Table<Cemetery, string>;
  sections!: Table<Section, string>;
  rows!: Table<Row, string>;
  monuments!: Table<Monument, string>;
  persons!: Table<Person, string>;
  photos!: Table<Photo, string>;
  photoBlobs!: Table<BlobRow, string>;
  photoThumbs!: Table<BlobRow, string>;
  overlayBlobs!: Table<BlobRow, string>;
  features!: Table<MapFeature, string>;
  overlays!: Table<Overlay, string>;
  tags!: Table<TagDef, string>;
  contributors!: Table<Contributor, string>;
  history!: Table<HistoryEntry, string>;
  settings!: Table<SettingRow, string>;
  tileMeta!: Table<TileMetaRow, string>;

  constructor(name = DB_NAME, migrations = MIGRATIONS) {
    super(name);
    for (const m of migrations) {
      const v = this.version(m.version).stores(m.stores);
      if (m.upgrade) v.upgrade(m.upgrade);
    }
    // Written on creation and after every upgrade, so an older build can see it is too old.
    const latest = migrations[migrations.length - 1]?.version ?? 1;
    this.on('ready', async () => {
      const row = await this.settings.get(SCHEMA_KEY);
      if (row?.value !== latest) await this.settings.put({ key: SCHEMA_KEY, value: latest });
    });
  }
}

export const SCHEMA_KEY = 'schemaVersion';

export class NewerSchemaError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(
      `This device's data was saved by a newer version of StoneByStone (data version ${found}; ` +
        `this version reads up to ${supported}). Update the app to open it.`,
    );
    this.name = 'NewerSchemaError';
  }
}

/**
 * Read the stored data version without upgrading or creating anything. Dexie 4 opens a
 * database whose version is higher than declared (and may then alter it), so this runs on
 * the raw IndexedDB API before Dexie touches the database.
 */
export function probeSchemaVersion(name = DB_NAME): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    let fresh = false;
    req.onupgradeneeded = () => {
      // Doesn't exist yet: abort so the probe leaves nothing behind.
      fresh = true;
      req.transaction?.abort();
    };
    req.onerror = (e) => {
      if (fresh) {
        e.preventDefault();
        resolve(undefined);
      } else reject(req.error ?? new Error('IndexedDB open failed'));
    };
    req.onsuccess = () => {
      const idb = req.result;
      // Dexie stores version × 10 as the native version.
      const native = Math.floor(idb.version / 10);
      const done = (stored: unknown) => {
        idb.close();
        resolve(Math.max(native, typeof stored === 'number' ? stored : 0));
      };
      if (!idb.objectStoreNames.contains('settings')) return done(undefined);
      const get = idb.transaction('settings', 'readonly').objectStore('settings').get(SCHEMA_KEY);
      get.onsuccess = () => done((get.result as SettingRow | undefined)?.value);
      get.onerror = () => done(undefined);
    };
  });
}

/** Open the database, refusing (with `NewerSchemaError`) data from a newer build. */
export async function openDatabase(name = DB_NAME, migrations = MIGRATIONS): Promise<StoneDB> {
  const supported = migrations[migrations.length - 1]?.version ?? SCHEMA_VERSION;
  const found = await probeSchemaVersion(name);
  if (found !== undefined && found > supported) throw new NewerSchemaError(found, supported);
  const db = new StoneDB(name, migrations);
  await db.open();
  return db;
}
