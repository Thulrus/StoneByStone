/**
 * Binary rows (`photoBlobs`, `photoThumbs`, `overlayBlobs`). New rows store raw bytes plus a
 * MIME type, not a `Blob`: WebKit refuses Blobs in IndexedDB in private/ephemeral sessions.
 * Rows written as `{ blob }` by earlier builds are still read.
 */
import type { BlobRow } from './db';

/** Read the bytes now, outside any transaction (IndexedDB can't wait on `arrayBuffer()`). */
export async function toBlobRow(id: string, blob: Blob): Promise<BlobRow> {
  return { id, bytes: await blob.arrayBuffer(), type: blob.type };
}

export function rowBlob(row: BlobRow | undefined): Blob | undefined {
  if (!row) return undefined;
  if (row.bytes) return new Blob([row.bytes], { type: row.type ?? '' });
  return row.blob;
}

export function rowSize(row: BlobRow | undefined): number {
  return row?.bytes?.byteLength ?? row?.blob?.size ?? 0;
}
