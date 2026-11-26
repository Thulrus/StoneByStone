/**
 * How each stone status looks (plan §11, §17): a colour **and** a shape, so colour is never the
 * only cue. The same paths draw the map icons (canvas) and the schematic/legend icons (SVG).
 */
import type { MonumentStatus } from '../../domain';

export interface StatusStyle {
  color: string;
  /** Filled shape in a 24×24 box (even-odd fill). */
  shape: string;
  /** Optional white stroke drawn on top (the check of `verified`). */
  mark?: string;
}

export const STATUS_ORDER: readonly MonumentStatus[] = [
  'located',
  'photographed',
  'transcribed',
  'verified',
];

export const STATUS_STYLE: Record<MonumentStatus, StatusStyle> = {
  // A ring: found, nothing recorded yet.
  located: {
    color: '#9ca3af',
    shape: 'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16Zm0 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z',
  },
  photographed: { color: '#38bdf8', shape: 'M5 5h14v14H5Z' },
  transcribed: { color: '#f59e0b', shape: 'M12 2.5l9.5 9.5-9.5 9.5-9.5-9.5Z' },
  verified: {
    color: '#22c55e',
    shape: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18Z',
    mark: 'M7.5 12.5l3 3 6-6.5',
  },
};

/** Ring drawn around the selected stone. */
export const SELECTED_COLOR = '#f5c542';
