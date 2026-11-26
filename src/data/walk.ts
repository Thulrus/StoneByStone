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

/** The row's stones with an index, their layout slots, and the line they're laid out on. */
export async function rowLayoutInputs(store: Store, row: Row) {
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
    await getRowStart(store, row.id),
    undefined,
    fixes,
  );
  return { stones, slots, line };
}

/** Lay out the row's computed positions again. Joins the current operation if there is one. */
export async function relayoutRow(store: Store, rowId: ID): Promise<number> {
  return store.run('Re-space row', async () => {
    const row = await store.rows.get(rowId);
    if (!row) return 0;
    const { stones, slots, line } = await rowLayoutInputs(store, row);
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
  /**
   * Index to put the stone at (Insert, or the start of a reversed walk). Stones at or after it
   * move up when the slot is taken. Default: after the last stone.
   */
  at?: number;
  /** Empty slots (Gap) to leave before this stone, in walking order. */
  gaps?: number;
  /** For Skip: a stone with no photo yet, flagged `needs-revisit`. */
  flags?: string[];
}

/** Add the next stone in a row (with its photo) and re-space the row: one undo step. */
export async function captureStone(
  store: Store,
  { rowId, photo, at, gaps = 0, flags }: StoneCapture,
): Promise<Monument> {
  const row = await store.rows.get(rowId);
  if (!row) throw new Error(`No row ${rowId}`);
  return store.run('Add stone', async (ctx) => {
    const stones = await rowStones(store, row);
    let rowIndex: number;
    if (at === undefined) rowIndex = (await nextRowIndex(store, row)) + gaps;
    else {
      rowIndex = Math.max(0, at);
      const taken = stones.some((m) => m.address?.rowIndex === rowIndex);
      if (taken || gaps > 0) await shiftFrom(store, stones, rowIndex, 1 + gaps);
    }
    const m = await store.monuments.create({
      cemeteryId: row.cemeteryId,
      kind: 'headstone',
      address: { ...(row.sectionId ? { sectionId: row.sectionId } : {}), rowId, rowIndex },
      ...(flags?.length ? { flags } : {}),
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

export async function setIndex(store: Store, m: Monument, rowIndex: number) {
  if (m.address?.rowIndex === rowIndex) return;
  await store.monuments.update(m.id, { address: { ...m.address, rowIndex } });
}

export async function shiftFrom(
  store: Store,
  stones: readonly Monument[],
  from: number,
  by: number,
) {
  for (const m of stones) {
    const i = m.address?.rowIndex;
    if (i !== undefined && i >= from) await setIndex(store, m, i + by);
  }
}

/**
 * "Row end here": the row's line becomes start → here (start is the "Row start here" fix,
 * else the drawn line's first point), and everything is re-spaced. With `atStart` (a reversed
 * walk, heading towards stone 1) the line becomes here → its current end instead.
 */
export async function endRowHere(
  store: Store,
  rowId: ID,
  end: RowFix,
  { atStart = false } = {},
): Promise<boolean> {
  const row = await store.rows.get(rowId);
  const coords = row?.line?.coordinates;
  const kept = atStart ? coords?.[coords.length - 1] : coords?.[0];
  const fromLine = kept ? { lng: kept[0] ?? 0, lat: kept[1] ?? 0 } : undefined;
  const fromStart = await getRowStart(store, rowId);
  // Without a line, the start fix is the far end either way (a reversed row keeps it last).
  const other = atStart ? (fromLine ?? fromStart) : (fromStart ?? fromLine);
  if (!other) return false;
  const pair = atStart ? [end, other] : [other, end];
  await store.run('Row end', async () => {
    await store.rows.update(rowId, {
      line: { type: 'LineString', coordinates: pair.map((p) => [p.lng, p.lat]) },
    });
    await relayoutRow(store, rowId);
  });
  return true;
}
