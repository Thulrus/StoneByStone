import { Trans } from '@lingui/react/macro';
import type { Monument } from '../../domain';
import { Button } from '../../ui/Button';

/**
 * Verify pass (plan §9): confirm a transcribed stone against its photo and move on. Shown
 * only for stones that have a transcription.
 */
export function VerifyBar({
  stone,
  onVerify,
  onUnverify,
}: {
  stone: Monument;
  onVerify: () => void;
  onUnverify: () => void;
}) {
  if (stone.status !== 'transcribed' && stone.status !== 'verified') return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={onVerify}>
        <Trans>Verified & next</Trans>
      </Button>
      {stone.status === 'verified' ? (
        <Button type="button" variant="ghost" onClick={onUnverify}>
          <Trans>Unmark verified</Trans>
        </Button>
      ) : null}
      <span className="text-sm text-fg-muted">
        <Trans>Checked against the photo? Ctrl+Shift+Enter</Trans>
      </span>
    </div>
  );
}
