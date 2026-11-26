import type { CemeterySettings } from './types';

export const DEFAULT_LICENSE = 'CC-BY-4.0';

export const DEFAULT_PHOTO_MAX_PX = 1600;
/** "Original": larger than any camera, so photos are never downscaled. */
export const PHOTO_ORIGINAL_PX = 1_000_000;
/** Long-edge sizes offered for stored photos (plan §14). */
export const PHOTO_SIZES = [1200, 1600, 2400, PHOTO_ORIGINAL_PX] as const;

export function defaultCemeterySettings(): CemeterySettings {
  return {
    units: 'imperial',
    dateLocale: 'en-US',
    transcriptionConvention: 'as-carved',
    photoMaxPx: DEFAULT_PHOTO_MAX_PX,
  };
}
