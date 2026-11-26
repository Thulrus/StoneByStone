import { afterEach, describe, expect, test, vi } from 'vitest';
import { holdStill } from './gps';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fakeGeolocation(fail = false) {
  let n = 0;
  const getCurrentPosition = vi.fn((ok: PositionCallback, err: PositionErrorCallback) => {
    setTimeout(() => {
      if (fail) err({ code: 3 } as GeolocationPositionError);
      else
        ok({
          coords: { longitude: -72 + n * 1e-6, latitude: 44, accuracy: 5 },
        } as GeolocationPosition);
      n++;
    }, 500);
  });
  const watchPosition = vi.fn();
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition, watchPosition } });
  return { getCurrentPosition, watchPosition };
}

describe('holdStill', () => {
  test('collects one-off fixes for the duration, then stops; never a watch', async () => {
    vi.useFakeTimers();
    const geo = fakeGeolocation();
    const seen: number[] = [];
    const done = holdStill(5000, { onFix: (f) => seen.push(f.length) });
    await vi.advanceTimersByTimeAsync(6000);
    const fixes = await done;
    expect(fixes.length).toBeGreaterThanOrEqual(5);
    expect(seen.at(-1)).toBe(fixes.length);
    expect(geo.watchPosition).not.toHaveBeenCalled();
    const calls = geo.getCurrentPosition.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(geo.getCurrentPosition.mock.calls.length).toBe(calls);
  });

  test('gives up after a few failures', async () => {
    vi.useFakeTimers();
    const geo = fakeGeolocation(true);
    const done = holdStill(60_000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await done).toEqual([]);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(3);
  });

  test('stops when aborted', async () => {
    vi.useFakeTimers();
    fakeGeolocation();
    const abort = new AbortController();
    const done = holdStill(60_000, { signal: abort.signal });
    await vi.advanceTimersByTimeAsync(1600);
    abort.abort();
    await vi.advanceTimersByTimeAsync(1000);
    expect((await done).length).toBeLessThanOrEqual(3);
  });
});
