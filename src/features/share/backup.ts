/**
 * One-tap full backup (plan §14): every cemetery as an `.sbs` file, sent with the Web Share
 * API on phones, written to a remembered folder with the File System Access API on Chromium,
 * or downloaded elsewhere.
 */
import { backupMark, markBackedUp, type BackupMark } from '../../data/backup';
import { listCemeteries } from '../../data/cemeteries';
import { collectArchive } from '../../data/format/export';
import { writeSbs } from '../../data/format/sbs';
import { getSetting, setSetting } from '../../data/settings';
import type { Store } from '../../data/store';
import type { Cemetery } from '../../domain';
import { download, fileSlug } from '../../ui/download';

const FOLDER_KEY = 'backupFolder';

interface DirHandle {
  name: string;
  queryPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle: (
    name: string,
    o: { create: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (b: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (o: { id: string; mode: 'readwrite' }) => Promise<DirHandle>;
};

export type DeliveryMethod = 'share' | 'folder' | 'download';
export type Delivery = { method: DeliveryMethod; folder?: string } | { method: 'cancelled' };

export function backupFileName(name: string, now = new Date()): string {
  return `${fileSlug(name)}-${now.toISOString().slice(0, 10)}.sbs`;
}

export async function cemeteryBackupFile(store: Store, cemetery: Cemetery): Promise<File> {
  const { archive, binaries } = await collectArchive(store, cemetery.id);
  const blob = await writeSbs(archive, binaries);
  return new File([blob], backupFileName(cemetery.name), { type: 'application/zip' });
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

function prefersShare(files: File[]): boolean {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse && typeof navigator.canShare === 'function' && navigator.canShare({ files });
}

async function folder(store: Store, pick: NonNullable<PickerWindow['showDirectoryPicker']>) {
  const saved = await getSetting<DirHandle | undefined>(store, FOLDER_KEY, undefined);
  if (saved) {
    const opts = { mode: 'readwrite' } as const;
    let state = (await saved.queryPermission?.(opts)) ?? 'granted';
    if (state === 'prompt') state = (await saved.requestPermission?.(opts)) ?? 'denied';
    if (state === 'granted') return saved;
  }
  const picked = await pick({ id: 'stonebystone-backups', mode: 'readwrite' });
  await setSetting(store, FOLDER_KEY, picked);
  return picked;
}

/** Hand the files to the user by the best means this browser has. */
export async function deliverFiles(store: Store, files: File[]): Promise<Delivery> {
  try {
    if (prefersShare(files)) {
      await navigator.share({ files, title: 'StoneByStone backup' });
      return { method: 'share' };
    }
    const pick = (window as PickerWindow).showDirectoryPicker;
    if (pick) {
      const dir = await folder(store, pick.bind(window));
      for (const f of files) {
        const w = await (await dir.getFileHandle(f.name, { create: true })).createWritable();
        await w.write(f);
        await w.close();
      }
      return { method: 'folder', folder: dir.name };
    }
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
      await navigator.share({ files, title: 'StoneByStone backup' });
      return { method: 'share' };
    }
  } catch (e) {
    if (isAbort(e)) return { method: 'cancelled' };
    throw e;
  }
  for (const f of files) download(f);
  return { method: 'download' };
}

export interface PreparedBackup {
  cemeteries: Cemetery[];
  files: File[];
  mark: BackupMark;
}

/** Export every cemetery to a file. */
export async function prepareBackup(store: Store): Promise<PreparedBackup> {
  const mark = backupMark(store);
  const cemeteries = await listCemeteries(store);
  const files: File[] = [];
  for (const c of cemeteries) files.push(await cemeteryBackupFile(store, c));
  return { cemeteries, files, mark };
}

/**
 * Deliver a prepared backup and, unless the user cancelled, mark its cemeteries backed up.
 * Throws `NotAllowedError` when the browser wants a fresh tap (a slow export can outlast the
 * original one); call again from a new click.
 */
export async function finishBackup(store: Store, prepared: PreparedBackup): Promise<Delivery> {
  const result = await deliverFiles(store, prepared.files);
  if (result.method !== 'cancelled') {
    for (const c of prepared.cemeteries) await markBackedUp(store, c.id, prepared.mark);
  }
  return result;
}

export const needsFreshTap = (e: unknown) =>
  e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
