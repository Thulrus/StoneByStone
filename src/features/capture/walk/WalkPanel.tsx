import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useStore } from '../../../app/store-context';
import { endRowHere, getRowStart, rowStones, setRowStart } from '../../../data/walk';
import type { ID, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';
import { quickFix } from '../gps';
import { useWalkCapture } from './useWalkCapture';
import { WalkCamera } from './WalkCamera';

export interface WalkPanelProps {
  row: Row;
  rowName: string;
  onEnd: () => void;
  /** The stone just captured, so the map or diagram can highlight it. */
  onCaptured?: (id: ID) => void;
}

/** Controls for an active walk-a-row session (plan §7.2), under the map or diagram. */
export function WalkPanel({ row, rowName, onEnd, onCaptured }: WalkPanelProps) {
  const { t } = useLingui();
  const store = useStore();
  const [camera, setCamera] = useState(false);
  const [locating, setLocating] = useState(false);
  const capture = useWalkCapture(row, true);
  const info = useLiveQuery(async () => {
    const stones = await rowStones(store, row);
    const next = stones.reduce((n, m) => Math.max(n, (m.address?.rowIndex ?? -1) + 1), 0);
    const index = new Map(stones.map((m) => [m.id, m.address?.rowIndex]));
    return { count: stones.length, next, index, start: await getRowStart(store, row.id) };
  }, [store, row.id, row.cemeteryId]);

  const currentIndex = capture.current ? info?.index.get(capture.current) : undefined;
  const captured = currentIndex === undefined ? undefined : capture.current;
  useEffect(() => {
    if (captured) onCaptured?.(captured);
  }, [captured, onCaptured]);
  const hasStart = Boolean(info?.start || row.line);

  const atHere = async (action: 'start' | 'end') => {
    setLocating(true);
    const fix = await quickFix(15_000);
    setLocating(false);
    if (!fix) return toast({ title: t`Couldn't get your location`, tone: 'error' });
    if (action === 'start') {
      await setRowStart(store, row.id, fix);
      toast({ title: t`Row start set` });
    } else if (await endRowHere(store, row.id, fix)) {
      toast({
        title: t`Row end set; stones re-spaced`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
    }
  };

  const count = info?.count ?? 0;
  return (
    <section aria-label={t`Walk a row`} className="flex flex-col gap-3 bg-surface p-3 sbs-border">
      <p className="text-lg">
        <Trans>
          <span className="font-semibold">Walking row {rowName}</span> · {count} stones
        </Trans>
      </p>
      <Button size="lg" onClick={() => setCamera(true)}>
        <Trans>Next stone</Trans>
      </Button>
      <div className="flex flex-wrap gap-2">
        {hasStart ? (
          <Button variant="secondary" disabled={locating} onClick={() => void atHere('end')}>
            <Trans>Row end here</Trans>
          </Button>
        ) : (
          <Button variant="secondary" disabled={locating} onClick={() => void atHere('start')}>
            <Trans>Row start here</Trans>
          </Button>
        )}
        <Button variant="ghost" onClick={onEnd}>
          <Trans>End walk</Trans>
        </Button>
      </div>
      <WalkCamera
        open={camera}
        onClose={() => {
          setCamera(false);
          capture.nextStone();
        }}
        rowName={rowName}
        nextNumber={(info?.next ?? 0) + 1}
        currentNumber={currentIndex === undefined ? undefined : currentIndex + 1}
        capture={capture}
      />
    </section>
  );
}
