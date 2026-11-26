import { useLingui } from '@lingui/react/macro';
import type { MultiPolygon, Polygon } from 'geojson';
import { useEffect } from 'react';
import type { LngLat } from '../../../domain';
import { bboxOf } from '../../../geo';
import { resolveProvider } from '../../map/imagery';
import { useImagerySettings } from '../../map/imagery-settings';
import { LazyMap } from '../../map/LazyMap';
import { MapTap, Pin } from '../../map/layers';
import { useMap } from '../../map/map-context';
import { BoundaryLayer } from '../../map/RowsLayer';

export interface PlaceMapProps {
  location?: LngLat;
  boundary?: Polygon | MultiPolygon;
  onPin: (at: LngLat) => void;
}

/** Fly to the chosen place whenever it changes. */
function FollowPlace({ location, boundary }: Omit<PlaceMapProps, 'onPin'>) {
  const { map } = useMap();
  const box = boundary ? bboxOf([boundary]) : undefined;
  const key = box ? box.join(',') : location ? `${location.lng},${location.lat}` : '';
  useEffect(() => {
    if (box) map.fitBounds(box, { padding: 32, maxZoom: 19, duration: 600 });
    else if (location)
      map.flyTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 17) });
    // Only when the place itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Map for setup: shows the chosen place; tap anywhere to drop (or move) the pin. */
export function PlaceMap({ location, boundary, onPin }: PlaceMapProps) {
  const { t } = useLingui();
  const settings = useImagerySettings();
  if (!settings) return null;
  const provider = resolveProvider(undefined, location, settings.custom, settings.keys);
  return (
    <LazyMap
      provider={provider}
      keys={settings.keys}
      camera={
        location
          ? { center: [location.lng, location.lat], zoom: 17 }
          : { center: [-95, 39], zoom: 3 }
      }
      label={t`Map: tap to place the cemetery`}
    >
      {boundary ? <BoundaryLayer boundary={boundary} /> : null}
      {location ? (
        <Pin
          lngLat={[location.lng, location.lat]}
          draggable
          onDragEnd={([lng, lat]) => onPin({ lng, lat })}
        />
      ) : null}
      <MapTap onTap={([lng, lat]) => onPin({ lng, lat })} />
      <FollowPlace location={location} boundary={boundary} />
    </LazyMap>
  );
}
