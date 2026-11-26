/** Browser storage helpers (plan §14): persistence and quota. */

/** Ask the browser not to evict our data. Safe to call repeatedly. */
export async function ensurePersisted(): Promise<boolean> {
  const s = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!s?.persist) return false;
  try {
    if (await s.persisted()) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean | undefined> {
  const s = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!s?.persisted) return undefined;
  try {
    return await s.persisted();
  } catch {
    return undefined;
  }
}

export interface Quota {
  usage: number;
  quota: number;
}

export async function storageEstimate(): Promise<Quota | undefined> {
  const s = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!s?.estimate) return undefined;
  try {
    const { usage, quota } = await s.estimate();
    return usage === undefined || !quota ? undefined : { usage, quota };
  } catch {
    return undefined;
  }
}

/** Warn when this share of the quota is used. */
export const QUOTA_WARNING = 0.8;

export function formatBytes(bytes: number, locale?: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let i = 0;
  let n = bytes;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[i],
    unitDisplay: i === 0 ? 'long' : 'short',
    maximumFractionDigits: n < 10 && i > 0 ? 1 : 0,
  }).format(n);
}
