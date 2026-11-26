/**
 * Photo pipeline (plan §14, §19): resize to the cemetery's long edge, ~20 KB thumbnail,
 * sha256, pHash, EXIF time/GPS. Runs on the main thread or inside `photo.worker.ts`, so it
 * only uses APIs both have (OffscreenCanvas when present, else a DOM canvas).
 */
import { exifTakenAt, phash, PHASH_SIZE, readExif, rgbaToGray } from '../../domain';
import { sha256Hex } from '../../data/hash';

export const THUMB_EDGE = 320;
export const THUMB_MAX_BYTES = 20_000;
const FULL_QUALITY = 0.85;

export interface ProcessOptions {
  /** Long edge in px (`Cemetery.settings.photoMaxPx`); larger images are scaled down. */
  maxPx: number;
}

export interface ProcessedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  sha256: string;
  phash: string;
  /** From EXIF, when the file carries it. */
  takenAt?: string;
  gps?: { lat: number; lng: number; accuracyM?: number };
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function canvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function draw(src: CanvasImageSource, w: number, h: number): { c: AnyCanvas; ctx: Ctx2D } {
  const c = canvas(w, h);
  const ctx = c.getContext('2d') as Ctx2D | null;
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return { c, ctx };
}

function encode(c: AnyCanvas, quality: number): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/jpeg', quality });
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))),
      'image/jpeg',
      quality,
    ),
  );
}

function fit(w: number, h: number, edge: number) {
  const s = Math.min(1, edge / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scaled: s < 1 };
}

/** Shrink quality, then size, until the thumbnail fits the budget. */
async function thumbnail(src: CanvasImageSource, w: number, h: number): Promise<Blob> {
  let best: Blob | undefined;
  for (const edge of [THUMB_EDGE, 240, 160]) {
    const t = fit(w, h, edge);
    const { c } = draw(src, t.w, t.h);
    for (const q of [0.7, 0.55, 0.4]) {
      best = await encode(c, q);
      if (best.size <= THUMB_MAX_BYTES) return best;
    }
  }
  if (!best) throw new Error('thumbnail failed');
  return best;
}

function hashPixels(src: CanvasImageSource): string {
  const { ctx } = draw(src, PHASH_SIZE, PHASH_SIZE);
  return phash(rgbaToGray(ctx.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE).data));
}

export async function processPhoto(file: Blob, { maxPx }: ProcessOptions): Promise<ProcessedPhoto> {
  const isJpeg = file.type === 'image/jpeg' || file.type === '';
  const exif = isJpeg ? readExif(new Uint8Array(await file.arrayBuffer())) : {};
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const size = fit(bmp.width, bmp.height, maxPx);
    // Keep the camera's own file when nothing would change: no re-encode loss, EXIF intact.
    const upright = (exif.orientation ?? 1) === 1;
    const keep = !size.scaled && upright && file.type === 'image/jpeg';
    const full = keep ? file : await encode(draw(bmp, size.w, size.h).c, FULL_QUALITY);
    const [thumb, sha256] = await Promise.all([thumbnail(bmp, size.w, size.h), sha256Hex(full)]);
    const out: ProcessedPhoto = {
      full,
      thumb,
      width: size.w,
      height: size.h,
      sha256,
      phash: hashPixels(bmp),
    };
    const takenAt = exifTakenAt(exif);
    if (takenAt) out.takenAt = takenAt;
    if (exif.lat !== undefined && exif.lng !== undefined) {
      out.gps = { lat: exif.lat, lng: exif.lng };
      if (exif.accuracyM !== undefined) out.gps.accuracyM = exif.accuracyM;
    }
    return out;
  } finally {
    bmp.close();
  }
}
