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
  lastSaved: { kind: 'stone' | 'photo' | 'skip'; stoneNumber: number } | undefined;
  shoot: (raw: Blob, role: PhotoRole) => void;
  nextStone: () => void;
  /** Empty plots (Gap) to leave before the next new stone. */
  gaps: number;
  setGaps: (n: number) => void;
  /** Skip: a photo-less stone in the next slot, flagged for a revisit. */
  skip: () => void;
  /** Where the next new stone goes while inserting (it advances after each one). */
  insertAt: number | undefined;
  setInsertAt: (at: number | undefined) => void;
  /** The row was reversed during this walk, so new stones go before stone 1. */
  reversed: boolean;
  setReversed: (r: boolean) => void;
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
  const [gaps, setGapsState] = useState(0);
  const [insertAt, setInsertState] = useState<number>();
  const [reversed, setReversedState] = useState(false);
  const placement = useRef({ gaps: 0, insertAt: undefined as number | undefined, reversed: false });
  const setGaps = useCallback((n: number) => {
    placement.current.gaps = Math.max(0, n);
    setGapsState(placement.current.gaps);
  }, []);
  const setInsertAt = useCallback((at: number | undefined) => {
    placement.current.insertAt = at;
    setInsertState(at);
  }, []);
  const setReversed = useCallback((r: boolean) => {
    placement.current.reversed = r;
    setReversedState(r);
  }, []);
  /** Where a new stone goes, read at the shutter press so queued shots keep their order. */
  const takePlacement = useCallback(() => {
    const p = placement.current;
    const gapsNow = p.gaps;
    let at: number | undefined;
    if (p.reversed) at = 0;
    else if (p.insertAt !== undefined) {
      at = p.insertAt;
      setInsertAt(at + 1);
    }
    if (gapsNow) setGaps(0);
    return { ...(at !== undefined ? { at } : {}), gaps: gapsNow };
  }, [setGaps, setInsertAt]);

  const nextStone = useCallback(() => {
    generation.current++;
    target.current = undefined;
    setCurrent(undefined);
  }, []);

  const shoot = useCallback(
    (raw: Blob, role: PhotoRole) => {
      const isNew = target.current === undefined;
      if (isNew) target.current = null;
      const where = isNew ? takePlacement() : {};
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
            const m = await captureStone(store, { rowId: row.id, photo, ...where });
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
    [store, row.id, row.cemeteryId, useGps, t, takePlacement],
  );

  const skip = useCallback(() => {
    nextStone();
    const where = takePlacement();
    setPending((n) => n + 1);
    queue.current = queue.current.then(async () => {
      try {
        const m = await captureStone(store, { rowId: row.id, flags: ['needs-revisit'], ...where });
        const n = (m.address?.rowIndex ?? 0) + 1;
        lastStone.current = { id: m.id, n };
        setLastSaved({ kind: 'skip', stoneNumber: n });
      } catch {
        toast({ title: t`Couldn't save that stone`, tone: 'error' });
      } finally {
        setPending((n) => n - 1);
      }
    });
  }, [nextStone, takePlacement, store, row.id, t]);

  const undoLast = useCallback(async () => {
    const saved = lastSaved;
    if (!saved) return;
    setLastSaved(undefined);
    setLastThumb(undefined);
    await queue.current;
    await store.undo();
    // An undone insert gives its slot back.
    const at = placement.current.insertAt;
    if (saved.kind !== 'photo' && at !== undefined) setInsertAt(Math.max(0, at - 1));
    if (saved.kind === 'stone' && target.current === lastStone.current?.id) nextStone();
  }, [lastSaved, store, nextStone, setInsertAt]);

  return {
    current,
    pending,
    lastThumb,
    lastSaved,
    shoot,
    nextStone,
    undoLast,
    gaps,
    setGaps,
    skip,
    insertAt,
    setInsertAt,
    reversed,
    setReversed,
  };
}
