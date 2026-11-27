import { useLiveQuery } from 'dexie-react-hooks';
import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { MatchView } from '../../features/people/match/MatchView';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';
import { CemeteryGate } from './CemeteryGate';

export function MatchPage() {
  return <CemeteryGate>{(c) => <Loaded cemetery={c} />}</CemeteryGate>;
}

function Loaded({ cemetery }: { cemetery: Cemetery }) {
  const store = useStore();
  const layout = useLayout(cemetery.id);
  const stones = useStones(cemetery.id);
  // Deleted too: merged index records are tombstones named in a person's aliases.
  const people = useLiveQuery(
    () => store.persons.listByCemetery(cemetery.id, { includeDeleted: true }),
    [store, cemetery.id],
  );
  if (!layout || !stones || !people) return null;
  return <MatchView cemetery={cemetery} layout={layout} stones={stones} people={people} />;
}
