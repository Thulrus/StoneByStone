import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { currentLocation } from '../cemeteries/create/osm-client';
import { useMap } from './map-context';

/** Fly the map to the device's position (one GPS fix, on tap only). */
export function LocateButton() {
  const { t } = useLingui();
  const { map } = useMap();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const at = await currentLocation();
      map.flyTo({ center: [at.lng, at.lat], zoom: Math.max(map.getZoom(), 18) });
    } catch {
      toast({ title: t`Couldn't get your location`, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      variant="secondary"
      className="absolute start-2 top-2 z-10 shadow"
      disabled={busy}
      onClick={() => void go()}
    >
      {t`My location`}
    </Button>
  );
}
