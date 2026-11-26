/** Cemeteries on this device (plan §6 Home, §11): create, list, progress. */
import {
  DEFAULT_LICENSE,
  defaultCemeterySettings,
  type Cemetery,
  type ID,
  type MonumentStatus,
} from '../domain';
import { getCemeteryDefaults } from './settings';
import type { Store } from './store';

/** A new, empty cemetery using this device's defaults, with this device's contributor. */
export async function createCemetery(store: Store, name: string): Promise<Cemetery> {
  const defaults = await getCemeteryDefaults(store);
  return store.cemeteries.create({
    name: name.trim(),
    license: DEFAULT_LICENSE,
    contributors: [store.device.contributorId],
    settings: { ...defaultCemeterySettings(), ...defaults },
  });
}

/** Live cemeteries, by name. */
export async function listCemeteries(store: Store): Promise<Cemetery[]> {
  const all = await store.db.cemeteries.toArray();
  return all
    .filter((c) => !c.deleted)
    .sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
}

export type CemeteryProgress = Record<MonumentStatus, number> & { total: number };

const STATUSES: readonly MonumentStatus[] = ['located', 'photographed', 'transcribed', 'verified'];

/** Live stones per status. */
export async function cemeteryProgress(store: Store, cemeteryId: ID): Promise<CemeteryProgress> {
  const out = { total: 0, located: 0, photographed: 0, transcribed: 0, verified: 0 };
  for (const status of STATUSES) {
    const n = await store.db.monuments
      .where('[cemeteryId+status]')
      .equals([cemeteryId, status])
      .filter((m) => !m.deleted)
      .count();
    out[status] = n;
    out.total += n;
  }
  return out;
}

/** Share of stones transcribed or verified, 0–1 (0 for an empty cemetery). */
export function transcribedShare(p: CemeteryProgress): number {
  return p.total === 0 ? 0 : (p.transcribed + p.verified) / p.total;
}
