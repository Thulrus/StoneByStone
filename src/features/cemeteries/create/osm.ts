/**
 * OpenStreetMap lookups for cemetery setup (plan §11, §24): Nominatim search and Overpass
 * "near me", turned into place candidates with a boundary where OSM has one. Request building
 * and response parsing only; `osm-client.ts` does the network.
 */
import type { MultiPolygon, Polygon, Position } from 'geojson';
import type { LngLat } from '../../../domain';
import { bboxOf, distanceM, pointInPolygon } from '../../../geo';

export interface PlaceCandidate {
  /** Stable key for lists: the OSM element, e.g. `way/123`. */
  key: string;
  name?: string;
  location: LngLat;
  boundary?: Polygon | MultiPolygon;
  /** `way/123`, `relation/45`, `node/6`. */
  osm?: string;
  /** ISO 3166-1 alpha-2, upper case. */
  country?: string;
  /** Largest first, e.g. ["Vermont", "Windsor County", "Reading"]. */
  adminAreas?: string[];
  /** Tagged as a cemetery or graveyard. */
  isCemetery: boolean;
  /** One line of context, e.g. the display name. */
  detail?: string;
  /** From the user, for "near me". */
  distanceM?: number;
}

export const NOMINATIM = 'https://nominatim.openstreetmap.org';
export const OVERPASS = 'https://overpass-api.de/api/interpreter';

export function nominatimSearchUrl(query: string, language = 'en'): string {
  const p = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    polygon_geojson: '1',
    polygon_threshold: '0.00001',
    limit: '10',
    'accept-language': language,
  });
  return `${NOMINATIM}/search?${p.toString()}`;
}

function isCemeteryTag(key: string | undefined, value: string | undefined): boolean {
  return (
    (key === 'landuse' && value === 'cemetery') || (key === 'amenity' && value === 'grave_yard')
  );
}

function areaGeometry(g: unknown): Polygon | MultiPolygon | undefined {
  const t = (g as { type?: string } | undefined)?.type;
  return t === 'Polygon' || t === 'MultiPolygon' ? (g as Polygon | MultiPolygon) : undefined;
}

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  place_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
  geojson?: unknown;
}

const ADMIN_KEYS = [
  ['state', 'province', 'region'],
  ['county', 'state_district'],
  ['city', 'town', 'village', 'hamlet', 'municipality'],
] as const;

function adminAreas(address: Record<string, string> | undefined): string[] | undefined {
  if (!address) return undefined;
  const out = ADMIN_KEYS.map((keys) => keys.map((k) => address[k]).find(Boolean)).filter(
    (x): x is string => Boolean(x),
  );
  return out.length ? out : undefined;
}

