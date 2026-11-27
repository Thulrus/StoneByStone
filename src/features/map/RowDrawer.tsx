import { Trans, useLingui } from '@lingui/react/macro';
import type { Position } from 'geojson';
import { useCallback, useMemo, useState } from 'react';
import { useStore } from '../../app/store-context';
import type { Row } from '../../domain';
import { lineLength } from '../../geo';
import { Button } from '../../ui/Button';
import { GeoJsonLayer, MapTap, Pin } from './layers';
import { PREVIEW_LINE } from './map-style';

export interface RowDrawerProps {
  row: Row;
  rowName: string;
  onClose: () => void;
}

/**
 * Draw or edit a row line (plan §7.2): tap the start, then the end; extra taps add bends.
 * Points can be dragged. Saved as one undoable edit.
 */
export function RowDrawer({ row, rowName, onClose }: RowDrawerProps) {
  const { t } = useLingui();
  const store = useStore();
  const [points, setPoints] = useState<Position[]>(() => row.line?.coordinates ?? []);
  const add = useCallback((p: [number, number]) => setPoints((ps) => [...ps, p]), []);
  const line = useMemo(() => ({ type: 'LineString' as const, coordinates: points }), [points]);
  const lengthM = points.length >= 2 ? lineLength(points) : 0;

  const save = async () => {
    await store.rows.update(row.id, { line: { type: 'LineString', coordinates: points } });
    onClose();
  };
  const remove = async () => {
    await store.rows.update(row.id, { line: undefined });
    onClose();
  };

  return (
    <>
      <MapTap onTap={add} />
      {points.length >= 2 ? <GeoJsonLayer data={line} line={PREVIEW_LINE} /> : null}
      {points.map((p, i) => (
        <Pin
          key={i}
          lngLat={[p[0] ?? 0, p[1] ?? 0]}
          className="sbs-vertex"
          draggable
          onDragEnd={(q) => setPoints((ps) => ps.map((x, j) => (j === i ? q : x)))}
        />
      ))}
      <div className="absolute inset-x-2 top-2 z-10 flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-lg sm:end-auto sm:max-w-md">
        <p className="font-semibold">
          <Trans>Drawing {rowName}</Trans>
        </p>
        <p className="text-sm text-fg-muted" aria-live="polite">
          {points.length === 0
            ? t`Tap where the row starts.`
            : points.length === 1
              ? t`Now tap where the row ends.`
              : t`${Math.round(lengthM)} m. Tap to add a bend, or drag a point to adjust.`}
        </p>
        {/* Tighter on phones, so the buttons keep to one line and the card covers less map. */}
        <div className="flex flex-wrap gap-2 max-sm:[&>button]:px-3">
          <Button
            variant="secondary"
            disabled={points.length === 0}
            onClick={() => setPoints((ps) => ps.slice(0, -1))}
          >
            <Trans>Undo point</Trans>
          </Button>
          {row.line ? (
            <Button variant="ghost" onClick={() => void remove()}>
              <Trans>Remove line</Trans>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button disabled={points.length < 2} onClick={() => void save()}>
            <Trans>Save line</Trans>
          </Button>
        </div>
      </div>
    </>
  );
}
