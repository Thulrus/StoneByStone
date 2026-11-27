import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import type { Cemetery, Monument } from '../../domain';
import type { Layout } from '../cemeteries/useLayout';
import { STATUS_LABEL } from '../stones/labels';
import { StatusIcon } from '../stones/StatusIcon';
import { StatusLegend } from '../stones/StatusLegend';
import {
  buildProgress,
  donePercent,
  percent,
  revisitList,
  STATUSES,
  type StatusCounts,
} from './progress';
import { RevisitChecklist } from './RevisitChecklist';
import { StatusBar } from './StatusBar';

/** Progress dashboard (plan §11): status per section and row, and the revisit checklist. */
export function ProgressView({
  cemetery,
  layout,
  stones,
}: {
  cemetery: Cemetery;
  layout: Layout;
  stones: Monument[];
}) {
  const { t } = useLingui();
  const progress = useMemo(
    () => buildProgress(stones, layout.sections, layout.rowsBySection),
    [stones, layout],
  );
  const revisit = useMemo(() => revisitList(stones, layout.rows), [stones, layout.rows]);
  const { counts } = progress;
  const done = donePercent(counts);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1 print:hidden">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">
          <Trans>Progress</Trans>
        </h1>
      </div>

      <section
        aria-labelledby="progress-total"
        className="flex min-w-0 flex-col gap-3 print:hidden"
      >
        <h2 id="progress-total" className="sr-only">
          <Trans>Whole cemetery</Trans>
        </h2>
        <p className="text-lg">
          <Plural value={counts.total} one="# stone" other="# stones" /> ·{' '}
          <Trans>{done}% transcribed</Trans>
        </p>
        <StatusBar counts={counts} className="h-4" />
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {STATUSES.map((s) => {
            const n = counts[s];
            const p = percent(counts, s);
            return (
              <li key={s} className="flex items-center gap-1.5">
                <StatusIcon status={s} size={18} />
                {t(STATUS_LABEL[s])}: {n} ({p}%)
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="progress-rows" className="flex min-w-0 flex-col gap-3 print:hidden">
        <h2 id="progress-rows" className="text-xl font-semibold">
          <Trans>By section and row</Trans>
        </h2>
        <StatusLegend />
        {progress.sections.length === 0 ? (
          <p className="text-fg-muted">
            <Trans>No rows yet. Add them on the Setup tab.</Trans>
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-start">
              <thead>
                <tr className="text-sm text-fg-muted">
                  <th scope="col" className="py-1 pe-3 text-start font-medium">
                    <Trans>Row</Trans>
                  </th>
                  <th scope="col" className="py-1 pe-3 text-end font-medium">
                    <Trans>Stones</Trans>
                  </th>
                  {STATUSES.map((s) => (
                    <th key={s} scope="col" className="py-1 pe-3 text-end font-medium">
                      {t(STATUS_LABEL[s])}
                    </th>
                  ))}
                  <th scope="col" className="w-1/4 py-1 font-medium">
                    <span className="sr-only">
                      <Trans>Bar</Trans>
                    </span>
                  </th>
                </tr>
              </thead>
              {progress.sections.map((g) => (
                <tbody key={g.section?.id ?? ''}>
                  <Line
                    head
                    name={g.section ? t`Section ${g.section.name}` : t`Rows with no section`}
                    counts={g.counts}
                  />
                  {g.rows.map((r) => (
                    <Line key={r.row.id} name={layout.labelOf(r.row)} counts={r.counts} />
                  ))}
                </tbody>
              ))}
              {progress.unplaced.total > 0 ? (
                <tbody>
                  <Line head name={t`Not in a row`} counts={progress.unplaced} />
                </tbody>
              ) : null}
            </table>
          </div>
        )}
      </section>

      <RevisitChecklist cemetery={cemetery} stones={revisit} layout={layout} />
    </div>
  );
}

function Line({ name, counts, head }: { name: string; counts: StatusCounts; head?: boolean }) {
  return (
    <tr className={head ? 'border-t border-border font-semibold' : undefined}>
      <th
        scope="row"
        className={
          head
            ? 'py-2 pe-3 text-start whitespace-nowrap'
            : 'py-1 ps-4 pe-3 text-start font-normal whitespace-nowrap'
        }
      >
        {name}
      </th>
      <td className="py-1 pe-3 text-end tabular-nums">{counts.total}</td>
      {STATUSES.map((s) => (
        <td key={s} className="py-1 pe-3 text-end tabular-nums">
          {counts[s]}
          <span className="text-sm text-fg-muted"> ({percent(counts, s)}%)</span>
        </td>
      ))}
      <td className="py-1">
        <StatusBar counts={counts} className="h-3" />
      </td>
    </tr>
  );
}
