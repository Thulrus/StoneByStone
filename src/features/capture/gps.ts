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
