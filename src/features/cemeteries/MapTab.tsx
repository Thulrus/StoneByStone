import type { ID, Overlay } from '../../domain';
import { CemeteryMap, type CemeteryMapProps } from '../map/CemeteryMap';
import { GridPinWorkspace } from '../overlays/GridPinWorkspace';
import { ImagePinWorkspace } from '../overlays/ImagePinWorkspace';

export interface MapTabProps extends Omit<CemeteryMapProps, 'tool'> {
  overlays: readonly Overlay[];
  /** Overlay being pinned, if any. */
  pinId?: ID;
  onPinDone: () => void;
}

/** The map, or a pinning session on it. */
export function MapTab({ overlays, pinId, onPinDone, ...map }: MapTabProps) {
  const pinning = overlays.find((o) => o.id === pinId);
  if (pinning?.kind === 'legacy-grid') {
    return <GridPinWorkspace key={pinning.id} grid={pinning} onDone={onPinDone} {...map} />;
  }
  if (pinning) {
    return (
      <ImagePinWorkspace
        key={pinning.id}
        overlay={pinning}
        onDone={onPinDone}
        overlays={overlays}
        {...map}
      />
    );
  }
  return <CemeteryMap {...map} overlays={overlays} />;
}
