/**
 * v1 `.cem.json` → v2 records, per the mapping in plan §22.3. Pure apart from hashing.
 *
 * Identity: monuments, tags and features keep their v1 UUID as an alias; persons and the
 * legacy-grid overlay get a derived alias (`v1-person:<grave>`, `v1-grid`). The caller passes
 * the ids already used for those aliases, so a re-import reuses them and merges to a no-op.
 * Contributors and history entries get deterministic ids hashed from their content.
 */
import {
  defaultCemeterySettings,
  formatHlc,
  parseDate,
  parseName,
  type Cemetery,
  type Contributor,
  type FuzzyDate,
  type HistoryEntry,
  type HLC,
  type ID,
  type MapFeature,
  type MapFeatureKind,
  type Monument,
  type Overlay,
  type Person,
  type Stamp,
  type TagDef,
} from '../../domain';
import { canonicalJson } from '../../domain';
import { sha256Hex } from '../hash';
import type { ArchiveData } from '../format/archive';
import type { V1Cell, V1File } from './types';

export const UNKNOWN_V1_CONTRIBUTOR = 'Unknown (v1)';
export const personAlias = (graveUuid: string) => `v1-person:${graveUuid}`;
export const GRID_ALIAS = 'v1-grid';
export const CONIFER_ALIAS = 'v1-tag:conifer';

export interface V1Ids {
  /** The v2 cemetery id to import into (new, or found by an earlier import). */
  cemeteryId: ID;
  /** The v2 id already holding a v1 alias in that cemetery, if any. */
  existing: (alias: string) => ID | undefined;
  newId: () => ID;
}

