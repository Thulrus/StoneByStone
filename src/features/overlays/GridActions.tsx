import { useLingui } from '@lingui/react/macro';
import { useStore } from '../../app/store-context';
import { gridRowsToRows } from '../../data/legacy-grid';
import type { ID, Overlay } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';

/** What can be done with an imported v1 grid (plan §22.4). */
export function GridActions({ grid, onPin }: { grid: Overlay; onPin: (id: ID) => void }) {
  const { t } = useLingui();
  const store = useStore();
  const makeRows = async () => {
    const rows = await gridRowsToRows(store, grid.cemeteryId);
    const n = rows.length;
    toast({
      title: n ? t`Made ${n} rows from the grid` : t`Every grid stone is already in a row`,
      ...(n ? { action: { label: t`Undo`, onAction: () => void store.undo() } } : {}),
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onPin(grid.id)}>
        {grid.transform ? t`Adjust grid on map` : t`Place grid on map`}
      </Button>
      <Button variant="secondary" onClick={() => void makeRows()}>
        {t`Treat grid rows as cemetery rows`}
      </Button>
    </div>
  );
}
