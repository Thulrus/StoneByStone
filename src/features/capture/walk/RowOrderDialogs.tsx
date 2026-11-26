import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../../app/store-context';
import { moveStone } from '../../../data/row-controls';
import { rowStones } from '../../../data/walk';
import type { Monument, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Dialog } from '../../../ui/Dialog';

/** The row's stones in order. */
function useRowOrder(row: Row, open: boolean): Monument[] {
  const store = useStore();
  return (
    useLiveQuery(
      async () =>
        open
          ? (await rowStones(store, row))
              .filter((m) => m.address?.rowIndex !== undefined)
              .sort((a, b) => (a.address?.rowIndex ?? 0) - (b.address?.rowIndex ?? 0))
          : [],
      [store, row.id, row.cemeteryId, open],
    ) ?? []
  );
}

const numberOf = (m: Monument) => (m.address?.rowIndex ?? 0) + 1;

/** Insert: pick where the new stone goes. `at` is the new stone's rowIndex. */
export function InsertDialog({
  row,
  open,
  onOpenChange,
  onPick,
}: {
  row: Row;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (at: number) => void;
}) {
  const stones = useRowOrder(row, open);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Insert a stone</Trans>}
      placement="bottom"
    >
      <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {stones.length > 0 ? (
          <li>
            <Button variant="secondary" className="w-full" onClick={() => onPick(0)}>
              <Trans>Before stone 1</Trans>
            </Button>
          </li>
        ) : null}
        {stones.map((m) => (
          <li key={m.id}>
            <Button variant="secondary" className="w-full" onClick={() => onPick(numberOf(m))}>
              <Trans>After stone {numberOf(m)}</Trans>
            </Button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Reorder: move stones up and down the row, one slot at a time (gloves, keyboard). */
export function ReorderDialog({
  row,
  open,
  onOpenChange,
}: {
  row: Row;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const store = useStore();
  const stones = useRowOrder(row, open);
  const last = stones[stones.length - 1];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Reorder stones</Trans>}
      placement="bottom"
      actions={
        <Button variant="secondary" onClick={() => void store.undo()}>
          <Trans>Undo</Trans>
        </Button>
      }
    >
      <ol
        aria-label={t`Stones in order`}
        className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto"
      >
        {stones.map((m) => {
          const n = numberOf(m);
          return (
            <li key={m.id} className="flex items-center gap-2">
              <span className="flex-1 text-lg">
                <Trans>Stone {n}</Trans>
                {m.flags?.includes('needs-revisit') ? (
                  <span className="ms-2 text-sm text-fg-muted">
                    <Trans>(skipped)</Trans>
                  </span>
                ) : null}
              </span>
              <Button
                variant="secondary"
                aria-label={t`Move stone ${n} earlier`}
                disabled={n === 1}
                onClick={() => void moveStone(store, m.id, -1)}
              >
                <span aria-hidden="true">↑</span>
              </Button>
              <Button
                variant="secondary"
                aria-label={t`Move stone ${n} later`}
                disabled={m === last}
                onClick={() => void moveStone(store, m.id, 1)}
              >
                <span aria-hidden="true">↓</span>
              </Button>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}
