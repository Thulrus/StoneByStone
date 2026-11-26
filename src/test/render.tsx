import { I18nProvider } from '@lingui/react';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { StoreContext } from '../app/store-context';
import { openDatabase } from '../data/db';
import { Store } from '../data/store';
import { i18n } from '../i18n/i18n';

function Providers({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

/** render() with the providers every component expects. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}

let n = 0;

/** A store on a fresh, uniquely named fake IndexedDB. */
export async function testStore(): Promise<Store> {
  const db = await openDatabase(`ui-test-${++n}-${Math.random().toString(36).slice(2)}`);
  return Store.open(db);
}

/** render() with a data store as well. */
export async function renderWithStore(ui: ReactElement, store?: Store) {
  const s = store ?? (await testStore());
  const result = render(ui, {
    wrapper: ({ children }) => (
      <I18nProvider i18n={i18n}>
        <StoreContext.Provider value={s}>{children}</StoreContext.Provider>
      </I18nProvider>
    ),
  });
  return { ...result, store: s };
}
