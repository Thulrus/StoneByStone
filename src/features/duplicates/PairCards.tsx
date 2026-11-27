import { Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { stonePath } from '../../app/paths';
import { formatDate, type Monument, type Person, type PersonDuplicate } from '../../domain';
import type { StoneDuplicate } from '../../domain';
import { Button } from '../../ui/Button';
import { personName } from '../people/search';
import { STATUS_LABEL } from '../stones/labels';
import { StatusIcon } from '../stones/StatusIcon';

export interface PairProps {
  cemeteryId: string;
  where: (m: Monument | undefined) => string;
  stoneOf: (id: string | undefined) => Monument | undefined;
  dismissed: boolean;
  onDismiss: (dismissed: boolean) => void;
}

function Card({
  children,
  reasons,
  dismissed,
  onDismiss,
}: {
  children: ReactNode;
  reasons: string;
  dismissed: boolean;
  onDismiss: (dismissed: boolean) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-fg-muted">{reasons}</span>
        <Button variant="secondary" onClick={() => onDismiss(!dismissed)}>
          {dismissed ? <Trans>Ask again</Trans> : <Trans>Not duplicates</Trans>}
        </Button>
      </div>
    </li>
  );
}

function StoneLink({
  cemeteryId,
  stone,
  label,
}: {
  cemeteryId: string;
  stone: Monument;
  label: string;
}) {
  return (
    <Link
      to={stonePath(cemeteryId, stone.id)}
      className="flex items-center gap-1.5 text-primary underline"
    >
      <StatusIcon status={stone.status} size={18} />
      {label}
    </Link>
  );
}

function PersonSide({
  p,
  ...props
}: { p: Person } & Pick<PairProps, 'cemeteryId' | 'where' | 'stoneOf'>) {
  const { t } = useLingui();
  const stone = props.stoneOf(p.monumentId);
  const born = p.birth ? formatDate(p.birth) : '';
  const died = p.death ? formatDate(p.death) : p.burial ? formatDate(p.burial) : '';
  const dates = born || died ? `${born || '?'} – ${died || '?'}` : t`No dates`;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="font-medium">{personName(p) || t`(no name)`}</span>
      <span className="text-sm text-fg-muted">{dates}</span>
      {stone ? (
        <StoneLink cemeteryId={props.cemeteryId} stone={stone} label={props.where(stone)} />
      ) : (
        <span className="text-sm text-fg-muted">
          <Trans>No stone (index record)</Trans>
        </span>
      )}
    </div>
  );
}

export function PersonPair({ pair, ...props }: { pair: PersonDuplicate } & PairProps) {
  const { t } = useLingui();
  const name = Math.round(pair.name * 100);
  const reasons =
    pair.date === undefined
      ? t`Same name · no dates to compare`
      : t`Name ${name}% alike · dates agree`;
  return (
    <Card reasons={reasons} dismissed={props.dismissed} onDismiss={props.onDismiss}>
      <PersonSide p={pair.a} {...props} />
      <PersonSide p={pair.b} {...props} />
    </Card>
  );
}

function StoneSide({
  m,
  people,
  ...props
}: { m: Monument; people: readonly Person[] } & Pick<PairProps, 'cemeteryId' | 'where'>) {
  const { t } = useLingui();
  const text = people.map(personName).filter(Boolean).join('; ') || m.inscription?.text || '';
  return (
    <div className="flex min-w-0 flex-col">
      <StoneLink cemeteryId={props.cemeteryId} stone={m} label={props.where(m)} />
      <span className="text-sm text-fg-muted">{t(STATUS_LABEL[m.status])}</span>
      <span className="line-clamp-2 text-sm">{text}</span>
    </div>
  );
}

export function StonePair({
  pair,
  peopleOf,
  ...props
}: { pair: StoneDuplicate; peopleOf: (id: string) => readonly Person[] } & PairProps) {
  const { t } = useLingui();
  const metres = pair.distanceM.toFixed(1);
  const alike = Math.round(pair.similarity * 100);
  return (
    <Card
      reasons={t`${metres} m apart · text ${alike}% alike`}
      dismissed={props.dismissed}
      onDismiss={props.onDismiss}
    >
      <StoneSide m={pair.a} people={peopleOf(pair.a.id)} {...props} />
      <StoneSide m={pair.b} people={peopleOf(pair.b.id)} {...props} />
    </Card>
  );
}
