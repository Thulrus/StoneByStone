import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { version } from '../../../package.json';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';

/** Which build this device is running, and a manual update check. */
export function AboutPanel() {
  const { t, i18n } = useLingui();
  const [checking, setChecking] = useState(false);
  const built = new Date(__BUILD_TIME__).toLocaleString(i18n.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const sha = __BUILD_SHA__;

  const check = async () => {
    setChecking(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) {
        toast({ title: t`Updates aren't available in this browser tab` });
        return;
      }
      await reg.update();
      // A newer build installs in the background; the update banner then offers it.
      toast({
        title:
          reg.installing || reg.waiting
            ? t`An update was found. Tap Reload when the banner appears.`
            : t`You have the latest version`,
      });
    } catch {
      toast({ title: t`Couldn't check for updates. Are you online?`, tone: 'error' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="flex flex-col gap-2" aria-labelledby="about-heading">
      <h2 id="about-heading" className="text-lg font-semibold">
        <Trans>About this app</Trans>
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-fg-muted">
          <Trans>Version</Trans>
        </dt>
        <dd>{version}</dd>
        <dt className="text-fg-muted">
          <Trans>Build</Trans>
        </dt>
        <dd>
          <code>{sha}</code>
        </dd>
        <dt className="text-fg-muted">
          <Trans>Built</Trans>
        </dt>
        <dd>{built}</dd>
      </dl>
      <Button
        variant="secondary"
        className="self-start"
        disabled={checking}
        onClick={() => void check()}
      >
        {checking ? t`Checking…` : t`Check for updates`}
      </Button>
    </section>
  );
}
