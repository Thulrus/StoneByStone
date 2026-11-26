/**
 * Repositories with entity-specific rules: materialized monument status and automatic
 * clearing of `verified` (plan §2.2).
 */
import {
  deriveStatus,
  deepEqual,
  MONUMENT_TRANSCRIPTION_FIELDS,
  PERSON_TRANSCRIPTION_FIELDS,
  type ID,
  type Monument,
  type Person,
  type Photo,
} from '../domain';
import { rowBlob, toBlobRow } from './blobs';
import type { BlobRow } from './db';
import { Repo } from './repository';
import type { OpContext } from './store';

function changesAny(
  fields: ReadonlySet<string>,
  before: object | undefined,
  after: object,
): boolean {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  for (const k of fields) if (!deepEqual(b[k], a[k])) return true;
  return false;
}

export class MonumentRepo extends Repo<Monument> {
  /** Mark verified now. Any later transcription change clears it. */
  async verify(id: ID): Promise<Monument> {
    const verified = { hlc: this.store.device.clock.now(), by: this.store.device.contributorId };
    return this.update(id, { verified });
  }

  async status(m: Pick<Monument, 'id' | 'verified' | 'inscription' | 'epitaph'>) {
    const db = this.store.db;
    const live = <R extends { deleted?: unknown }>(r: R) => !r.deleted;
    const [photos, persons] = await Promise.all([
      db.photos.where('monumentId').equals(m.id).filter(live).count(),
      db.persons.where('monumentId').equals(m.id).filter(live).count(),
    ]);
    return deriveStatus(m, { hasPhoto: photos > 0, hasPerson: persons > 0 });
  }

  /** Re-derive status after a linked person or photo changed. Not a stamped write. */
  async refreshStatus(ctx: OpContext, id: ID): Promise<void> {
    const m = await this.table.get(id);
    if (!m) return;
    const status = await this.status(m);
    if (status !== m.status) await this.write(ctx, m, { ...m, status });
  }

  protected override adjustPatch(
    before: Monument,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!before.verified || 'verified' in patch) return patch;
    const touches = [...MONUMENT_TRANSCRIPTION_FIELDS].some(
      (k) => k in patch && !deepEqual(before[k], patch[k]),
    );
    return touches ? { ...patch, verified: undefined } : patch;
  }

  protected override async prepare(_ctx: OpContext, r: Monument): Promise<Monument> {
    return { ...r, status: await this.status(r) };
  }
}

/** Shared by persons and photos: they decide their monument's status. */
abstract class LinkedRepo<T extends Person | Photo> extends Repo<T> {
  protected abstract invalidatesVerification(before: T | undefined, after: T): boolean;

  protected override async afterWrite(ctx: OpContext, before: T | undefined, after: T) {
    const ids = new Set([before?.monumentId, after.monumentId].filter((x) => x !== undefined));
    for (const id of ids) ctx.touchedMonuments.add(id);
    if (ctx.group !== undefined || !this.invalidatesVerification(before, after)) return;
    for (const id of ids) {
      const m = await this.store.monuments.get(id, { includeDeleted: true });
      if (m?.verified) await this.store.monuments.update(id, { verified: undefined });
    }
  }
}

export class PersonRepo extends LinkedRepo<Person> {
  protected invalidatesVerification(before: Person | undefined, after: Person): boolean {
    return Boolean(after.deleted) !== Boolean(before?.deleted)
      ? true
      : changesAny(PERSON_TRANSCRIPTION_FIELDS, before, after);
  }

  async byMonument(monumentId: ID): Promise<Person[]> {
    const all = await this.table.where('monumentId').equals(monumentId).toArray();
    return all.filter((p) => !p.deleted);
  }
}

const ROLE_ORDER = ['front', 'back', 'detail', 'context', 'other'];

export class PhotoRepo extends LinkedRepo<Photo> {
  protected invalidatesVerification(): boolean {
    return false;
  }

  /** Display order: by role, then `takenAt` (§2.2). */
  async byMonument(monumentId: ID): Promise<Photo[]> {
    const all = await this.table.where('monumentId').equals(monumentId).toArray();
    return all
      .filter((p) => !p.deleted)
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          (a.takenAt ?? '').localeCompare(b.takenAt ?? ''),
      );
  }

  /** Store the full image and thumbnail for a photo record. */
  async putBlobs(photoId: ID, full: Blob, thumb?: Blob): Promise<void> {
    const fullRow = await toBlobRow(photoId, full);
    const thumbRow = thumb ? await toBlobRow(photoId, thumb) : undefined;
    await this.store.run('Add photo', (ctx) => this.writeBlobs(ctx, fullRow, thumbRow));
  }

  /** Inside an operation: store rows already read by `toBlobRow`. */
  async writeBlobs(ctx: OpContext, full: BlobRow, thumb?: BlobRow): Promise<void> {
    const db = this.store.db;
    this.store.snapshot(ctx, 'photoBlobs', full.id, await db.photoBlobs.get(full.id));
    await db.photoBlobs.put(full);
    if (thumb) {
      this.store.snapshot(ctx, 'photoThumbs', thumb.id, await db.photoThumbs.get(thumb.id));
      await db.photoThumbs.put(thumb);
    }
  }

  async blob(photoId: ID): Promise<Blob | undefined> {
    return rowBlob(await this.store.db.photoBlobs.get(photoId));
  }

  async thumb(photoId: ID): Promise<Blob | undefined> {
    return rowBlob(await this.store.db.photoThumbs.get(photoId));
  }
}
