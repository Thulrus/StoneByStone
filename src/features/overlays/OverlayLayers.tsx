import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { useStore } from '../../app/store-context';
import { overlayErrorM } from '../../data/overlays';
import type { ID, Overlay } from '../../domain';
import { asAffine } from '../../geo';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { ImageOverlayLayer } from '../map/ImageOverlayLayer';
import { MapTap } from '../map/layers';
import { useOverlayImage } from './image';

/** Pinned image overlays whose image and transform are available. */
const pinnedImages = (overlays: readonly Overlay[]) =>
  overlays.filter((o) => o.imageId && asAffine(o.transform));

function PinnedImage({ overlay }: { overlay: Overlay }) {
  const image = useOverlayImage(overlay.imageId);
  const t = asAffine(overlay.transform);
  if (!image || !t) return null;
  return <ImageOverlayLayer {...image} transform={t} opacity={overlay.opacity} />;
}

/** Every pinned plat/drone image, at its saved opacity. */
export function OverlayImages({ overlays }: { overlays: readonly Overlay[] }) {
  return (
    <>
      {pinnedImages(overlays).map((o) => (
        <PinnedImage key={o.id} overlay={o} />
      ))}
    </>
  );
}

/** "Place stones" mode: each tap on the overlay adds a stone there (plan §7.4). */
export function PlaceOnOverlay({
  cemeteryId,
  overlays,
}: {
  cemeteryId: ID;
  overlays: readonly Overlay[];
}) {
  const { t } = useLingui();
  const store = useStore();
  const [on, setOn] = useState(false);
  const pinned = pinnedImages(overlays);
  const errors = pinned.map(overlayErrorM).filter((e) => e !== undefined);
  const accuracyM = errors.length ? Math.round(Math.max(...errors) * 10) / 10 : undefined;

  const place = useCallback(
    ([lng, lat]: [number, number]) => {
      void store.monuments
        .create({
          cemeteryId,
          kind: 'headstone',
          position: {
            lng,
            lat,
            source: 'overlay',
            ...(accuracyM !== undefined ? { accuracyM } : {}),
          },
        })
        .then(() =>
          toast({
            title: t`Stone added`,
            action: { label: t`Undo`, onAction: () => void store.undo() },
          }),
        );
    },
    [store, cemeteryId, accuracyM, t],
  );

  if (pinned.length === 0) return null;
  return (
    <>
      {on ? <MapTap onTap={place} /> : null}
      <Button
        variant={on ? 'primary' : 'secondary'}
        aria-pressed={on}
        className="absolute start-1/2 top-2 z-10 -translate-x-1/2 shadow rtl:translate-x-1/2"
        onClick={() => setOn((v) => !v)}
      >
        {on ? t`Done placing` : t`Place stones`}
      </Button>
    </>
  );
}
