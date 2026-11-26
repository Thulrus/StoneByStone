import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useStore } from '../../app/store-context';
import { storageUsage } from '../../data/usage';
import { Button } from '../../ui/Button';
import { useBackup } from '../share/useBackup';
import {
  ensurePersisted,
  formatBytes,
  isPersisted,
  QUOTA_WARNING,
  storageEstimate,
  type Quota,
} from './storage';

/** Storage dashboard (plan §14): quota, persistence, usage per cemetery, one-tap backup. */
export function StoragePanel() {
  const { t, i18n } = useLingui();
  const store = useStore();
  const usage = useLiveQuery(() => storageUsage(store), [store]);
  const [quota, setQuota] = useState<Quota>();
  const [persisted, setPersisted] = useState<boolean>();
  const { backUp, busy } = useBackup();
  const fmt = (n: number) => formatBytes(n, i18n.locale);

  useEffect(() => {
    void storageEstimate().then(setQuota);
    void isPersisted().then(setPersisted);
  }, [usage]);

  const share = quota ? quota.usage / quota.quota : 0;
  const pct = new Intl.NumberFormat(i18n.locale, { style: 'percent' }).format(share);

  return (
    <section aria-labelledby="storage-heading" className="flex flex-col gap-4">
      <h2 id="storage-heading" className="text-lg font-semibold">
        <Trans>Storage</Trans>
      </h2>

      {quota && (
        <div className="flex flex-col gap-1">
          <p>
            <Trans>
              Using {fmt(quota.usage)} of about {fmt(quota.quota)} ({pct}).
            </Trans>
          </p>
          <progress
            value={quota.usage}
            max={quota.quota}
            aria-label={t`Storage used`}
            className="h-3 w-full accent-primary"
          />
          {share >= QUOTA_WARNING && (
            <p role="alert" className="font-medium text-danger">
              <Trans>
                Storage is almost full. Back up, then lower the photo quality or remove cemeteries
                you have finished.
              </Trans>
            </p>
          )}
        </div>
      )}

      {persisted === false && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1">
            <Trans>
              The browser may clear this app’s data when space runs low. Installing the app helps.
            </Trans>
          </p>
          <Button variant="secondary" onClick={() => void ensurePersisted().then(setPersisted)}>
            <Trans>Keep my data</Trans>
          </Button>
        </div>
      )}
      {persisted === true && (
        <p className="text-fg-muted">
          <Trans>The browser has agreed to keep this app’s data.</Trans>
        </p>
      )}

      {usage && usage.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <caption className="sr-only">{t`Storage per cemetery`}</caption>
            <thead>
              <tr className="text-sm text-fg-muted">
                <th scope="col" className="py-2 text-start font-medium">
                  <Trans>Cemetery</Trans>
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  <Trans>Data</Trans>
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  <Trans>Photos</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.cemeteryId} className="sbs-border border-x-0 border-b-0">
                  <th scope="row" className="py-2 text-start font-normal">
                    {u.name}
                    {u.deleted && (
                      <span className="ms-2 text-sm text-fg-muted">
                        <Trans>(deleted)</Trans>
                      </span>
                    )}
                  </th>
                  <td className="py-2 text-end tabular-nums">{fmt(u.dataBytes)}</td>
                  <td className="py-2 text-end tabular-nums">{fmt(u.photoBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <Button onClick={() => void backUp()} disabled={busy || !usage?.length}>
          {busy ? <Trans>Preparing…</Trans> : <Trans>Back up everything</Trans>}
        </Button>
      </div>
    </section>
  );
}
