import type { RowFix } from '../../geo';

/**
 * One quick GPS fix for a capture, or `undefined` if none arrives in time. Never a watch:
 * GPS is not run continuously (plan §7.3).
 */
export function quickFix(timeoutMs = 4000): Promise<RowFix | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator))
      return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ lng: p.coords.longitude, lat: p.coords.latitude, accuracyM: p.coords.accuracy }),
      () => resolve(undefined),
      // Fresh only: at walking pace even a few seconds is metres out of date.
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/**
 * "Hold still" (plan §7.3): one fresh fix after another for `durationMs`, then stop. Each
 * request is a one-off, so GPS runs only while the user is holding still.
 */
export async function holdStill(
  durationMs: number,
  { onFix, signal }: { onFix?: (fixes: readonly RowFix[]) => void; signal?: AbortSignal } = {},
): Promise<RowFix[]> {
  const fixes: RowFix[] = [];
  const end = Date.now() + durationMs;
  let misses = 0;
  while (!signal?.aborted && Date.now() < end) {
    const fix = await quickFix(Math.max(1000, end - Date.now()));
    if (signal?.aborted) break;
    if (fix) {
      fixes.push(fix);
      onFix?.(fixes);
    } else if (++misses >= 3) break;
    // Some browsers hand back the same fix at once; give the receiver a moment.
    await new Promise((r) => setTimeout(r, 250));
  }
  return fixes;
}
