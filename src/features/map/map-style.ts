import type { ExpressionSpecification } from 'maplibre-gl';

/** Paint for overlays. High-contrast colours that read over aerial imagery (plan §17). */
const ACCENT = '#f5c542';

export const BOUNDARY_LINE = { 'line-color': ACCENT, 'line-width': 2, 'line-dasharray': [2, 1] };
export const BOUNDARY_FILL = { 'fill-color': ACCENT, 'fill-opacity': 0.08 };
export const ROW_LINE = { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.9 };
export const ACTIVE_LINE = { 'line-color': ACCENT, 'line-width': 7 };
export const PREVIEW_LINE = { 'line-color': ACCENT, 'line-width': 5 };

/** Stones grow with zoom: dots when zoomed out, glove-sized near z20. */
export const STONE_ICON_SIZE: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  15,
  0.45,
  18,
  0.8,
  21,
  1.4,
];
const SELECTED_RADIUS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  15,
  8,
  18,
  14,
  21,
  24,
];
export const STONE_SELECTED = {
  'circle-radius': SELECTED_RADIUS,
  'circle-color': 'rgba(0,0,0,0)',
  'circle-stroke-color': ACCENT,
  'circle-stroke-width': 4,
};
export const GRID_PREVIEW_FILL = { 'fill-color': ACCENT, 'fill-opacity': 0.15 };
export const GRID_PREVIEW_LINE = { 'line-color': ACCENT, 'line-width': 1, 'line-opacity': 0.8 };
/** A stone's GPS accuracy circle (plan §7.3). */
export const STONE_ACCURACY_FILL = { 'fill-color': ACCENT, 'fill-opacity': 0.12 };
export const STONE_ACCURACY_LINE = {
  'line-color': ACCENT,
  'line-width': 2,
  'line-dasharray': [2, 2],
};
