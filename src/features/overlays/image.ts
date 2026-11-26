import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useStore } from '../../app/store-context';
import { overlayImage } from '../../data/overlays';
import type { ID } from '../../domain';

/** Longest edge kept: larger textures fail on many phones' GPUs. */
const MAX_EDGE = 4096;

/** Shrink a big photo to fit a map texture; small images pass through untouched. */
export async function prepareOverlayImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap === 'undefined') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  if (scale === 1) {
    bmp.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}

export interface LoadedImage {
  url: string;
  width: number;
  height: number;
}

/** An overlay's stored image as an object URL with its size; `undefined` while loading. */
export function useOverlayImage(imageId: ID | undefined): LoadedImage | undefined {
  const store = useStore();
  const blob = useLiveQuery(
    async () => (imageId ? ((await overlayImage(store, imageId)) ?? null) : null),
    [store, imageId],
  );
  const [img, setImg] = useState<LoadedImage>();
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    let live = true;
    const el = new Image();
    el.onload = () => {
      if (live) setImg({ url, width: el.naturalWidth, height: el.naturalHeight });
    };
    el.src = url;
    return () => {
      live = false;
      setImg(undefined);
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return img;
}
