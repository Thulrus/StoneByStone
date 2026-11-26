import { t as coreT } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { useStore } from '../../app/store-context';
import { backupStatus, type BackupStatus } from '../../data/backup';
import type { Store } from '../../data/store';
import { toast } from '../../ui/toast-store';
import type { PreparedBackup } from './backup';

// The archive writer (fflate, schemas) loads on first use, not with the app shell.
const loadBackup = () => import('./backup');

/** Live count of stones not yet in a backup, across all cemeteries. */
export function useBackupStatus(): { statuses: BackupStatus[]; unbacked: number } | undefined {
  const store = useStore();
  const statuses = useLiveQuery(() => backupStatus(store), [store]);
  if (!statuses) return undefined;
  return { statuses, unbacked: statuses.reduce((n, s) => n + s.unbacked, 0) };
}

async function deliverWithToasts(store: Store, prepared: PreparedBackup): Promise<void> {
  const { finishBackup, needsFreshTap } = await loadBackup();
  try {
    const r = await finishBackup(store, prepared);
    if (r.method === 'cancelled') return;
    const n = prepared.files.length;
    toast({
      title: coreT`Backup saved`,
      description:
        r.method === 'folder'
          ? coreT`${n} file(s) written to the folder “${r.folder ?? ''}”.`
          : r.method === 'share'
            ? coreT`${n} file(s) shared.`
            : coreT`${n} file(s) downloaded.`,
    });
  } catch (e) {
    if (needsFreshTap(e)) {
      toast({
        title: coreT`Your backup is ready`,
        action: { label: coreT`Save it`, onAction: () => void deliverWithToasts(store, prepared) },
        duration: 60_000,
      });
    } else {
      toast({ tone: 'error', title: coreT`Backup failed`, description: String(e) });
    }
  }
}

/** Runs a one-tap backup with toasts for the outcome. */
export function useBackup(): { backUp: () => Promise<void>; busy: boolean } {
  const { t } = useLingui();
  const store = useStore();
  const [busy, setBusy] = useState(false);

  const deliver = useCallback((p: PreparedBackup) => deliverWithToasts(store, p), [store]);

  const backUp = useCallback(async () => {
    setBusy(true);
    try {
      const prepared = await (await loadBackup()).prepareBackup(store);
      if (prepared.files.length === 0) {
        toast({ title: t`There is nothing to back up yet.` });
        return;
      }
      await deliver(prepared);
    } catch (e) {
      toast({ tone: 'error', title: t`Backup failed`, description: String(e) });
    } finally {
      setBusy(false);
    }
  }, [deliver, store, t]);

  return { backUp, busy };
}
