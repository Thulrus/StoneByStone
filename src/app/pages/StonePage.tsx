import { Trans } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { useFeatures } from '../../features/cemeteries/useRecords';
import { StoneDetail } from '../../features/stones/detail/StoneDetail';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';

export function StonePage() {
  const { cemeteryId = '', stoneId = '' } = useParams();
  const store = useStore();
  const cemetery = useLiveQuery(
    async () => (await store.cemeteries.resolve(cemeteryId)) ?? null,
    [store, cemeteryId],
  );
  if (cemetery === undefined) return null;
  if (cemetery === null) return <NotFound />;
  return <StoneView key={cemetery.id} cemetery={cemetery} stoneId={stoneId} />;
}

function StoneView({ cemetery, stoneId }: { cemetery: Cemetery; stoneId: string }) {
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  const features = useFeatures(cemetery.id);
  if (!layout || !stones || !features) return null;
  const stone = stones.find((m) => m.id === stoneId);
  if (!stone) return <NotFound />;
  return (
    <StoneDetail
      cemetery={cemetery}
      stone={stone}
      stones={stones}
      features={features}
      rows={layout.rows}
      labelOf={layout.labelOf}
    />
  );
}

function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        <Trans>Stone not found</Trans>
      </h1>
      <Link to="/" className="text-primary underline">
        <Trans>Back to cemeteries</Trans>
      </Link>
    </div>
  );
}
