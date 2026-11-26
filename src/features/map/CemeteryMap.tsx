import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import type { Cemetery, ID, Row } from '../../domain';
import { cameraFor } from './camera';
import { resolveProvider } from './imagery';
import { useImagerySettings } from './imagery-settings';
import { ImageryPicker } from './ImageryPicker';
import { LazyMap } from './LazyMap';
import { MapToolbar } from './MapToolbar';
import { RowDrawer } from './RowDrawer';
import { BoundaryLayer, RowsLayer } from './RowsLayer';

export interface CemeteryMapProps {
  cemetery: Cemetery;
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  activeRowId?: ID;
  onSelectRow?: (id: ID) => void;
  /** When set, the map is in draw mode for this row. */
  drawRowId?: ID;
  onDrawClose?: () => void;
}

/** The cemetery map: imagery, boundary, rows, and the row-line drawing tool. */
export function CemeteryMap(props: CemeteryMapProps) {
  const { cemetery, rows, labelOf, activeRowId, onSelectRow, drawRowId, onDrawClose } = props;
  const { t } = useLingui();
  const settings = useImagerySettings();
  const [picker, setPicker] = useState(false);
  // The camera is computed once per cemetery, so edits don't make the map jump.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const camera = useMemo(() => cameraFor(cemetery, rows), [cemetery.id]);
  if (!settings) return null;

  const provider = resolveProvider(
    cemetery.settings.imagery,
    cemetery.location,
    settings.custom,
    settings.keys,
  );
  const drawRow = rows.find((r) => r.id === drawRowId);
  const focus = rows.filter((r) => r.line && (!activeRowId || r.id === activeRowId));

  return (
    <div className="relative h-full">
      <LazyMap
        provider={provider}
        keys={settings.keys}
        camera={camera}
        units={cemetery.settings.units}
        label={t`Map of ${cemetery.name}`}
      >
        {cemetery.boundary ? <BoundaryLayer boundary={cemetery.boundary} /> : null}
        <RowsLayer
          rows={drawRow ? rows.filter((r) => r.id !== drawRow.id) : rows}
          activeId={activeRowId}
          labelOf={labelOf}
          onSelect={drawRow ? undefined : onSelectRow}
        />
        {drawRow ? (
          <RowDrawer
            key={drawRow.id}
            row={drawRow}
            rowName={labelOf(drawRow)}
            onClose={() => onDrawClose?.()}
          />
        ) : (
          <MapToolbar
            lines={focus.flatMap((r) => (r.line ? [r.line] : []))}
            onImagery={() => setPicker(true)}
          />
        )}
      </LazyMap>
      <ImageryPicker
        open={picker}
        onOpenChange={setPicker}
        cemetery={cemetery}
        current={provider}
        settings={settings}
      />
    </div>
  );
}
