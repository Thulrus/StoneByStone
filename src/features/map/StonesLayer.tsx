import type { MapMouseEvent } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import type { ID, Monument } from '../../domain';
import { stonesGeoJson } from '../stones/stones-geojson';
import { useMap } from './map-context';
import { STONE_ICON_SIZE, STONE_SELECTED } from './map-style';
import { addStoneIcons, ICON_PREFIX } from './stone-icons';

const SRC = 'sbs-stones';
const ICONS = 'sbs-stones-icons';
const SELECTED = 'sbs-stones-selected';
/** Half the tap box, px: glove-sized (plan §17). */
const HIT = 18;

export interface StonesLayerProps {
  stones: readonly Monument[];
  selectedId?: ID;
  /** Omit to make stones untappable (e.g. while drawing a row). */
  onSelect?: (id: ID) => void;
}

/**
 * All stones as one GeoJSON source drawn by WebGL, so 10,000 stones stay smooth (plan §17).
 * Status is shown by icon shape and colour.
 */
export function StonesLayer({ stones, selectedId, onSelect }: StonesLayerProps) {
  const { map } = useMap();
  const data = useMemo(() => stonesGeoJson(stones), [stones]);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    addStoneIcons(map);
    map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: SELECTED,
      type: 'circle',
      source: SRC,
      filter: ['==', ['get', 'id'], ''],
      paint: STONE_SELECTED,
    });
    map.addLayer({
      id: ICONS,
      type: 'symbol',
      source: SRC,
      layout: {
        'icon-image': ['concat', ICON_PREFIX, ['get', 'status']],
        'icon-size': STONE_ICON_SIZE,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
    const click = (e: MapMouseEvent) => {
      if (!select.current) return;
      const { x, y } = e.point;
      const hits = map.queryRenderedFeatures(
        [
          [x - HIT, y - HIT],
          [x + HIT, y + HIT],
        ],
        { layers: [ICONS] },
      );
      // Nearest to the tap wins.
      let best: { id: ID; d: number } | undefined;
      for (const f of hits) {
        if (f.geometry.type !== 'Point') continue;
        const p = map.project(f.geometry.coordinates as [number, number]);
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        const id = f.properties.id as ID;
        if (!best || d < best.d) best = { id, d };
      }
      if (best) select.current(best.id);
    };
    map.on('click', click);
    return () => {
      map.off('click', click);
      if (!map.getStyle()) return;
      for (const l of [ICONS, SELECTED]) if (map.getLayer(l)) map.removeLayer(l);
      if (map.getSource(SRC)) map.removeSource(SRC);
    };
  }, [map]);

  useEffect(() => {
    const src = map.getSource(SRC);
    if (src && 'setData' in src) (src as { setData(d: unknown): void }).setData(data);
  }, [map, data]);

  useEffect(() => {
    if (map.getLayer(SELECTED)) map.setFilter(SELECTED, ['==', ['get', 'id'], selectedId ?? '']);
  }, [map, selectedId]);

  return null;
}
