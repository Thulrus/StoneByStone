import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../app/store-context';
import { downloadId, getTileDownload, putTileDownload, removeTileDownload } from '../../data/tiles';
import type { Cemetery, Monument, Row } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { ensurePersisted, formatBytes } from '../settings/storage';
import { resolveProvider } from './imagery';
import { useImagerySettings } from './imagery-settings';
import { deleteTiles, downloadTiles, MAX_TILES, offlineArea, planDownload } from './offline';

export interface OfflinePanelProps {
  cemetery: Cemetery;
  rows: readonly Row[];
  stones: readonly Monument[];
}

/** "Prepare for offline": download the cemetery's imagery where the terms allow (plan §8). */
export function OfflinePanel({ cemetery, rows, stones }: OfflinePanelProps) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const settings = useImagerySettings();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const abort = useRef<AbortController>(undefined);
  const provider = settings
    ? resolveProvider(cemetery.settings.imagery, cemetery.location, settings.custom, settings.keys)
    : undefined;
  const saved = useLiveQuery(
    async () =>
      provider ? ((await getTileDownload(store, cemetery.id, provider.id)) ?? null) : null,
    [store, cemetery.id, provider?.id],
  );
  const area = useMemo(() => offlineArea(cemetery, rows, stones), [cemetery, rows, stones]);
  if (!provider || saved === undefined) return null;

  const fmt = (n: number) => formatBytes(n, i18n.locale);
  const plan = area ? planDownload(area, provider) : undefined;
  const name = provider.name;

  const download = async () => {
    if (!area || !plan) return;
    const ac = new AbortController();
    abort.current = ac;
    setProgress({ done: 0, total: plan.count });
    try {
      const r = await downloadTiles(area, plan, provider, {
        signal: ac.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      await putTileDownload(store, {
        id: downloadId(cemetery.id, provider.id),
        cemeteryId: cemetery.id,
        providerId: provider.id,
        tiles: r.tiles,
        bytes: r.bytes,
        downloadedAt: new Date().toISOString(),
      });
      await ensurePersisted();
      const failed = r.failed;
      toast(
        failed
          ? { title: t`Saved for offline, but ${failed} tiles failed`, tone: 'error' }
          : { title: t`Map saved for offline use` },
      );
    } catch (e) {
      if (!ac.signal.aborted)
        toast({ title: t`Download failed`, description: String(e), tone: 'error' });
    } finally {
      setProgress(undefined);
    }
  };

  const remove = async () => {
    const free = await removeTileDownload(store, downloadId(cemetery.id, provider.id));
    await deleteTiles(provider.id, free);
    toast({ title: t`Offline map deleted` });
  };

  let body;
  if (!provider.allowsOffline) {
    body = (
      <p>
        <Trans>
          {name} can't be saved for offline use under its terms. Pick USGS imagery, or a custom
          source whose terms allow it, from the map's Imagery menu. The diagram works offline
          without any imagery.
        </Trans>
      </p>
    );
  } else if (!area || !plan) {
    body = (
      <p>
        <Trans>Set the cemetery's location or draw a row line first.</Trans>
      </p>
    );
  } else if (progress) {
    const { done, total } = progress;
    body = (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <Trans>
            Downloading {done} of {total} tiles…
          </Trans>
          <progress max={total} value={done} className="w-full" />
        </label>
        <Button variant="secondary" className="self-start" onClick={() => abort.current?.abort()}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    );
  } else {
    const count = plan.count;
    const size = fmt(plan.estimateBytes);
    const tooBig = count > MAX_TILES;
    body = (
      <div className="flex flex-col gap-2">
        {saved ? (
          <p>
            <Trans>
              Saved for offline: {saved.tiles.length} tiles, {fmt(saved.bytes)}, on{' '}
              {new Date(saved.downloadedAt).toLocaleDateString(i18n.locale)}.
            </Trans>
          </p>
        ) : null}
        <p className="text-fg-muted">
          {tooBig ? (
            <Trans>The area is too large to download ({count} tiles).</Trans>
          ) : (
            <Trans>
              {name}: about {count} tiles, roughly {size}.
            </Trans>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={tooBig} onClick={() => void download()}>
            {saved ? t`Download again` : t`Download for offline`}
          </Button>
          {saved ? (
            <Button variant="danger" onClick={() => void remove()}>
              <Trans>Delete offline map</Trans>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl bg-surface p-4 sbs-border">
      <h2 className="text-lg font-bold">
        <Trans>Offline map</Trans>
      </h2>
      {body}
    </section>
  );
}
