import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { stonePath } from '../../../app/paths';
import { rankStones, type MatchCandidate, type Person, type StoneContext } from '../../../domain';
import { Button } from '../../../ui/Button';
import type { Layout } from '../../cemeteries/useLayout';
import { STATUS_LABEL } from '../../stones/labels';
import { StatusIcon } from '../../stones/StatusIcon';
import { useStoneLabel } from '../../stones/useStoneLabel';
import { personName } from '../search';
import { useRecordLine } from './useRecordLine';

export interface RecordActions {
  onMerge: (record: Person, person: Person) => void;
  onAttach: (record: Person, stoneId: string) => void;
  onNoStone: (record: Person, none: boolean) => void;
}

/** One index record with its likely stones, best first, and what can be done with it. */
export function RecordCard({
  record,
  contexts,
  layout,
  cemeteryId,
  actions,
  noStone,
}: {
  record: Person;
  contexts: readonly StoneContext[];
  layout: Layout;
  cemeteryId: string;
  actions: RecordActions;
  noStone?: boolean;
}) {
  const { t } = useLingui();
  const line = useRecordLine();
  const candidates = useMemo(
    () => (noStone ? [] : rankStones(record, contexts)),
    [record, contexts, noStone],
  );
  const name = personName(record) || t`(no name)`;
  return (
    <li className="flex flex-col gap-2 rounded-xl p-3 sbs-border" aria-label={name}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{name}</span>
          <span className="text-sm text-fg-muted">{line(record)}</span>
        </div>
        <Button variant="ghost" onClick={() => actions.onNoStone(record, !noStone)}>
          {noStone ? <Trans>Look for a stone again</Trans> : <Trans>No stone found</Trans>}
        </Button>
      </div>
      {noStone ? null : candidates.length === 0 ? (
        <p className="text-sm">
          <Trans>No likely stone yet. It may be an unmarked or lost grave.</Trans>
        </p>
      ) : (
        <ul aria-label={t`Likely stones for ${name}`} className="flex flex-col gap-2">
          {candidates.map((c) => (
            <Candidate
              key={c.stone.id}
              c={c}
              record={record}
              layout={layout}
              cemeteryId={cemeteryId}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function Candidate({
  c,
  record,
  layout,
  cemeteryId,
  actions,
}: {
  c: MatchCandidate;
  record: Person;
  layout: Layout;
  cemeteryId: string;
  actions: RecordActions;
}) {
  const { t } = useLingui();
  const where = useStoneLabel(layout.rows, layout.labelOf);
  const line = useRecordLine();
  const { person, reasons } = c;
  const chips: ReactNode[] = [];
  if (reasons.name >= 0.95) chips.push(t`same name`);
  else if (reasons.name >= 0.6) chips.push(t`similar name`);
  if (reasons.date !== undefined && reasons.date >= 0.95) chips.push(t`same year`);
  else if (reasons.date !== undefined && reasons.date > 0) chips.push(t`close year`);
  if (reasons.place !== undefined && reasons.place >= 0.95) chips.push(t`same place`);
  else if (reasons.place !== undefined && reasons.place > 0) chips.push(t`place partly agrees`);
  const label = where(c.stone);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 p-2">
      <div className="flex min-w-0 flex-col">
        <Link
          to={stonePath(cemeteryId, c.stone.id)}
          className="flex items-center gap-1.5 font-medium text-primary underline"
        >
          <StatusIcon status={c.stone.status} size={18} />
          {label}
          <span className="sr-only">, {t(STATUS_LABEL[c.stone.status])}</span>
        </Link>
        {person ? (
          <span className="text-sm">
            {personName(person)}
            {line(person) ? <span className="text-fg-muted"> · {line(person)}</span> : null}
          </span>
        ) : (
          <span className="text-sm text-fg-muted">
            <Trans>No one entered on this stone yet</Trans>
          </span>
        )}
        <span className="text-sm text-fg-muted">{chips.join(' · ')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {person ? (
          <Button size="md" onClick={() => actions.onMerge(record, person)}>
            <Trans>Same person</Trans>
          </Button>
        ) : null}
        <Button
          size="md"
          variant={person ? 'secondary' : 'primary'}
          onClick={() => actions.onAttach(record, c.stone.id)}
          aria-label={person ? t`Add to ${label} as another person` : t`Put on ${label}`}
        >
          {person ? <Trans>Another person here</Trans> : <Trans>On this stone</Trans>}
        </Button>
      </div>
    </li>
  );
}
