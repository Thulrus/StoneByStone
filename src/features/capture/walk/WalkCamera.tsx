import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import type { PhotoRole } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Camera } from '../Camera';
import { haptic } from '../camera';
import { QuickTray } from './QuickTray';
import type { WalkCapture } from './useWalkCapture';

export interface WalkCameraProps {
  open: boolean;
  onClose: () => void;
  rowName: string;
  /** 1-based number the next new stone will get. */
  nextNumber: number;
  /** 1-based number of the stone extra photos go to. */
  currentNumber: number | undefined;
  capture: WalkCapture;
}

/** The camera during a walk: the first shot makes the stone, later ones add to it. */
export function WalkCamera({
  open,
  onClose,
  rowName,
  nextNumber,
  currentNumber,
  capture,
}: WalkCameraProps) {
  const { t } = useLingui();
  const [role, setRole] = useState<PhotoRole>('front');
  const [thumb, setThumb] = useState<string>();
  const [lastSurname, setLastSurname] = useState<string>();
  const { current, pending, lastThumb, lastSaved, shoot, nextStone, undoLast, gaps, setGaps } =
    capture;

  useEffect(() => {
    if (!lastThumb) return;
    const url = URL.createObjectURL(lastThumb);
    const id = requestAnimationFrame(() => setThumb(url));
    return () => {
      cancelAnimationFrame(id);
      URL.revokeObjectURL(url);
    };
  }, [lastThumb]);

  const adding = current !== undefined || pending > 0;
  const title =
    adding && currentNumber !== undefined
      ? t`Row ${rowName} · stone ${currentNumber}`
      : t`Row ${rowName} · stone ${nextNumber}`;

  return (
    <Camera
      open={open}
      onClose={onClose}
      title={
        <>
          {title}
          {pending > 0 ? (
            <span className="ms-2 text-sm font-normal">
              <Trans>Saving…</Trans>
            </span>
          ) : null}
        </>
      }
      role={role}
      onRoleChange={setRole}
      lastPhoto={thumb}
      tray={
        current ? (
          <QuickTray
            key={current}
            monumentId={current}
            lastSurname={lastSurname}
            onSurname={setLastSurname}
          />
        ) : undefined
      }
      onCapture={(blob, r) => {
        shoot(blob, r);
        if (!adding && r === 'front') setRole('back');
      }}
      actions={
        <>
          {lastSaved && pending === 0 ? (
            <span className="flex items-center gap-2" role="status">
              {lastSaved.kind === 'stone' ? (
                <Trans>Stone {lastSaved.stoneNumber} saved</Trans>
              ) : lastSaved.kind === 'skip' ? (
                <Trans>Stone {lastSaved.stoneNumber} skipped</Trans>
              ) : (
                <Trans>Photo added</Trans>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  if (lastSaved.kind === 'stone') setRole('front');
                  void undoLast();
                }}
              >
                <Trans>Undo</Trans>
              </Button>
            </span>
          ) : null}
          {gaps > 0 ? (
            <span className="flex items-center gap-2" role="status">
              <Plural value={gaps} one="# empty plot before it" other="# empty plots before it" />
              <Button variant="secondary" onClick={() => setGaps(gaps - 1)}>
                <Trans>Remove gap</Trans>
              </Button>
            </span>
          ) : null}
          {!adding && capture.insertAt === undefined ? (
            <Button
              variant="secondary"
              onClick={() => {
                haptic();
                setGaps(gaps + 1);
              }}
            >
              <Trans>Gap</Trans>
            </Button>
          ) : null}
          {!adding ? (
            <Button
              variant="secondary"
              onClick={() => {
                haptic();
                void capture.skip();
              }}
            >
              <Trans>Skip</Trans>
            </Button>
          ) : null}
          {adding ? (
            <Button
              size="lg"
              onClick={() => {
                haptic();
                nextStone();
                setRole('front');
              }}
            >
              <Trans>Next stone</Trans>
            </Button>
          ) : null}
        </>
      }
    />
  );
}
