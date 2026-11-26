/**
 * Typed repository for one stamped table. Every write is stamped (one HLC per write, one
 * stamp per changed top-level field), normalized, snapshotted for undo, and logged to history.
 */
import type { Table } from 'dexie';
import {
  deepEqual,
  mergeRecords,
  normalizeRecord,
  type HistoryEntry,
  type ID,
  type MergeableRecord,
  type Stamp,
} from '../domain';
import { recordHistory } from './history';
import type { OpContext, Store } from './store';
import type { TableName } from './undo';

/** Bookkeeping fields that are never stamped. `status` is derived (§2.2). */
const META = new Set(['id', 'cemeteryId', 'createdAt', 'stamps', 'deleted', 'status']);

type Meta = 'id' | 'cemeteryId' | 'createdAt' | 'stamps' | 'deleted' | 'status';

export type NewRecord<T> = Omit<T, Meta> & { id?: ID };
export type Patch<T> = Partial<Omit<T, Meta>>;

type Rec = MergeableRecord & Record<string, unknown>;

function asRec(r: unknown): Rec {
  return r as Rec;
}

/** Data fields of a record (everything except bookkeeping). */
export function dataFields(r: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!META.has(k) && v !== undefined) out[k] = v;
  return out;
}

export interface RepoOptions {
  /** Cemeteries are their own scope: no `cemeteryId` or `createdAt`. */
  standalone?: boolean;
}

export class Repo<T extends MergeableRecord> {
  constructor(
    protected readonly store: Store,
    readonly tableName: TableName,
    readonly entityType: string,
    private readonly options: RepoOptions = {},
  ) {}

  get table(): Table<T, string> {
    return this.store.db.table(this.tableName);
  }

  protected cemeteryOf(r: T): ID {
    return r.cemeteryId ?? r.id;
  }

  /** A record by id; tombstoned records only with `includeDeleted`. */
  async get(id: ID, { includeDeleted = false } = {}): Promise<T | undefined> {
    const r = await this.table.get(id);
    return r && (includeDeleted || !r.deleted) ? r : undefined;
  }

  /** A record by id, or by an id that was merged into it. */
  async resolve(id: ID, { includeDeleted = false } = {}): Promise<T | undefined> {
    const direct = await this.get(id, { includeDeleted });
    if (direct) return direct;
    const viaAlias = await this.table.where('aliases').equals(id).first();
    return viaAlias && (includeDeleted || !viaAlias.deleted) ? viaAlias : undefined;
  }

  async listByCemetery(cemeteryId: ID, { includeDeleted = false } = {}): Promise<T[]> {
    const all = await this.table.where('cemeteryId').equals(cemeteryId).toArray();
    return includeDeleted ? all : all.filter((r) => !r.deleted);
  }

