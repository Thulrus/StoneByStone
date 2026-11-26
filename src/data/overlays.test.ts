// @vitest-environment node
import { expect, test } from 'vitest';
import { addImageOverlay, overlayErrorM, overlayImage, pinImageOverlay } from './overlays';
import { freshStore } from './test/helpers';

test('an image overlay is stored, pinned with residuals, and undoable', async () => {
  const { store } = await freshStore();
  const o = await addImageOverlay(store, 'c1', new Blob(['img']), ' Plat 1890 ');
  expect(o).toMatchObject({ name: 'Plat 1890', kind: 'plat', opacity: 0.7, controlPoints: [] });
  expect(await (await overlayImage(store, o.imageId!))?.text()).toBe('img');

  const pts = [
    { x: 0, y: 0, lng: -72.6, lat: 43.5 },
    { x: 1000, y: 0, lng: -72.599, lat: 43.5 },
    { x: 0, y: 800, lng: -72.6, lat: 43.4993 },
    { x: 1000, y: 800, lng: -72.59899, lat: 43.4993 },
  ];
  await expect(pinImageOverlay(store, o, pts.slice(0, 2))).rejects.toThrow();
  const pinned = await pinImageOverlay(store, o, pts);
  expect(pinned.transform).toHaveLength(6);
  expect(overlayErrorM(pinned)).toBeGreaterThan(0);
  expect(overlayErrorM(pinned)).toBeLessThan(1);

  await store.undo(); // pin
  await store.undo(); // add
  expect(await store.overlays.get(o.id)).toBeUndefined();
  expect(await overlayImage(store, o.imageId!)).toBeUndefined();
});
