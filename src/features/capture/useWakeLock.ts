import { useEffect } from 'react';

/**
 * Keep the screen on while `active` (plan §17: only during a capture session). The browser
 * drops the lock when the page is hidden, so it is asked for again on return. Released when
 * `active` turns false or the component unmounts.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wl = typeof navigator === 'undefined' ? undefined : navigator.wakeLock;
    if (!active || !wl) return;
    let sentinel: WakeLockSentinel | undefined;
    let done = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await wl.request('screen');
        if (done) void s.release();
        else sentinel = s;
      } catch {
        // Not allowed (battery saver, no user gesture yet): the screen just sleeps as usual.
      }
    };
    void acquire();
    const onVisible = () => void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
