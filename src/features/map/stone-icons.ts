/** Status icons for the stones symbol layer, drawn once per map from the shared SVG paths. */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MonumentStatus } from '../../domain';
import { STATUS_ORDER, STATUS_STYLE } from '../stones/status-style';

const SIZE = 24;
const RATIO = 2;

export const ICON_PREFIX = 'sbs-stone-';
export const iconId = (s: MonumentStatus) => `${ICON_PREFIX}${s}`;

function draw(status: MonumentStatus): ImageData | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE * RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof Path2D === 'undefined') return undefined;
  const s = STATUS_STYLE[status];
  ctx.scale(RATIO, RATIO);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const shape = new Path2D(s.shape);
  // A dark halo, then a white outline, so every shape reads over imagery (plan §17).
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 4;
  ctx.stroke(shape);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke(shape);
  ctx.fillStyle = s.color;
  ctx.fill(shape, 'evenodd');
  if (s.mark) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.stroke(new Path2D(s.mark));
  }
  return ctx.getImageData(0, 0, SIZE * RATIO, SIZE * RATIO);
}

/** Register the four status icons on `map` (idempotent). */
export function addStoneIcons(map: MapLibreMap): void {
  for (const s of STATUS_ORDER) {
    if (map.hasImage(iconId(s))) continue;
    const img = draw(s);
    if (img) map.addImage(iconId(s), img, { pixelRatio: RATIO });
  }
}
