import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type ChangeEvent } from 'react';
import { useStore } from '../../app/store-context';
import { addImageOverlay, overlayErrorM } from '../../data/overlays';
import type { ID, Overlay } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { prepareOverlayImage } from './image';

export interface OverlaysPanelProps {
  cemeteryId: ID;
  overlays: readonly Overlay[];
  onPin: (id: ID) => void;
}

/** Setup: plat maps and drone images — add, pin, fade, delete (plan §7.4). */
export function OverlaysPanel({ cemeteryId, overlays, onPin }: OverlaysPanelProps) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const images = overlays.filter((o) => o.imageId);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await prepareOverlayImage(file);
      const o = await addImageOverlay(store, cemeteryId, blob, file.name.replace(/\.[^.]+$/, ''));
      onPin(o.id);
    } catch {
      toast({ title: t`Couldn't read that image`, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (o: Overlay) => {
    await store.overlays.delete(o.id);
    const name = o.name;
    toast({
      title: t`Deleted ${name}`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  const fmt = (m: number) =>
    new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(m);

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-surface p-4 sbs-border">
      <h2 className="text-lg font-bold">
        <Trans>Plat maps and drone images</Trans>
      </h2>
      <ul className="flex flex-col gap-3">
        {images.map((o) => {
          const err = overlayErrorM(o);
          const name = o.name;
          const pct = Math.round(o.opacity * 100);
          return (
            <li key={o.id} className="flex flex-col gap-2">
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-fg-muted">
                {o.transform && err !== undefined
                  ? t`On the map, average error ${fmt(err)} m`
                  : t`Not on the map yet`}
              </p>
              {o.transform ? (
                <label className="flex items-center gap-2">
                  <span className="w-20">{t`Opacity`}</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={pct}
                    aria-valuetext={`${pct}%`}
                    className="min-h-12 flex-1"
                    onChange={(e) =>
                      void store.overlays.update(o.id, { opacity: Number(e.target.value) / 100 })
                    }
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => onPin(o.id)}>
                  {o.transform ? t`Adjust pins for ${name}` : t`Pin ${name} to the map`}
                </Button>
                <Button variant="ghost" onClick={() => void remove(o)}>
                  {t`Delete ${name}`}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <label className="inline-flex min-h-12 cursor-pointer items-center justify-center self-start rounded-lg bg-primary px-4 font-medium text-primary-fg">
        {busy ? t`Adding…` : t`Add a plat map or drone image`}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          data-testid="overlay-input"
          disabled={busy}
          onChange={(e) => void add(e)}
        />
      </label>
    </section>
  );
}
