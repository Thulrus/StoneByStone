import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { useStore } from '../../app/store-context';
import { getTileDownload } from '../../data/tiles';
import type { Cemetery, Row } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { resolveProvider } from '../map/imagery';
import { useImagerySettings } from '../map/imagery-settings';
import { ensurePersisted, formatBytes, isPersisted, storageEstimate } from '../settings/storage';
import { fieldChecklist, type CheckStatus, type FieldState } from './field-checklist';

interface BatteryManagerLike {
  level: number;
  charging: boolean;
}

async function battery(): Promise<FieldState['battery']> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
  try {
    const b = await nav.getBattery?.();
    return b ? { level: b.level, charging: b.charging } : undefined;
  } catch {
    return undefined;
  }
}

const MARK: Record<CheckStatus, string> = { ok: '✓', warn: '!', unknown: '?' };

/** "Before you go out" (plan §8): battery, storage, offline map, persistence, rows. */
export function FieldChecklist({ cemetery, rows }: { cemetery: Cemetery; rows: readonly Row[] }) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const settings = useImagerySettings();
  const [run, setRun] = useState(0);
  const provider = settings
    ? resolveProvider(cemetery.settings.imagery, cemetery.location, settings.custom, settings.keys)
    : undefined;
  const tiles = useLiveQuery(
    async () =>
      provider
        ? {
            allowed: provider.allowsOffline,
            count: (await getTileDownload(store, cemetery.id, provider.id))?.tiles.length ?? 0,
          }
        : undefined,
    [store, cemetery.id, provider?.id, provider?.allowsOffline],
  );
  const device = useLiveQuery(async () => {
    void run;
    const [b, quota, persisted] = await Promise.all([battery(), storageEstimate(), isPersisted()]);
    return { battery: b, freeBytes: quota && quota.quota - quota.usage, persisted };
  }, [run]);
  if (!device) return null;

  const withLine = rows.filter((r) => r.line).length;
  const state: FieldState = { ...device, tiles, rows: { total: rows.length, withLine } };
  const status = Object.fromEntries(fieldChecklist(state).map((i) => [i.id, i.status]));
  const pct = device.battery ? Math.round(device.battery.level * 100) : 0;
  const free = device.freeBytes === undefined ? '' : formatBytes(device.freeBytes, i18n.locale);
  const n = rows.length;
  const tileCount = tiles?.count ?? 0;

  const item = (id: string, text: ReactNode, action?: ReactNode) => {
    const s = (status[id] ?? 'unknown') as CheckStatus;
    return (
      <li key={id} className="flex flex-wrap items-center gap-3" data-status={s}>
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full font-bold',
            s === 'ok'
              ? 'bg-primary text-primary-fg'
              : s === 'warn'
                ? 'bg-danger text-white'
                : 'bg-surface-2',
          )}
        >
          {MARK[s]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="sr-only">
            {s === 'ok' ? t`Ready:` : s === 'warn' ? t`Needs attention:` : t`Can't check:`}{' '}
          </span>
          {text}
        </span>
        {action}
      </li>
    );
  };

  return (
    <section
      aria-labelledby="field-prep"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4 sbs-border"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="field-prep" className="text-xl font-semibold">
          <Trans>Before you go out</Trans>
        </h2>
        <Button variant="ghost" onClick={() => setRun((r) => r + 1)}>
          <Trans>Check again</Trans>
        </Button>
      </div>
      <ul className="flex flex-col gap-3" aria-label={t`Field checklist`}>
        {item(
          'battery',
          !device.battery ? (
            <Trans>Battery: this browser can't tell. Charge the phone before you go.</Trans>
          ) : device.battery.charging ? (
            <Trans>Battery {pct}%, charging</Trans>
          ) : (
            <Trans>Battery {pct}%</Trans>
          ),
        )}
        {item(
          'storage',
          device.freeBytes === undefined ? (
            <Trans>Free space: this browser can't tell.</Trans>
          ) : status.storage === 'ok' ? (
            <Trans>{free} free for photos</Trans>
          ) : (
            <Trans>Only {free} free. Back up and remove old cemeteries to make room.</Trans>
          ),
        )}
        {item(
          'tiles',
          !tiles ? (
            <Trans>Offline map: no imagery chosen.</Trans>
          ) : !tiles.allowed ? (
            <Trans>This imagery can't be saved for offline use. The diagram works offline.</Trans>
          ) : tileCount > 0 ? (
            <Trans>Map saved for offline ({tileCount} tiles)</Trans>
          ) : (
            <Trans>Map not saved for offline yet. Use "Download for offline" below.</Trans>
          ),
        )}
        {item(
          'persisted',
          device.persisted === undefined ? (
            <Trans>Storage protection: this browser can't tell.</Trans>
          ) : device.persisted ? (
            <Trans>Data protected from browser clean-up</Trans>
          ) : (
            <Trans>The browser may clear this app's data when space runs low.</Trans>
          ),
          device.persisted === false ? (
            <Button
              variant="secondary"
              onClick={() => void ensurePersisted().then(() => setRun((r) => r + 1))}
            >
              <Trans>Protect data</Trans>
            </Button>
          ) : undefined,
        )}
        {item(
          'rows',
          n === 0 ? (
            <Trans>No rows planned. Add them above, or start a new row when you walk.</Trans>
          ) : (
            <>
              <Plural value={n} one="# row planned" other="# rows planned" />,{' '}
              <Plural
                value={withLine}
                one="# with a line on the map"
                other="# with a line on the map"
              />
            </>
          ),
        )}
      </ul>
    </section>
  );
}
