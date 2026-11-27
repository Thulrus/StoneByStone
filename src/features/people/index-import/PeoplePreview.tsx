import { Plural, Trans, useLingui } from '@lingui/react/macro';
import type { IndexImportResult } from '../../../data/format/index-csv';
import { formatDate } from '../../../domain';
import { personName } from '../search';

const SHOWN = 5;

/** The first people the import will make, as they will read, and what will be skipped. */
export function PeoplePreview({ result }: { result: IndexImportResult }) {
  const { t } = useLingui();
  const { people, skipped } = result;
  const lines = skipped.slice(0, 10).join(', ');
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">
        <Trans>What will be imported</Trans>
      </h3>
      {people.length === 0 ? (
        <p className="text-fg-muted">
          <Trans>No names yet. Mark the column (or columns) that hold names.</Trans>
        </p>
      ) : (
        <ol aria-label={t`Preview`} className="flex flex-col">
          {people.slice(0, SHOWN).map((p, i) => {
            const loc = p.sources?.[0]?.location;
            const where = [
              loc?.section && t`Section ${loc.section}`,
              loc?.row && t`Row ${loc.row}`,
              loc?.plot && t`Plot ${loc.plot}`,
            ]
              .filter(Boolean)
              .join(', ');
            const born = p.birth ? formatDate(p.birth) : '';
            const died = p.death ? formatDate(p.death) : '';
            const dates = born || died ? `${born || '?'} – ${died || '?'}` : '';
            return (
              <li key={i} className="border-b border-border py-1.5">
                <span className="font-medium">{personName(p) || t`(no name)`}</span>
                {[dates, where].filter(Boolean).length > 0 ? (
                  <span className="text-sm text-fg-muted">
                    {' · '}
                    {[dates, where].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {people.length > SHOWN ? (
        <p className="text-sm text-fg-muted">
          <Plural value={people.length - SHOWN} one="…and # more" other="…and # more" />
        </p>
      ) : null}
      {skipped.length > 0 ? (
        <p className="text-sm">
          <Plural
            value={skipped.length}
            one={`# row has no name and will be skipped (line ${lines}).`}
            other={`# rows have no name and will be skipped (lines ${lines}).`}
          />
        </p>
      ) : null}
    </div>
  );
}
