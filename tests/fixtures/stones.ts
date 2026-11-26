/**
 * A synthetic `.sbs.json` with many placed stones, for the 10,000-stone performance check
 * (plan §17, #28). Plain JSON, no app imports, so Playwright and scripts can use it too;
 * `src/data/format/stones-fixture.test.ts` validates the output against the v2 schemas.
 */
const STATUSES = ['located', 'photographed', 'transcribed', 'verified'] as const;

const uuid = (kind: number, i: number) =>
  `0193f1c2-${kind.toString(16).padStart(4, '0')}-7000-8000-${i.toString(16).padStart(12, '0')}`;

export interface StonesFixtureOptions {
  rows?: number;
  perRow?: number;
  /** [lng, lat] of the first stone. */
  origin?: [number, number];
}

export function makeStonesDocument({
  rows = 100,
  perRow = 100,
  origin = [-72.6, 43.5],
}: StonesFixtureOptions = {}) {
  const who = uuid(0, 1);
  const cemeteryId = uuid(1, 1);
  const hlc = `${String(1764000000000).padStart(15, '0')}-00000-00000000000000aa`;
  const stamp = { hlc, by: who };
  const stampAll = (r: Record<string, unknown>) =>
    Object.fromEntries(Object.keys(r).map((k) => [k, stamp]));
  // ~1 m between stones, 2 m between rows.
  const dLng = 1 / (111320 * Math.cos((origin[1] * Math.PI) / 180));
  const dLat = 1 / 110540;
  const at = (r: number, i: number): [number, number] => [
    origin[0] + i * dLng,
    origin[1] + r * 2 * dLat,
  ];

  const rowRecords = [];
  const monuments = [];
  for (let r = 0; r < rows; r++) {
    const id = uuid(2, r);
    const fields = {
      label: String(r + 1),
      order: r,
      line: { type: 'LineString', coordinates: [at(r, 0), at(r, perRow - 1)] },
    };
    rowRecords.push({ id, cemeteryId, createdAt: hlc, ...fields, stamps: stampAll(fields) });
    for (let i = 0; i < perRow; i++) {
      const [lng, lat] = at(r, i);
      const n = r * perRow + i;
      const f = {
        kind: 'headstone',
        position: { lng, lat, source: 'map' },
        address: { rowId: id, rowIndex: i },
        status: STATUSES[n % 4],
        ...(n % 4 === 3 ? { verified: stamp } : {}),
        ...(n % 4 >= 2 ? { inscription: { text: `Stone ${n + 1}` } } : {}),
      };
      const { status: _s, ...stamped } = f;
      monuments.push({ id: uuid(3, n), cemeteryId, createdAt: hlc, ...f, stamps: stampAll(stamped) });
    }
  }
  const cemetery = {
    id: cemeteryId,
    name: `Performance test (${rows * perRow} stones)`,
    location: { lng: origin[0], lat: origin[1] },
    country: 'US',
    contributors: [who],
    settings: {
      units: 'metric',
      dateLocale: 'en-US',
      transcriptionConvention: 'diplomatic',
      photoMaxPx: 1600,
    },
  };
  return {
    manifest: {
      format: 'stonebystone',
      formatVersion: 2,
      appVersion: '2.0.0',
      kind: 'full',
      cemeteryId,
      createdAt: '2026-11-25T00:00:00.000Z',
      createdBy: { id: who, displayName: 'Fixture' },
      counts: { rows: rows, monuments: monuments.length },
      photoQuality: 0,
    },
    cemetery: { ...cemetery, stamps: stampAll(cemetery) },
    data: {
      sections: [],
      rows: rowRecords,
      monuments,
      persons: [],
      photos: [],
      features: [],
      overlays: [],
      tags: [],
      contributors: [{ id: who, displayName: 'Fixture' }],
      history: [],
    },
  };
}
