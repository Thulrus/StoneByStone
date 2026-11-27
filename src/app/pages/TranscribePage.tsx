import { useSearchParams } from 'react-router';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { useStones } from '../../features/stones/useStones';
import { TranscribeView } from '../../features/transcribe/TranscribeView';
import { CemeteryGate } from './CemeteryGate';

export function TranscribePage() {
  return <CemeteryGate>{(c) => <Loaded cemetery={c} />}</CemeteryGate>;
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
