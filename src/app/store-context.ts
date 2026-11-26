import { createContext, useContext } from 'react';
import { openDatabase } from '../data/db';
import { Store } from '../data/store';

export const StoreContext = createContext<Store | null>(null);

/** The data store. Only valid below `<StoreGate>`. */
export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore() used outside <StoreGate>');
  return store;
}

let opening: Promise<Store> | undefined;

/** Opens the database once per page; a failed attempt can be retried. */
export function openStoreOnce(
  open = () => openDatabase().then((db) => Store.open(db)),
): Promise<Store> {
  opening ??= open().catch((e: unknown) => {
    opening = undefined;
    throw e;
  });
  return opening;
}
