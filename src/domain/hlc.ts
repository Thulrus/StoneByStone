/**
 * Hybrid Logical Clock (plan §21.1; Kulkarni et al. 2014).
 *
 * String form: `<wallMillis:15 digits>-<counter:5 digits>-<nodeId:16 hex>`. Every part is
 * fixed width, so comparing the strings is the same as comparing (wall, counter, nodeId),
 * and ties between devices are broken by nodeId.
 *
 * The clock state itself is pure data; persisting it and the nodeId is the data layer's job.
 */
import type { HLC } from './types';

export interface HlcParts {
  wall: number;
  counter: number;
  node: string;
}

export interface ClockState {
  wall: number;
  counter: number;
}

const WALL_DIGITS = 15;
const COUNTER_DIGITS = 5;
export const MAX_COUNTER = 10 ** COUNTER_DIGITS - 1;
const NODE_RE = /^[0-9a-f]{16}$/;
const HLC_RE = /^(\d{15})-(\d{5})-([0-9a-f]{16})$/;

export function isNodeId(s: string): boolean {
  return NODE_RE.test(s);
}

export function formatHlc({ wall, counter, node }: HlcParts): HLC {
  if (!Number.isSafeInteger(wall) || wall < 0 || wall >= 10 ** WALL_DIGITS) {
    throw new RangeError(`HLC wall time out of range: ${wall}`);
  }
  if (!Number.isInteger(counter) || counter < 0 || counter > MAX_COUNTER) {
    throw new RangeError(`HLC counter out of range: ${counter}`);
  }
  if (!isNodeId(node)) throw new RangeError(`Invalid HLC node id: ${node}`);
  return `${String(wall).padStart(WALL_DIGITS, '0')}-${String(counter).padStart(COUNTER_DIGITS, '0')}-${node}`;
}

export function parseHlc(hlc: HLC): HlcParts {
  const m = HLC_RE.exec(hlc);
  if (!m) throw new SyntaxError(`Invalid HLC: ${hlc}`);
  return { wall: Number(m[1]), counter: Number(m[2]), node: m[3] ?? '' };
}

export function isHlc(s: string): boolean {
  return HLC_RE.test(s);
}

export function compareHlc(a: HLC, b: HLC): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxHlc(a: HLC, b: HLC): HLC;
export function maxHlc(a: HLC | undefined, b: HLC | undefined): HLC | undefined;
export function maxHlc(a: HLC | undefined, b: HLC | undefined): HLC | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a >= b ? a : b;
}

/** Advance past `wall`/`counter`, rolling into the next millisecond if the counter is full. */
function bump(wall: number, counter: number): ClockState {
  return counter >= MAX_COUNTER ? { wall: wall + 1, counter: 0 } : { wall, counter: counter + 1 };
}

/** A local event (a write): returns the new state. */
export function tick(state: ClockState, physicalNow: number): ClockState {
  const pt = Math.floor(physicalNow);
  if (pt > state.wall) return { wall: pt, counter: 0 };
  return bump(state.wall, state.counter);
}

/**
 * Observe a remote HLC (from an import or merge). The result is greater than both the local
 * state and the remote time, so later local writes sort after everything we have seen even
 * when this device's clock is behind.
 */
export function receive(state: ClockState, remote: HLC, physicalNow: number): ClockState {
  const r = parseHlc(remote);
  const pt = Math.floor(physicalNow);
  const wall = Math.max(state.wall, r.wall, pt);
  if (wall === state.wall && wall === r.wall) {
    return bump(wall, Math.max(state.counter, r.counter));
  }
  if (wall === state.wall) return bump(wall, state.counter);
  if (wall === r.wall) return bump(wall, r.counter);
  return { wall, counter: 0 };
}

/** A stateful clock for one device. The caller persists `state` if it needs to survive reloads. */
export class HybridClock {
  state: ClockState;

  constructor(
    readonly nodeId: string,
    initial: ClockState = { wall: 0, counter: 0 },
    private readonly physicalNow: () => number = Date.now,
  ) {
    if (!isNodeId(nodeId)) throw new RangeError(`Invalid HLC node id: ${nodeId}`);
    this.state = { ...initial };
  }

  /** Timestamp for a new local write. */
  now(): HLC {
    this.state = tick(this.state, this.physicalNow());
    return formatHlc({ ...this.state, node: this.nodeId });
  }

  /** Fold in a timestamp seen in imported data. */
  receive(remote: HLC): void {
    this.state = receive(this.state, remote, this.physicalNow());
  }
}
