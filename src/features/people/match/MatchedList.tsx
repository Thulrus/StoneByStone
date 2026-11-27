import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';
import { stonePath } from '../../../app/paths';
import type { MatchedItem } from '../../../data/index-match';
import type { Monument } from '../../../domain';
import { Button } from '../../../ui/Button';
import type { Layout } from '../../cemeteries/useLayout';
import { useStoneLabel } from '../../stones/useStoneLabel';
import { personName } from '../search';
import { useRecordLine } from './useRecordLine';

/** Index records already on a stone, each with Unlink. */
export function MatchedList({
  items,
  layout,
  cemeteryId,
  stoneOf,
  onUnlink,
}: {
  items: readonly MatchedItem[];
  layout: Layout;
  cemeteryId: string;
  stoneOf: (id: string | undefined) => Monument | undefined;
  onUnlink: (item: MatchedItem) => void;
}) {
  const { t } = useLingui();
  const where = useStoneLabel(layout.rows, layout.labelOf);
  const line = useRecordLine();
  if (items.length === 0) {
    return (
      <p className="text-fg-muted">
        <Trans>Nothing matched yet.</Trans>
      </p>
    );
  }
  return (
    <ul aria-label={t`Matched records`} className="flex flex-col">
      {items.map((item) => {
        const stone = stoneOf(item.person.monumentId);
        const name = personName(item.record) || t`(no name)`;
        const on = personName(item.person);
        return (
          <li
            key={`${item.person.id}:${item.record.id}`}
            aria-label={name}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"
          >
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{name}</span>
              <span className="text-sm text-fg-muted">{line(item.record)}</span>
              <span className="text-sm">
                {stone ? (
                  <Link to={stonePath(cemeteryId, stone.id)} className="text-primary underline">
                    {where(stone)}
                  </Link>
                ) : null}
                {item.kind === 'merged' && on ? (
                  <>
                    {' · '}
                    <Trans>same person as {on}</Trans>
                  </>
                ) : null}
              </span>
            </div>
            <Button variant="secondary" onClick={() => onUnlink(item)}>
              <Trans>Unlink</Trans>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
