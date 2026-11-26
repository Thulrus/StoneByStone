import { Plural, Trans } from '@lingui/react/macro';
import { Button } from '../../ui/Button';
import { useBackup, useBackupStatus } from './useBackup';

/** Home's backup status: how many stones would be lost with this device (plan §14). */
export function BackupBanner() {
  const status = useBackupStatus();
  const { backUp, busy } = useBackup();
  if (!status || status.unbacked === 0) return null;
  return (
    <section
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4 sbs-border border-danger"
    >
      <p className="font-medium">
        <Plural
          value={status.unbacked}
          one="# stone is not backed up"
          other="# stones are not backed up"
        />
        <span className="block text-sm font-normal text-fg-muted">
          <Trans>If this device is lost or the browser clears its data, they are gone.</Trans>
        </span>
      </p>
      <Button onClick={() => void backUp()} disabled={busy}>
        {busy ? <Trans>Preparing…</Trans> : <Trans>Back up now</Trans>}
      </Button>
    </section>
  );
}

/** Compact, always-visible version for the app header. */
export function BackupIndicator() {
  const status = useBackupStatus();
  const { backUp, busy } = useBackup();
  if (!status || status.unbacked === 0) return null;
  return (
    <Button
      variant="ghost"
      onClick={() => void backUp()}
      disabled={busy}
      className="text-sm font-semibold text-danger"
    >
      <span aria-hidden="true">⚠ </span>
      <Plural value={status.unbacked} one="# not backed up" other="# not backed up" />
    </Button>
  );
}
