import type { CemeterySettings } from './types';

export const DEFAULT_LICENSE = 'CC-BY-4.0';

export function defaultCemeterySettings(): CemeterySettings {
  return {
    units: 'imperial',
    dateLocale: 'en-US',
    transcriptionConvention: 'as-carved',
    photoMaxPx: 1600,
  };
}
