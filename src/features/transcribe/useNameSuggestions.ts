import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { useStore } from '../../app/store-context';
import type { ID } from '../../domain';
import { buildNameIndex, suggestNames } from './name-index';

/** Name autocomplete over this cemetery's people, imported index records included (§9). */
export function useNameSuggestions(cemeteryId: ID): (typed: string) => string[] {
  const store = useStore();
  const people = useLiveQuery(() => store.persons.listByCemetery(cemeteryId), [store, cemeteryId]);
  const index = useMemo(() => buildNameIndex(people ?? []), [people]);
  return useCallback((typed: string) => suggestNames(index, typed), [index]);
}
