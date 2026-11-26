import { Trans } from '@lingui/react/macro';
import { useEffect, useState, type ReactNode } from 'react';
import { NewerSchemaError } from '../data/db';
import type { Store } from '../data/store';
import { openStoreOnce, StoreContext } from './store-context';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; store: Store }
  | { kind: 'newer'; found: number; supported: number }
  | { kind: 'failed'; message: string };

/**
 * Opens the database before rendering the app. Data from a newer build is never opened, so
 * it can't be corrupted (plan §14); the user is told to update instead.
 */
export function StoreGate({
  children,
  open = openStoreOnce,
}: {
  children: ReactNode;
  open?: () => Promise<Store>;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    open().then(
      (store) => live && setState({ kind: 'ready', store }),
      (e: unknown) => {
        if (!live) return;
        if (e instanceof NewerSchemaError) {
          setState({ kind: 'newer', found: e.found, supported: e.supported });
        } else setState({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [open]);

  if (state.kind === 'ready') {
    return <StoreContext.Provider value={state.store}>{children}</StoreContext.Provider>;
  }
  if (state.kind === 'loading') return null;
  return (
    <main role="alert" className="mx-auto flex max-w-prose flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">
        {state.kind === 'newer' ? (
          <Trans>This app is out of date</Trans>
        ) : (
          <Trans>Your data could not be opened</Trans>
        )}
      </h1>
      {state.kind === 'newer' ? (
        <p>
          <Trans>
            The data on this device was saved by a newer version of StoneByStone (data version{' '}
            {state.found}; this version reads up to {state.supported}). Nothing has been changed.
            Reload the page to get the latest version.
          </Trans>
        </p>
      ) : (
        <p>
          <Trans>Nothing has been changed. Details: {state.message}</Trans>
        </p>
      )}
    </main>
  );
}
