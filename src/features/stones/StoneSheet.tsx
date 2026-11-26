import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import type { Monument, Row } from '../../domain';
import { Sheet } from '../../ui/Sheet';
import { STATUS_LABEL } from './labels';
import { StatusIcon } from './StatusIcon';

export interface StoneSheetProps {
  stone: Monument | undefined;
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  onClose: () => void;
}

/** Summary of the selected stone in a bottom sheet (full stone detail is #42). */
export function StoneSheet({ stone, rows, labelOf, onClose }: StoneSheetProps) {
  const { t } = useLingui();
  const store = useStore();
  const people = useLiveQuery(
    async () => (stone ? store.persons.byMonument(stone.id) : []),
    [store, stone?.id],
  );
  const row = rows.find((r) => r.id === stone?.address?.rowId);
  const names = (people ?? []).map(
    (p) =>
      p.name.asCarved ||
      [p.name.given, p.name.surname].filter(Boolean).join(' ') ||
      t`Unnamed person`,
  );

  let where = '';
  if (row) {
    const index = stone?.address?.rowIndex;
    const rowName = labelOf(row);
    where = index === undefined ? t`Row ${rowName}` : t`Row ${rowName}, stone ${index + 1}`;
  } else if (stone?.legacyGrid) {
    const r = stone.legacyGrid.row + 1;
    const c = stone.legacyGrid.col + 1;
    where = t`v1 grid row ${r}, column ${c}`;
  }

  return (
    <Sheet
      open={stone !== undefined}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={
        names[0] ?? (stone?.address?.plotLabel ? t`Plot ${stone.address.plotLabel}` : t`Stone`)
      }
      description={where || undefined}
    >
      {stone ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 font-medium">
            <StatusIcon status={stone.status} />
            {t(STATUS_LABEL[stone.status])}
          </p>
          {names.length > 1 ? (
            <ul className="list-inside list-disc">
              {names.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
          {stone.inscription?.text ? (
            <p className="whitespace-pre-line text-fg-muted">{stone.inscription.text}</p>
          ) : null}
          {stone.position ? null : (
            <p className="text-fg-muted">
              <Trans>Not placed on the map yet.</Trans>
            </p>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
