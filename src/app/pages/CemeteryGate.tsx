import { Trans } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { Cemetery } from '../../domain';
import { useStore } from '../store-context';

/**
 * Loads the route's `:cemeteryId` (or one of its aliases) and renders `children` with it, keyed
 * by id. Nothing while loading, so "not found" never flashes.
 */
export function CemeteryGate({ children }: { children: (cemetery: Cemetery) => ReactNode }) {
  const { cemeteryId = '' } = useParams();
  const store = useStore();
  const cemetery = useLiveQuery(
    async () => (await store.cemeteries.resolve(cemeteryId)) ?? null,
    [store, cemeteryId],
  );
  if (cemetery === undefined) return null;
  if (cemetery === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          <Trans>Cemetery not found</Trans>
        </h1>
        <Link to="/" className="text-primary underline">
          <Trans>Back to cemeteries</Trans>
        </Link>
      </div>
    );
  }
  return <Fragment key={cemetery.id}>{children(cemetery)}</Fragment>;
}
