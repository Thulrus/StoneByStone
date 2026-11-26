/** What a walk-a-row session added (plan §8 session summary). */
import type { HLC, Row } from '../domain';
import type { Store } from './store';
import { rowStones } from './walk';

export interface WalkSummary {
  stones: number;
  photos: number;
  /** Stones flagged for a revisit (Skip). */
  skipped: number;
}

/** Stones in `row` made since `since`, and the photos taken of the row's stones since then. */
export async function walkSummary(
  store: Store,
  row: Pick<Row, 'id' | 'cemeteryId'>,
  since: HLC,
): Promise<WalkSummary> {
  const all = await rowStones(store, row);
  const fresh = all.filter((m) => m.createdAt >= since);
  let photos = 0;
  for (const m of all)
    photos += (await store.photos.byMonument(m.id)).filter((p) => p.createdAt >= since).length;
  return {
    stones: fresh.length,
    photos,
    skipped: fresh.filter((m) => m.flags?.includes('needs-revisit')).length,
  };
}
