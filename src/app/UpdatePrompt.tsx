import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../ui/Button';
import { toast } from '../ui/toast-store';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Service-worker lifecycle UI (registerType: 'prompt'). A new deploy never reloads the page
 * on its own, because that could interrupt a capture session; the user chooses when.
 */
export function UpdatePrompt() {
  const { t } = useLingui();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Installed PWAs can stay open for days; look for new deploys now and then.
      const check = () => {
        if (navigator.onLine && document.visibilityState === 'visible') void registration.update();
      };
      setInterval(check, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', check);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast({ title: t`Ready to work offline` });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, t]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-primary px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-primary-fg"
    >
      <span>
        <Trans>A new version of StoneByStone is available.</Trans>
      </span>
      <Button variant="secondary" onClick={() => void updateServiceWorker(true)}>
        <Trans>Reload</Trans>
      </Button>
      <Button
        variant="ghost"
        className="text-primary-fg hover:bg-transparent hover:underline"
        onClick={() => setNeedRefresh(false)}
      >
        <Trans>Later</Trans>
      </Button>
    </div>
  );
}
