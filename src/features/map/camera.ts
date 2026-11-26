import { bboxOf } from '../../geo';
import type { Cemetery, Row } from '../../domain';
import type { MapCamera } from './map-context';

/** Where to open the map: the cemetery's boundary and rows, else its location, else the world. */
export function cameraFor(
  cemetery: Pick<Cemetery, 'boundary' | 'location'>,
  rows: readonly Row[],
): MapCamera {
  const box = bboxOf([cemetery.boundary, ...rows.map((r) => r.line)]);
  if (box && (box[2] - box[0] > 1e-5 || box[3] - box[1] > 1e-5)) return { bounds: box };
  if (box) return { center: [box[0], box[1]], zoom: 19 };
  if (cemetery.location)
    return { center: [cemetery.location.lng, cemetery.location.lat], zoom: 18 };
  return { center: [0, 20], zoom: 1.5 };
}
