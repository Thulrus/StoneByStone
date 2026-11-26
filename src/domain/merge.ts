/**
 * Same-ID merge (plan §21.2, §2.2).
 *
 * - One stamp per top-level field. The value with the greater stamp wins: HLC first (which
 *   already ends in the nodeId), then contributor id, then canonical JSON of the value, so
 *   the result never depends on argument order.
 * - A field with a stamp but no value is a cleared field, and that clearing wins like any write.
 * - `aliases` and `sources` merge by set union and are kept in canonical sorted order, which
 *   is what makes the union associative. Their stamp is the max of both sides.
 * - `deleted` (the tombstone) is the greater of the two stamps. `createdAt` is the earlier.
 *
 * `mergeRecords` is commutative, associative and idempotent over normalized records
 * (`normalizeRecord`); the property tests check this.
 */
import { canonicalJson, deepEqual } from './canonical';
import { compareHlc } from './hlc';
import type { HLC, ID, Stamp } from './types';

export interface MergeableRecord {
  id: ID;
  stamps: Record<string, Stamp>;
  deleted?: Stamp;
  aliases?: ID[];
  createdAt?: HLC;
  cemeteryId?: ID;
}

/** Fields that are bookkeeping, not stamped data. */
const META = new Set(['id', 'stamps', 'deleted', 'createdAt', 'cemeteryId']);

/** Fields merged by set union rather than last-writer-wins. */
export const UNION_FIELDS: ReadonlySet<string> = new Set(['aliases', 'sources']);

export function compareStamps(a: Stamp | undefined, b: Stamp | undefined): number {
  if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1;
  return compareHlc(a.hlc, b.hlc) || (a.by < b.by ? -1 : a.by > b.by ? 1 : 0);
}

function maxStamp(a: Stamp | undefined, b: Stamp | undefined): Stamp | undefined {
  return compareStamps(a, b) >= 0 ? a : b;
}

function unionSorted(a: unknown, b: unknown): unknown[] | undefined {
  const items = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  if (items.length === 0 && !Array.isArray(a) && !Array.isArray(b)) return undefined;
  const byKey = new Map<string, unknown>();
  for (const it of items) byKey.set(canonicalJson(it), it);
  return [...byKey.keys()].sort().map((k) => byKey.get(k));
}

/** Put union fields into canonical sorted order and dedupe them. Idempotent. */
export function normalizeRecord<T extends MergeableRecord>(r: T): T {
  const out = { ...r } as Record<string, unknown>;
  for (const f of UNION_FIELDS) {
    if (Array.isArray(out[f])) out[f] = unionSorted(out[f], undefined);
  }
  return out as T;
}

function get(r: MergeableRecord, k: string): unknown {
  return (r as unknown as Record<string, unknown>)[k];
}

function dataFields(a: MergeableRecord, b: MergeableRecord): string[] {
  const keys = new Set<string>();
  for (const r of [a, b]) {
    for (const k of Object.keys(r)) if (!META.has(k)) keys.add(k);
    for (const k of Object.keys(r.stamps)) keys.add(k);
  }
  return [...keys].sort();
}

/** Which side wins field `k`: positive = a, negative = b, 0 = identical writes. */
function pick(a: MergeableRecord, b: MergeableRecord, k: string): number {
  const c = compareStamps(a.stamps[k], b.stamps[k]);
  if (c !== 0) return c;
  // An absent value sorts lowest, so an unstamped value still beats nothing.
  const va = get(a, k);
  const vb = get(b, k);
  const ja = va === undefined ? '' : canonicalJson(va);
  const jb = vb === undefined ? '' : canonicalJson(vb);
  return ja > jb ? 1 : ja < jb ? -1 : 0;
}

export function mergeRecords<T extends MergeableRecord>(a: T, b: T): T {
  if (a.id !== b.id) throw new Error(`Cannot merge different records: ${a.id} / ${b.id}`);
  if (a.cemeteryId !== undefined && b.cemeteryId !== undefined && a.cemeteryId !== b.cemeteryId) {
    throw new Error(`Record ${a.id} belongs to two cemeteries; remap before merging`);
  }
  const out: Record<string, unknown> = { id: a.id };
  const cemeteryId = a.cemeteryId ?? b.cemeteryId;
  if (cemeteryId !== undefined) out.cemeteryId = cemeteryId;
  const createdAt =
    a.createdAt === undefined || (b.createdAt !== undefined && b.createdAt < a.createdAt)
      ? b.createdAt
      : a.createdAt;
  if (createdAt !== undefined) out.createdAt = createdAt;

  const stamps: Record<string, Stamp> = {};
  for (const k of dataFields(a, b)) {
    let value: unknown;
    let stamp: Stamp | undefined;
    if (UNION_FIELDS.has(k)) {
      value = unionSorted(get(a, k), get(b, k));
      stamp = maxStamp(a.stamps[k], b.stamps[k]);
    } else {
      const winner = pick(a, b, k) >= 0 ? a : b;
      value = get(winner, k);
      stamp = winner.stamps[k];
    }
    if (value !== undefined) out[k] = value;
    if (stamp !== undefined) stamps[k] = stamp;
  }
  out.stamps = stamps;
  const deleted = maxStamp(a.deleted, b.deleted);
  if (deleted !== undefined) out.deleted = deleted;
  return out as unknown as T;
}

/** Per contributor, the greatest HLC we have seen from them (the last common sync point). */
export type LastSeen = Record<ID, HLC>;

export function updateLastSeen(lastSeen: LastSeen, record: MergeableRecord): LastSeen {
  const out = { ...lastSeen };
  const stamps = [...Object.values(record.stamps), ...(record.deleted ? [record.deleted] : [])];
  for (const s of stamps) {
    const prev = out[s.by];
    if (prev === undefined || s.hlc > prev) out[s.by] = s.hlc;
  }
  return out;
}

export interface FieldConflict {
  field: string;
  local: unknown;
  remote: unknown;
  localStamp: Stamp;
  remoteStamp: Stamp;
  kept: 'local' | 'remote';
}

/**
 * Fields that both sides changed since the last sync with the remote writer, to different
 * values. The merge still resolves them deterministically; this is only for optional review.
 * `lastSeen` is the local device's sync state from before this import.
 */
export function detectConflicts(
  local: MergeableRecord,
  remote: MergeableRecord,
  lastSeen: LastSeen,
): FieldConflict[] {
  const out: FieldConflict[] = [];
  for (const k of dataFields(local, remote)) {
    if (UNION_FIELDS.has(k)) continue;
    const ls = local.stamps[k];
    const rs = remote.stamps[k];
    if (!ls || !rs || compareStamps(ls, rs) === 0) continue;
    const base = lastSeen[rs.by];
    if (base !== undefined && (ls.hlc <= base || rs.hlc <= base)) continue;
    const lv = get(local, k);
    const rv = get(remote, k);
    if (deepEqual(lv, rv)) continue;
    out.push({
      field: k,
      local: lv,
      remote: rv,
      localStamp: ls,
      remoteStamp: rs,
      kept: pick(local, remote, k) >= 0 ? 'local' : 'remote',
    });
  }
  return out;
}

/** Merge two collections by id (duplicates within one side merge too). Output is sorted by id. */
export function mergeCollections<T extends MergeableRecord>(a: readonly T[], b: readonly T[]): T[] {
  const byId = new Map<ID, T>();
  for (const r of [...a, ...b]) {
    const prev = byId.get(r.id);
    byId.set(r.id, prev ? mergeRecords(prev, r) : normalizeRecord(r));
  }
  return [...byId.values()]
    .map((r) => normalizeRecord(r))
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}
