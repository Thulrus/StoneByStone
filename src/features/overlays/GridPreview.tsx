import type { FeatureCollection } from 'geojson';
import { useMemo } from 'react';
import type { Overlay } from '../../domain';
import { toLngLat, type Affine } from '../../geo';
import { GeoJsonLayer } from '../map/layers';
import { GRID_PREVIEW_FILL, GRID_PREVIEW_LINE } from '../map/map-style';

/** Live preview of the grid's cells over the imagery, with the current fit. */
export function GridPreview({ grid, transform }: { grid: Overlay; transform?: Affine }) {
  const data = useMemo<FeatureCollection>(() => {
    if (!transform) return { type: 'FeatureCollection', features: [] };
    const rows = grid.grid?.rows ?? 0;
    const cols = grid.grid?.cols ?? 0;
    const valid = grid.grid?.validCells ? new Set(grid.grid.validCells) : undefined;
    const features: FeatureCollection['features'] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (valid && !valid.has(`${r},${c}`)) continue;
        const ring = [
          [c, r],
          [c + 1, r],
          [c + 1, r + 1],
          [c, r + 1],
          [c, r],
        ].map(([x = 0, y = 0]) => toLngLat(transform, [x, y]));
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [grid, transform]);
  return <GeoJsonLayer data={data} fill={GRID_PREVIEW_FILL} line={GRID_PREVIEW_LINE} />;
}
