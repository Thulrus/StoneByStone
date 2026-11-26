/**
 * The enhancement in use, kept for the session and shared across stones: consecutive stones
 * usually need the same treatment. Geometry (straighten, perspective) is per photo, so it
 * resets when the photo changes.
 */
import { useSyncExternalStore } from 'react';
import { NO_ENHANCEMENT, type Enhancement } from './filters';

let current: Enhancement = NO_ENHANCEMENT;
const listeners = new Set<() => void>();

export function setEnhancement(e: Enhancement | ((e: Enhancement) => Enhancement)): void {
  current = typeof e === 'function' ? e(current) : e;
  for (const fn of listeners) fn();
}

/** Back to straight and square, keeping the tone settings (a new photo). */
export function resetGeometry(): void {
  if (current.rotateDeg || current.vertical || current.horizontal)
    setEnhancement((e) => ({ ...e, rotateDeg: 0, vertical: 0, horizontal: 0 }));
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useEnhancement(): Enhancement {
  return useSyncExternalStore(subscribe, () => current);
}
