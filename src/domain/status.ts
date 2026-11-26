/**
 * Monument status (plan §2.2): `located` / `photographed` / `transcribed` are derived and
 * materialized on write so they can be indexed; `verified` is an explicit stamp that is
 * cleared when a transcription field changes afterwards.
 */
import type { Monument, MonumentStatus, Person } from './types';

export interface StatusInputs {
  /** At least one live photo links to the monument. */
  hasPhoto: boolean;
  /** At least one live person links to the monument. */
  hasPerson: boolean;
}

export function deriveStatus(
  m: Pick<Monument, 'verified' | 'inscription' | 'epitaph'>,
  { hasPhoto, hasPerson }: StatusInputs,
): MonumentStatus {
  if (m.verified) return 'verified';
  if (hasPerson || Boolean(m.inscription?.text.trim()) || Boolean(m.epitaph?.trim())) {
    return 'transcribed';
  }
  return hasPhoto ? 'photographed' : 'located';
}

/** Monument fields whose change invalidates a verification. */
export const MONUMENT_TRANSCRIPTION_FIELDS: ReadonlySet<keyof Monument> = new Set([
  'inscription',
  'epitaph',
  'carver',
  'symbols',
]);

/** Person fields whose change invalidates the verification of the person's monument. */
export const PERSON_TRANSCRIPTION_FIELDS: ReadonlySet<keyof Person> = new Set([
  'monumentId',
  'name',
  'sex',
  'birth',
  'death',
  'burial',
  'age',
  'relationshipText',
  'military',
  'occupation',
]);
