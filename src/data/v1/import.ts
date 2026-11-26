/**
 * Import a v1 `.cem.json` file (plan §22.2). The result is a new cemetery, or a merge into
 * the cemetery an earlier import of the same file created (found through the v1 aliases).
 */
import type { ID, MergeableRecord } from '../../domain';
import { APP_VERSION, FORMAT, FORMAT_VERSION, type Archive } from '../format/archive';
import { importArchive, type ImportSummary } from '../format/import';
import { parseArchive } from '../format/parse';
import { FormatError } from '../format/validate';
import type { Repo } from '../repository';
import type { Store } from '../store';
import { convertV1 } from './convert';
import type { V1File } from './types';

const TABLES = ['monuments', 'persons', 'tags', 'features', 'overlays'] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Readable problems with the parts of a v1 file the converter relies on. */
export function checkV1(json: unknown): string[] {
  if (!isObject(json)) return ['the file is not a JSON object'];
  const out: string[] = [];
  if (json.schema_version !== '1.0.0') {
    out.push(`unsupported v1 schema_version ${JSON.stringify(json.schema_version)}`);
  }
  const c = json.cemetery;
  if (!isObject(c)) out.push('missing "cemetery"');
  else {
    if (typeof c.id !== 'string') out.push('cemetery: missing "id"');
    if (typeof c.name !== 'string') out.push('cemetery: missing "name"');
  }
  const lists = { graves: true, landmarks: false, roads: false, groups: false, change_log: false };
  for (const [key, required] of Object.entries(lists)) {
    const list = json[key];
    if (list === undefined && !required) continue;
    if (!Array.isArray(list)) {
      out.push(`"${key}" must be a list`);
      continue;
    }
    list.forEach((item: unknown, i) => {
      const where = `${key} item ${i + 1}`;
      if (!isObject(item)) return out.push(`${where}: not an object`);
      if (key === 'change_log') {
        if (typeof item.timestamp !== 'string') out.push(`${where}: missing "timestamp"`);
        return;
      }
      if (typeof item.uuid !== 'string') out.push(`${where}: missing "uuid"`);
      if (!isObject(item.properties)) out.push(`${where}: missing "properties"`);
      if (key === 'roads' && !Array.isArray(item.cells)) out.push(`${where}: missing "cells"`);
    });
  }
  return out;
}

/** The cemetery an earlier import of this file created, if any. */
async function findPrevious(store: Store, file: V1File): Promise<ID | undefined> {
  for (const g of file.graves) {
    const m = await store.db.monuments.where('aliases').equals(g.uuid).first();
    if (m) return m.cemeteryId;
  }
  // v1 ids like "current" aren't unique, so the name has to match too.
  const same = await store.db.cemeteries.where('legacy.v1Id').equals(file.cemetery.id).toArray();
  return same.find((c) => c.name === file.cemetery.name && !c.deleted)?.id;
}

export async function importV1(store: Store, json: unknown): Promise<ImportSummary> {
  const found = checkV1(json);
  if (found.length > 0) throw new FormatError(found);
  const file = json as V1File;

  const cemeteryId = (await findPrevious(store, file)) ?? store.newId();
  const aliases = new Map<string, ID>();
  for (const t of TABLES) {
    const repo = store[t] as unknown as Repo<MergeableRecord>;
    for (const r of await repo.listByCemetery(cemeteryId, { includeDeleted: true })) {
      for (const a of r.aliases ?? []) aliases.set(a, r.id);
    }
  }
  const { cemetery, data } = await convertV1(file, {
    cemeteryId,
    existing: (a) => aliases.get(a),
    newId: () => store.newId(),
  });

  const me = (await store.db.contributors.get(store.device.contributorId)) ?? {
    id: store.device.contributorId,
    displayName: '',
  };
  const archive: Archive = {
    manifest: {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      appVersion: APP_VERSION,
      kind: 'full',
      cemeteryId,
      createdAt: new Date().toISOString(),
      createdBy: me,
      counts: {},
    },
    cemetery,
    data,
  };
  // The converted data must satisfy the v2 schemas like any other file.
  parseArchive(archive as unknown as Parameters<typeof parseArchive>[0]);
  return importArchive(store, archive, undefined, { label: `Import ${file.cemetery.name} (v1)` });
}
