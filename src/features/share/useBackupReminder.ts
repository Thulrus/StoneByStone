import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { useStore } from '../../app/store-context';
import { backupStatus, lastReminded, noteReminded, reminderDue } from '../../data/backup';
import { toast } from '../../ui/toast-store';
import { useBackup } from './useBackup';

/**
 * A backup reminder when the app opens with unsaved work that is a few days old, at most
 * once a day (plan §14).
 */
export function useBackupReminder() {
  const { t } = useLingui();
  const store = useStore();
  const { backUp } = useBackup();

  useEffect(() => {
    let live = true;
    void (async () => {
      const statuses = await backupStatus(store);
      if (!live || !reminderDue(statuses, await lastReminded(store), Date.now())) return;
      await noteReminded(store);
      const n = statuses.reduce((sum, s) => sum + s.unbacked, 0);
      toast({
        title: t`Time to back up`,
        description: t`${n} stone(s) on this device are not in any backup.`,
        action: { label: t`Back up`, onAction: () => void backUp() },
        duration: 20_000,
      });
    })();
    return () => {
      live = false;
    };
    // Once per app start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
}
