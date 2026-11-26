/**
 * The data layer's entry point. Features get a `Store` and use its repositories; nothing
 * else writes to IndexedDB.
 *
 * Every public write runs in one Dexie transaction with an `OpContext` that collects undo
 * snapshots. Writes made while another operation is active (in the same transaction) join it,
 * which is how `group()` turns an import or merge into one undoable operation.
 */
import Dexie, { type Transaction } from 'dexie';
import {
  updateLastSeen,
  uuidv7,
  type Cemetery,
  type Contributor,
  type HistoryOp,
  type ID,
  type LastSeen,
  type MapFeature,
  type MergeableRecord,
  type Overlay,
  type Row,
  type Section,
  type TagDef,
} from '../domain';
import type { StoneDB } from './db';
import { LAST_SEEN_KEY, loadDevice, saveClock, type Device } from './device';
import { entityHistory } from './history';
import { Repo, dataFields, type Patch } from './repository';
import { MonumentRepo, PersonRepo, PhotoRepo } from './repos';
import { UndoStack, type Snapshot, type TableName, type UndoEntry } from './undo';

export interface OpContext {
  label: string;
  kind: 'edit' | 'group';
  /** Set for imports and merges; becomes the history `group` and the undo entry id. */
  group?: ID;
  op?: Extract<HistoryOp, 'import' | 'merge'>;
  snapshots: Map<string, Snapshot>;
  touchedMonuments: Set<ID>;
}

const contexts = new WeakMap<Transaction, OpContext>();

const STAMPED_TABLES: readonly TableName[] = [
  'cemeteries',
  'sections',
  'rows',
  'monuments',
  'persons',
  'photos',
  'features',
  'overlays',
  'tags',
];

export class Store {
  readonly cemeteries: Repo<Cemetery>;
  readonly sections: Repo<Section>;
  readonly rows: Repo<Row>;
  readonly monuments: MonumentRepo;
  readonly persons: PersonRepo;
  readonly photos: PhotoRepo;
  readonly features: Repo<MapFeature>;
  readonly overlays: Repo<Overlay>;
  readonly tags: Repo<TagDef>;

  constructor(
    readonly db: StoneDB,
    readonly device: Device,
    readonly undoStack = new UndoStack(),
  ) {
    this.cemeteries = new Repo(this, 'cemeteries', 'cemetery', { standalone: true });
    this.sections = new Repo(this, 'sections', 'section');
    this.rows = new Repo(this, 'rows', 'row');
    this.monuments = new MonumentRepo(this, 'monuments', 'monument');
    this.persons = new PersonRepo(this, 'persons', 'person');
    this.photos = new PhotoRepo(this, 'photos', 'photo');
    this.features = new Repo(this, 'features', 'feature');
    this.overlays = new Repo(this, 'overlays', 'overlay');
    this.tags = new Repo(this, 'tags', 'tag');
  }

  static async open(db: StoneDB, now: () => number = Date.now): Promise<Store> {
    return new Store(db, await loadDevice(db, now));
  }

  repo(table: TableName): Repo<MergeableRecord> | undefined {
    return STAMPED_TABLES.includes(table)
      ? (this[table as keyof Store] as unknown as Repo<MergeableRecord>)
      : undefined;
  }

  newId(): ID {
    return uuidv7(this.device.clock.state.wall || Date.now());
  }

  /** Remember a record's state before this operation first touches it. */
  snapshot(ctx: OpContext, table: TableName, id: ID, before: unknown): void {
    const key = `${table}:${id}`;
    if (!ctx.snapshots.has(key)) ctx.snapshots.set(key, { table, id, before });
  }

