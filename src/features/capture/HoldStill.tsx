import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { usePrefs } from '../../app/prefs';
import type { Position } from '../../domain';
import { averageFixes, MAX_FIX_OFFSET_M, snapToLine, type AveragedFix } from '../../geo';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { holdStill } from './gps';

export interface HoldStillProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The active row's line: the result is snapped onto it when close enough. */
  line?: readonly [number, number][] | undefined;
  onUse: (position: Position) => void;
}

/** "Hold still": average a few seconds of GPS fixes into one position (plan §7.3). */
export function HoldStill({ open, onOpenChange, line, onUse }: HoldStillProps) {
  const seconds = usePrefs((s) => s.holdStillSeconds);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Hold still</Trans>}
      placement="bottom"
    >
      {open ? <Collect seconds={seconds} line={line} onUse={onUse} /> : null}
    </Dialog>
  );
}

function Collect({
  seconds,
  line,
  onUse,
}: {
  seconds: number;
  line: HoldStillProps['line'];
  onUse: HoldStillProps['onUse'];
}) {
  const { t } = useLingui();
  const [live, setLive] = useState<AveragedFix>();
  const [result, setResult] = useState<AveragedFix | null>();
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const end = Date.now() + seconds * 1000;
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    void holdStill(seconds * 1000, {
      signal: abort.signal,
      onFix: (fixes) => setLive(averageFixes(fixes)),
    }).then((fixes) => {
      clearInterval(tick);
      if (!abort.signal.aborted) setResult(averageFixes(fixes) ?? null);
    });
    return () => {
      abort.abort();
      clearInterval(tick);
    };
  }, [seconds, run]);

  const retry = () => {
    setResult(undefined);
    setLive(undefined);
    setLeft(seconds);
    setRun((n) => n + 1);
  };

  if (result === undefined) {
    const n = live?.used ?? 0;
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="text-lg">
          <Trans>Stand at the stone and keep the phone still… {left} s</Trans>
        </p>
        <p className="text-fg-muted">
          {live ? (
            <Trans>
              {n} fixes, about ±{live.accuracyM} m so far
            </Trans>
          ) : (
            <Trans>Waiting for GPS…</Trans>
          )}
        </p>
      </div>
    );
  }
  if (result === null)
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">
          <Trans>No GPS fixes came in. Check that location is on, then try again.</Trans>
        </p>
        <Button variant="secondary" onClick={retry}>
          <Trans>Try again</Trans>
        </Button>
      </div>
    );

  const snapped = snapToLine(line, result, MAX_FIX_OFFSET_M);
  const position: Position = {
    lng: snapped?.[0] ?? result.lng,
    lat: snapped?.[1] ?? result.lat,
    accuracyM: result.accuracyM,
    source: 'gps-averaged',
  };
  const n = result.used;
  const dropped = result.rejected;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg" role="status">
        <Trans>
          About ±{result.accuracyM} m from {n} fixes
        </Trans>
        {dropped > 0 ? (
          <span className="ms-1 text-fg-muted">{t`(${dropped} dropped as outliers)`}</span>
        ) : null}
      </p>
      {snapped ? (
        <p className="text-fg-muted">
          <Trans>Snapped onto the row line.</Trans>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => onUse(position)}>
          <Trans>Use this position</Trans>
        </Button>
        <Button variant="secondary" onClick={retry}>
          <Trans>Try again</Trans>
        </Button>
      </div>
    </div>
  );
}
