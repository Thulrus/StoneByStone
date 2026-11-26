import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { addRows } from '../../../data/layout';
import { setRowStart } from '../../../data/walk';
import type { ID, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { RadioGroup } from '../../../ui/RadioGroup';
import { Sheet } from '../../../ui/Sheet';
import { toast } from '../../../ui/toast-store';
import { quickFix } from '../gps';

export type WalkMode = 'draw' | 'gps' | 'name';

export interface WalkStartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cemeteryId: ID;
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  counts: ReadonlyMap<ID, number>;
  /** `draw`: the caller opens the row drawer first, then starts the walk. */
  onStart: (rowId: ID, mode: WalkMode | 'line') => void;
}

// eslint-disable-next-line lingui/no-unlocalized-strings -- an option value, never shown
const NEW = '__new__';

/** Pick or create the row to walk, and how its line is set (plan §7.2 step 1). */
export function WalkStart({
  open,
  onOpenChange,
  cemeteryId,
  rows,
  labelOf,
  counts,
  onStart,
}: WalkStartProps) {
  const { t } = useLingui();
  const store = useStore();
  const [choice, setChoice] = useState<string>(() => rows[0]?.id ?? NEW);
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<WalkMode>('gps');
  const [busy, setBusy] = useState(false);
  const picked = rows.find((r) => r.id === choice);
  const needsLine = !picked?.line;

  const start = async () => {
    setBusy(true);
    try {
      let rowId = picked?.id;
      if (!rowId) {
        const [row] = await addRows(store, cemeteryId, null, [
          label.trim() || String(rows.length + 1),
        ]);
        rowId = row?.id;
      }
      if (!rowId) return;
      if (!needsLine) return onStart(rowId, 'line');
      if (mode === 'gps') {
        const fix = await quickFix(15_000);
        if (fix) await setRowStart(store, rowId, fix);
        else
          toast({ title: t`Couldn't get your location; set the row start later`, tone: 'error' });
      }
      onStart(rowId, mode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t`Walk a row`}
      actions={
        <Button size="lg" disabled={busy} onClick={() => void start()}>
          {mode === 'gps' && needsLine ? <Trans>Row start here</Trans> : <Trans>Start</Trans>}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          legend={t`Row`}
          name="walk-row"
          value={choice}
          onChange={setChoice}
          options={[
            ...rows.map((r) => {
              const name = labelOf(r);
              const n = counts.get(r.id) ?? 0;
              return { value: r.id, label: t`Row ${name} (${n} stones)` };
            }),
            { value: NEW, label: t`New row` },
          ]}
        />
        {choice === NEW ? (
          <Field
            label={t`Row name`}
            value={label}
            placeholder={String(rows.length + 1)}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
        ) : null}
        {needsLine ? (
          <RadioGroup
            legend={t`Where is the row?`}
            name="walk-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'gps', label: t`I'm standing at the row start (GPS)` },
              { value: 'draw', label: t`Draw it on the map` },
              { value: 'name', label: t`Just name it; place it later` },
            ]}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
