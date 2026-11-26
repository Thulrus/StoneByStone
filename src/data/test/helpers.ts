import { openDatabase, type StoneDB } from '../db';
import { Store } from '../store';

let n = 0;

/** A fresh database and store with a controllable clock. */
export async function freshStore(start = Date.UTC(2026, 0, 1)) {
  const name = `test-${++n}-${Math.random().toString(36).slice(2)}`;
  const time = { now: start };
  const db = await openDatabase(name);
  const store = await Store.open(db, () => time.now);
  return { db, store, name, time, advance: (ms: number) => (time.now += ms) };
}

export async function dump(db: StoneDB, tables: readonly string[] = ENTITY_TABLES) {
  const out: Record<string, unknown[]> = {};
  for (const t of tables) out[t] = await db.table(t).toArray();
  return out;
}

export const ENTITY_TABLES = [
  'cemeteries',
  'sections',
  'rows',
  'monuments',
  'persons',
  'photos',
  'features',
  'overlays',
  'tags',
] as const;
