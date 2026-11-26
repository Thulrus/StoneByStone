import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import type { ID, Monument } from '../../domain';

/** Live stones of a cemetery; `undefined` while loading. */
export function useStones(cemeteryId: ID): Monument[] | undefined {
  const store = useStore();
  return useLiveQuery(() => store.monuments.listByCemetery(cemeteryId), [store, cemeteryId]);
}
