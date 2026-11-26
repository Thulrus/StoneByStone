import { bboxOf } from '../../geo';
import type { Cemetery, Monument, Row } from '../../domain';
import type { MapCamera } from './map-context';

/** Where to open the map: the cemetery's boundary, rows and stones, else its location, else the world. */
export function cameraFor(
  cemetery: Pick<Cemetery, 'boundary' | 'location'>,
  rows: readonly Row[],
  stones: readonly Pick<Monument, 'position'>[] = [],
): MapCamera {
  const placed = stones.flatMap((m) => (m.position ? [[m.position.lng, m.position.lat]] : []));
  const box = bboxOf([
    cemetery.boundary,
    ...rows.map((r) => r.line),
    placed.length ? { type: 'MultiPoint', coordinates: placed } : undefined,
  ]);
  if (box && (box[2] - box[0] > 1e-5 || box[3] - box[1] > 1e-5)) return { bounds: box };
  if (box) return { center: [box[0], box[1]], zoom: 19 };
  if (cemetery.location)
    return { center: [cemetery.location.lng, cemetery.location.lat], zoom: 18 };
  return { center: [0, 20], zoom: 1.5 };
}
