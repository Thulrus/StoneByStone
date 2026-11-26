/**
 * Walk-a-row capture (plan §7.2): each stone gets the next `rowIndex` in its row, and every
 * computed position in the row is laid out again (`geo/row-layout`). A stone's GPS fix is the
 * `position` of its first photo that has one, so re-spacing can happen at any time.
 */
import type { ID, Monument, Position, Row } from '../domain';
import { effectiveRowLine, layoutRow, type RowFix, type RowSlot } from '../geo';
import { writePhoto, type PreparedPhoto } from './photos';
import { getSetting, setSetting } from './settings';
import type { Store } from './store';

/** Device-local "Row start here" fix, kept until the row gets its line. */
const startKey = (rowId: ID) => `walk:start:${rowId}`;

export async function getRowStart(store: Store, rowId: ID): Promise<RowFix | undefined> {
  return getSetting<RowFix | undefined>(store, startKey(rowId), undefined);
}

export async function setRowStart(store: Store, rowId: ID, fix: RowFix): Promise<void> {
  await setSetting(store, startKey(rowId), fix);
}

export async function rowStones(store: Store, row: Pick<Row, 'id' | 'cemeteryId'>) {
  const all = await store.db.monuments
    .where('[cemeteryId+address.rowId+address.rowIndex]')
    .between([row.cemeteryId, row.id, -Infinity], [row.cemeteryId, row.id, Infinity])
    .toArray();
  return all.filter((m) => !m.deleted);
}

export async function nextRowIndex(store: Store, row: Pick<Row, 'id' | 'cemeteryId'>) {
  const stones = await rowStones(store, row);
  return stones.reduce((n, m) => Math.max(n, (m.address?.rowIndex ?? -1) + 1), 0);
}

const toFix = (p: Position): RowFix => ({
  lng: p.lng,
  lat: p.lat,
  ...(p.accuracyM !== undefined ? { accuracyM: p.accuracyM } : {}),
});

/** Positions the layout owns; anything else was placed some other way and is kept. */
const computed = (m: Monument) => !m.position || m.position.source === 'row-interpolated';

const moved = (a: Position | undefined, b: Position) =>
  !a ||
  a.source !== b.source ||
  a.accuracyM !== b.accuracyM ||
  Math.abs(a.lng - b.lng) > 1e-7 ||
  Math.abs(a.lat - b.lat) > 1e-7;

/** Lay out the row's computed positions again. Joins the current operation if there is one. */
export async function relayoutRow(store: Store, rowId: ID): Promise<number> {
  return store.run('Re-space row', async () => {
    const row = await store.rows.get(rowId);
    if (!row) return 0;
    const stones = (await rowStones(store, row)).filter((m) => m.address?.rowIndex !== undefined);
    const slots: RowSlot[] = [];
    const fixes: RowFix[] = [];
    for (const m of stones) {
      const slot: RowSlot = { index: m.address?.rowIndex ?? 0 };
      if (!computed(m) && m.position) slot.placed = toFix(m.position);
      else {
        const photos = await store.photos.byMonument(m.id);
        const withFix = photos.find((p) => p.position);
        if (withFix?.position) {
          slot.fix = toFix(withFix.position);
          fixes.push(slot.fix);
        }
      }
      slots.push(slot);
    }
    const line = effectiveRowLine(
      row.line?.coordinates,
      await getRowStart(store, rowId),
      undefined,
      fixes,
    );
    if (!line) return 0;
    const placements = new Map(layoutRow(line, slots).map((p) => [p.index, p]));
    let changed = 0;
    for (const m of stones) {
      if (!computed(m)) continue;
      const p = placements.get(m.address?.rowIndex ?? -1);
      if (!p) continue;
      const position: Position = {
        lng: p.point[0],
        lat: p.point[1],
        source: 'row-interpolated',
        ...(p.accuracyM !== undefined ? { accuracyM: p.accuracyM } : {}),
      };
      if (!moved(m.position, position)) continue;
      await store.monuments.update(m.id, { position });
      changed++;
    }
    return changed;
  });
}

export interface StoneCapture {
  rowId: ID;
  /** The front photo, read and hashed already (`preparePhoto`). */
  photo?: PreparedPhoto;
}

/** Add the next stone in a row (with its photo) and re-space the row: one undo step. */
export async function captureStone(
  store: Store,
  { rowId, photo }: StoneCapture,
): Promise<Monument> {
  const row = await store.rows.get(rowId);
  if (!row) throw new Error(`No row ${rowId}`);
  return store.run('Add stone', async (ctx) => {
    const rowIndex = await nextRowIndex(store, row);
    const m = await store.monuments.create({
      cemeteryId: row.cemeteryId,
      kind: 'headstone',
      address: { ...(row.sectionId ? { sectionId: row.sectionId } : {}), rowId, rowIndex },
    });
    if (photo)
      await writePhoto(store, ctx, row.cemeteryId, {
        ...photo,
        record: { ...photo.record, monumentId: m.id },
      });
    await relayoutRow(store, rowId);
    return (await store.monuments.get(m.id)) ?? m;
  });
}

/**
 * "Row end here": the row's line becomes start → here (start is the "Row start here" fix,
 * else the drawn line's first point), and everything is re-spaced.
 */
export async function endRowHere(store: Store, rowId: ID, end: RowFix): Promise<boolean> {
  const row = await store.rows.get(rowId);
  const first = row?.line?.coordinates[0];
  const start =
    (await getRowStart(store, rowId)) ??
    (first ? { lng: first[0] ?? 0, lat: first[1] ?? 0 } : undefined);
  if (!start) return false;
  await store.run('Row end', async () => {
    await store.rows.update(rowId, {
      line: {
        type: 'LineString',
        coordinates: [
          [start.lng, start.lat],
          [end.lng, end.lat],
        ],
      },
    });
    await relayoutRow(store, rowId);
  });
  return true;
}
