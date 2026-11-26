import { useLingui } from '@lingui/react/macro';
import { useCallback, useRef, useState } from 'react';
import { useStore } from '../../../app/store-context';
import { addPhoto, preparePhoto } from '../../../data/photos';
import { captureStone } from '../../../data/walk';
import type { ID, PhotoRole, Row } from '../../../domain';
import { toast } from '../../../ui/toast-store';
import { quickFix } from '../gps';
import { photoFields, processForCemetery } from '../useSavePhoto';

export interface WalkCapture {
  /** The stone further photos go to; `undefined` means the next shot starts a new stone. */
  current: ID | undefined;
  /** Shots still being processed or saved. */
  pending: number;
  /** Thumbnail of the last saved photo. */
  lastThumb: Blob | undefined;
  /** What the last saved shot did, for in-camera feedback (toasts would cover the shutter). */
  lastSaved: { kind: 'stone' | 'photo'; stoneNumber: number } | undefined;
  shoot: (raw: Blob, role: PhotoRole) => void;
  nextStone: () => void;
  /** Undo the last saved shot. */
  undoLast: () => Promise<void>;
}

/**
 * The capture queue for one walk: shots are processed and saved strictly in order, so stone
 * order is the order of the shutter presses even when a phone is slow. The GPS fix is asked
 * for at the shutter press, while the photo is processed.
 */
export function useWalkCapture(row: Row, useGps: boolean): WalkCapture {
  const store = useStore();
  const { t } = useLingui();
  const [current, setCurrent] = useState<ID>();
  const [pending, setPending] = useState(0);
  const [lastThumb, setLastThumb] = useState<Blob>();
  const [lastSaved, setLastSaved] = useState<WalkCapture['lastSaved']>();
  const lastStone = useRef<{ id: ID; n: number }>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // `null`: a new stone is being saved. Bumping `generation` (Next stone) detaches it.
  const target = useRef<ID | null | undefined>(undefined);
  const generation = useRef(0);

  const nextStone = useCallback(() => {
    generation.current++;
    target.current = undefined;
    setCurrent(undefined);
  }, []);

  const shoot = useCallback(
    (raw: Blob, role: PhotoRole) => {
      const isNew = target.current === undefined;
      if (isNew) target.current = null;
      const gen = generation.current;
      const fix = useGps ? quickFix() : Promise.resolve(undefined);
      setPending((n) => n + 1);
      queue.current = queue.current.then(async () => {
        try {
          const [processed, gps] = await Promise.all([
            processForCemetery(store, row.cemeteryId, raw),
            fix,
          ]);
          const fields = photoFields(processed, role);
          if (!fields.position && gps) fields.position = { ...gps, source: 'gps' };
          if (isNew) {
            const photo = await preparePhoto(store, { monumentId: '', ...fields });
            const m = await captureStone(store, { rowId: row.id, photo });
            if (generation.current === gen) {
              target.current = m.id;
              setCurrent(m.id);
            }
            const n = (m.address?.rowIndex ?? 0) + 1;
            lastStone.current = { id: m.id, n };
            setLastSaved({ kind: 'stone', stoneNumber: n });
          } else {
            const monumentId = target.current;
            if (!monumentId) return;
            await addPhoto(store, { monumentId, ...fields });
            const n = lastStone.current?.id === monumentId ? lastStone.current.n : 0;
            setLastSaved({ kind: 'photo', stoneNumber: n });
          }
          setLastThumb(processed.thumb);
        } catch {
          if (isNew && generation.current === gen) target.current = undefined;
          toast({ title: t`Couldn't save that photo`, tone: 'error' });
        } finally {
          setPending((n) => n - 1);
        }
      });
    },
    [store, row.id, row.cemeteryId, useGps, t],
  );

  const undoLast = useCallback(async () => {
    const saved = lastSaved;
    if (!saved) return;
    setLastSaved(undefined);
    setLastThumb(undefined);
    await queue.current;
    await store.undo();
    if (saved.kind === 'stone' && target.current === lastStone.current?.id) nextStone();
  }, [lastSaved, store, nextStone]);

  return { current, pending, lastThumb, lastSaved, shoot, nextStone, undoLast };
}
