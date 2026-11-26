/**
 * Append-only history (plan §2.2, §19). Consecutive edits to the same entity by the same
 * contributor within 30 s are coalesced into one entry. An entry whose changes cancel out
 * (an edit followed by its undo) disappears.
 */
import { deepEqual, parseHlc, uuidv7, type HistoryEntry } from '../domain';
import type { StoneDB } from './db';

export const COALESCE_MS = 30_000;

type Fields = NonNullable<HistoryEntry['fields']>;

function wall(hlc: string): number {
  return parseHlc(hlc).wall;
}

function dropNoops(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) if (!deepEqual(v.from, v.to)) out[k] = v;
  return out;
}

/** Latest entry for an entity. */
export async function lastEntry(db: StoneDB, entityId: string): Promise<HistoryEntry | undefined> {
  return db.history.where('[entityId+at]').between([entityId, ''], [entityId, '￿']).last();
}

export async function entityHistory(db: StoneDB, entityId: string): Promise<HistoryEntry[]> {
  return db.history.where('[entityId+at]').between([entityId, ''], [entityId, '￿']).toArray();
}

/**
 * Record one change. Grouped entries (imports, merges) are never coalesced. Must run inside
 * a transaction that includes `history`.
 */
export async function recordHistory(db: StoneDB, entry: Omit<HistoryEntry, 'id'>): Promise<void> {
  const prev = entry.group === undefined ? await lastEntry(db, entry.entityId) : undefined;
  const canCoalesce =
    prev !== undefined &&
    prev.group === undefined &&
    prev.by === entry.by &&
    entry.op === 'update' &&
    (prev.op === 'update' || prev.op === 'create') &&
    wall(entry.at) - wall(prev.at) <= COALESCE_MS;

  if (prev && canCoalesce) {
    const fields: Fields = { ...prev.fields };
    for (const [k, v] of Object.entries(entry.fields ?? {})) {
      const before = fields[k];
      fields[k] = before ? { from: before.from, to: v.to } : v;
    }
    const kept = prev.op === 'create' ? fields : dropNoops(fields);
    if (prev.op === 'update' && Object.keys(kept).length === 0) {
      await db.history.delete(prev.id);
      return;
    }
    await db.history.put({ ...prev, at: entry.at, fields: kept });
    return;
  }
  if (entry.op === 'update' && entry.fields && Object.keys(dropNoops(entry.fields)).length === 0) {
    return;
  }
  await db.history.add({ ...entry, id: uuidv7(wall(entry.at)) });
}
