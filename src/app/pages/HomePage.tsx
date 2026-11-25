import { Trans } from '@lingui/react/macro';
import { InstallPrompt } from '../InstallPrompt';

/** Placeholder until the cemetery list lands (WP3, #21). */
export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        <Trans>Cemeteries</Trans>
      </h1>
      <InstallPrompt />
      <p className="text-fg-muted">
        <Trans>No cemeteries on this device yet.</Trans>
      </p>
    </div>
  );
}
