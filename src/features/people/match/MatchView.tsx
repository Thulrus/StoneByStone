import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cemeteryPath, peoplePath } from '../../../app/paths';
import { useStore } from '../../../app/store-context';
import {
  attachToStone,
  mergeIntoPerson,
  setNoStoneFound,
  unlink,
  type MatchedItem,
} from '../../../data/index-match';
import type { Cemetery, Monument, Person } from '../../../domain';
import { Button } from '../../../ui/Button';
import { cn } from '../../../ui/cn';
import { toast } from '../../../ui/toast-store';
import type { Layout } from '../../cemeteries/useLayout';
import { personName } from '../search';
import { MatchedList } from './MatchedList';
import { RecordCard, type RecordActions } from './RecordCard';
import { useMatchData } from './useMatchData';

type Tab = 'to-match' | 'no-stone' | 'matched';
const PAGE = 20;

/**
 * Match view (plan §11): imported index records ↔ stones. Each record lists its likely stones
 * (name, dates, place); one click links it. Records with no likely stone point at unmarked or
 * lost graves; "No stone found" sets them aside. Every link and unlink can be undone.
 */
export function MatchView({
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
  const { contexts, toMatch, noStone, matched } = useMatchData(layout, stones, people);
  const [tab, setTab] = useState<Tab>('to-match');
  const [shown, setShown] = useState(PAGE);
  const stoneById = useMemo(() => new Map(stones.map((m) => [m.id, m])), [stones]);

  const done = (title: string) => (p: Promise<void>) =>
    p
      .then(() => toast({ title, action: { label: t`Undo`, onAction: () => void store.undo() } }))
      .catch((e: unknown) =>
        toast({ tone: 'error', title: t`Couldn't save`, description: String(e) }),
      );

  const actions: RecordActions = {
    onMerge: (r, p) => void done(t`Matched ${personName(r)}`)(mergeIntoPerson(store, r.id, p.id)),
    onAttach: (r, stoneId) =>
      void done(t`Matched ${personName(r)}`)(attachToStone(store, r.id, stoneId)),
    onNoStone: (r, none) =>
      void done(none ? t`Set aside ${personName(r)}` : t`Back on the list`)(
        setNoStoneFound(store, r.id, none),
      ),
  };
  const onUnlink = (item: MatchedItem) =>
    void done(t`Unlinked ${personName(item.record)}`)(unlink(store, item));

  const total = toMatch.length + noStone.length + matched.length;
  const list = tab === 'to-match' ? toMatch : noStone;
  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => {
        setTab(id);
        setShown(PAGE);
      }}
      className={cn(
        'min-h-12 rounded-lg px-4',
        tab === id ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">
          <Trans>Match index to stones</Trans>
        </h1>
      </div>
      {total === 0 ? (
        <p className="max-w-prose text-fg-muted">
          <Trans>
            No index records yet. Import a burial index on the{' '}
            <Link to={peoplePath(cemetery.id)} className="text-primary underline">
              People
            </Link>{' '}
            page, then match its records to stones here.
          </Trans>
        </p>
      ) : (
        <>
          <div role="tablist" aria-label={t`Records`} className="flex flex-wrap gap-2">
            {tabButton('to-match', t`To match (${toMatch.length})`)}
            {tabButton('no-stone', t`No stone found (${noStone.length})`)}
            {tabButton('matched', t`Matched (${matched.length})`)}
          </div>
          <div role="tabpanel" className="flex flex-col gap-3">
            {tab === 'matched' ? (
              <MatchedList
                items={matched}
                layout={layout}
                cemeteryId={cemetery.id}
                stoneOf={(id) => (id ? stoneById.get(id) : undefined)}
                onUnlink={onUnlink}
              />
            ) : list.length === 0 ? (
              <p className="text-fg-muted">
                {tab === 'to-match' ? (
                  <Trans>Every record is matched or set aside.</Trans>
                ) : (
                  <Trans>No records set aside.</Trans>
                )}
              </p>
            ) : (
              <>
                {tab === 'no-stone' ? (
                  <p className="max-w-prose">
                    <Trans>
                      Records with no stone found: likely unmarked or lost graves. They stay in the
                      People index.
                    </Trans>
                  </p>
                ) : null}
                <ol className="flex flex-col gap-3">
                  {list.slice(0, shown).map((r) => (
                    <RecordCard
                      key={r.id}
                      record={r}
                      contexts={contexts}
                      layout={layout}
                      cemeteryId={cemetery.id}
                      actions={actions}
                      noStone={tab === 'no-stone'}
                    />
                  ))}
                </ol>
                {list.length > shown ? (
                  <Button
                    variant="secondary"
                    className="self-start"
                    onClick={() => setShown(shown + PAGE)}
                  >
                    <Plural
                      value={list.length - shown}
                      one="Show more (# left)"
                      other="Show more (# left)"
                    />
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
