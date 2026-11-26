// @vitest-environment node
import { unzipSync } from 'fflate';
import { describe, expect, test } from 'vitest';
import { canonicalJson, defaultCemeterySettings } from '../../domain';
import { sha256Hex } from '../hash';
import { dump, ENTITY_TABLES, freshStore } from '../test/helpers';
import { collectArchive } from './export';
import { importArchive } from './import';
import { readSbsJson } from './parse';
import { readSbs, writeSbs, writeSbsJson } from './sbs';
import { FormatError } from './validate';

const jpeg = (seed: number, size = 3000) =>
  new Blob([Uint8Array.from({ length: size }, (_, i) => (i * seed) % 251)], {
    type: 'image/jpeg',
  });

async function seeded() {
  const ctx = await freshStore();
  const { store, advance } = ctx;
  const cem = await store.cemeteries.create({
    name: 'Mount Hope',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
    license: 'CC-BY-4.0',
  });
  const sec = await store.sections.create({ cemeteryId: cem.id, name: 'A' });
  const row = await store.rows.create({ cemeteryId: cem.id, sectionId: sec.id, label: '1' });
  const tag = await store.tags.create({ cemeteryId: cem.id, name: 'Veterans', color: '#123456' });
  const m1 = await store.monuments.create({
    cemeteryId: cem.id,
    kind: 'headstone',
    address: { sectionId: sec.id, rowId: row.id, rowIndex: 1 },
    position: { lng: -72.5, lat: 43.6, accuracyM: 4, source: 'gps' },
    tags: [tag.id],
    inscription: { text: 'IN MEMORY OF\nCAPT. JOHN ROOT' },
  });
  const m2 = await store.monuments.create({ cemeteryId: cem.id, kind: 'footstone' });
  await store.persons.create({
    cemeteryId: cem.id,
    monumentId: m1.id,
    name: { asCarved: 'CAPT. JOHN ROOT', prefix: 'Capt.', given: 'John', surname: 'Root' },
    death: { original: 'Mar. 3, 1801', y: 1801, m: 3, d: 3 },
    sources: [{ kind: 'stone' }],
  });
  const full = jpeg(7);
  const photo = await store.photos.create({
    cemeteryId: cem.id,
    monumentId: m1.id,
    role: 'front',
    width: 1600,
    height: 1200,
    bytes: full.size,
    sha256: await sha256Hex(full),
    takenAt: '2026-05-01T10:00:00.000Z',
  });
  await store.photos.putBlobs(photo.id, full, jpeg(3, 200));
  const img = store.newId();
  await store.db.overlayBlobs.put({ id: img, blob: jpeg(11) });
  await store.overlays.create({
    cemeteryId: cem.id,
    kind: 'plat',
    name: 'Plat 1902',
    imageId: img,
    controlPoints: [{ x: 1, y: 2, lng: -72.5, lat: 43.6 }],
    opacity: 0.6,
  });
  await store.features.create({ cemeteryId: cem.id, kind: 'gate', name: 'North gate' });
  advance(60_000);
  await store.monuments.update(m1.id, { material: 'slate' });
  await store.monuments.delete(m2.id);
  return { ...ctx, cem, photo };
}

async function blobsOf(db: Parameters<typeof dump>[0]) {
  const out: Record<string, string> = {};
  for (const t of ['photoBlobs', 'photoThumbs', 'overlayBlobs'] as const) {
    for (const r of await db[t].toArray()) out[`${t}/${r.id}`] = await sha256Hex(r.blob);
  }
  return out;
}