/** Nominatim results, cemeteries first. */
export function parseNominatim(json: unknown): PlaceCandidate[] {
  if (!Array.isArray(json)) return [];
  const out = (json as NominatimResult[]).flatMap((r): PlaceCandidate[] => {
    const lng = Number(r.lon);
    const lat = Number(r.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    const osm = r.osm_type && r.osm_id !== undefined ? `${r.osm_type}/${r.osm_id}` : undefined;
    const c: PlaceCandidate = {
      key: osm ?? `place/${r.place_id ?? `${lng},${lat}`}`,
      location: { lng, lat },
      isCemetery: isCemeteryTag(r.category, r.type),
    };
    if (r.name) c.name = r.name;
    if (r.display_name) c.detail = r.display_name;
    if (osm) c.osm = osm;
    const boundary = areaGeometry(r.geojson);
    if (boundary) c.boundary = boundary;
    const cc = r.address?.country_code;
    if (cc) c.country = cc.toUpperCase();
    const areas = adminAreas(r.address);
    if (areas) c.adminAreas = areas;
    return [c];
  });
  return [...out.filter((c) => c.isCemetery), ...out.filter((c) => !c.isCemetery)];
}

/** Overpass QL for cemeteries and graveyards within `radiusM` of a point, with geometry. */
export function overpassNearQuery({ lng, lat }: LngLat, radiusM: number): string {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(6)},${lng.toFixed(6)})`;
  return `[out:json][timeout:25];(nwr["landuse"="cemetery"]${around};nwr["amenity"="grave_yard"]${around};);out tags geom;`;
}

interface LatLon {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: (LatLon | null)[];
  members?: { type: string; role?: string; geometry?: (LatLon | null)[] }[];
}

const pos = (g: LatLon): Position => [g.lon, g.lat];
const same = (a: Position | undefined, b: Position | undefined) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** Join way pieces into closed rings, reversing pieces as needed. Unclosable pieces are dropped. */
export function stitchRings(pieces: readonly Position[][]): Position[][] {
  const left = pieces.filter((p) => p.length >= 2).map((p) => [...p]);
  const rings: Position[][] = [];
  while (left.length) {
    const ring = left.shift() as Position[];
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      const end = ring[ring.length - 1];
      const i = left.findIndex((p) => same(p[0], end) || same(p[p.length - 1], end));
      if (i >= 0) {
        const [next] = left.splice(i, 1) as [Position[]];
        const piece = same(next[0], end) ? next : [...next].reverse();
        ring.push(...piece.slice(1));
        grew = true;
      }
    }
    if (same(ring[0], ring[ring.length - 1]) && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function wayRing(geom: (LatLon | null)[] | undefined): Position[] | undefined {
  const pts = (geom ?? []).filter((g): g is LatLon => g !== null).map(pos);
  return pts.length >= 4 && same(pts[0], pts[pts.length - 1]) ? pts : undefined;
}

function relationArea(el: OverpassElement): Polygon | MultiPolygon | undefined {
  const pieces = (role: string) =>
    (el.members ?? [])
      .filter((m) => m.type === 'way' && (m.role || 'outer') === role)
      .map((m) => (m.geometry ?? []).filter((g): g is LatLon => g !== null).map(pos));
  const outers = stitchRings(pieces('outer'));
  if (!outers.length) return undefined;
  const polys: Position[][][] = outers.map((o) => [o]);
  for (const inner of stitchRings(pieces('inner'))) {
    const host = polys.find((p) =>
      pointInPolygon(inner[0] as Position, { type: 'Polygon', coordinates: p }),
    );
    host?.push(inner);
  }
  return polys.length === 1
    ? { type: 'Polygon', coordinates: polys[0] as Position[][] }
    : { type: 'MultiPolygon', coordinates: polys };
}

/** Area-weighted centroid of the largest outer ring; the bbox centre if that falls outside. */
export function areaCenter(g: Polygon | MultiPolygon): LngLat {
  const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
  let best = { a: 0, x: 0, y: 0 };
  for (const ring of rings) {
    if (!ring) continue;
    let a = 0, x = 0, y = 0; // prettier-ignore
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi = 0, yi = 0] = ring[i] as Position;
      const [xj = 0, yj = 0] = ring[j] as Position;
      const f = xj * yi - xi * yj;
      a += f;
      x += (xi + xj) * f;
      y += (yi + yj) * f;
    }
    if (Math.abs(a) > Math.abs(best.a)) best = { a, x: x / (3 * a), y: y / (3 * a) };
  }
  const c: Position = [best.x, best.y];
  if (best.a !== 0 && pointInPolygon(c, g)) return { lng: best.x, lat: best.y };
  const [w = 0, s = 0, e = 0, n = 0] = bboxOf([g]) ?? [];
  return { lng: (w + e) / 2, lat: (s + n) / 2 };
}

/** Overpass elements as candidates, nearest first. A user inside a boundary is at distance 0. */
export function parseOverpass(json: unknown, from: LngLat): PlaceCandidate[] {
  const elements = (json as { elements?: OverpassElement[] } | undefined)?.elements ?? [];
  const here: Position = [from.lng, from.lat];
  const out = elements.flatMap((el): PlaceCandidate[] => {
    let boundary: Polygon | MultiPolygon | undefined;
    if (el.type === 'way') {
      const ring = wayRing(el.geometry);
      if (ring) boundary = { type: 'Polygon', coordinates: [ring] };
    } else if (el.type === 'relation') {
      boundary = relationArea(el);
    }
    let location: LngLat | undefined;
    if (boundary) location = areaCenter(boundary);
    else if (el.lat !== undefined && el.lon !== undefined) location = { lng: el.lon, lat: el.lat };
    if (!location) return [];
    const osm = `${el.type}/${el.id}`;
    const c: PlaceCandidate = {
      key: osm,
      osm,
      location,
      isCemetery: true,
      distanceM:
        boundary && pointInPolygon(here, boundary)
          ? 0
          : distanceM(here, [location.lng, location.lat]),
    };
    const name = el.tags?.name;
    if (name) c.name = name;
    if (boundary) c.boundary = boundary;
    return [c];
  });
  return out.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
}