  async create(data: NewRecord<T> & { cemeteryId?: ID }): Promise<T> {
    return this.store.run(`Create ${this.entityType}`, async (ctx) => {
      const hlc = this.store.device.clock.now();
      const stamp: Stamp = { hlc, by: this.store.device.contributorId };
      const { id: givenId, ...fields } = data as Record<string, unknown>;
      const id = typeof givenId === 'string' ? givenId : this.store.newId();
      const stamps: Record<string, Stamp> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (!META.has(k) && v !== undefined) stamps[k] = stamp;
      }
      const record = { ...fields, id, stamps } as Record<string, unknown>;
      if (!this.options.standalone) record.createdAt = hlc;
      const after = await this.prepare(ctx, normalizeRecord(record as unknown as T), undefined);
      await this.write(ctx, undefined, after);
      await this.log(ctx, after, 'create', hlc, this.changes({}, dataFields(after)));
      return after;
    });
  }

  /** Change fields. A key present with value `undefined` clears that field. */
  async update(id: ID, patch: Patch<T>): Promise<T> {
    return this.store.run(`Edit ${this.entityType}`, async (ctx) => {
      const before = await this.table.get(id);
      if (!before) throw new Error(`${this.entityType} ${id} not found`);
      const full = this.adjustPatch(before, { ...patch } as Record<string, unknown>);
      const changed = Object.keys(full).filter(
        (k) => !META.has(k) && !deepEqual(asRec(before)[k], full[k]),
      );
      if (changed.length === 0) return before;
      const hlc = this.store.device.clock.now();
      const stamp: Stamp = { hlc, by: this.store.device.contributorId };
      const next = { ...before, stamps: { ...before.stamps } } as Rec;
      for (const k of changed) {
        if (full[k] === undefined) Reflect.deleteProperty(next, k);
        else next[k] = full[k];
        next.stamps[k] = stamp;
      }
      const after = await this.prepare(ctx, normalizeRecord(next as unknown as T), before);
      await this.write(ctx, before, after);
      const from: Record<string, unknown> = {};
      const to: Record<string, unknown> = {};
      for (const k of changed) {
        from[k] = asRec(before)[k];
        to[k] = asRec(after)[k];
      }
      await this.log(ctx, after, 'update', hlc, this.changes(from, to));
      return after;
    });
  }

  /** Tombstone the record. Nothing is ever destroyed (§14). */
  async delete(id: ID): Promise<void> {
    await this.store.run(`Delete ${this.entityType}`, async (ctx) => {
      const before = await this.table.get(id);
      if (!before || before.deleted) return;
      const hlc = this.store.device.clock.now();
      const after = { ...before, deleted: { hlc, by: this.store.device.contributorId } };
      await this.write(ctx, before, after);
      await this.log(ctx, after, 'delete', hlc, undefined);
    });
  }

  /** Remove a tombstone (only used by undo; a peer's tombstone still wins on merge). */
  async undelete(ctx: OpContext, id: ID): Promise<void> {
    const before = await this.table.get(id);
    if (!before?.deleted) return;
    const after = { ...before };
    delete after.deleted;
    await this.write(ctx, before, after);
    await this.log(ctx, after, 'update', this.store.device.clock.now(), {
      deleted: { from: before.deleted },
    });
  }

  /**
   * Merge an incoming copy into the local record (same-ID merge, §21.2), or insert it. Must
   * run inside a group (`store.group`). Folds every incoming stamp into the local clock.
   */
  async upsertMerged(
    ctx: OpContext,
    incoming: T,
    { logFields = true } = {},
  ): Promise<'created' | 'updated' | 'unchanged'> {
    for (const s of Object.values(incoming.stamps)) this.store.device.clock.receive(s.hlc);
    if (incoming.deleted) this.store.device.clock.receive(incoming.deleted.hlc);
    const before = await this.table.get(incoming.id);
    let merged = normalizeRecord(before ? mergeRecords(before, incoming) : incoming);
    if (before && 'status' in before) merged = { ...merged, status: asRec(before).status };
    merged = await this.prepare(ctx, merged, before);
    if (before && deepEqual(before, merged)) return 'unchanged';
    await this.write(ctx, before, merged);
    const at = this.store.device.clock.now();
    let fields: HistoryEntry['fields'];
    if (before && logFields) {
      const from: Record<string, unknown> = {};
      const to: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(before), ...Object.keys(merged)])) {
        if (META.has(k) || deepEqual(asRec(before)[k], asRec(merged)[k])) continue;
        from[k] = asRec(before)[k];
        to[k] = asRec(merged)[k];
      }
      fields = this.changes(from, to);
    }
    await this.log(ctx, merged, ctx.op ?? 'import', at, fields);
    return before ? 'updated' : 'created';
  }

  /** Snapshot for undo, then store. */
  async write(ctx: OpContext, before: T | undefined, after: T): Promise<void> {
    this.store.snapshot(ctx, this.tableName, after.id, before);
    await this.table.put(after);
    await this.afterWrite(ctx, before, after);
  }

  /** Hook: add implied changes to a patch (e.g. clearing `verified`). */
  protected adjustPatch(_before: T, patch: Record<string, unknown>): Record<string, unknown> {
    return patch;
  }

  /** Hook: finish a record before it is stored (e.g. materialize derived fields). */
  protected async prepare(_ctx: OpContext, r: T, _before: T | undefined): Promise<T> {
    return r;
  }

  /** Hook: side effects on other records. */
  protected async afterWrite(_ctx: OpContext, _before: T | undefined, _after: T): Promise<void> {}

  private changes(
    from: Record<string, unknown>,
    to: Record<string, unknown>,
  ): HistoryEntry['fields'] {
    const out: NonNullable<HistoryEntry['fields']> = {};
    for (const k of new Set([...Object.keys(from), ...Object.keys(to)])) {
      out[k] = { from: from[k], to: to[k] };
    }
    return out;
  }

  private async log(
    ctx: OpContext,
    r: T,
    op: HistoryEntry['op'],
    at: string,
    fields: HistoryEntry['fields'],
  ): Promise<void> {
    await recordHistory(this.store.db, {
      cemeteryId: this.cemeteryOf(r),
      entityId: r.id,
      entityType: this.entityType,
      at,
      by: this.store.device.contributorId,
      op,
      ...(fields ? { fields } : {}),
      ...(ctx.group !== undefined ? { group: ctx.group } : {}),
    });
  }
}
