import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
