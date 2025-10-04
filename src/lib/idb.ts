import { openDB as idbOpenDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Database schema interface
 * TODO: Define detailed object stores and indexes based on cemetery data model
 */
interface CemeteryDB extends DBSchema {
  cemeteries: {
    key: string;
    value: {
      id: string;
      name: string;
      // TODO: Add more cemetery fields
    };
  };
  graves: {
    key: string;
    value: {
      uuid: string;
      // TODO: Add grave fields
    };
    indexes: { 'by-cemetery': string };
  };
  changes: {
    key: number;
    value: {
      id: number;
      timestamp: string;
      // TODO: Add change log fields
    };
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
      if (!db.objectStoreNames.contains('cemeteries')) {
        db.createObjectStore('cemeteries', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('graves')) {
        const graveStore = db.createObjectStore('graves', { keyPath: 'uuid' });
        graveStore.createIndex('by-cemetery', 'cemeteryId');
      }

      if (!db.objectStoreNames.contains('changes')) {
        db.createObjectStore('changes', {
          keyPath: 'id',
          autoIncrement: true,
        });
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

// TODO: Add CRUD operations for cemeteries, graves, and change logs