/** A UUID (version 8, RFC 9562 "custom") derived from text, so it's the same on every device. */
export async function hashUuid(text: string): Promise<ID> {
  const h = (await sha256Hex(new TextEncoder().encode(text))).slice(0, 32).split('');
  h[12] = '8';
  h[16] = ((parseInt(h[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const LANDMARK_KINDS: Record<string, MapFeatureKind> = {
  bench: 'bench',
  tree: 'tree',
  pine: 'tree',
  building: 'building',
  statue: 'large-monument',
};

function joinText(...parts: (string | undefined)[]): string | undefined {
  const kept = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  return kept.length > 0 ? kept.join('\n\n') : undefined;
}

/** v1 dates are ISO `YYYY-MM-DD`; anything else goes through the general parser. */
function v1Date(s: string | undefined): FuzzyDate | undefined {
  if (!s?.trim()) return undefined;
  const d = parseDate(s.trim());
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) && d.d !== undefined
    ? { ...d, qualifier: 'exact' }
    : d;
}

function cellKey(c: V1Cell): string {
  return `${c.row},${c.col}`;
}

/** Drop undefined members so records stay canonical. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export async function convertV1(
  file: V1File,
  ids: V1Ids,
): Promise<{ cemetery: Cemetery; data: ArchiveData }> {
  const c = file.cemetery;
  const cemeteryId = ids.cemeteryId;
  const fallbackTime = Date.parse(c.last_modified ?? '') || 0;

  // Contributors: one per distinct modified_by / user string.
  const people = new Map<string, Contributor>();
  const contributorFor = async (name: string | undefined): Promise<Contributor> => {
    const key = name?.trim() && name.trim() !== 'anonymous' ? name.trim() : 'anonymous';
    let found = people.get(key);
    if (!found) {
      found = {
        id: await hashUuid(`v1-contributor:${key}`),
        displayName: key === 'anonymous' ? UNKNOWN_V1_CONTRIBUTOR : key,
      };
      people.set(key, found);
    }
    return found;
  };

  /** Stamp for v1 `last_modified` / `modified_by`: the HLC comes from the v1 timestamp. */
  const stampFor = async (when: string | undefined, who: string | undefined): Promise<Stamp> => {
    const by = (await contributorFor(who)).id;
    const wall = Math.max(0, Date.parse(when ?? '') || fallbackTime);
    return { hlc: formatHlc({ wall, counter: 0, node: by.replaceAll('-', '').slice(0, 16) }), by };
  };

  /** A record with every data field stamped by one write. */
  const stamped = <T extends object>(
    fields: T,
    stamp: Stamp,
    deleted: boolean | undefined,
  ): T & { stamps: Record<string, Stamp>; createdAt: HLC; deleted?: Stamp } => {
    const body = clean(fields);
    const stamps: Record<string, Stamp> = {};
    for (const k of Object.keys(body))
      if (!['id', 'cemeteryId', 'aliases'].includes(k)) stamps[k] = stamp;
    return { ...body, stamps, createdAt: stamp.hlc, ...(deleted ? { deleted: stamp } : {}) };
  };

  const idFor = (alias: string) => ids.existing(alias) ?? ids.newId();
  const base = (alias: string) => ({ id: idFor(alias), cemeteryId, aliases: [alias] });

  // Groups → tags.
  const tags: TagDef[] = [];
  const tagIds = new Map<string, ID>();
  for (const g of file.groups ?? []) {
    const p = g.properties;
    const t = stamped(
      { ...base(g.uuid), name: p.name, color: p.color, description: p.description },
      await stampFor(p.last_modified, p.modified_by),
      p.deleted,
    );
    tags.push(t);
    tagIds.set(g.uuid, t.id);
  }
  const landmarks = file.landmarks ?? [];
  let coniferId: ID | undefined;
  const pine = landmarks.find((l) => l.landmark_type === 'pine');
  if (pine) {
    const t = stamped(
      { ...base(CONIFER_ALIAS), name: 'conifer' },
      await stampFor(pine.properties.last_modified, pine.properties.modified_by),
      false,
    );
    tags.push(t);
    coniferId = t.id;
  }

  // Graves → monuments (+ one person each when there is person data).
  const monuments: Monument[] = [];
  const persons: Person[] = [];
  const monumentIds = new Map<string, ID>();
  for (const g of file.graves) {
    const p = g.properties;
    const stamp = await stampFor(p.last_modified, p.modified_by);
    const [lng, lat] = g.geometry?.coordinates ?? [];
    const m = stamped(
      {
        ...base(g.uuid),
        kind: 'headstone',
        legacyGrid: g.grid ? { row: g.grid.row, col: g.grid.col } : undefined,
        address: g.plot ? { plotLabel: g.plot } : undefined,
        position:
          typeof lng === 'number' && typeof lat === 'number'
            ? { lng, lat, source: 'imported' as const }
            : undefined,
        inscription: p.inscription?.trim() ? { text: p.inscription } : undefined,
        notes: p.notes?.trim() ? p.notes : undefined,
        tags: p.group_ids?.length
          ? p.group_ids.map((id) => tagIds.get(id)).filter((id) => id !== undefined)
          : undefined,
      },
      stamp,
      p.deleted,
    );
    const hasPerson = Boolean(p.name?.trim() || p.birth?.trim() || p.death?.trim());
    // Status is re-derived on write; this is the §22.3 value for readers of the raw output.
    monuments.push({ ...m, status: hasPerson || m.inscription ? 'transcribed' : 'located' });
    monumentIds.set(g.uuid, m.id);
    if (hasPerson) {
      persons.push(
        stamped(
          {
            ...base(personAlias(g.uuid)),
            monumentId: m.id,
            name: p.name?.trim() ? parseName(p.name) : {},
            birth: v1Date(p.birth),
            death: v1Date(p.death),
          },
          stamp,
          p.deleted,
        ),
      );
    }
  }

  // Landmarks and roads → map features with legacy cells.
  const features: MapFeature[] = [];
  const featureIds = new Map<string, ID>();
  for (const l of landmarks) {
    const p = l.properties;
    const f = stamped(
      {
        ...base(l.uuid),
        kind: LANDMARK_KINDS[l.landmark_type] ?? 'other',
        legacyCells: l.grid ? [{ row: l.grid.row, col: l.grid.col }] : undefined,
        name: p.name?.trim() ? p.name : undefined,
        notes: joinText(p.description, p.notes),
        tags: l.landmark_type === 'pine' && coniferId ? [coniferId] : undefined,
      },
      await stampFor(p.last_modified, p.modified_by),
      p.deleted,
    );
    features.push(f);
    featureIds.set(l.uuid, f.id);
  }
  for (const r of file.roads ?? []) {
    const p = r.properties;
    const f = stamped(
      {
        ...base(r.uuid),
        kind: 'path' as const,
        legacyCells: r.cells.map((x) => ({ row: x.row, col: x.col })),
        name: p.name?.trim() ? p.name : undefined,
        notes: joinText(p.description, p.notes),
        style: p.color ? { color: p.color } : undefined,
      },
      await stampFor(p.last_modified, p.modified_by),
      p.deleted,
    );
    features.push(f);
    featureIds.set(r.uuid, f.id);
  }

  // The grid becomes an unpinned legacy-grid overlay.
  const cemStamp = await stampFor(c.last_modified, c.modified_by);
  const overlays: Overlay[] = [];
  const grid = c.grid;
  if (grid && grid.rows > 0 && grid.cols > 0) {
    const cells = grid.validCells ?? grid.shape?.map(cellKey);
    overlays.push(
      stamped(
        {
          ...base(GRID_ALIAS),
          kind: 'legacy-grid' as const,
          name: 'v1 grid',
          grid: clean({ rows: grid.rows, cols: grid.cols, validCells: cells }),
          controlPoints: [],
          opacity: 1,
        },
        cemStamp,
        false,
      ),
    );
  }

  // The change log becomes read-only history.
  const history: HistoryEntry[] = [];
  const entities = new Map<string, { id: ID; type: string }>([
    ...[...monumentIds].map(([k, id]) => [k, { id, type: 'monument' }] as const),
    ...[...featureIds].map(([k, id]) => [k, { id, type: 'feature' }] as const),
    ...[...tagIds].map(([k, id]) => [k, { id, type: 'tag' }] as const),
  ]);
  for (const [i, e] of (file.change_log ?? []).entries()) {
    const target = entities.get(e.uuid) ?? { id: cemeteryId, type: 'cemetery' };
    const stamp = await stampFor(e.timestamp, e.user);
    const fields = Object.fromEntries(
      Object.entries(e.changes ?? {}).map(([k, v]) => [k, { to: v }]),
    );
    history.push(
      clean({
        id: await hashUuid(`v1-history:${cemeteryId}:${i}:${canonicalJson(e)}`),
        cemeteryId,
        entityId: target.id,
        entityType: target.type,
        at: stamp.hlc,
        by: stamp.by,
        op: 'import' as const,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
      }),
    );
  }

  const contributors = [...people.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const { createdAt, ...cemeteryFields } = stamped(
    {
      id: cemeteryId,
      name: c.name,
      license: c.license,
      contributors: contributors.map((p) => p.id),
      settings: defaultCemeterySettings(),
      legacy: { v1Id: c.id },
    },
    cemStamp,
    false,
  );
  return {
    cemetery: cemeteryFields,
    data: {
      sections: [],
      rows: [],
      monuments,
      persons,
      photos: [],
      features,
      overlays,
      tags,
      contributors,
      history,
    },
  };
}
