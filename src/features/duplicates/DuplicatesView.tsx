import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { listDismissed, setDismissed } from '../../data/duplicates';
import {
  findDuplicatePeople,
  findDuplicateStones,
  pairKey,
  type Cemetery,
  type ID,
  type Monument,
  type Person,
} from '../../domain';
import { Button } from '../../ui/Button';
import type { Layout } from '../cemeteries/useLayout';
import { useStoneLabel } from '../stones/useStoneLabel';
import { PersonPair, StonePair } from './PairCards';

const NONE: readonly Person[] = [];

/**
 * Possible duplicates within the cemetery (plan §11): people with alike names and dates, and
 * stones within ~1 m with alike text. Review only: nothing is merged or changed here.
 */
export function DuplicatesView({
  cemetery,
  layout,
  stones,
  people,
}: {
  cemetery: Cemetery;
  layout: Layout;
  stones: Monument[];
  people: Person[];
}) {
  const { t } = useLingui();
  const store = useStore();
  const [showDismissed, setShowDismissed] = useState(false);
  const dismissedList = useLiveQuery(() => listDismissed(store, cemetery.id), [store, cemetery.id]);
  const dismissed = useMemo(() => new Set(dismissedList ?? []), [dismissedList]);
  const where = useStoneLabel(layout.rows, layout.labelOf);

  const data = useMemo(() => {
    const live = people.filter((p) => !p.deleted);
    const byStone = new Map<ID, Person[]>();
    for (const p of live) {
      if (!p.monumentId) continue;
      byStone.set(p.monumentId, [...(byStone.get(p.monumentId) ?? []), p]);
    }
    const stoneById = new Map(stones.map((m) => [m.id, m]));
    return {
      byStone,
      stoneById,
      people: findDuplicatePeople(live),
      stones: findDuplicateStones(stones, byStone),
    };
  }, [people, stones]);

  const keep = (key: string) => showDismissed || !dismissed.has(key);
  const personPairs = data.people.filter((d) => keep(pairKey(d.a.id, d.b.id)));
  const stonePairs = data.stones.filter((d) => keep(pairKey(d.a.id, d.b.id)));
  const hidden = [...data.people, ...data.stones].filter((d) =>
    dismissed.has(pairKey(d.a.id, d.b.id)),
  ).length;

  const props = (key: string) => ({
    cemeteryId: cemetery.id,
    where,
    stoneOf: (id: string | undefined) => (id ? data.stoneById.get(id) : undefined),
    dismissed: dismissed.has(key),
    onDismiss: (d: boolean) => void setDismissed(store, cemetery.id, key, d),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">
          <Trans>Possible duplicates</Trans>
        </h1>
        <p className="text-fg-muted">
          <Trans>
            Nothing here is changed for you. Open the stones to fix or delete a duplicate, or mark a
            pair "Not duplicates" to stop seeing it.
          </Trans>
        </p>
      </div>

      {!showDismissed && hidden > 0 ? (
        <Button variant="secondary" className="self-start" onClick={() => setShowDismissed(true)}>
          <Plural value={hidden} one="Show # dismissed pair" other="Show # dismissed pairs" />
        </Button>
      ) : null}

      <section aria-labelledby="dup-people" className="flex flex-col gap-3">
        <h2 id="dup-people" className="text-xl font-semibold">
          <Trans>People</Trans>{' '}
          <span className="font-normal text-fg-muted">({personPairs.length})</span>
        </h2>
        {personPairs.length === 0 ? (
          <p className="text-fg-muted">
            <Trans>No people look like duplicates.</Trans>
          </p>
        ) : (
          <ul aria-label={t`Possible duplicate people`} className="flex flex-col gap-2">
            {personPairs.map((pair) => {
              const key = pairKey(pair.a.id, pair.b.id);
              return <PersonPair key={key} pair={pair} {...props(key)} />;
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="dup-stones" className="flex flex-col gap-3">
        <h2 id="dup-stones" className="text-xl font-semibold">
          <Trans>Stones</Trans>{' '}
          <span className="font-normal text-fg-muted">({stonePairs.length})</span>
        </h2>
        {stonePairs.length === 0 ? (
          <p className="text-fg-muted">
            <Trans>No stones look like duplicates.</Trans>
          </p>
        ) : (
          <ul aria-label={t`Possible duplicate stones`} className="flex flex-col gap-2">
            {stonePairs.map((pair) => {
              const key = pairKey(pair.a.id, pair.b.id);
              return (
                <StonePair
                  key={key}
                  pair={pair}
                  peopleOf={(id) => data.byStone.get(id) ?? NONE}
                  {...props(key)}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
