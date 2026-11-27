import { useLiveQuery } from 'dexie-react-hooks';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { DuplicatesView } from '../../features/duplicates/DuplicatesView';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';
import { CemeteryGate } from './CemeteryGate';

export function DuplicatesPage() {
  return <CemeteryGate>{(c) => <Loaded cemetery={c} />}</CemeteryGate>;
}

function Loaded({ cemetery }: { cemetery: Cemetery }) {
  const store = useStore();
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  const people = useLiveQuery(
    () => store.persons.listByCemetery(cemetery.id),
    [store, cemetery.id],
  );
  if (!layout || !stones || !people) return null;
  return <DuplicatesView cemetery={cemetery} layout={layout} stones={stones} people={people} />;
}
