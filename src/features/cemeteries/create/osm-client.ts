/**
 * Network calls for cemetery setup. Each runs only on an explicit tap (plan §24). Nominatim is
 * limited to 1 request/second and results are cached for the session, per its usage policy.
 */
import type { LngLat } from '../../../domain';
import {
  nominatimSearchUrl,
  OVERPASS,
  overpassNearQuery,
  parseNominatim,
  parseOverpass,
  type PlaceCandidate,
} from './osm';

const cache = new Map<string, unknown>();
let nominatimNext = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait for this request's 1-second slot. Exported for tests. */
export async function nominatimSlot(now = Date.now()): Promise<void> {
  const at = Math.max(now, nominatimNext);
  nominatimNext = at + 1000;
  if (at > now) await sleep(at - now);
}

/** Forget cached results and the rate-limit slot (tests). */
export function resetOsmClient(): void {
  cache.clear();
  nominatimNext = 0;
}

async function json(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchPlaces(query: string, language?: string): Promise<PlaceCandidate[]> {
  const url = nominatimSearchUrl(query, language);
  if (!cache.has(url)) {
    await nominatimSlot();
    cache.set(url, await json(await fetch(url, { headers: { Accept: 'application/json' } })));
  }
  return parseNominatim(cache.get(url));
}

export async function cemeteriesNear(at: LngLat, radiusM = 1500): Promise<PlaceCandidate[]> {
  const query = overpassNearQuery(at, radiusM);
  if (!cache.has(query)) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
    });
    cache.set(query, await json(res));
  }
  return parseOverpass(cache.get(query), at);
}

/** One GPS fix, on request. GPS is never run continuously (plan §7.3). */
export function currentLocation(): Promise<LngLat & { accuracyM: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ lng: p.coords.longitude, lat: p.coords.latitude, accuracyM: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  });
}
