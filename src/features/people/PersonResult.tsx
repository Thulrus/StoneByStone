import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';
import { stonePath } from '../../app/paths';
import { formatDate } from '../../domain';
import type { Layout } from '../cemeteries/useLayout';
import { STATUS_LABEL } from '../stones/labels';
import { StatusIcon } from '../stones/StatusIcon';
import { useStoneLabel } from '../stones/useStoneLabel';
import { personName, type PersonHit } from './search';

/** One person in the People list: name, dates, and the stone they are on. */
export function PersonResult({
  hit,
  cemeteryId,
  layout,
}: {
  hit: PersonHit;
  cemeteryId: string;
  layout: Layout;
}) {
  const { t } = useLingui();
  const where = useStoneLabel(layout.rows, layout.labelOf);
  const { person: p, stone } = hit;
  const born = p.birth ? formatDate(p.birth) : '';
  const died = p.death ? formatDate(p.death) : '';
  const dates = born || died ? `${born || '?'} – ${died || '?'}` : '';
  const name = personName(p) || t`(no name)`;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-2">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">
          {name}
          {p.military ? (
            <span className="ms-2 text-sm text-fg-muted">
              <Trans>veteran</Trans>
            </span>
          ) : null}
        </span>
        {dates || p.relationshipText ? (
          <span className="text-sm text-fg-muted">
            {[dates, p.relationshipText].filter(Boolean).join(' · ')}
          </span>
        ) : null}
      </div>
      {stone ? (
        <Link
          to={stonePath(cemeteryId, stone.id)}
          className="flex items-center gap-1.5 text-primary underline"
          aria-label={t`${name}: ${where(stone)}, ${t(STATUS_LABEL[stone.status])}`}
        >
          <StatusIcon status={stone.status} size={18} />
          {where(stone)}
        </Link>
      ) : (
        <span className="text-sm text-fg-muted">
          <Trans>No stone (index record)</Trans>
        </span>
      )}
    </li>
  );
}
