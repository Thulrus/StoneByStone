import { useLingui } from '@lingui/react/macro';
import { useMemo, useState, type ReactNode } from 'react';
import type { Cemetery, ID, Monument, Row } from '../../domain';
import { StatusLegend } from '../stones/StatusLegend';
import { cameraFor } from './camera';
import { resolveProvider } from './imagery';
import { useImagerySettings } from './imagery-settings';
import { ImageryPicker } from './ImageryPicker';
import { LazyMap } from './LazyMap';
import { MapToolbar } from './MapToolbar';
import { RowDrawer } from './RowDrawer';
import { BoundaryLayer, RowsLayer } from './RowsLayer';
import { StonesLayer } from './StonesLayer';

export interface CemeteryMapProps {
  cemetery: Cemetery;
  rows: readonly Row[];
  stones: readonly Monument[];
  selectedStoneId?: ID;
  onSelectStone?: (id: ID) => void;
  labelOf: (r: Row) => string;
  activeRowId?: ID;
  onSelectRow?: (id: ID) => void;
  /** When set, the map is in draw mode for this row. */
  drawRowId?: ID;
  onDrawClose?: () => void;
  /** A pinning session: layers for the map and a panel shown under it. */
  tool?: { map: ReactNode; panel: ReactNode };
}

/** The cemetery map: imagery, boundary, rows, and the row-line drawing tool. */
export function CemeteryMap(props: CemeteryMapProps) {
  const { cemetery, rows, stones, labelOf, activeRowId, onSelectRow, drawRowId, onDrawClose } =
    props;
  const { t } = useLingui();
  const settings = useImagerySettings();
  const [picker, setPicker] = useState(false);
  // The camera is computed once per cemetery, so edits don't make the map jump.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const camera = useMemo(() => cameraFor(cemetery, rows, stones), [cemetery.id]);
  if (!settings) return null;

  const provider = resolveProvider(
    cemetery.settings.imagery,
    cemetery.location,
    settings.custom,
    settings.keys,
  );
  const tool = props.tool;
  const drawRow = tool ? undefined : rows.find((r) => r.id === drawRowId);
  const busy = Boolean(tool ?? drawRow);
  const focus = rows.filter((r) => r.line && (!activeRowId || r.id === activeRowId));

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
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
            onSelect={busy ? undefined : onSelectRow}
          />
          <StonesLayer
            stones={stones}
            selectedId={props.selectedStoneId}
            onSelect={busy ? undefined : props.onSelectStone}
          />
          {tool?.map}
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
        {stones.length > 0 && !tool ? (
          <StatusLegend className="absolute start-2 top-2 z-10 flex flex-col gap-1 rounded-lg bg-surface/90 p-2 shadow" />
        ) : null}
      </div>
      {tool ? <div className="max-h-[45%] overflow-y-auto">{tool.panel}</div> : null}
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