  /** Run `fn` as one atomic operation, or as part of the operation already in progress. */
  async run<R>(
    label: string,
    fn: (ctx: OpContext) => Promise<R>,
    opts: { kind?: OpContext['kind']; op?: OpContext['op']; undoable?: boolean } = {},
  ): Promise<R> {
    const current = Dexie.currentTransaction;
    const active = current ? contexts.get(current) : undefined;
    if (active) return fn(active);

    const ctx: OpContext = {
      label,
      kind: opts.kind ?? 'edit',
      snapshots: new Map(),
      touchedMonuments: new Set(),
      ...(opts.kind === 'group' ? { group: this.newId(), op: opts.op ?? 'import' } : {}),
    };
    const result = await this.db.transaction('rw', this.db.tables, async (tx) => {
      contexts.set(tx, ctx);
      const r = await fn(ctx);
      for (const id of ctx.touchedMonuments) await this.monuments.refreshStatus(ctx, id);
      await saveClock(this.db, this.device.clock);
      return r;
    });
    if (opts.undoable !== false) {
      this.undoStack.push({
        id: ctx.group ?? this.newId(),
        label,
        kind: ctx.kind,
        snapshots: [...ctx.snapshots.values()],
      });
    }
    return result;
  }

  /** An import or merge: one history group and one undo step. */
  group<R>(label: string, op: OpContext['op'], fn: (ctx: OpContext) => Promise<R>): Promise<R> {
    return this.run(label, fn, { kind: 'group', op });
  }

  /** Contributors are not stamped; their records are only ever added or renamed. */
  async putContributor(c: Contributor): Promise<void> {
    await this.run('Edit contributor', async (ctx) => {
      this.snapshot(ctx, 'contributors', c.id, await this.db.contributors.get(c.id));
      await this.db.contributors.put(c);
    });
  }

  async lastSeen(): Promise<LastSeen> {
    return ((await this.db.settings.get(LAST_SEEN_KEY))?.value as LastSeen | undefined) ?? {};
  }

  /** Fold imported records into the per-contributor sync state (§21.2). */
  async noteSeen(records: readonly MergeableRecord[]): Promise<void> {
    let seen = await this.lastSeen();
    for (const r of records) seen = updateLastSeen(seen, r);
    await this.db.settings.put({ key: LAST_SEEN_KEY, value: seen });
  }

  history(entityId: ID) {
    return entityHistory(this.db, entityId);
  }

  get canUndo(): boolean {
    return this.undoStack.size > 0;
  }

  /** Undo the most recent operation of this session. Returns it, or undefined if none. */
  async undo(): Promise<UndoEntry | undefined> {
    const entry = this.undoStack.pop();
    if (!entry) return undefined;
    if (entry.kind === 'group') await this.restoreSnapshots(entry);
    else
      await this.run(`Undo ${entry.label}`, (ctx) => this.invert(ctx, entry), { undoable: false });
    return entry;
  }

  /** Imports and merges: put every touched record back exactly as it was. */
  private async restoreSnapshots(entry: UndoEntry): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      for (const s of [...entry.snapshots].reverse()) {
        const table = this.db.table(s.table);
        if (s.before === undefined) await table.delete(s.id);
        else await table.put(s.before);
      }
      await this.db.history.where('group').equals(entry.id).delete();
    });
  }

  /**
   * Edits: write the previous values back as new stamped writes. Forward order, so side
   * effects of undoing one record (clearing `verified`) are overwritten by the restore of the
   * record they hit.
   */
  private async invert(ctx: OpContext, entry: UndoEntry): Promise<void> {
    for (const s of entry.snapshots) {
      const repo = this.repo(s.table);
      const table = this.db.table(s.table);
      if (!repo) {
        this.snapshot(ctx, s.table, s.id, await table.get(s.id));
        if (s.before === undefined) await table.delete(s.id);
        else await table.put(s.before);
        continue;
      }
      const current = (await table.get(s.id)) as MergeableRecord | undefined;
      const before = s.before as MergeableRecord | undefined;
      if (!current) continue;
      if (!before) {
        await repo.delete(s.id);
        continue;
      }
      if (current.deleted && !before.deleted) await repo.undelete(ctx, s.id);
      const was = dataFields(before);
      const now = dataFields(current);
      const patch: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) patch[k] = was[k];
      await repo.update(s.id, patch as Patch<MergeableRecord>);
    }
  }
}
