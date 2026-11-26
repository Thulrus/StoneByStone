/**
 * Versioned IndexedDB schema (plan §14, §19). Never edit a released entry: append a new
 * version with the changed `stores` and an `upgrade` that rewrites existing data. Each
 * version needs a test that opens the previous version's data.
 */
import type { Transaction } from 'dexie';

export interface Migration {
  version: number;
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => Promise<void>;
}

/** Index lists shared by the stamped entity tables. */
const ENTITY = 'id, cemeteryId, *aliases';

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    stores: {
      cemeteries: 'id, *aliases, legacy.v1Id',
      sections: ENTITY,
      rows: `${ENTITY}, sectionId`,
      monuments: `${ENTITY}, [cemeteryId+status], [cemeteryId+address.rowId+address.rowIndex]`,
      persons: `${ENTITY}, monumentId, [cemeteryId+name.surname]`,
      photos: `${ENTITY}, monumentId, sha256`,
      photoBlobs: 'id',
      photoThumbs: 'id',
      overlayBlobs: 'id',
      features: ENTITY,
      overlays: ENTITY,
      tags: ENTITY,
      contributors: 'id',
      history: 'id, cemeteryId, [entityId+at], group',
      settings: 'key',
      tileMeta: 'id',
    },
  },
];

/** The data version this build writes. Opening anything newer is refused. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 1;
