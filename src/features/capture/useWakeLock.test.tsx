import { renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

afterEach(() => vi.unstubAllGlobals());

function fakeWakeLock() {
  const sentinels: { released: boolean; release: () => Promise<void> }[] = [];
  const request = vi.fn(async () => {
    const s = {
      released: false,
      release: vi.fn(async () => {
        s.released = true;
      }),
    };
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

test('holds the screen on only while active, and releases when the session ends', async () => {
  const { request, sentinels } = fakeWakeLock();
  const { rerender, unmount } = renderHook(({ on }) => useWakeLock(on), {
    initialProps: { on: false },
  });
  expect(request).not.toHaveBeenCalled();
  rerender({ on: true });
  await vi.waitFor(() => expect(sentinels).toHaveLength(1));
  rerender({ on: false });
  expect(sentinels[0]?.released).toBe(true);
  rerender({ on: true });
  await vi.waitFor(() => expect(sentinels).toHaveLength(2));
  unmount();
  expect(sentinels[1]?.released).toBe(true);
});

test('asks again when the app comes back to the foreground', async () => {
  const { request, sentinels } = fakeWakeLock();
  renderHook(() => useWakeLock(true));
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  // The browser releases the lock when the page is hidden.
  if (sentinels[0]) sentinels[0].released = true;
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});
