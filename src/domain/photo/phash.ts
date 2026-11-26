/**
 * Perceptual hash (DCT pHash, 64 bits as 16 hex chars) for photo match scoring (plan §19).
 * Input is a square grayscale image, normally 32×32, already downscaled by the caller.
 */

export const PHASH_SIZE = 32;
const LOW = 8;

const at = (a: ArrayLike<number>, i: number) => a[i] ?? 0;

/** Luma from RGBA pixels (canvas `ImageData.data`). */
export function rgbaToGray(rgba: ArrayLike<number>): Float64Array {
  const out = new Float64Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = 0.299 * at(rgba, i * 4) + 0.587 * at(rgba, i * 4 + 1) + 0.114 * at(rgba, i * 4 + 2);
  }
  return out;
}

let cosTable: Float64Array | undefined;
function cosines(n: number): Float64Array {
  if (cosTable?.length === n * LOW) return cosTable;
  const t = new Float64Array(n * LOW);
  for (let u = 0; u < LOW; u++) {
    for (let x = 0; x < n; x++) t[u * n + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
  }
  return (cosTable = t);
}

export function phash(gray: ArrayLike<number>, size = PHASH_SIZE): string {
  if (gray.length !== size * size) throw new Error(`phash expects ${size}×${size} pixels`);
  const c = cosines(size);
  // Separable DCT, low 8×8 frequencies only.
  const rows = new Float64Array(size * LOW);
  for (let y = 0; y < size; y++) {
    for (let u = 0; u < LOW; u++) {
      let s = 0;
      for (let x = 0; x < size; x++) s += at(gray, y * size + x) * at(c, u * size + x);
      rows[y * LOW + u] = s;
    }
  }
  const coef: number[] = [];
  for (let v = 0; v < LOW; v++) {
    for (let u = 0; u < LOW; u++) {
      let s = 0;
      for (let y = 0; y < size; y++) s += at(rows, y * LOW + u) * at(c, v * size + y);
      coef.push(s);
    }
  }
  // Median over the 63 AC terms; the DC term only carries overall brightness.
  const ac = coef.slice(1).sort((a, b) => a - b);
  const median = at(ac, ac.length >> 1);
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    let nib = 0;
    for (let b = 0; b < 4; b++) nib = (nib << 1) | (at(coef, i + b) > median ? 1 : 0);
    hex += nib.toString(16);
  }
  return hex;
}

/** Number of differing bits between two hashes of equal length. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new Error('hash lengths differ');
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a.charAt(i), 16) ^ parseInt(b.charAt(i), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}
