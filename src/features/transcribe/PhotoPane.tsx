import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import type { ID } from '../../domain';
import { cn } from '../../ui/cn';
import { ROLE_LABEL } from '../capture/labels';
import { BlobImage } from '../capture/PhotoStrip';
import { photoOrder } from './queue';

/** The current stone's photos, large, front first; a button per photo when there are more. */
export function PhotoPane({ monumentId }: { monumentId: ID }) {
  const { t } = useLingui();
  const store = useStore();
  const photos = useLiveQuery(
    async () => photoOrder(await store.photos.byMonument(monumentId)),
    [store, monumentId],
  );
  const [pickedId, setPickedId] = useState<ID>();
  const shown = photos?.find((p) => p.id === pickedId) ?? photos?.[0];
  const blob = useLiveQuery(
    async () => (shown ? ((await store.photos.blob(shown.id)) ?? null) : null),
    [store, shown?.id],
  );
  const role = shown ? t(ROLE_LABEL[shown.role]) : '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {blob ? (
          <BlobImage
            key={shown?.id}
            blob={blob}
            alt={t`${role} photo`}
            className="max-h-[70dvh] w-full object-contain"
          />
        ) : photos && photos.length === 0 ? (
          <p className="p-6 text-fg-muted">
            <Trans>No photo of this stone yet.</Trans>
          </p>
        ) : null}
      </div>
      {photos && photos.length > 1 ? (
        <div role="group" aria-label={t`Photos`} className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === shown?.id}
              onClick={() => setPickedId(p.id)}
              className={cn(
                'min-h-12 rounded-lg px-3',
                p.id === shown?.id ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
              )}
            >
              {t(ROLE_LABEL[p.role])}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
