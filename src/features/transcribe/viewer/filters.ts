/** Photo enhancement settings (plan §9). Non-destructive: the stored photo never changes. */

export interface Enhancement {
  /** −1…1, added. */
  brightness: number;
  /** −1…1; 0 = unchanged. */
  contrast: number;
  /** Levels: input black and white points, 0…1, and gamma (0.2…5, 1 = linear). */
  black: number;
  white: number;
  gamma: number;
  grayscale: boolean;
  invert: boolean;
  /** Unsharp mask amount, 0…3. */
  sharpen: number;
  /** CLAHE-style local contrast, 0…1. */
  localContrast: number;
  /** Raking light (emboss) strength 0…1, from `lightDeg` (0 = from the left, 90 = from above). */
  emboss: number;
  lightDeg: number;
  /** Straighten, degrees (−45…45, plus quarter turns). */
  rotateDeg: number;
  /** Perspective keystones, −0.5…0.5. */
  vertical: number;
  horizontal: number;
}

export const NO_ENHANCEMENT: Enhancement = {
  brightness: 0,
  contrast: 0,
  black: 0,
  white: 1,
  gamma: 1,
  grayscale: false,
  invert: false,
  sharpen: 0,
  localContrast: 0,
  emboss: 0,
  lightDeg: 45,
  rotateDeg: 0,
  vertical: 0,
  horizontal: 0,
};

export type PresetId = 'marble' | 'faint' | 'raking';

/** Starting points that often make weathered stone readable. */
export const PRESETS: Record<PresetId, Partial<Enhancement>> = {
  // Weathered marble: local contrast + raking light, in grey (plan §9).
  marble: { grayscale: true, localContrast: 0.7, emboss: 0.45, sharpen: 0.8, contrast: 0.15 },
  // Faint, low-contrast lettering: stretch the levels and sharpen.
  faint: { grayscale: true, black: 0.25, white: 0.8, contrast: 0.3, sharpen: 1.2 },
  // Shallow carving: strong relief only.
  raking: { grayscale: true, emboss: 0.85, localContrast: 0.3 },
};

/** Apply a preset over the current geometry (rotation and perspective stay). */
export function withPreset(e: Enhancement, id: PresetId): Enhancement {
  return {
    ...NO_ENHANCEMENT,
    rotateDeg: e.rotateDeg,
    vertical: e.vertical,
    horizontal: e.horizontal,
    lightDeg: e.lightDeg,
    ...PRESETS[id],
  };
}

export const isUnchanged = (e: Enhancement) =>
  (Object.keys(NO_ENHANCEMENT) as (keyof Enhancement)[]).every(
    (k) => k === 'lightDeg' || e[k] === NO_ENHANCEMENT[k],
  );

/** A quarter turn more, normalised to [−180, 180). */
export const quarterTurn = (deg: number, dir: 1 | -1): number =>
  ((((deg + 90 * dir) % 360) + 540) % 360) - 180;

/** The subset a plain `<img>` can do with CSS, for browsers without WebGL2. */
export function cssFilter(e: Enhancement): string {
  const parts = [
    `brightness(${(1 + e.brightness).toFixed(3)})`,
    `contrast(${(1 + e.contrast).toFixed(3)})`,
  ];
  if (e.grayscale) parts.push('grayscale(1)');
  if (e.invert) parts.push('invert(1)');
  return parts.join(' ');
}

export const cssTransform = (e: Enhancement): string => `rotate(${e.rotateDeg}deg)`;
