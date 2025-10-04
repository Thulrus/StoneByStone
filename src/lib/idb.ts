import { openDB as idbOpenDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  Cemetery,
  Grave,
  ChangeLogEntry,
  CemeteryData,
} from '../types/cemetery';

/**
 * Database schema interface
 */
interface CemeteryDB extends DBSchema {
  cemetery: {
    key: string;
    value: Cemetery;
  };
  graves: {
    key: string;
    value: Grave;
    indexes: { 'by-plot': string };
  };
  change_log: {
    key: number;
    value: ChangeLogEntry & { id?: number };
  };
}

let dbInstance: IDBPDatabase<CemeteryDB> | null = null;

/**
 * Open or get the IndexedDB database instance
 */
export async function openDB(): Promise<IDBPDatabase<CemeteryDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await idbOpenDB<CemeteryDB>('cemetery-db', 1, {
    upgrade(db) {
      // Create object stores
      if (!db.objectStoreNames.contains('cemetery')) {
        db.createObjectStore('cemetery', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('graves')) {
        const graveStore = db.createObjectStore('graves', { keyPath: 'uuid' });
        graveStore.createIndex('by-plot', 'plot');
      }

      if (!db.objectStoreNames.contains('change_log')) {
        db.createObjectStore('change_log', { autoIncrement: true });
      }
    },
  });

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Load the entire cemetery dataset from IndexedDB
 */
export async function loadCemetery(): Promise<CemeteryData | null> {
  const db = await openDB();
  const cemetery = await db.get('cemetery', 'current');
  if (!cemetery) return null;

  const graves = await db.getAll('graves');
  const change_log = await db.getAll('change_log');

  return {
    schema_version: '1.0.0',
    cemetery,
    graves,
    change_log,
  };
}

/**
 * Save cemetery metadata
 */
export async function saveCemeteryMeta(cemetery: Cemetery): Promise<void> {
  const db = await openDB();
  await db.put('cemetery', { ...cemetery, id: 'current' });
}

/**
 * Save or update a grave
 */
export async function saveOrUpdateGrave(grave: Grave): Promise<void> {
  const db = await openDB();
  await db.put('graves', grave);
}

/**
 * Get all graves
 */
export async function getAllGraves(): Promise<Grave[]> {
  const db = await openDB();
  return db.getAll('graves');
}

/**
 * Get a single grave by UUID
 */
export async function getGrave(uuid: string): Promise<Grave | undefined> {
  const db = await openDB();
  return db.get('graves', uuid);
}

/**
 * Delete a grave (actually just marks as deleted)
 */
export async function deleteGrave(uuid: string): Promise<void> {
  const db = await openDB();
  const grave = await db.get('graves', uuid);
  if (grave) {
    grave.properties.deleted = true;
    await db.put('graves', grave);
  }
}

/**
 * Append a change log entry
 */
export async function appendChangeLog(entry: ChangeLogEntry): Promise<void> {
  const db = await openDB();
  await db.add('change_log', entry);
}

/**
 * Get all change log entries
 */
export async function getChangeLog(): Promise<ChangeLogEntry[]> {
  const db = await openDB();
  return db.getAll('change_log');
}

/**
 * Get change log entries for a specific grave
 */
export async function getGraveHistory(uuid: string): Promise<ChangeLogEntry[]> {
  const db = await openDB();
  const allChanges = await db.getAll('change_log');
  return allChanges.filter((entry) => entry.uuid === uuid);
}

/**
 * Clear all data and load new dataset
 */
export async function replaceAllData(data: CemeteryData): Promise<void> {
  const db = await openDB();

  // Clear existing data
  await db.clear('cemetery');
  await db.clear('graves');
  await db.clear('change_log');

  // Load new data
  await saveCemeteryMeta(data.cemetery);

  for (const grave of data.graves) {
    await saveOrUpdateGrave(grave);
  }

  for (const entry of data.change_log) {
    await appendChangeLog(entry);
  }
}

/**
 * Check if any data exists
 */
export async function hasData(): Promise<boolean> {
  const db = await openDB();
  const cemetery = await db.get('cemetery', 'current');
  return !!cemetery;
}
