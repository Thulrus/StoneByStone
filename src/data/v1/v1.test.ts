// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { canonicalJson } from '../../domain';
import { collectArchive } from '../format/export';
import { readSbsJson } from '../format/parse';
import { writeSbsJson } from '../format/sbs';
import { FormatError } from '../format/validate';
import { dump, ENTITY_TABLES, freshStore } from '../test/helpers';
import { UNKNOWN_V1_CONTRIBUTOR } from './convert';
import { importV1 } from './import';
import { isV1File } from './types';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(`tests/fixtures/v1/${name}.cem.json`, 'utf8'));

async function imported(name: string, json = fixture(name)) {
  const ctx = await freshStore();
  const summary = await importV1(ctx.store, json);
  const id = summary.cemeteryId;
  const s = ctx.store;
  const all = { includeDeleted: true };
  return {
    ...ctx,
    summary,
    cemetery: await s.cemeteries.get(id),
    monuments: await s.monuments.listByCemetery(id, all),
    persons: await s.persons.listByCemetery(id, all),
    tags: await s.tags.listByCemetery(id, all),
    features: await s.features.listByCemetery(id, all),
    overlays: await s.overlays.listByCemetery(id, all),
    history: await ctx.db.history.where('cemeteryId').equals(id).toArray(),
  };
}

const COUNTS = {
  'minimal-example': { monuments: 4, persons: 2, tags: 0, features: 0, log: 0, people: 1 },
  example: { monuments: 6, persons: 6, tags: 0, features: 0, log: 6, people: 3 },
  'groups-demo': { monuments: 5, persons: 5, tags: 2, features: 0, log: 5, people: 1 },
  'willow-creek-example': { monuments: 37, persons: 37, tags: 13, features: 25, log: 4, people: 1 },
};

