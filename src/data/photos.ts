/** Storing captured photos: the `Photo` record plus its full image and thumbnail (plan §19). */
import type { ID, Photo, PhotoRole, Position } from '../domain';
import { toBlobRow } from './blobs';
import type { BlobRow } from './db';
import type { OpContext, Store } from './store';

export interface NewPhoto {
  monumentId: ID;
  role: PhotoRole;
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  sha256: string;
  phash?: string;
  takenAt?: string;
  position?: Position;
}

/** A photo whose bytes have been read, ready to write inside a transaction. */
export interface PreparedPhoto {
  id: ID;
  record: Omit<Photo, 'id' | 'stamps' | 'createdAt' | 'deleted' | 'cemeteryId'>;
  full: BlobRow;
  thumb: BlobRow;
}

/** Must run outside any transaction: reading Blob bytes can't happen inside one. */
export async function preparePhoto(store: Store, input: NewPhoto): Promise<PreparedPhoto> {
  const id = store.newId();
  const { full, thumb, ...rest } = input;
  const [fullRow, thumbRow] = await Promise.all([toBlobRow(id, full), toBlobRow(id, thumb)]);
  return { id, record: { ...rest, bytes: full.size }, full: fullRow, thumb: thumbRow };
}

/** Inside an operation: create the record and store its bytes. */
export async function writePhoto(
  store: Store,
  ctx: OpContext,
  cemeteryId: ID,
  p: PreparedPhoto,
): Promise<Photo> {
  await store.photos.writeBlobs(ctx, p.full, p.thumb);
  return store.photos.create({ ...p.record, id: p.id, cemeteryId });
}

/** Add one photo to an existing stone, as one undoable step. */
export async function addPhoto(store: Store, input: NewPhoto): Promise<Photo> {
  const m = await store.monuments.get(input.monumentId);
  if (!m) throw new Error(`No stone ${input.monumentId}`);
  const prepared = await preparePhoto(store, input);
  return store.run('Add photo', (ctx) => writePhoto(store, ctx, m.cemeteryId, prepared));
}
