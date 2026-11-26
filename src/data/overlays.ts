/** Image overlays: plat maps and drone orthophotos pinned onto the map (plan §7.4). */
import type { ControlPoint, ID, Overlay } from '../domain';
import { fitPins, type SourcePoint } from '../geo';
import type { Store } from './store';

/** Store an image and create its (unpinned) overlay, as one undoable step. */
export async function addImageOverlay(
  store: Store,
  cemeteryId: ID,
  image: Blob,
  name: string,
  kind: 'plat' | 'drone' = 'plat',
): Promise<Overlay> {
  return store.run('Add overlay', async (ctx) => {
    const imageId = store.newId();
    store.snapshot(ctx, 'overlayBlobs', imageId, undefined);
    await store.db.overlayBlobs.put({ id: imageId, blob: image });
    return store.overlays.create({
      cemeteryId,
      kind,
      name: name.trim() || 'Overlay',
      imageId,
      controlPoints: [],
      opacity: 0.7,
    });
  });
}

export async function overlayImage(store: Store, imageId: ID): Promise<Blob | undefined> {
  return (await store.db.overlayBlobs.get(imageId))?.blob;
}

/** Save control points and the fitted transform (≥3 points: least-squares affine). */
export async function pinImageOverlay(
  store: Store,
  overlay: Overlay,
  points: readonly SourcePoint[],
): Promise<Overlay> {
  const fit = points.length >= 3 ? fitPins(points) : undefined;
  if (!fit) throw new Error('Need at least three well-spread points');
  const controlPoints: ControlPoint[] = points.map(({ x, y, lng, lat }) => ({ x, y, lng, lat }));
  return store.overlays.update(overlay.id, { controlPoints, transform: [...fit.transform] });
}

/** RMS residual of an overlay's pins, in metres (the accuracy of stones placed on it). */
export function overlayErrorM(overlay: Overlay): number | undefined {
  return fitPins(overlay.controlPoints)?.rmsM;
}
