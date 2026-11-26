/** Desk-mode transcription writes (plan §9). Each is one undo step. */
import type { ID } from '../domain';
import type { Store } from './store';

/**
 * Save a stone's inscription exactly as carved: line breaks and leading spaces kept, only
 * trailing blank space dropped. Empty clears it. Unchanged text writes nothing.
 */
export async function saveInscription(store: Store, id: ID, text: string): Promise<void> {
  const value = text.replace(/\s+$/u, '');
  await store.run('Transcribe', async () => {
    const m = await store.monuments.get(id);
    if (!m || (m.inscription?.text ?? '') === value) return;
    const { text: _old, ...rest } = m.inscription ?? { text: '' };
    const inscription = value
      ? { ...rest, text: value }
      : Object.keys(rest).length
        ? { ...rest, text: '' }
        : undefined;
    await store.monuments.update(id, { inscription });
  });
}
