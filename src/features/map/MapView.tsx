/**
 * MapLibre wrapper (plan §7.1). Loaded lazily through `LazyMap`; never import this file
 * directly from the shell.
 */
import * as maplibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 looks for its worker next to its own module, which bundling breaks: point it at
// the emitted asset. Without the worker, GeoJSON layers (boundaries, rows) never render.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MAP_BACKGROUND as BACKGROUND,
  tileUrls,
  type ImageryKeys,
  type ImageryProvider,
} from './imagery';
import { MapContext, type MapCamera, type MapHandle } from './map-context';
import { loadTile, OFFLINE_PROTOCOL, offlineTemplate, registerOfflineProvider } from './offline';

export interface MapViewProps {
  provider: ImageryProvider;
  keys: ImageryKeys;
  camera: MapCamera;
  /** Accessible name for the map region. */
  label: string;
  units?: 'metric' | 'imperial';
  onError?: (e: Error) => void;
  children?: ReactNode;
}

maplibre.setWorkerUrl(workerUrl);
// Offline-capable imagery goes through this loader, which reads downloaded tiles first.
maplibre.addProtocol(OFFLINE_PROTOCOL, async (params, ac) => ({
  data: await loadTile(params.url, ac.signal),
}));

const IMAGERY = 'imagery';

function setImagery(map: maplibre.Map, provider: ImageryProvider, keys: ImageryKeys) {
  if (map.getLayer(IMAGERY)) map.removeLayer(IMAGERY);
  if (map.getSource(IMAGERY)) map.removeSource(IMAGERY);
  if (provider.allowsOffline) registerOfflineProvider(provider);
  map.addSource(IMAGERY, {
    type: 'raster',
    tiles: provider.allowsOffline ? [offlineTemplate(provider.id)] : tileUrls(provider, keys),
    tileSize: provider.tileSize,
    maxzoom: provider.maxzoom,
    attribution: provider.attribution,
  });
  // Imagery sits directly above the background, under every overlay.
  const above = map.getStyle().layers.find((l) => l.id !== 'background')?.id;
  map.addLayer({ id: IMAGERY, type: 'raster', source: IMAGERY }, above);
}

export default function MapView({
  provider,
  keys,
  camera,
  label,
  units = 'metric',
  onError,
  children,
}: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const [handle, setHandle] = useState<MapHandle>();
  const first = useRef({ provider, keys, camera, units, onError });

  useEffect(() => {
    const init = first.current;
    let map: maplibre.Map;
    try {
      map = new maplibre.Map({
        container: el.current as HTMLDivElement,
        style: {
          version: 8,
          sources: {},
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': BACKGROUND } },
          ],
        },
        center: init.camera.center ?? [0, 20],
        zoom: init.camera.zoom ?? 1.5,
        bearing: init.camera.bearing ?? 0,
        bounds: init.camera.bounds,
        fitBoundsOptions: { padding: 32, maxZoom: 19 },
        maxZoom: 22,
        maxPitch: 0,
        attributionControl: false,
        dragRotate: true,
        touchPitch: false,
      });
    } catch (e) {
      // No WebGL, most likely. The schematic view (WP5) works without a map.
      init.onError?.(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    map.addControl(new maplibre.AttributionControl({ compact: false }), 'bottom-right');
    map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new maplibre.ScaleControl({ unit: init.units }), 'bottom-left');
    map.on('error', () => {
      // Missing tiles (offline, outside coverage) are expected; keep the map usable.
    });
    map.once('load', () => {
      setImagery(map, init.provider, init.keys);
      setHandle({ map, lib: maplibre });
    });
    return () => {
      setHandle(undefined);
      map.remove();
    };
  }, []);

  const tileKey = tileUrls(provider, keys).join(' ');
  useEffect(() => {
    if (handle && handle.map.getSource(IMAGERY)) setImagery(handle.map, provider, keys);
    // Re-run only when the actual tile source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, provider.id, tileKey]);

  return (
    <div className="relative h-full min-h-64 w-full">
      {/* Inline style: MapLibre's unlayered CSS (`.maplibregl-map { position: relative }`)
          beats Tailwind's layered utilities. */}
      <div ref={el} role="region" aria-label={label} style={{ position: 'absolute', inset: 0 }} />
      {handle ? <MapContext.Provider value={handle}>{children}</MapContext.Provider> : null}
    </div>
  );
}
