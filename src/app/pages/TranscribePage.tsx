import { Trans } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams, useSearchParams } from 'react-router';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { useStones } from '../../features/stones/useStones';
import { TranscribeView } from '../../features/transcribe/TranscribeView';
import { useStore } from '../store-context';

export function TranscribePage() {
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
  return <Loaded key={cemetery.id} cemetery={cemetery} />;
}

function Loaded({ cemetery }: { cemetery: Cemetery }) {
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  const [params] = useSearchParams();
  if (!layout || !stones) return null;
  return (
    <TranscribeView
      cemetery={cemetery}
      stones={stones}
      rows={layout.rows}
      labelOf={layout.labelOf}
      initialStoneId={params.get('stone') ?? undefined}
    />
  );
}
