import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import { pinImageOverlay } from '../../data/overlays';
import type { Overlay } from '../../domain';
import { toast } from '../../ui/toast-store';
import { CemeteryMap, type CemeteryMapProps } from '../map/CemeteryMap';
import { ImageOverlayLayer } from '../map/ImageOverlayLayer';
import { useOverlayImage } from './image';
import { ImagePicker } from './ImagePicker';
import { PinMapLayer } from './PinMapLayer';
import { PinPanel } from './PinPanel';
import { usePins } from './usePins';

export interface ImagePinWorkspaceProps extends Omit<CemeteryMapProps, 'tool'> {
  overlay: Overlay;
  onDone: () => void;
}

/** Pin a plat or drone image with ≥3 control points; least-squares affine (plan §7.4). */
export function ImagePinWorkspace({ overlay, onDone, ...map }: ImagePinWorkspaceProps) {
  const { t } = useLingui();
  const store = useStore();
  const image = useOverlayImage(overlay.imageId);
  const pins = usePins(overlay.controlPoints);
  const [busy, setBusy] = useState(false);
  const transform = pins.points.length >= 3 ? pins.fit?.transform : undefined;

  const apply = async () => {
    setBusy(true);
    try {
      await pinImageOverlay(store, overlay, pins.points);
      const name = overlay.name;
      toast({
        title: t`${name} is on the map`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <CemeteryMap
      {...map}
      overlays={map.overlays?.filter((o) => o.id !== overlay.id)}
      tool={{
        map: (
          <PinMapLayer pins={pins}>
            {image && transform ? (
              <ImageOverlayLayer {...image} transform={transform} opacity={0.6} />
            ) : null}
          </PinMapLayer>
        ),
        panel: (
          <PinPanel
            pins={pins}
            sourceHint={t`point on the image`}
            minPoints={3}
            busy={busy}
            onApply={() => void apply()}
            onCancel={onDone}
          >
            {image ? <ImagePicker image={image} pins={pins} /> : null}
          </PinPanel>
        ),
      }}
    />
  );
}
