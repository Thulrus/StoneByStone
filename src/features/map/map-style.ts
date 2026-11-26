/** Paint for overlays. High-contrast colours that read over aerial imagery (plan §17). */
const ACCENT = '#f5c542';

export const BOUNDARY_LINE = { 'line-color': ACCENT, 'line-width': 2, 'line-dasharray': [2, 1] };
export const BOUNDARY_FILL = { 'fill-color': ACCENT, 'fill-opacity': 0.08 };
export const ROW_LINE = { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.9 };
export const ACTIVE_LINE = { 'line-color': ACCENT, 'line-width': 7 };
export const PREVIEW_LINE = { 'line-color': ACCENT, 'line-width': 5 };
