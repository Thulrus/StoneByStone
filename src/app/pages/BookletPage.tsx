import { useLiveQuery } from 'dexie-react-hooks';
import { coverPhotos, namedContributors } from '../../data/booklet';
import type { Cemetery } from '../../domain';
import { BookletView } from '../../features/booklet/BookletView';
import { useLayout } from '../../features/cemeteries/useLayout';
import { useStones } from '../../features/stones/useStones';
import { useStore } from '../store-context';
import { CemeteryGate } from './CemeteryGate';

export function BookletPage() {
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
  const covers = useLiveQuery(() => coverPhotos(store, cemetery.id), [store, cemetery.id]);
  const contributors = useLiveQuery(
    () =>
      namedContributors(
        store,
        [cemetery, ...(stones ?? []), ...(people ?? [])],
        cemetery.contributors,
      ),
    [store, cemetery, stones, people],
  );
  if (!layout || !stones || !people || !covers || !contributors) return null;
  return (
    <BookletView
      cemetery={cemetery}
      layout={layout}
      stones={stones}
      people={people}
      covers={covers}
      contributors={contributors}
    />
  );
}
