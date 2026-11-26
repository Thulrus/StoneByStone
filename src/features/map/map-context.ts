/**
 * The live map and the MapLibre module, for layer components. Layers get the library from
 * here instead of importing it, so only the lazy `MapView` chunk pulls MapLibre in.
 */
import { createContext, useContext } from 'react';
import type * as MapLibre from 'maplibre-gl';

export interface MapHandle {
  map: MapLibre.Map;
  lib: typeof MapLibre;
}

export const MapContext = createContext<MapHandle | null>(null);

export function useMap(): MapHandle {
  const h = useContext(MapContext);
  if (!h) throw new Error('useMap() outside <MapView>');
  return h;
}

/** [west, south, east, north] */
export type Bounds = [number, number, number, number];

export interface MapCamera {
  center?: [number, number];
  zoom?: number;
  bounds?: Bounds;
  bearing?: number;
}
