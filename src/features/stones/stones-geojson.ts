import type { FeatureCollection, Point } from 'geojson';
import type { ID, Monument, MonumentStatus } from '../../domain';

export interface StoneProps {
  id: ID;
  status: MonumentStatus;
}

/** Stones that have a position, as one point collection for the map's WebGL layer. */
export function stonesGeoJson(stones: readonly Monument[]): FeatureCollection<Point, StoneProps> {
  const features: FeatureCollection<Point, StoneProps>['features'] = [];
  for (const m of stones) {
    if (!m.position) continue;
    features.push({
      type: 'Feature',
      properties: { id: m.id, status: m.status },
      geometry: { type: 'Point', coordinates: [m.position.lng, m.position.lat] },
    });
  }
  return { type: 'FeatureCollection', features };
}
