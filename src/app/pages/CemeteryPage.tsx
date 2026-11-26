import { Trans } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import type { Cemetery } from '../../domain';
import { CemeteryTabs, type Tab } from '../../features/cemeteries/CemeteryTabs';
import { useLayout } from '../../features/cemeteries/useLayout';
import { useFeatures, useOverlays } from '../../features/cemeteries/useRecords';
import { hasCoordinates } from '../../features/schematic/schematic';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';

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
  return <CemeteryView key={cemetery.id} cemetery={cemetery} />;
}

function CemeteryView({ cemetery }: { cemetery: Cemetery }) {
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  const overlays = useOverlays(cemetery.id);
  const features = useFeatures(cemetery.id);
  if (!layout || !stones || !overlays || !features) return null;
  // A new cemetery opens on Setup so the first job, adding rows, is in front of the user.
  // With nothing that has coordinates (a v1 grid import, a canopy survey), the diagram.
  const initialTab: Tab =
    layout.rows.length === 0 && stones.length === 0
      ? 'setup'
      : hasCoordinates(layout.rows, stones)
        ? 'map'
        : 'diagram';
  return (
    <CemeteryTabs
      cemetery={cemetery}
      layout={layout}
      stones={stones}
      overlays={overlays}
      features={features}
      initialTab={initialTab}
    />
  );
}
