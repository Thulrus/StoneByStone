/**
 * Backup tracking (plan §14): which stones changed since this device last exported their
 * cemetery, and when to remind the user.
 *
 * A backup records the clock's HLC at export time. A stone is "not backed up" when it, or a
 * person or photo on it, carries a stamp newer than that. Records brought in from a file keep
 * their original stamps, so they don't count unless they are newer than the last backup.
 */
import { compareHlc, type HLC, type ID, type MergeableRecord } from '../domain';
import { saveClock } from './device';
import { getSetting, setSetting } from './settings';
import type { Store } from './store';

const backupKey = (cemeteryId: ID) => `backup:${cemeteryId}`;
const REMINDED_KEY = 'backupRemindedAt';

export interface BackupMark {
  /** HLC taken right after the export was written. */
  hlc: HLC;
  /** Wall-clock milliseconds, for "last backed up 3 days ago". */
  at: number;
}

export async function lastBackup(store: Store, cemeteryId: ID): Promise<BackupMark | undefined> {
  return getSetting<BackupMark | undefined>(store, backupKey(cemeteryId), undefined);
}

/** The mark for a backup that starts now. Take it before collecting the data. */
export function backupMark(store: Store, at = Date.now()): BackupMark {
  return { hlc: store.device.clock.now(), at };
}

export async function markBackedUp(
  store: Store,
  cemeteryId: ID,
  mark: BackupMark = backupMark(store),
): Promise<void> {
  await setSetting(store, backupKey(cemeteryId), mark);
  await saveClock(store.db, store.device.clock);
}

function latestStamp(r: MergeableRecord): HLC | undefined {
  let latest: HLC | undefined = r.createdAt;
  const all = Object.values(r.stamps).map((s) => s.hlc);
  if (r.deleted) all.push(r.deleted.hlc);
  for (const h of all) if (latest === undefined || compareHlc(h, latest) > 0) latest = h;
  return latest;
}

const newer = (r: MergeableRecord, since: HLC | undefined) => {
  if (since === undefined) return true;
  const l = latestStamp(r);
  return l !== undefined && compareHlc(l, since) > 0;
};

/** Live stones in the cemetery with changes not yet in a backup. */
export async function unbackedStones(store: Store, cemeteryId: ID): Promise<number> {
  const since = (await lastBackup(store, cemeteryId))?.hlc;
  const monuments = await store.monuments.listByCemetery(cemeteryId);
  const live = new Set(monuments.map((m) => m.id));
  const changed = new Set(monuments.filter((m) => newer(m, since)).map((m) => m.id));
  const linked = [
    ...(await store.persons.listByCemetery(cemeteryId, { includeDeleted: true })),
    ...(await store.photos.listByCemetery(cemeteryId, { includeDeleted: true })),
  ];
  for (const r of linked) {
    if (r.monumentId && live.has(r.monumentId) && newer(r, since)) changed.add(r.monumentId);
  }
  return changed.size;
}

export interface BackupStatus {
  cemeteryId: ID;
  unbacked: number;
  last?: BackupMark;
}

/** Backup state of every live cemetery. */
export async function backupStatus(store: Store): Promise<BackupStatus[]> {
  const cemeteries = (await store.db.cemeteries.toArray()).filter((c) => !c.deleted);
  const out: BackupStatus[] = [];
  for (const c of cemeteries) {
    const last = await lastBackup(store, c.id);
    out.push({
      cemeteryId: c.id,
      unbacked: await unbackedStones(store, c.id),
      ...(last ? { last } : {}),
    });
  }
  return out;
}

/** How long unsaved work may sit before the user is reminded again. */
export const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
/** At most one reminder per day. */
export const REMIND_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether to remind now: there is unsaved work, the oldest backup among the affected
 * cemeteries is more than a few days old (or missing), and no reminder was shown today.
 */
export function reminderDue(
  statuses: readonly BackupStatus[],
  remindedAt: number | undefined,
  now: number,
): boolean {
  const pending = statuses.filter((s) => s.unbacked > 0);
  if (pending.length === 0) return false;
  if (remindedAt !== undefined && now - remindedAt < REMIND_EVERY_MS) return false;
  return pending.some((s) => s.last === undefined || now - s.last.at >= REMIND_AFTER_MS);
}

export async function lastReminded(store: Store): Promise<number | undefined> {
  return getSetting<number | undefined>(store, REMINDED_KEY, undefined);
}

export async function noteReminded(store: Store, at = Date.now()): Promise<void> {
  await setSetting(store, REMINDED_KEY, at);
}
