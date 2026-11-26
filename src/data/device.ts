/**
 * Per-device identity and clock (plan §21.1), persisted in the `settings` table.
 */
import { generateNodeId, HybridClock, uuidv7, type ClockState, type ID } from '../domain';
import type { StoneDB } from './db';

export const NODE_KEY = 'nodeId';
export const CLOCK_KEY = 'clock';
export const CONTRIBUTOR_KEY = 'contributorId';
export const LAST_SEEN_KEY = 'lastSeen';

export interface Device {
  nodeId: string;
  clock: HybridClock;
  /** The contributor this device writes as. */
  contributorId: ID;
}

/** Load the device identity, creating it on first run. */
export async function loadDevice(db: StoneDB, now: () => number = Date.now): Promise<Device> {
  return db.transaction('rw', db.settings, db.contributors, async () => {
    let nodeId = (await db.settings.get(NODE_KEY))?.value;
    if (typeof nodeId !== 'string') {
      nodeId = generateNodeId();
      await db.settings.put({ key: NODE_KEY, value: nodeId });
    }
    let contributorId = (await db.settings.get(CONTRIBUTOR_KEY))?.value;
    if (typeof contributorId !== 'string') {
      contributorId = uuidv7(now());
      // The display name is set by the user later (WP3).
      await db.contributors.put({ id: contributorId as string, displayName: '' });
      await db.settings.put({ key: CONTRIBUTOR_KEY, value: contributorId });
    }
    const state = (await db.settings.get(CLOCK_KEY))?.value as ClockState | undefined;
    return {
      nodeId: nodeId as string,
      contributorId: contributorId as string,
      clock: new HybridClock(nodeId as string, state, now),
    };
  });
}

export async function saveClock(db: StoneDB, clock: HybridClock): Promise<void> {
  await db.settings.put({ key: CLOCK_KEY, value: { ...clock.state } });
}
