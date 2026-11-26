import { Trans } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import { useStore } from '../store-context';

/** Placeholder until the map lands (M2). */
export function CemeteryPage() {
  const { cemeteryId = '' } = useParams();
  const store = useStore();
  // `null` once loaded and not found, so the page doesn't flash "not found" while loading.
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
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">{cemetery.name}</h1>
      <p className="text-fg-muted">
        <Trans>The map for this cemetery arrives in a later update.</Trans>
      </p>
    </div>
  );
}
