import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cemeteryPath, matchPath } from '../../app/paths';
import { isIndexRecord, type Cemetery, type Monument, type Person } from '../../domain';
import { Button } from '../../ui/Button';
import type { Layout } from '../cemeteries/useLayout';
import { IndexImport } from './index-import/IndexImport';
import { PeopleFiltersPanel } from './PeopleFiltersPanel';
import { PersonResult } from './PersonResult';
import { activeFilterCount, buildPeopleIndex, type PeopleFilters } from './search';

const PAGE = 100;

/** The cemetery's people index (plan §6 "People", §11 search). */
export function PeopleView({
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
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PeopleFilters>({});
  const [shown, setShown] = useState(PAGE);
  const [importing, setImporting] = useState(false);
  const index = useMemo(
    () => buildPeopleIndex(people, stones, layout.rows),
    [people, stones, layout.rows],
  );
  // Typing stays responsive on a big cemetery; the list catches up.
  const q = useDeferredValue(query);
  const f = useDeferredValue(filters);
  const hits = useMemo(() => index.search(q, f), [index, q, f]);
  const total = hits.length;
  const toMatch = useMemo(
    () =>
      people.filter(
        (p) =>
          !p.deleted && !p.monumentId && isIndexRecord(p) && p.matchStatus !== 'no-stone-found',
      ).length,
    [people],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
            <Trans>Back to {cemetery.name}</Trans>
          </Link>
          <h1 className="text-2xl font-bold">
            <Trans>People</Trans>
          </h1>
        </div>
        {!importing ? (
          <div className="flex flex-wrap gap-2">
            {toMatch > 0 ? (
              <Link
                to={matchPath(cemetery.id)}
                className="inline-flex min-h-12 items-center rounded-lg bg-primary px-4 font-medium text-primary-fg"
              >
                <Trans>Match to stones ({toMatch})</Trans>
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Trans>Import an index (CSV)</Trans>
            </Button>
          </div>
        ) : null}
      </div>
      {importing ? (
        <IndexImport cemetery={cemetery} onDone={() => setImporting(false)} />
      ) : index.size === 0 ? (
        <p className="text-fg-muted">
          <Trans>
            No people yet. Names appear here as stones are transcribed, or import a burial index
            from a historical society.
          </Trans>
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="font-medium">
              <Trans>Search names, inscriptions and notes</Trans>
            </span>
            <input
              type="search"
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setShown(PAGE);
              }}
              placeholder={t`e.g. Smith, Wm Peck, blacksmith`}
              className="min-h-12 rounded-lg bg-surface px-3 text-base text-fg sbs-border"
            />
          </label>
          <PeopleFiltersPanel
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setShown(PAGE);
            }}
            sections={layout.sections}
            stones={stones}
          />
          <p aria-live="polite" className="text-fg-muted">
            {query.trim() || activeFilterCount(filters) > 0 ? (
              <Plural value={total} one="# person found" other="# people found" />
            ) : (
              <Plural value={total} one="# person" other="# people" />
            )}
          </p>
          <ul aria-label={t`People`} className="flex flex-col">
            {hits.slice(0, shown).map((h) => (
              <PersonResult key={h.person.id} hit={h} cemeteryId={cemetery.id} layout={layout} />
            ))}
          </ul>
          {total > shown ? (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setShown(shown + PAGE)}
            >
              <Trans>Show more</Trans>
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
