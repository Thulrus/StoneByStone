import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useStore } from '../../../app/store-context';
import { reverseRow } from '../../../data/row-controls';
import { endRowHere, getRowStart, rowStones, setRowStart } from '../../../data/walk';
import type { ID, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';
import { haptic } from '../camera';
import { quickFix } from '../gps';
import { useWakeLock } from '../useWakeLock';
import { InsertDialog, ReorderDialog } from './RowOrderDialogs';
import { useWalkCapture } from './useWalkCapture';
import { WalkCamera } from './WalkCamera';
import { WalkSummary } from './WalkSummary';

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
  const [dialog, setDialog] = useState<'insert' | 'reorder'>();
  const [since] = useState(() => store.device.clock.now());
  const [rowEnded, setRowEnded] = useState(false);
  const [ended, setEnded] = useState(false);
  // The screen stays on for the walk only (plan §17).
  useWakeLock(!ended);
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
    haptic();
    if (action === 'start') {
      await setRowStart(store, row.id, fix);
      toast({ title: t`Row start set` });
    } else if (await endRowHere(store, row.id, fix, { atStart: capture.reversed })) {
      setRowEnded(true);
      toast({
        title: t`Row end set; stones re-spaced`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
    }
  };

  const reverse = async () => {
    if (!(await reverseRow(store, row.id))) return;
    haptic();
    capture.setReversed(!capture.reversed);
    toast({
      title: t`Row reversed: stone 1 is now at the other end`,
      action: {
        label: t`Undo`,
        onAction: () => {
          void store.undo();
          capture.setReversed(capture.reversed);
        },
      },
    });
  };

  const count = info?.count ?? 0;
  const nextNumber = capture.reversed
    ? 1
    : capture.insertAt !== undefined
      ? capture.insertAt + 1
      : (info?.next ?? 0) + capture.gaps + 1;
  return (
    <section aria-label={t`Walk a row`} className="flex flex-col gap-3 bg-surface p-3 sbs-border">
      <p className="text-lg">
        <Trans>
          <span className="font-semibold">Walking row {rowName}</span> · {count} stones
        </Trans>
        {capture.reversed ? (
          <span className="ms-2 text-base text-fg-muted">
            <Trans>(new stones go before stone 1)</Trans>
          </span>
        ) : null}
      </p>
      <Button size="lg" onClick={() => setCamera(true)}>
        <Trans>Next stone</Trans>
      </Button>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t`Row controls`}>
        <Button
          variant="secondary"
          onClick={() => {
            haptic();
            capture.setGaps(capture.gaps + 1);
          }}
        >
          {capture.gaps > 0 ? (
            <Plural value={capture.gaps} one="Gap (# before next)" other="Gap (# before next)" />
          ) : (
            <Trans>Gap</Trans>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            haptic();
            // Inside the camera the camera shows this; here a toast does.
            void capture.skip().then((n) => {
              if (n === undefined) return;
              toast({
                title: t`Stone ${n} skipped`,
                action: { label: t`Undo`, onAction: () => void capture.undoLast() },
              });
            });
          }}
        >
          <Trans>Skip</Trans>
        </Button>
        <Button variant="secondary" disabled={count === 0} onClick={() => setDialog('insert')}>
          <Trans>Insert…</Trans>
        </Button>
        <Button variant="secondary" disabled={count === 0} onClick={() => void reverse()}>
          <Trans>Reverse direction</Trans>
        </Button>
        <Button variant="secondary" disabled={count < 2} onClick={() => setDialog('reorder')}>
          <Trans>Reorder…</Trans>
        </Button>
      </div>
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
        <Button variant="ghost" onClick={() => setEnded(true)}>
          <Trans>End walk</Trans>
        </Button>
      </div>
      <InsertDialog
        row={row}
        open={dialog === 'insert'}
        onOpenChange={(o) => setDialog(o ? 'insert' : undefined)}
        onPick={(at) => {
          setDialog(undefined);
          capture.setGaps(0);
          capture.setInsertAt(at);
          setCamera(true);
        }}
      />
      <WalkSummary
        open={ended}
        row={row}
        rowName={rowName}
        since={since}
        rowEnded={rowEnded}
        onDone={onEnd}
      />
      <ReorderDialog
        row={row}
        open={dialog === 'reorder'}
        onOpenChange={(o) => setDialog(o ? 'reorder' : undefined)}
      />
      <WalkCamera
        open={camera}
        onClose={() => {
          setCamera(false);
          capture.nextStone();
          capture.setInsertAt(undefined);
        }}
        rowName={rowName}
        nextNumber={nextNumber}
        currentNumber={currentIndex === undefined ? undefined : currentIndex + 1}
        capture={capture}
      />
    </section>
  );
}
