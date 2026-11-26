/**
 * Photo viewer geometry (plan §9), pure. Everything the viewer does to where pixels come from
 * — zoom, pan, straighten, perspective — is one 3×3 projective matrix from canvas pixels to
 * source texture coordinates, so the shader samples the original photo once, sharply.
 *
 * Matrices are row-major `[a, b, c, d, e, f, g, h, i]` acting on column vectors `(x, y, 1)`.
 */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Vec2 = readonly [number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += (a[i * 3 + k] ?? 0) * (b[k * 3 + j] ?? 0);
      r.push(s);
    }
  return r as unknown as Mat3;
}

export function apply(m: Mat3, [x, y]: Vec2): Vec2 {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

const translate = (x: number, y: number): Mat3 => [1, 0, x, 0, 1, y, 0, 0, 1];
const scale = (sx: number, sy = sx): Mat3 => [sx, 0, 0, 0, sy, 0, 0, 0, 1];
const rotate = (deg: number): Mat3 => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

/** The projective map taking the unit square's corners (0,0) (1,0) (1,1) (0,1) to `q`. */
export function squareToQuad(q: readonly [Vec2, Vec2, Vec2, Vec2]): Mat3 {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) {
    return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1];
  }
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

/**
 * Perspective correction as two keystone amounts in [-0.5, 0.5]. `vertical > 0` widens the
 * top (a stone shot from below looks narrower at the top); `horizontal > 0` heightens the
 * left side. Returns output uv → source uv.
 */
export function keystone(vertical: number, horizontal: number): Mat3 {
  const v = Math.max(-0.5, Math.min(0.5, vertical)) / 2;
  const h = Math.max(-0.5, Math.min(0.5, horizontal)) / 2;
  const top = Math.max(v, 0);
  const bottom = Math.max(-v, 0);
  const left = Math.max(h, 0);
  const right = Math.max(-h, 0);
  return squareToQuad([
    [top, left],
    [1 - top, right],
    [1 - bottom, 1 - right],
    [bottom, 1 - left],
  ]);
}

export interface View {
  /** 1 = the whole photo fits. */
  zoom: number;
  /** The photo point (source pixels) at the canvas centre. */
  cx: number;
  cy: number;
}

export interface Size {
  w: number;
  h: number;
}

export const fitView = (img: Size): View => ({ zoom: 1, cx: img.w / 2, cy: img.h / 2 });

/** Canvas pixels per photo pixel. */
export const pixelScale = (view: View, canvas: Size, img: Size) =>
  Math.min(canvas.w / img.w, canvas.h / img.h) * view.zoom;

/** Canvas point → photo point (before straighten and perspective). */
export function canvasToImage(view: View, canvas: Size, img: Size): Mat3 {
  const s = pixelScale(view, canvas, img);
  return mul(
    translate(view.cx, view.cy),
    mul(scale(1 / s), translate(-canvas.w / 2, -canvas.h / 2)),
  );
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 16;

/** Zoom by `factor`, keeping the photo point under canvas point `p` where it is. */
export function zoomAt(view: View, p: Vec2, factor: number, canvas: Size, img: Size): View {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * factor));
  const [qx, qy] = apply(canvasToImage(view, canvas, img), p);
  const s = pixelScale({ ...view, zoom }, canvas, img);
  return { zoom, cx: qx - (p[0] - canvas.w / 2) / s, cy: qy - (p[1] - canvas.h / 2) / s };
}

/** Drag by `(dx, dy)` canvas pixels. */
export function panBy(view: View, dx: number, dy: number, canvas: Size, img: Size): View {
  const s = pixelScale(view, canvas, img);
  return { ...view, cx: view.cx - dx / s, cy: view.cy - dy / s };
}

/**
 * Canvas pixel (y down) → source uv: view, then straighten about the photo centre, then
 * perspective. Points outside [0, 1]² are off the photo.
 */
export function toSource(
  view: View,
  canvas: Size,
  img: Size,
  { rotateDeg = 0, vertical = 0, horizontal = 0 } = {},
): Mat3 {
  const toUv = scale(1 / img.w, 1 / img.h);
  const straighten = mul(
    translate(img.w / 2, img.h / 2),
    mul(rotate(-rotateDeg), translate(-img.w / 2, -img.h / 2)),
  );
  return mul(
    keystone(vertical, horizontal),
    mul(toUv, mul(straighten, canvasToImage(view, canvas, img))),
  );
}

/**
 * Canvas pixels per CSS pixel. Capped at 2: a 3× phone screen would cost more than twice the
 * shading for detail nobody can see.
 */
export const viewerDpr = (): number =>
  Math.min(2, (typeof window === 'undefined' ? 1 : window.devicePixelRatio) || 1);
