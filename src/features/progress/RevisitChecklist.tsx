import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';
import { stonePath } from '../../app/paths';
import type { Cemetery, Monument } from '../../domain';
import { Button } from '../../ui/Button';
import { download, fileSlug } from '../../ui/download';
import type { Layout } from '../cemeteries/useLayout';
import { FLAG_LABEL } from '../stones/attribute-labels';
import { STATUS_LABEL } from '../stones/labels';
import { StatusIcon } from '../stones/StatusIcon';
import { useStoneLabel } from '../stones/useStoneLabel';
import { csvLine, REVISIT_FLAG } from './progress';

/**
 * Stones flagged "needs revisit", in walking order, as a field checklist (plan §11): printable,
 * and downloadable as CSV for a spreadsheet or another phone.
 */
export function RevisitChecklist({
  cemetery,
  stones,
  layout,
}: {
  cemetery: Cemetery;
  stones: Monument[];
  layout: Layout;
}) {
  const { t } = useLingui();
  const rowLabel = useStoneLabel(layout.rows, layout.labelOf);
  const where = (m: Monument) => {
    if (m.address?.rowId) return rowLabel(m);
    if (m.address?.plotLabel) return t`Plot ${m.address.plotLabel}`;
    if (m.legacyGrid) {
      const { row, col } = m.legacyGrid;
      return t`Grid row ${row}, column ${col}`;
    }
    return t`Stone`;
  };
  const otherFlags = (m: Monument) =>
    (m.flags ?? [])
      .filter((f) => f !== REVISIT_FLAG)
      .map((f) => (f in FLAG_LABEL ? t(FLAG_LABEL[f as keyof typeof FLAG_LABEL]) : f));

  const exportCsv = () => {
    const head = csvLine([t`Done`, t`Where`, t`Status`, t`Flags`, t`Notes`]);
    const lines = stones.map((m) =>
      csvLine(['', where(m), t(STATUS_LABEL[m.status]), otherFlags(m).join('; '), m.notes]),
    );
    const text = `${[head, ...lines].join('\r\n')}\r\n`;
    // eslint-disable-next-line lingui/no-unlocalized-strings -- a file name
    download(new File([text], `${fileSlug(cemetery.name)}-revisit.csv`, { type: 'text/csv' }));
  };

  return (
    <section aria-labelledby="revisit" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="revisit" className="text-xl font-semibold">
          <span className="hidden print:inline">{cemetery.name}: </span>
          <Trans>Needs revisit</Trans>{' '}
          <span className="font-normal text-fg-muted">
            (<Plural value={stones.length} one="# stone" other="# stones" />)
          </span>
        </h2>
        {stones.length > 0 ? (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              <Trans>Print checklist</Trans>
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Trans>Download checklist (CSV)</Trans>
            </Button>
          </div>
        ) : null}
      </div>
      {stones.length === 0 ? (
        <p className="text-fg-muted">
          <Trans>
            Nothing to revisit. Stones you skip on a walk, or mark "Needs revisit", show up here.
          </Trans>
        </p>
      ) : (
        <ol aria-label={t`Stones to revisit`} className="flex flex-col">
          {stones.map((m) => {
            const flags = otherFlags(m);
            return (
              <li
                key={m.id}
                className="flex items-start gap-3 border-b border-border py-2 break-inside-avoid"
              >
                <span
                  aria-hidden
                  className="mt-0.5 hidden size-5 shrink-0 border-2 border-fg print:block"
                />
                <StatusIcon status={m.status} size={20} />
                <div className="flex min-w-0 flex-col">
                  <Link
                    to={stonePath(cemetery.id, m.id)}
                    className="font-medium text-primary underline print:text-fg print:no-underline"
                  >
                    {where(m)}
                  </Link>
                  <span className="text-sm text-fg-muted">
                    {[t(STATUS_LABEL[m.status]), ...flags].join(' · ')}
                  </span>
                  {m.notes ? <span className="text-sm">{m.notes}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
