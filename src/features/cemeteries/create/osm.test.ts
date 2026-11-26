import type { Polygon } from 'geojson';
import { nominatimSlot, resetOsmClient } from './osm-client';
import {
  areaCenter,
  nominatimSearchUrl,
  overpassNearQuery,
  parseNominatim,
  parseOverpass,
  stitchRings,
} from './osm';

const square = (x: number, y: number, d: number) => [
  { lat: y, lon: x },
  { lat: y, lon: x + d },
  { lat: y + d, lon: x + d },
  { lat: y + d, lon: x },
  { lat: y, lon: x },
];

describe('Nominatim', () => {
  it('builds a search URL with polygons and address details', () => {
    const u = new URL(nominatimSearchUrl(' Old North Cemetery, Concord ', 'fr'));
    expect(u.searchParams.get('q')).toBe('Old North Cemetery, Concord');
    expect(u.searchParams.get('polygon_geojson')).toBe('1');
    expect(u.searchParams.get('addressdetails')).toBe('1');
    expect(u.searchParams.get('accept-language')).toBe('fr');
  });

  it('parses results, cemeteries first, with boundary and admin areas', () => {
    const results = parseNominatim([
      {
        osm_type: 'node',
        osm_id: 1,
        lat: '43.2',
        lon: '-71.5',
        name: 'Concord',
        category: 'place',
        type: 'city',
      },
      {
        osm_type: 'way',
        osm_id: 22,
        lat: '43.21',
        lon: '-71.54',
        name: 'Old North Cemetery',
        display_name: 'Old North Cemetery, Concord, NH, USA',
        category: 'landuse',
        type: 'cemetery',
        address: {
          country_code: 'us',
          state: 'New Hampshire',
          county: 'Merrimack County',
          city: 'Concord',
        },
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      },
      { osm_type: 'node', osm_id: 3, lat: 'x', lon: '0' },
    ]);
    expect(results.map((r) => r.key)).toEqual(['way/22', 'node/1']);
    const [cem] = results;
    expect(cem).toMatchObject({
      name: 'Old North Cemetery',
      isCemetery: true,
      osm: 'way/22',
      country: 'US',
      adminAreas: ['New Hampshire', 'Merrimack County', 'Concord'],
      location: { lng: -71.54, lat: 43.21 },
    });
    expect(cem?.boundary?.type).toBe('Polygon');
    expect(results[1]?.boundary).toBeUndefined();
    expect(parseNominatim({ error: 'x' })).toEqual([]);
  });
});

describe('Overpass', () => {
  it('queries cemeteries and graveyards around a point', () => {
    const q = overpassNearQuery({ lng: -72.1, lat: 43.5 }, 1500.4);
    expect(q).toContain('nwr["landuse"="cemetery"](around:1500,43.500000,-72.100000)');
    expect(q).toContain('nwr["amenity"="grave_yard"]');
    expect(q).toContain('out tags geom');
  });

  it('stitches split, reversed ways into rings and drops open ones', () => {
    const rings = stitchRings([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 1],
        [1, 0],
      ], // reversed
      [
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      [
        [5, 5],
        [6, 6],
      ], // never closes
    ]);
    expect(rings).toEqual([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
  });

  it('turns ways, relations with holes, and nodes into candidates, nearest first', () => {
    const from = { lng: 0.5, lat: 0.5 };
    const out = parseOverpass(
      {
        elements: [
          { type: 'node', id: 9, lat: 0.5, lon: 3, tags: { amenity: 'grave_yard' } },
          {
            type: 'relation',
            id: 7,
            tags: { name: 'Big Yard', landuse: 'cemetery' },
            members: [
              { type: 'way', role: 'outer', geometry: square(10, 0, 4).slice(0, 3) },
              { type: 'way', role: 'outer', geometry: square(10, 0, 4).slice(2) },
              { type: 'way', role: 'inner', geometry: square(11, 1, 1) },
              { type: 'way', role: 'outer', geometry: square(20, 0, 1) },
            ],
          },
          { type: 'way', id: 5, tags: { name: 'Churchyard' }, geometry: square(0, 0, 1) },
          { type: 'way', id: 6, geometry: square(0, 0, 1).slice(0, 3) }, // open: no boundary, no centre
        ],
      },
      from,
    );
    expect(out.map((c) => c.key)).toEqual(['way/5', 'node/9', 'relation/7']);
    expect(out[0]).toMatchObject({ name: 'Churchyard', distanceM: 0 });
    expect(out[0]?.boundary?.type).toBe('Polygon');
    const rel = out[2];
    expect(rel?.boundary?.type).toBe('MultiPolygon');
    const coords = rel?.boundary?.type === 'MultiPolygon' ? rel.boundary.coordinates : [];
    expect(coords[0]).toHaveLength(2); // outer + hole
    expect(coords[1]).toHaveLength(1);
    expect(out[1]?.boundary).toBeUndefined();
  });

  it('centres an L-shaped area inside it', () => {
    const l: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [3, 0],
          [3, 1],
          [1, 1],
          [1, 3],
          [0, 3],
          [0, 0],
        ],
      ],
    };
    const c = areaCenter(l);
    expect(c.lng).toBeGreaterThan(0);
    expect(c.lng).toBeLessThan(3);
  });
});

describe('Nominatim rate limit', () => {
  beforeEach(() => {
    resetOsmClient();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('spaces requests one second apart', async () => {
    const t0 = Date.now();
    let done = 0;
    void nominatimSlot(t0).then(() => done++);
    void nominatimSlot(t0).then(() => done++);
    void nominatimSlot(t0).then(() => done++);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(3);
  });
});
