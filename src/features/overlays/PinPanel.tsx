import { Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Button } from '../../ui/Button';
import type { Pins } from './usePins';

export interface PinPanelProps {
  pins: Pins;
  /** What is being pinned, e.g. "grid cell" or "point on the image". */
  sourceHint: string;
  /** The picker for source points (grid or image). */
  children: ReactNode;
  minPoints: number;
  busy?: boolean;
  onApply: () => void;
  onCancel: () => void;
}

/** Steps, residuals and apply/cancel for a pinning session. */
export function PinPanel(props: PinPanelProps) {
  const { pins, sourceHint, children, minPoints, busy, onApply, onCancel } = props;
  const { t, i18n } = useLingui();
  const m = (v: number) =>
    new Intl.NumberFormat(i18n.locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(v);
  const n = pins.points.length + 1;
  const rms = pins.fit ? m(pins.fit.rmsM) : undefined;

  return (
    <div className="flex flex-col gap-3 p-3">
      <p role="status" className="font-medium">
        {pins.pending
          ? t`Now tap the same spot on the map for point ${n}.`
          : t`Pick a ${sourceHint} for point ${n}, then tap the same spot on the map.`}
      </p>
      {children}
      {pins.points.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {pins.points.map((_, i) => {
            const r = pins.fit?.residuals[i];
            const num = i + 1;
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="flex-1">
                  {r === undefined || pins.points.length < 3
                    ? t`Point ${num}`
                    : t`Point ${num}: off by ${m(r)} m`}
                </span>
                <Button variant="ghost" onClick={() => pins.remove(i)}>
                  {t`Remove point ${num}`}
                </Button>
              </li>
            );
          })}
        </ol>
      ) : null}
      {rms !== undefined && pins.points.length >= 3 ? (
        <p>
          <Trans>Average error: {rms} m</Trans>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!pins.fit || pins.points.length < minPoints || busy} onClick={onApply}>
          <Trans>Apply</Trans>
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  );
}
