import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { ProgressView } from '../../features/progress/ProgressView';
import { useStones } from '../../features/stones/useStones';
import { CemeteryGate } from './CemeteryGate';

export function ProgressPage() {
  return <CemeteryGate>{(c) => <Loaded cemetery={c} />}</CemeteryGate>;
}

function Loaded({ cemetery }: { cemetery: Cemetery }) {
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  if (!layout || !stones) return null;
  return <ProgressView cemetery={cemetery} layout={layout} stones={stones} />;
}
