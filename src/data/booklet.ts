/** What the printable booklet needs beyond the records: cover photos and contributor names. */
import type { Contributor, ID, Photo } from '../domain';
import type { Store } from './store';

const ROLE_ORDER = ['front', 'back', 'detail', 'context', 'other'];

/** Each stone's first photo by role, then time (the display order, plan §2.2). */
export async function coverPhotos(store: Store, cemeteryId: ID): Promise<Map<ID, ID>> {
  const photos = await store.photos.listByCemetery(cemeteryId);
  const best = new Map<ID, Photo>();
  const rank = (p: Photo) => ROLE_ORDER.indexOf(p.role);
  for (const p of photos) {
    const b = best.get(p.monumentId);
    if (!b || rank(p) < rank(b) || (rank(p) === rank(b) && (p.takenAt ?? '') < (b.takenAt ?? ''))) {
      best.set(p.monumentId, p);
    }
  }
  return new Map([...best].map(([m, p]) => [m, p.id]));
}

/** Everyone who wrote any of `records`, with a name, in name order. */
export async function namedContributors(
  store: Store,
  records: readonly { stamps: Record<string, { by: ID }> }[],
  also: readonly ID[] = [],
): Promise<Contributor[]> {
  const ids = new Set(also);
  for (const r of records) for (const s of Object.values(r.stamps)) ids.add(s.by);
  const found = await store.db.contributors.bulkGet([...ids]);
  return found
    .filter((c): c is Contributor => !!c && c.displayName.trim() !== '')
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
