/** Map overlays drawn from GeoJSON. They get MapLibre from context, never by import. */
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { useEffect, useId } from 'react';
import { useMap } from './map-context';

type Paint = Record<string, unknown>;

export interface GeoJsonLayerProps {
  data: FeatureCollection | Feature | Geometry;
  fill?: Paint;
  line?: Paint;
  circle?: Paint;
}

/** One GeoJSON source with optional fill, line and circle layers on top of the imagery. */
export function GeoJsonLayer({ data, fill, line, circle }: GeoJsonLayerProps) {
  const { map } = useMap();
  const id = `g${useId().replaceAll(':', '')}`;

  useEffect(() => {
    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    if (fill) map.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: fill });
    if (line) {
      map.addLayer({
        id: `${id}-line`,
        type: 'line',
        source: id,
        paint: line,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    }
    if (circle) map.addLayer({ id: `${id}-circle`, type: 'circle', source: id, paint: circle });
    return () => {
      if (!map.getStyle()) return; // map already removed
      for (const suffix of ['fill', 'line', 'circle']) {
        if (map.getLayer(`${id}-${suffix}`)) map.removeLayer(`${id}-${suffix}`);
      }
      if (map.getSource(id)) map.removeSource(id);
    };
    // Paint objects are fixed per layer; changing them needs a remount (use `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id]);

  useEffect(() => {
    const src = map.getSource(id);
    if (src && 'setData' in src) (src as { setData(d: unknown): void }).setData(data);
  }, [map, id, data]);

  return null;
}

export interface PinProps {
  lngLat: [number, number];
  label?: string;
  draggable?: boolean;
  onDragEnd?: (lngLat: [number, number]) => void;
  className?: string;
  onClick?: () => void;
}

/** An HTML marker: a pin, a draggable vertex, or a text label. */
export function Pin({ lngLat, label, draggable, onDragEnd, className, onClick }: PinProps) {
  const { map, lib } = useMap();
  const [lng, lat] = lngLat;

  useEffect(() => {
    const el = document.createElement('div');
    el.className = className ?? 'sbs-pin';
    if (label) el.textContent = label;
    if (onClick) {
      el.setAttribute('role', 'button');
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    const m = new lib.Marker({ element: el, draggable: Boolean(draggable) })
      .setLngLat([lng, lat])
      .addTo(map);
    if (onDragEnd) {
      m.on('dragend', () => {
        const p = m.getLngLat();
        onDragEnd([p.lng, p.lat]);
      });
    }
    return () => {
      m.remove();
    };
    // Callbacks are taken from the render that created the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lib, lng, lat, label, draggable, className]);

  return null;
}

/** Calls `onTap` with the tapped [lng, lat] while mounted. */
export function MapTap({ onTap }: { onTap: (lngLat: [number, number]) => void }) {
  const { map } = useMap();
  useEffect(() => {
    const h = (e: { lngLat: { lng: number; lat: number } }) => onTap([e.lngLat.lng, e.lngLat.lat]);
    map.on('click', h);
    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    return () => {
      map.off('click', h);
      canvas.style.cursor = '';
    };
  }, [map, onTap]);
  return null;
}
