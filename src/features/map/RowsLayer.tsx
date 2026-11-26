import type { FeatureCollection, LineString } from 'geojson';
import { useMemo } from 'react';
import type { ID, Row } from '../../domain';
import { GeoJsonLayer, Pin } from './layers';
import { ACTIVE_LINE, BOUNDARY_FILL, BOUNDARY_LINE, ROW_LINE } from './map-style';

export function BoundaryLayer({ boundary }: { boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon }) {
  return <GeoJsonLayer data={boundary} fill={BOUNDARY_FILL} line={BOUNDARY_LINE} />;
}

function lines(rows: readonly Row[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: rows.flatMap((r) =>
      r.line ? [{ type: 'Feature', properties: { id: r.id }, geometry: r.line }] : [],
    ),
  };
}

export interface RowsLayerProps {
  rows: readonly Row[];
  activeId?: ID;
  /** Row id → label shown on the map (e.g. with its section). */
  labelOf: (r: Row) => string;
  onSelect?: (id: ID) => void;
}

/** Row lines with a tappable label at each row's start. */
export function RowsLayer({ rows, activeId, labelOf, onSelect }: RowsLayerProps) {
  const all = useMemo(() => lines(rows), [rows]);
  const active = useMemo(() => lines(rows.filter((r) => r.id === activeId)), [rows, activeId]);
  return (
    <>
      <GeoJsonLayer data={all} line={ROW_LINE} />
      <GeoJsonLayer data={active} line={ACTIVE_LINE} />
      {rows.map((r) => {
        const start = r.line?.coordinates[0];
        if (!start) return null;
        return (
          <Pin
            key={`${r.id}-${String(r.id === activeId)}`}
            lngLat={[start[0] ?? 0, start[1] ?? 0]}
            label={labelOf(r)}
            className={r.id === activeId ? 'sbs-label sbs-label-active' : 'sbs-label'}
            onClick={onSelect ? () => onSelect(r.id) : undefined}
          />
        );
      })}
    </>
  );
}
