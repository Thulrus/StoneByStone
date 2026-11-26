/**
 * Session undo stack (plan §2.2). In memory only: it lives as long as the page.
 *
 * - `edit` entries are undone by writing the previous values back as new stamped writes, so
 *   the undo itself merges correctly with copies that already saw the edit.
 * - `group` entries (imports, merges) hold a pre-change snapshot of every record they
 *   touched and are undone by restoring those snapshots exactly.
 */
import type { ID } from '../domain';

export type TableName =
  | 'cemeteries'
  | 'sections'
  | 'rows'
  | 'monuments'
  | 'persons'
  | 'photos'
  | 'features'
  | 'overlays'
  | 'tags'
  | 'contributors'
  | 'photoBlobs'
  | 'photoThumbs'
  | 'overlayBlobs'
  | 'settings'
  | 'history';

export interface Snapshot {
  table: TableName;
  id: ID;
  /** The record before the operation; undefined if it didn't exist. */
  before: unknown;
}

export interface UndoEntry {
  id: ID;
  label: string;
  kind: 'edit' | 'group';
  snapshots: Snapshot[];
}

export class UndoStack {
  private entries: UndoEntry[] = [];
  private listeners = new Set<() => void>();

  constructor(readonly limit = 200) {}

  push(entry: UndoEntry): void {
    if (entry.snapshots.length === 0) return;
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
    this.emit();
  }

  pop(): UndoEntry | undefined {
    const e = this.entries.pop();
    if (e) this.emit();
    return e;
  }

  peek(): UndoEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  get size(): number {
    return this.entries.length;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
