import { Trans, useLingui } from '@lingui/react/macro';
import { useStore } from '../../../app/store-context';
import { moveStone } from '../../../data/row-controls';
import { moveToRow } from '../../../data/stone-edit';
import type { Monument, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { AttributeChips, type AttributeGroup } from '../AttributeChips';

/** Type, material, condition, flags, and the stone's place in its row. */
export function AttributesSection({
  stone,
  rows,
  labelOf,
}: {
  stone: Monument;
  rows: readonly Row[];
  labelOf: (r: Row) => string;
}) {
  const { t } = useLingui();
  const store = useStore();
  const groups: [AttributeGroup, string][] = [
    ['kind', t`Type`],
    ['material', t`Material`],
    ['condition', t`Condition`],
    ['flags', t`Flags`],
  ];
  const index = stone.address?.rowIndex;
  const n = index === undefined ? 0 : index + 1;
  return (
    <section aria-labelledby="stone-attributes" className="flex flex-col gap-4">
      <h2 id="stone-attributes" className="text-xl font-semibold">
        <Trans>Details</Trans>
      </h2>
      {groups.map(([g, label]) => (
        <fieldset key={g} className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{label}</legend>
          <AttributeChips
            monument={stone}
            group={g}
            wrap
            onPatch={(patch) => void store.monuments.update(stone.id, patch)}
          />
        </fieldset>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-medium">
            <Trans>Row</Trans>
          </span>
          <select
            className="min-h-12 rounded-lg bg-surface-2 px-3"
            value={stone.address?.rowId ?? ''}
            onChange={(e) => void moveToRow(store, stone.id, e.currentTarget.value || undefined)}
          >
            <option value="">{t`No row`}</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {labelOf(r)}
              </option>
            ))}
          </select>
        </label>
        {index !== undefined ? (
          <>
            <span className="min-h-12 content-center px-2">
              <Trans>Stone {n} in the row</Trans>
            </span>
            <Button
              variant="secondary"
              disabled={index === 0}
              onClick={() => void moveStone(store, stone.id, -1)}
            >
              <Trans>Earlier</Trans>
            </Button>
            <Button variant="secondary" onClick={() => void moveStone(store, stone.id, 1)}>
              <Trans>Later</Trans>
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}
