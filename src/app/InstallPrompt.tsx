import { Trans } from '@lingui/react/macro';
import { useSyncExternalStore } from 'react';
import { Button } from '../ui/Button';
import { detectInstallPlatform, getDeferredPrompt, subscribeInstall } from './install';
import { usePrefs } from './prefs';

/**
 * Install card with per-platform instructions (plan §14). Installing matters most on iOS,
 * where Safari evicts site data after 7 days without a visit unless the app is on the
 * home screen.
 */
export function InstallPrompt() {
  const deferred = useSyncExternalStore(subscribeInstall, getDeferredPrompt, () => null);
  const dismissed = usePrefs((s) => s.installHintDismissed);
  const dismiss = usePrefs((s) => s.dismissInstallHint);
  const platform = detectInstallPlatform(deferred !== null);

  if (dismissed || platform === 'installed' || platform === 'other') return null;

  return (
    <section
      aria-labelledby="install-title"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4 sbs-border"
    >
      <h2 id="install-title" className="text-lg font-semibold">
        <Trans>Install StoneByStone</Trans>
      </h2>
      {platform === 'ios' ? (
        <p>
          <Trans>
            In Safari, tap the Share button, then “Add to Home Screen”. Your survey data is only
            safe from automatic clean-up once the app is on your home screen.
          </Trans>
        </p>
      ) : platform === 'android' ? (
        <p>
          <Trans>Open your browser’s menu and choose “Install app” or “Add to Home screen”.</Trans>
        </p>
      ) : (
        <p>
          <Trans>Install the app so it opens offline and keeps your survey data safe.</Trans>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {platform === 'chromium' && deferred && (
          <Button onClick={() => void deferred.prompt()}>
            <Trans>Install</Trans>
          </Button>
        )}
        <Button variant="secondary" onClick={dismiss}>
          <Trans>Not now</Trans>
        </Button>
      </div>
    </section>
  );
}
