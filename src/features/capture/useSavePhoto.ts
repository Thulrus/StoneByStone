import { useLingui } from '@lingui/react/macro';
import { useCallback } from 'react';
import { useStore } from '../../app/store-context';
import type { Store } from '../../data/store';
import type { ID, Photo, PhotoRole, Position } from '../../domain';
import { toast } from '../../ui/toast-store';
import type { ProcessedPhoto } from './pipeline';
import { processPhotoFile } from './process';

/** Run the pipeline at the cemetery's photo size. */
export async function processForCemetery(
  store: Store,
  cemeteryId: ID,
  raw: Blob,
): Promise<ProcessedPhoto> {
  const c = await store.cemeteries.get(cemeteryId);
  return processPhotoFile(raw, { maxPx: c?.settings.photoMaxPx ?? 1600 });
}

/** Fields of a `NewPhoto` that come from the pipeline. */
export function photoFields(p: ProcessedPhoto, role: PhotoRole, at = new Date()) {
  const position: Position | undefined = p.gps
    ? {
        lng: p.gps.lng,
        lat: p.gps.lat,
        source: 'gps',
        ...(p.gps.accuracyM ? { accuracyM: p.gps.accuracyM } : {}),
      }
    : undefined;
  return {
    role,
    full: p.full,
    thumb: p.thumb,
    width: p.width,
    height: p.height,
    sha256: p.sha256,
    phash: p.phash,
    takenAt: p.takenAt ?? at.toISOString(),
    ...(position ? { position } : {}),
  };
}

/** Add a photo to an existing stone, with an Undo toast. */
export function useSavePhoto() {
  const store = useStore();
  const { t } = useLingui();
  return useCallback(
    async (monumentId: ID, raw: Blob, role: PhotoRole): Promise<Photo | undefined> => {
      try {
        const m = await store.monuments.get(monumentId);
        if (!m) return undefined;
        const processed = await processForCemetery(store, m.cemeteryId, raw);
        const { addPhoto } = await import('../../data/photos');
        const photo = await addPhoto(store, { monumentId, ...photoFields(processed, role) });
        toast({
          title: t`Photo added`,
          action: { label: t`Undo`, onAction: () => void store.undo() },
        });
        return photo;
      } catch {
        toast({ title: t`Couldn't read that photo`, tone: 'error' });
        return undefined;
      }
    },
    [store, t],
  );
}