describe('v1 import', () => {
  test.each(Object.entries(COUNTS))('%s imports with the expected counts', async (name, n) => {
    expect(isV1File(fixture(name))).toBe(true);
    const r = await imported(name);
    expect(r.monuments).toHaveLength(n.monuments);
    expect(r.persons).toHaveLength(n.persons);
    expect(r.tags).toHaveLength(n.tags);
    expect(r.features).toHaveLength(n.features);
    expect(r.overlays).toHaveLength(1);
    expect(r.cemetery?.contributors).toHaveLength(n.people);
    // History: one import entry per record, plus the v1 change log.
    expect(r.history.filter((h) => h.group === undefined)).toHaveLength(n.log);
  });

  test('every converted fixture validates and survives a .sbs.json round trip', async () => {
    for (const name of Object.keys(COUNTS)) {
      const r = await imported(name);
      const { archive } = await collectArchive(r.store, r.summary.cemeteryId);
      expect(() => readSbsJson(writeSbsJson(archive))).not.toThrow();
    }
  });

  test('maps cemetery, graves and persons (example)', async () => {
    const r = await imported('example');
    expect(r.cemetery).toMatchObject({
      name: 'Greenwood Memorial Cemetery',
      license: 'CC0-1.0',
      legacy: { v1Id: 'greenwood-memorial' },
      settings: { units: 'imperial', dateLocale: 'en-US' },
    });
    const john = r.monuments.find((m) =>
      m.aliases?.includes('a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d'),
    );
    expect(john).toMatchObject({
      kind: 'headstone',
      legacyGrid: { row: 0, col: 0 },
      address: { plotLabel: 'A-1' },
      inscription: { text: 'Beloved Father and Grandfather' },
      notes: 'Oak tree nearby',
      status: 'transcribed',
    });
    const person = r.persons.find((p) => p.monumentId === john?.id);
    expect(person?.name).toEqual({ asCarved: 'John Smith', given: 'John', surname: 'Smith' });
    expect(person?.birth).toEqual({
      original: '1920-03-15',
      y: 1920,
      m: 3,
      d: 15,
      qualifier: 'exact',
    });
    expect(person?.death?.y).toBe(2005);
    // Stamps come from v1 last_modified / modified_by.
    const alice = (await r.db.contributors.toArray()).find((c) => c.displayName === 'Alice');
    expect(john?.stamps.kind?.by).toBe(alice?.id);
    expect(
      john?.stamps.kind?.hlc.startsWith(
        String(Date.parse('2024-10-01T10:00:00.000Z')).padStart(15, '0'),
      ),
    ).toBe(true);
    const grid = r.overlays[0];
    expect(grid).toMatchObject({
      kind: 'legacy-grid',
      grid: { rows: 15, cols: 20 },
      controlPoints: [],
    });
    expect(grid?.grid?.validCells).toBeUndefined();
  });

  test('graves without person data are located, or transcribed by inscription (minimal)', async () => {
    const r = await imported('minimal-example');
    const byPlot = (p: string) => r.monuments.find((m) => m.address?.plotLabel === p);
    expect(byPlot('A-1')?.status).toBe('transcribed');
    expect(byPlot('B-1')?.status).toBe('transcribed'); // inscription only (§2.2)
    expect(byPlot('B-2')?.status).toBe('located');
    expect(r.persons.find((p) => p.monumentId === byPlot('A-2')?.id)?.name).toEqual({});
  });

  test('groups become tags on monuments (groups-demo)', async () => {
    const r = await imported('groups-demo');
    const smith = r.tags.find((t) => t.name === 'Smith Family');
    expect(smith).toMatchObject({ color: '#3b82f6', description: 'Members of the Smith family' });
    const john = r.monuments.find((m) =>
      m.aliases?.includes('11111111-1111-4111-a111-111111111111'),
    );
    expect(john?.tags).toHaveLength(2);
    expect(john?.tags).toContain(smith?.id);
  });

  test('shape, landmarks and roads (willow creek)', async () => {
    const r = await imported('willow-creek-example');
    const grid = r.overlays[0]?.grid;
    expect(grid?.rows).toBe(20);
    expect(grid?.validCells).toHaveLength(382);
    expect(grid?.validCells?.[0]).toBe('0,0');
    const kinds = r.features.map((f) => f.kind);
    expect(kinds.filter((k) => k === 'large-monument')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'tree')).toHaveLength(5);
    expect(kinds.filter((k) => k === 'path')).toHaveLength(11);
    const conifer = r.tags.find((t) => t.name === 'conifer');
    expect(r.features.filter((f) => f.tags?.includes(conifer?.id ?? ''))).toHaveLength(2);
    const angel = r.features.find((f) => f.name === 'Angel of Hope');
    expect(angel).toMatchObject({
      kind: 'large-monument',
      legacyCells: [{ row: 1, col: 13 }],
      notes: 'White marble angel statue at cemetery entrance\n\nDedicated 1965, restored 2015',
    });
    const road = r.features.find((f) => f.kind === 'path');
    expect(road?.legacyCells?.length).toBeGreaterThan(1);
    expect(road?.style?.color).toMatch(/^#/);
    // v1 id "current" is kept but never used as an id.
    expect(r.cemetery?.legacy?.v1Id).toBe('current');
    expect(r.cemetery?.id).not.toBe('current');
  });

  test('validCells, deleted graves, geometry and anonymous users', async () => {
    const json = fixture('minimal-example') as {
      cemetery: { grid: object };
      graves: { properties: Record<string, unknown>; geometry?: object }[];
    };
    json.cemetery.grid = { rows: 2, cols: 2, validCells: ['0,0', '0,1', '1,0'] };
    const [g0, g1] = json.graves;
    if (!g0 || !g1) throw new Error('fixture changed');
    g0.properties.deleted = true;
    g0.properties.modified_by = 'anonymous';
    g1.geometry = { type: 'Point', coordinates: [-72.51, 43.61] };
    const r = await imported('minimal-example', json);
    expect(r.overlays[0]?.grid?.validCells).toEqual(['0,0', '0,1', '1,0']);
    const dead = r.monuments.find((m) => m.address?.plotLabel === 'A-1');
    expect(dead?.deleted).toBeDefined();
    expect(r.persons.find((p) => p.monumentId === dead?.id)?.deleted).toBeDefined();
    expect(await r.store.monuments.listByCemetery(r.summary.cemeteryId)).toHaveLength(3);
    const unknown = await r.db.contributors.get(dead?.deleted?.by ?? '');
    expect(unknown?.displayName).toBe(UNKNOWN_V1_CONTRIBUTOR);
    const placed = r.monuments.find((m) => m.address?.plotLabel === 'A-2');
    expect(placed?.position).toEqual({ lng: -72.51, lat: 43.61, source: 'imported' });
  });

  test('importing twice creates no duplicates and changes nothing', async () => {
    for (const name of Object.keys(COUNTS)) {
      const r = await imported(name);
      const before = await dump(r.db, [...ENTITY_TABLES, 'contributors', 'history']);
      const again = await importV1(r.store, fixture(name));
      expect(again.cemeteryId).toBe(r.summary.cemeteryId);
      expect(again.created + again.updated).toBe(0);
      expect(canonicalJson(await dump(r.db, [...ENTITY_TABLES, 'contributors', 'history']))).toBe(
        canonicalJson(before),
      );
    }
  });

  test('re-import keeps later local edits', async () => {
    const r = await imported('example');
    const m = r.monuments[0];
    if (!m) throw new Error('no monuments');
    await r.store.monuments.update(m.id, { notes: 'checked in the field' });
    await importV1(r.store, fixture('example'));
    expect((await r.store.monuments.get(m.id))?.notes).toBe('checked in the field');
  });

  test('two different v1 cemeteries both called "current" stay separate', async () => {
    const r = await imported('willow-creek-example');
    const other = fixture('minimal-example') as { cemetery: { id: string } };
    other.cemetery.id = 'current';
    const s = await importV1(r.store, other);
    expect(s.cemeteryId).not.toBe(r.summary.cemeteryId);
  });

  test('malformed files are rejected with readable errors', async () => {
    const { store } = await freshStore();
    const bad = { schema_version: '1.0.0', cemetery: { id: 'x' }, graves: [{ uuid: 1 }] };
    const err = await importV1(store, bad).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FormatError);
    expect((err as FormatError).problems).toEqual([
      'cemetery: missing "name"',
      'graves item 1: missing "uuid"',
      'graves item 1: missing "properties"',
    ]);
    expect(isV1File({ schema_version: '2' })).toBe(false);
  });
});