describe('.sbs', () => {
  test('export → wipe → import is deep-equal; photos match by sha256', async () => {
    const a = await seeded();
    const { archive, binaries } = await collectArchive(a.store, a.cem.id);
    const file = await writeSbs(archive, binaries);
    const before = await dump(a.db);
    const beforeBlobs = await blobsOf(a.db);
    const beforeHistory = await a.db.history.toArray();
    a.db.close();
    await a.db.delete();

    const b = await freshStore();
    const read = await readSbs(file);
    const summary = await importArchive(b.store, read.archive, read.binaries);
    expect(summary.warnings).toEqual([]);
    expect(summary.photos).toBe(1);
    expect(canonicalJson(await dump(b.db, ENTITY_TABLES))).toBe(canonicalJson(before));
    expect(await blobsOf(b.db)).toEqual(beforeBlobs);
    const history = await b.db.history.toArray();
    for (const h of beforeHistory) expect(history).toContainEqual(h);
    const people = await b.db.contributors.toArray();
    expect(people.map((c) => c.id)).toContain(a.store.device.contributorId);

    // Importing the same archive again changes nothing.
    const historyCount = await b.db.history.count();
    const again = await importArchive(b.store, read.archive, read.binaries);
    expect(again.created + again.updated).toBe(0);
    expect(await b.db.history.count()).toBe(historyCount);
  });

  test('the zip holds manifest, data, photos, thumbs, overlays, schemas and README', async () => {
    const a = await seeded();
    const { archive, binaries } = await collectArchive(a.store, a.cem.id);
    const files = unzipSync(
      new Uint8Array(await (await writeSbs(archive, binaries)).arrayBuffer()),
    );
    const names = Object.keys(files);
    expect(names).toEqual(expect.arrayContaining(['manifest.json', 'cemetery.json', 'README.txt']));
    expect(names).toContain(`photos/${a.photo.id}.jpg`);
    expect(names).toContain(`thumbs/${a.photo.id}.jpg`);
    expect(names.filter((n) => n.startsWith('overlays/'))).toHaveLength(1);
    expect(names.filter((n) => n.startsWith('data/'))).toHaveLength(10);
    expect(names).toContain('schema/monument.json');
    const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
    expect(manifest).toMatchObject({
      format: 'stonebystone',
      formatVersion: 2,
      kind: 'full',
      cemeteryId: a.cem.id,
      counts: { monuments: 2, persons: 1, photos: 1 },
      photoQuality: 1600,
    });
  });

  test('a corrupted photo is skipped with a warning', async () => {
    const a = await seeded();
    const { archive, binaries } = await collectArchive(a.store, a.cem.id);
    binaries.photos.set(a.photo.id, jpeg(99));
    const b = await freshStore();
    const s = await importArchive(b.store, archive, binaries);
    expect(s.warnings).toHaveLength(1);
    expect(await b.db.photoBlobs.count()).toBe(0);
  });

  test('an import is one undo step', async () => {
    const a = await seeded();
    const { archive, binaries } = await collectArchive(a.store, a.cem.id);
    const b = await freshStore();
    const tables = [...ENTITY_TABLES, 'contributors', 'history', 'settings', 'photoBlobs'];
    // The clock is the one thing undo keeps: it never goes backwards.
    const state = async () => {
      const d = await dump(b.db, tables);
      d.settings = (d.settings as { key: string }[]).filter((r) => r.key !== 'clock');
      return d;
    };
    const before = await state();
    await importArchive(b.store, archive, binaries);
    await b.store.undo();
    expect(await state()).toEqual(before);
  });
});

describe('.sbs.json', () => {
  test('round-trips without binaries', async () => {
    const a = await seeded();
    const { archive } = await collectArchive(a.store, a.cem.id);
    const text = writeSbsJson(archive);
    expect(readSbsJson(text)).toEqual(JSON.parse(text));
    const b = await freshStore();
    await importArchive(b.store, readSbsJson(text));
    expect(canonicalJson(await dump(b.db, ENTITY_TABLES))).toBe(canonicalJson(await dump(a.db)));
  });

  test('invalid files are rejected with readable errors', async () => {
    const a = await seeded();
    const { archive } = await collectArchive(a.store, a.cem.id);
    const doc = JSON.parse(writeSbsJson(archive));
    const withPos = doc.data.monuments.findIndex((m: { position?: unknown }) => m.position);
    doc.data.monuments[withPos].position.lat = 'north';
    delete doc.data.persons[0].name;
    doc.data.photos[0].role = 'selfie';
    const err = (() => {
      try {
        readSbsJson(JSON.stringify(doc));
      } catch (e) {
        return e;
      }
    })() as FormatError;
    expect(err).toBeInstanceOf(FormatError);
    expect(err.problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^data\/monuments\.json item \d \(.+\): "position\.lat" must be number$/,
        ),
        expect.stringMatching(/^data\/persons\.json item 1 \(.+\): missing "name"$/),
        expect.stringMatching(/^data\/photos\.json item 1 \(.+\): "role" must be one of "front"/),
      ]),
    );
    expect(() => readSbsJson('{nope')).toThrow('not valid JSON');
    expect(() => readSbsJson('{"manifest":{"format":"other"}}')).toThrow('not a StoneByStone');
    doc.manifest.formatVersion = 3;
    expect(() => readSbsJson(JSON.stringify(doc))).toThrow('newer version');
  });

  test('a non-zip .sbs is rejected', async () => {
    await expect(readSbs(new Blob(['hello']))).rejects.toThrow('not a StoneByStone archive');
  });
});
