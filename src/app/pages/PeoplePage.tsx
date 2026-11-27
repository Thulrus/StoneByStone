import { useLiveQuery } from 'dexie-react-hooks';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { PeopleView } from '../../features/people/PeopleView';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';
import { CemeteryGate } from './CemeteryGate';

export function PeoplePage() {
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
  return <PeopleView cemetery={cemetery} layout={layout} stones={stones} people={people} />;
}
