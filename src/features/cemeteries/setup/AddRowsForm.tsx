import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../../app/store-context';
import { addRows } from '../../../data/layout';
import { labelSeries, nextLabel, type ID } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';

export interface AddRowsFormProps {
  cemeteryId: ID;
  sectionId: ID | null;
  /** Label of the last row in this group, to continue its series. */
  lastLabel?: string;
}

/** Add one or many rows: "1" × 12 gives rows 1–12, "A" × 3 gives A–C, free text gives one. */
export function AddRowsForm({ cemeteryId, sectionId, lastLabel }: AddRowsFormProps) {
  const { t } = useLingui();
  const store = useStore();
  const suggested = (lastLabel === undefined ? '1' : nextLabel(lastLabel)) ?? '';
  const [first, setFirst] = useState<string>();
  const [count, setCount] = useState('1');
  const label = first ?? suggested;
  const n = Math.max(1, Math.min(200, Math.floor(Number(count)) || 1));
  const series = labelSeries(label, n);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (series.length === 0) return;
    await addRows(store, cemeteryId, sectionId, series);
    setFirst(undefined);
    setCount('1');
  };

  const last = series[series.length - 1];
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-2">
      <Field
        className="w-32"
        label={t`First row`}
        value={label}
        onChange={(e) => setFirst(e.target.value)}
      />
      <Field
        className="w-20"
        label={t`How many`}
        value={count}
        inputMode="numeric"
        onChange={(e) => setCount(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={series.length === 0}>
        {series.length > 1 ? (
          <Trans>
            Add rows {series[0]}–{last}
          </Trans>
        ) : (
          <Trans>Add row</Trans>
        )}
      </Button>
    </form>
  );
}
