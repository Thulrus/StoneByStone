// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { collectArchive } from './format/export';
import { writeSbs, writeSbsJson } from './format/sbs';
import { detectFileKind, importFile } from './import';
import { freshStore } from './test/helpers';

const v1 = new Blob([readFileSync('tests/fixtures/v1/groups-demo.cem.json')]);

describe('importFile', () => {
  test('detects and imports v1, .sbs and .sbs.json by content', async () => {
    const a = await freshStore();
    const first = await importFile(a.store, v1);
    expect(first.kind).toBe('v1');
    const { archive, binaries } = await collectArchive(a.store, first.cemeteryId);
    const zip = await writeSbs(archive, binaries);
    const json = new Blob([writeSbsJson(archive)]);
    expect(await detectFileKind(zip)).toBe('sbs');
    expect(await detectFileKind(json)).toBe('sbs.json');

    const b = await freshStore();
    expect((await importFile(b.store, zip)).created).toBeGreaterThan(0);
    const c = await freshStore();
    expect((await importFile(c.store, json)).kind).toBe('sbs.json');
  });

  test('rejects anything else with a readable error', async () => {
    const { store } = await freshStore();
    await expect(importFile(store, new Blob(['{"a":1}']))).rejects.toThrow(
      'not a StoneByStone archive',
    );
    expect(await detectFileKind(new Blob(['not json']))).toBeUndefined();
  });
});
