/**
 * Pinning the v1 grid to the map and turning grid rows into rows (plan §22.4).
 */
import {
  asAffine,
  cellPolygons,
  distanceM,
  fitPins,
  toLngLat,
  type Affine,
  type SourcePoint,
} from '../geo';
import type { ControlPoint, ID, Monument, Overlay, Row } from '../domain';
import type { Geometry, Position } from 'geojson';
import { listRows } from './layout';
import type { Store } from './store';

/** The cemetery's v1 grid overlay, if it has one. */
export async function legacyGridOf(store: Store, cemeteryId: ID): Promise<Overlay | undefined> {
  return (await store.overlays.listByCemetery(cemeteryId)).find((o) => o.kind === 'legacy-grid');
}

/** Cell centre (x = col + ½, y = row + ½, y down) in the grid's source frame. */
const centre = (c: { row: number; col: number }): [number, number] => [c.col + 0.5, c.row + 0.5];

/** Polygon(s) covering the cells, mapped onto the map. */
function cellsGeometry(t: Affine, cells: { row: number; col: number }[]): Geometry {
  const polys = cellPolygons(cells).map((rings) =>
    rings.map((ring) => ring.map((p) => toLngLat(t, p) as Position)),
  );
  return polys.length === 1
    ? { type: 'Polygon', coordinates: polys[0] ?? [] }
    : { type: 'MultiPolygon', coordinates: polys };
}

export interface PinResult {
  stones: number;
  features: number;
  rmsM: number;
}

/**
 * Save the control points and transform, then position every grid stone
 * (`source: 'legacy-grid'`, accuracy ≈ residual + cell size) and turn cell features into
 * polygons. Stones someone placed another way keep their position.
 */
export async function pinLegacyGrid(
  store: Store,
  overlay: Overlay,
  points: readonly SourcePoint[],
): Promise<PinResult> {
  const fit = fitPins(points);
  if (!fit) throw new Error('Need at least two well-spread points');
  const t = fit.transform;
  const cellM = Math.max(
    distanceM(toLngLat(t, [0, 0]), toLngLat(t, [1, 0])),
    distanceM(toLngLat(t, [0, 0]), toLngLat(t, [0, 1])),
  );
  const accuracyM = Math.round((fit.rmsM + cellM) * 10) / 10;
  return store.run('Place v1 grid on map', async () => {
    const controlPoints: ControlPoint[] = points.map(({ x, y, lng, lat }) => ({ x, y, lng, lat }));
    await store.overlays.update(overlay.id, { controlPoints, transform: [...t] });
    // A v1 import has no location; the pinned grid gives it one.
    const cemetery = await store.cemeteries.get(overlay.cemeteryId);
    if (cemetery && !cemetery.location) {
      const n = points.length;
      const lng = points.reduce((s, p) => s + p.lng, 0) / n;
      const lat = points.reduce((s, p) => s + p.lat, 0) / n;
      await store.cemeteries.update(cemetery.id, { location: { lng, lat } });
    }
    let stones = 0;
    for (const m of await store.monuments.listByCemetery(overlay.cemeteryId)) {
      if (!m.legacyGrid) continue;
      if (m.position && m.position.source !== 'legacy-grid') continue;
      const [lng, lat] = toLngLat(t, centre(m.legacyGrid));
      await store.monuments.update(m.id, {
        position: { lng, lat, accuracyM, source: 'legacy-grid' },
      });
      stones++;
    }
    let features = 0;
    for (const f of await store.features.listByCemetery(overlay.cemeteryId)) {
      if (!f.legacyCells?.length) continue;
      await store.features.update(f.id, { geometry: cellsGeometry(t, f.legacyCells) });
      features++;
    }
    return { stones, features, rmsM: fit.rmsM };
  });
}

/**
 * "Treat each grid row as a cemetery row": one Row per grid row that has stones not yet in a
 * row, with those stones in column order (empty cells stay as gaps). Rows get a line when the
 * grid is pinned. Returns the rows created.
 */
export async function gridRowsToRows(store: Store, cemeteryId: ID): Promise<Row[]> {
  return store.run('Make grid rows into rows', async () => {
    const grid = await legacyGridOf(store, cemeteryId);
    const t = asAffine(grid?.transform);
    const byRow = new Map<number, Monument[]>();
    for (const m of await store.monuments.listByCemetery(cemeteryId)) {
      if (!m.legacyGrid || m.address?.rowId) continue;
      byRow.set(m.legacyGrid.row, [...(byRow.get(m.legacyGrid.row) ?? []), m]);
    }
    const taken = new Set((await listRows(store, cemeteryId)).map((r) => r.label));
    let order =
      (await listRows(store, cemeteryId, null)).reduce((o, r) => Math.max(o, r.order ?? -1), -1) +
      1;
    const out: Row[] = [];
    for (const r of [...byRow.keys()].sort((a, b) => a - b)) {
      const stones = byRow.get(r) ?? [];
      const cols = stones.map((m) => m.legacyGrid?.col ?? 0);
      const min = Math.min(...cols);
      const max = Math.max(...cols);
      let label = String(r + 1);
      if (taken.has(label)) label = `${label} (v1)`;
      taken.add(label);
      const line =
        t && max > min
          ? {
              type: 'LineString' as const,
              coordinates: [
                toLngLat(t, centre({ row: r, col: min })),
                toLngLat(t, centre({ row: r, col: max })),
              ],
            }
          : undefined;
      const row = await store.rows.create({
        cemeteryId,
        label,
        order: order++,
        ...(line ? { line } : {}),
      });
      for (const m of stones) {
        await store.monuments.update(m.id, {
          address: { ...m.address, rowId: row.id, rowIndex: (m.legacyGrid?.col ?? 0) - min },
        });
      }
      out.push(row);
    }
    return out;
  });
}
