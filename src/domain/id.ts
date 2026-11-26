import type { ID } from './types';

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * RFC 9562 UUIDv7: 48-bit Unix-millis timestamp, then random bits. IDs sort by creation time
 * (to the millisecond) and are globally unique.
 */
export function uuidv7(nowMs: number = Date.now()): ID {
  const b = randomBytes(16);
  let ms = Math.max(0, Math.floor(nowMs));
  for (let i = 5; i >= 0; i--) {
    b[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70; // version 7
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => HEX[x]).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Any RFC 4122/9562 UUID (lowercase). v1 imports may carry non-v7 IDs. */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** Unix millis encoded in a UUIDv7, or undefined for other versions. */
export function uuidv7Time(id: ID): number | undefined {
  if (!isUuid(id) || id[14] !== '7') return undefined;
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

/** 16 lowercase hex chars (64 random bits): a device's stable HLC node id. */
export function generateNodeId(): string {
  return Array.from(randomBytes(8), (x) => HEX[x]).join('');
}
