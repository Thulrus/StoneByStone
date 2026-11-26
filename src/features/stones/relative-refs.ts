import { anchorOf } from '../../geo';
import type { ID, MapFeature, Monument, Row } from '../../domain';

export interface RelativeRef {
  id: ID;
  kind: 'stone' | 'feature';
  lng: number;
  lat: number;
  accuracyM?: number | undefined;
  /** The reference's row line, for "along the row" directions. */
  rowLine?: [number, number][] | undefined;
  /** For sorting and labels. */
  row?: Row | undefined;
  rowIndex?: number | undefined;
  feature?: MapFeature;
}

/**
 * What a stone can be placed relative to: placed stones (its row neighbours first, nearest
 * index first), then other placed stones, then map features with a geometry.
 */
export function relativeRefs(
  stone: Monument,
  stones: readonly Monument[],
  features: readonly MapFeature[],
  rows: readonly Row[],
): RelativeRef[] {
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const myRow = stone.address?.rowId;
  const myIndex = stone.address?.rowIndex ?? 0;
  const out: (RelativeRef & { rank: number })[] = [];
  for (const m of stones) {
    if (m.id === stone.id || !m.position || m.deleted) continue;
    const row = m.address?.rowId ? rowOf.get(m.address.rowId) : undefined;
    const same = myRow !== undefined && m.address?.rowId === myRow;
    out.push({
      id: m.id,
      kind: 'stone',
      lng: m.position.lng,
      lat: m.position.lat,
      accuracyM: m.position.accuracyM,
      rowLine: row?.line?.coordinates as [number, number][] | undefined,
      row,
      rowIndex: m.address?.rowIndex,
      rank: same ? Math.abs((m.address?.rowIndex ?? 0) - myIndex) : 1e6,
    });
  }
  out.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.row?.label ?? '').localeCompare(b.row?.label ?? '', undefined, { numeric: true }) ||
      (a.rowIndex ?? 0) - (b.rowIndex ?? 0),
  );
  for (const f of features) {
    const at = anchorOf(f.geometry);
    if (!at || f.deleted) continue;
    out.push({ id: f.id, kind: 'feature', ...at, feature: f, rank: 2e6 });
  }
  return out.map(({ rank: _rank, ...r }) => r);
}
