import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Link } from 'react-router';
import { cemeteryPath } from '../../../app/paths';
import { useStore } from '../../../app/store-context';
import { placeStone } from '../../../data/placement';
import { clearPosition } from '../../../data/stone-edit';
import type { MapFeature, Monument, PositionSource, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { HoldStill } from '../../capture/HoldStill';
import { RelativePlacer } from '../RelativePlacer';
import { SOURCE_LABEL } from './labels';

export interface PositionSectionProps {
  stone: Monument;
  stones: readonly Monument[];
  features: readonly MapFeature[];
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  units: 'metric' | 'imperial';
}

/** Where the stone is and how we know (plan §7): every placement method, and undoing it. */
export function PositionSection(props: PositionSectionProps) {
  const { stone, rows } = props;
  const { t } = useLingui();
  const store = useStore();
  const [dialog, setDialog] = useState<'hold' | 'relative'>();
  const p = stone.position;
  const row = rows.find((r) => r.id === stone.address?.rowId);
  const inRow = Boolean(row);
  const source = p ? t(SOURCE_LABEL[p.source as PositionSource]) : '';
  const acc = p?.accuracyM === undefined ? undefined : Math.round(p.accuracyM * 10) / 10;
  return (
    <section aria-labelledby="stone-position" className="flex flex-col gap-3">
      <h2 id="stone-position" className="text-xl font-semibold">
        <Trans>Position</Trans>
      </h2>
      {p ? (
        <p>
          {acc === undefined ? (
            <Trans>From {source}</Trans>
          ) : (
            <Trans>
              From {source}, within about ±{acc} m
            </Trans>
          )}
          <span className="block text-sm text-fg-muted">
            {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
          </span>
        </p>
      ) : (
        <p className="text-fg-muted">
          <Trans>Not placed on the map yet.</Trans>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setDialog('hold')}>
          <Trans>Hold still here (GPS)</Trans>
        </Button>
        <Button variant="secondary" onClick={() => setDialog('relative')}>
          <Trans>Place relative to…</Trans>
        </Button>
        <Link
          to={`${cemeteryPath(stone.cemeteryId)}?place=${encodeURIComponent(stone.id)}`}
          className="inline-flex min-h-12 items-center rounded-lg bg-surface-2 px-4 sbs-border"
        >
          <Trans>Place on the map</Trans>
        </Link>
        {p && (p.source !== 'row-interpolated' || !inRow) ? (
          <Button variant="ghost" onClick={() => void clearPosition(store, stone.id)}>
            {inRow ? <Trans>Back to its row position</Trans> : <Trans>Remove position</Trans>}
          </Button>
        ) : null}
      </div>
      <HoldStill
        open={dialog === 'hold'}
        onOpenChange={(o) => setDialog(o ? 'hold' : undefined)}
        line={row?.line?.coordinates as [number, number][] | undefined}
        onUse={(position) => {
          setDialog(undefined);
          void placeStone(store, stone.id, position);
        }}
      />
      <RelativePlacer
        {...props}
        open={dialog === 'relative'}
        onOpenChange={(o) => setDialog(o ? 'relative' : undefined)}
      />
    </section>
  );
}
