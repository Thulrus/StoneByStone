import { openDB as idbOpenDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  Cemetery,
  Grave,
  Landmark,
  Road,
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
  landmarks: {
    key: string;
    value: Landmark;
  };
  roads: {
    key: string;
    value: Road;
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

  dbInstance = await idbOpenDB<CemeteryDB>('cemetery-db', 3, {
    upgrade(db, oldVersion) {
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

      // Add landmarks store in version 2
      if (oldVersion < 2 && !db.objectStoreNames.contains('landmarks')) {
        db.createObjectStore('landmarks', { keyPath: 'uuid' });
      }

      // Add roads store in version 3
      if (oldVersion < 3 && !db.objectStoreNames.contains('roads')) {
        db.createObjectStore('roads', { keyPath: 'uuid' });
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
  const landmarks = await db.getAll('landmarks');
  const roads = await db.getAll('roads');
  const change_log = await db.getAll('change_log');

  return {
    schema_version: '1.0.0',
    cemetery,
    graves,
    landmarks,
    roads,
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
 * Save or update a landmark
 */
export async function saveOrUpdateLandmark(landmark: Landmark): Promise<void> {
  const db = await openDB();
  await db.put('landmarks', landmark);
}

/**
 * Get all landmarks
 */
export async function getAllLandmarks(): Promise<Landmark[]> {
  const db = await openDB();
  return db.getAll('landmarks');
}

/**
 * Get a single landmark by UUID
 */
export async function getLandmark(uuid: string): Promise<Landmark | undefined> {
  const db = await openDB();
  return db.get('landmarks', uuid);
}

/**
 * Delete a landmark (actually just marks as deleted)
 */
export async function deleteLandmark(uuid: string): Promise<void> {
  const db = await openDB();
  const landmark = await db.get('landmarks', uuid);
  if (landmark) {
    landmark.properties.deleted = true;
    await db.put('landmarks', landmark);
  }
}

/**
 * Save or update a road
 */
export async function saveOrUpdateRoad(road: Road): Promise<void> {
  const db = await openDB();
  await db.put('roads', road);
}

/**
 * Get all roads
 */
export async function getAllRoads(): Promise<Road[]> {
  const db = await openDB();
  return db.getAll('roads');
}

/**
 * Get a single road by UUID
 */
export async function getRoad(uuid: string): Promise<Road | undefined> {
  const db = await openDB();
  return db.get('roads', uuid);
}

/**
 * Delete a road (actually just marks as deleted)
 */
export async function deleteRoad(uuid: string): Promise<void> {
  const db = await openDB();
  const road = await db.get('roads', uuid);
  if (road) {
    road.properties.deleted = true;
    await db.put('roads', road);
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
 * Clear all graves, landmarks, roads, and change logs (but keep cemetery metadata)
 * Used when creating a new empty cemetery
 */
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  await db.clear('graves');
  await db.clear('landmarks');
  await db.clear('roads');
  await db.clear('change_log');
}

/**
 * Clear all data and load new dataset
 */
export async function replaceAllData(data: CemeteryData): Promise<void> {
  const db = await openDB();

  // Clear existing data
  await db.clear('cemetery');
  await db.clear('graves');
  await db.clear('landmarks');
  await db.clear('roads');
  await db.clear('change_log');

  // Load new data
  await saveCemeteryMeta(data.cemetery);

  for (const grave of data.graves) {
    await saveOrUpdateGrave(grave);
  }

  if (data.landmarks) {
    for (const landmark of data.landmarks) {
      await saveOrUpdateLandmark(landmark);
    }
  }

  if (data.roads) {
    for (const road of data.roads) {
      await saveOrUpdateRoad(road);
    }
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
