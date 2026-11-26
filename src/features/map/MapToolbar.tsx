import { useLingui } from '@lingui/react/macro';
import type { LineString } from 'geojson';
import { horizontalBearingFor, meanAxisBearing } from '../../geo';
import { Button } from '../../ui/Button';
import { useMap } from './map-context';

export interface MapToolbarProps {
  /** Lines of the active row, or of all rows. */
  lines: readonly LineString[];
  onImagery: () => void;
}

/** Floating map buttons: imagery choice and "rows horizontal" rotation (plan §7.1). */
export function MapToolbar({ lines, onImagery }: MapToolbarProps) {
  const { t } = useLingui();
  const { map } = useMap();
  const axis = meanAxisBearing(lines.map((l) => l.coordinates));

  const rotate = () => {
    if (axis === undefined) return;
    map.easeTo({ bearing: horizontalBearingFor(axis, map.getBearing()), duration: 500 });
  };

  return (
    <div className="absolute bottom-10 end-2 z-10 flex flex-col items-end gap-2">
      <Button variant="secondary" className="shadow" onClick={onImagery}>
        {t`Imagery`}
      </Button>
      <Button
        variant="secondary"
        className="shadow"
        disabled={axis === undefined}
        title={axis === undefined ? t`Draw a row line first` : undefined}
        onClick={rotate}
      >
        {t`Rows horizontal`}
      </Button>
    </div>
  );
}
