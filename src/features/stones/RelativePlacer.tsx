import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useStore } from '../../app/store-context';
import { placeStone } from '../../data/placement';
import type { MapFeature, Monument, Row } from '../../domain';
import { COMPASS_ERROR_DEG, relativePosition, ROW_ERROR_DEG, rowBearingAt } from '../../geo';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/toast-store';
import { FEATURE_LABEL } from './attribute-labels';
import { relativeRefs, type RelativeRef } from './relative-refs';

const FT = 0.3048;
type RowDir = 'ahead' | 'back' | 'left' | 'right';
const ROW_TURN: Record<RowDir, number> = { ahead: 0, back: 180, left: -90, right: 90 };

export interface RelativePlacerProps {
  stone: Monument;
  stones: readonly Monument[];
  features: readonly MapFeature[];
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  units: 'metric' | 'imperial';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Place relative to…" (plan §7.6): pick a reference, a distance and a direction; no typing. */
export function RelativePlacer(props: RelativePlacerProps) {
  const { stone, stones, features, rows, labelOf, units, open, onOpenChange } = props;
  const { t } = useLingui();
  const store = useStore();
  const refs = useMemo(
    () => (open ? relativeRefs(stone, stones, features, rows) : []),
    [open, stone, stones, features, rows],
  );
  const [refId, setRefId] = useState<string>();
  const ref = refs.find((r) => r.id === refId) ?? refs[0];
  const imperial = units === 'imperial';
  const steps = imperial ? [2, 3, 5, 7, 10, 15, 30] : [0.5, 1, 1.5, 2, 3, 5, 10];
  const step = imperial ? 1 : 0.5;
  const [amount, setAmount] = useState(imperial ? 5 : 2);
  const [dir, setDir] = useState<number | RowDir>();

  const nameOf = (r: RelativeRef) => {
    if (r.kind === 'feature' && r.feature) {
      const kind = t(FEATURE_LABEL[r.feature.kind]);
      return r.feature.name ? `${kind}: ${r.feature.name}` : kind;
    }
    if (r.row) {
      const rowName = labelOf(r.row);
      const n = (r.rowIndex ?? 0) + 1;
      return t`Row ${rowName}, stone ${n}`;
    }
    return t`Stone`;
  };

  const place = async () => {
    if (!ref || dir === undefined) return;
    const rowDir = typeof dir === 'string';
    const bearing = rowDir
      ? rowBearingAt(ref.rowLine ?? [], [ref.lng, ref.lat]) + ROW_TURN[dir]
      : dir;
    const p = relativePosition({
      from: ref,
      distanceM: imperial ? amount * FT : amount,
      bearingDeg: bearing,
      directionErrorDeg: rowDir ? ROW_ERROR_DEG : COMPASS_ERROR_DEG,
    });
    await placeStone(store, stone.id, { ...p, source: 'relative' });
    onOpenChange(false);
    toast({
      title: t`Stone placed relative to ${nameOf(ref)}`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  const unit = imperial ? t`ft` : t`m`;
  const pick = (value: number | RowDir, label: string) => (
    <button
      key={String(value)}
      type="button"
      aria-pressed={dir === value}
      onClick={() => setDir(value)}
      className={cn(
        'min-h-12 rounded-lg px-3',
        dir === value ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
      )}
    >
      {label}
    </button>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t`Place relative to…`}
      actions={
        <Button size="lg" disabled={!ref || dir === undefined} onClick={() => void place()}>
          <Trans>Place stone</Trans>
        </Button>
      }
    >
      {refs.length === 0 ? (
        <p>
          <Trans>Nothing nearby is placed yet. Place a stone or a landmark first.</Trans>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-medium">
              <Trans>From</Trans>
            </span>
            <select
              className="min-h-12 rounded-lg bg-surface-2 px-3 text-lg"
              value={ref?.id}
              onChange={(e) => setRefId(e.currentTarget.value)}
            >
              {refs.map((r) => (
                <option key={r.id} value={r.id}>
                  {nameOf(r)}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">
              <Trans>
                How far: {amount} {unit}
              </Trans>
            </legend>
            <div className="flex flex-wrap gap-2">
              {steps.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={amount === n}
                  onClick={() => setAmount(n)}
                  className={cn(
                    'min-h-12 min-w-12 rounded-lg px-3',
                    amount === n ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
                  )}
                >
                  {n}
                </button>
              ))}
              <Button
                variant="secondary"
                aria-label={t`Less`}
                onClick={() => setAmount((a) => Math.max(0, a - step))}
              >
                −
              </Button>
              <Button
                variant="secondary"
                aria-label={t`More`}
                onClick={() => setAmount((a) => a + step)}
              >
                +
              </Button>
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">
              <Trans>Which way</Trans>
            </legend>
            {ref?.rowLine ? (
              <div className="grid grid-cols-2 gap-2">
                {pick('ahead', t`Further along the row`)}
                {pick('back', t`Back along the row`)}
                {pick('left', t`Left of the row`)}
                {pick('right', t`Right of the row`)}
              </div>
            ) : null}
            <div className="grid grid-cols-4 gap-2">
              {[t`N`, t`NE`, t`E`, t`SE`, t`S`, t`SW`, t`W`, t`NW`].map((c, i) => pick(i * 45, c))}
            </div>
          </fieldset>
        </div>
      )}
    </Sheet>
  );
}
