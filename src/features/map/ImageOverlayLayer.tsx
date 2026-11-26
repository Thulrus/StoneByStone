import { useEffect, useId } from 'react';
import { cornersOf, type Affine } from '../../geo';
import { useMap } from './map-context';

export interface ImageOverlayLayerProps {
  url: string;
  width: number;
  height: number;
  transform: Affine;
  opacity: number;
}

/** A pinned image (plat, drone photo) drawn just above the imagery, under rows and stones. */
export function ImageOverlayLayer({
  url,
  width,
  height,
  transform,
  opacity,
}: ImageOverlayLayerProps) {
  const { map } = useMap();
  const id = `img${useId().replaceAll(':', '')}`;
  const coordinates = cornersOf(transform, width, height) as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  const key = JSON.stringify(coordinates);

  useEffect(() => {
    map.addSource(id, { type: 'image', url, coordinates });
    const layers = map.getStyle().layers;
    const i = layers.findIndex((l) => l.id === 'imagery');
    map.addLayer(
      {
        id,
        type: 'raster',
        source: id,
        paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 },
      },
      layers[i + 1]?.id,
    );
    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
    // Coordinates and opacity are updated in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id, url]);

  useEffect(() => {
    const src = map.getSource(id);
    if (src && 'setCoordinates' in src) {
      (src as { setCoordinates(c: unknown): void }).setCoordinates(JSON.parse(key));
    }
  }, [map, id, key]);

  useEffect(() => {
    if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', opacity);
  }, [map, id, opacity]);

  return null;
}
