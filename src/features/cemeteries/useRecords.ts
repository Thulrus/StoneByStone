import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import type { ID, MapFeature, Overlay } from '../../domain';

/** Live overlays (plats, the v1 grid) of a cemetery; `undefined` while loading. */
export function useOverlays(cemeteryId: ID): Overlay[] | undefined {
  const store = useStore();
  return useLiveQuery(() => store.overlays.listByCemetery(cemeteryId), [store, cemeteryId]);
}

/** Live map features of a cemetery; `undefined` while loading. */
export function useFeatures(cemeteryId: ID): MapFeature[] | undefined {
  const store = useStore();
  return useLiveQuery(() => store.features.listByCemetery(cemeteryId), [store, cemeteryId]);
}
