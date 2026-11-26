/**
 * Imagery providers (plan §24). Terms were checked on 2026-11-25; the findings are recorded in
 * §24 of the plan. This module is plain data and string building, so it can be used without
 * loading the map library.
 */
import type { LngLat } from '../../domain';

export type ProviderId = string;

export interface ImageryProvider {
  id: ProviderId;
  name: string;
  /** `imagery` is aerial; `street` is map context only (too coarse to see stones). */
  kind: 'imagery' | 'street';
  /** MapLibre raster tile URL templates. */
  tiles: string[];
  tileSize: 256 | 512;
  /** Highest zoom the server has tiles for; MapLibre over-zooms beyond it. */
  maxzoom: number;
  /** HTML, shown in the always-visible attribution control. */
  attribution: string;
  /** Whether the provider's terms allow downloading an area for offline use (WP5). */
  allowsOffline: boolean;
  /** Needs an API key the user supplies (stored on this device only). */
  needsKey?: 'esri';
  custom?: boolean;
}

export interface CustomSource {
  id: ProviderId;
  name: string;
  type: 'xyz' | 'wms';
  /** XYZ template with {z}/{x}/{y} (or {quadkey}), or a WMS base URL. */
  url: string;
  /** WMS only: comma-separated layer names. */
  layers?: string;
  attribution: string;
  maxzoom: number;
  /** The user's statement that this source's terms allow offline download. */
  allowsOffline: boolean;
}

export interface ImageryKeys {
  esri?: string;
}

/** Shown where there are no tiles (offline, outside coverage). */
export const MAP_BACKGROUND = '#c9c6bd';

export const USGS_ID = 'usgs-imagery';
export const ESRI_ID = 'esri-world-imagery';
export const OSM_ID = 'osm-standard';

export const PRESETS: readonly ImageryProvider[] = [
  {
    id: USGS_ID,
    name: 'USGS National Map imagery',
    kind: 'imagery',
    tiles: [
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    // The cache is built to 1:9,028 (z16); NAIP is ~0.6–1 m, so over-zooming still helps.
    maxzoom: 16,
    attribution:
      '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank" rel="noopener">USGS The National Map</a>: orthoimagery (USDA NAIP)',
    allowsOffline: true,
  },
  {
    id: ESRI_ID,
    name: 'Esri World Imagery',
    kind: 'imagery',
    tiles: [
      'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/arcgis/imagery/static/tile/{z}/{y}/{x}?token={key}',
    ],
    tileSize: 512,
    maxzoom: 22,
    attribution:
      'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> | Esri, Vantor, Earthstar Geographics, and the GIS User Community',
    // Esri's terms don't grant offline storage for this service; treat it as online only.
    allowsOffline: false,
    needsKey: 'esri',
  },
  {
    id: OSM_ID,
    name: 'OpenStreetMap',
    kind: 'street',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxzoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    // OSM tile policy forbids "download for offline" and prefetching.
    allowsOffline: false,
  },
];

// Coarse boxes [west, south, east, north] where USGS imagery has coverage.
const US_BOXES: readonly (readonly [number, number, number, number])[] = [
  [-125, 24.4, -66.9, 49.5], // conterminous US
  [-170, 51, -129.9, 71.5], // Alaska
  [-160.6, 18.8, -154.7, 22.4], // Hawaii
  [-67.5, 17.6, -64.5, 18.6], // Puerto Rico, US Virgin Islands
  [144.5, 13.2, 145.9, 15.4], // Guam, Northern Mariana Islands
  [-170.9, -14.4, -168.1, -11], // American Samoa
];

export function inUsCoverage({ lng, lat }: LngLat): boolean {
  return US_BOXES.some(([w, s, e, n]) => lng >= w && lng <= e && lat >= s && lat <= n);
}

/**
 * The default provider for a place: USGS inside the US. Elsewhere, OpenStreetMap, because no
 * global aerial source we checked allows keyless use in a public app; users can add an Esri key
 * or a national orthophoto service (plan §24, §27).
 */
export function defaultProviderId(
  location: LngLat | undefined,
  keys: ImageryKeys = {},
): ProviderId {
  if (location && inUsCoverage(location)) return USGS_ID;
  return keys.esri ? ESRI_ID : OSM_ID;
}

const XYZ_TOKEN = /\{(z|x|y|quadkey)\}/g;

/** Why a custom source can't be used, or `undefined` when it looks valid. */
export function customSourceProblem(
  s: Pick<CustomSource, 'type' | 'url' | 'layers'>,
): 'url' | 'https' | 'placeholders' | 'layers' | undefined {
  let u: URL;
  try {
    u = new URL(s.url.replaceAll(/[{}]/g, ''));
  } catch {
    return 'url';
  }
  if (u.protocol !== 'https:') return 'https';
  if (s.type === 'wms') return s.layers?.trim() ? undefined : 'layers';
  const found = new Set([...s.url.matchAll(XYZ_TOKEN)].map((m) => m[1]));
  return found.has('quadkey') || (found.has('z') && found.has('x') && found.has('y'))
    ? undefined
    : 'placeholders';
}

/** A WMS GetMap template that MapLibre fills with each tile's Web Mercator bbox. */
export function wmsTemplate(baseUrl: string, layers: string, tileSize = 256): string {
  const u = new URL(baseUrl);
  const params: Record<string, string> = {
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: layers.trim(),
    STYLES: '',
    CRS: 'EPSG:3857',
    WIDTH: String(tileSize),
    HEIGHT: String(tileSize),
    FORMAT: 'image/jpeg',
  };
  for (const k of [...u.searchParams.keys()]) {
    if (k.toUpperCase() in params || k.toUpperCase() === 'BBOX') u.searchParams.delete(k);
  }
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  // URLSearchParams would escape the braces, so the bbox placeholder is appended verbatim.
  return `${u.toString()}&BBOX={bbox-epsg-3857}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function customProvider(s: CustomSource): ImageryProvider {
  return {
    id: s.id,
    name: s.name,
    kind: 'imagery',
    tiles: [s.type === 'wms' ? wmsTemplate(s.url, s.layers ?? '') : s.url],
    tileSize: 256,
    maxzoom: s.maxzoom,
    attribution: escapeHtml(s.attribution),
    allowsOffline: s.allowsOffline,
    custom: true,
  };
}

/** All providers available on this device. */
export function allProviders(custom: readonly CustomSource[]): ImageryProvider[] {
  return [...PRESETS, ...custom.map(customProvider)];
}

export function isUsable(p: ImageryProvider, keys: ImageryKeys): boolean {
  return !p.needsKey || Boolean(keys[p.needsKey]);
}

/**
 * The provider to show: the cemetery's choice when it exists here and is usable (a custom
 * source made on another device won't be), otherwise the default for its location.
 */
export function resolveProvider(
  chosen: ProviderId | undefined,
  location: LngLat | undefined,
  custom: readonly CustomSource[],
  keys: ImageryKeys,
): ImageryProvider {
  const all = allProviders(custom);
  const pick = all.find((p) => p.id === chosen && isUsable(p, keys));
  const fallback = defaultProviderId(location, keys);
  return pick ?? all.find((p) => p.id === fallback) ?? (PRESETS[0] as ImageryProvider);
}

/** Tile URLs with any key filled in. */
export function tileUrls(p: ImageryProvider, keys: ImageryKeys): string[] {
  const key = p.needsKey ? encodeURIComponent(keys[p.needsKey] ?? '') : '';
  return p.tiles.map((t) => t.replaceAll('{key}', key));
}
