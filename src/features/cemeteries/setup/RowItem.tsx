import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { moveRow, setRowSection } from '../../../data/layout';
import type { ID, Row, Section } from '../../../domain';
import { Button } from '../../../ui/Button';
import { cn } from '../../../ui/cn';
import { toast } from '../../../ui/toast-store';
import { TextPrompt } from './TextPrompt';

export interface RowItemProps {
  row: Row;
  sections: readonly Section[];
  stones: number;
  first: boolean;
  last: boolean;
  active: boolean;
  onSelect: (id: ID) => void;
  onDraw: (id: ID) => void;
}

export function RowItem(props: RowItemProps) {
  const { row, sections, stones, first, last, active, onSelect, onDraw } = props;
  const { t } = useLingui();
  const store = useStore();
  const [renaming, setRenaming] = useState(false);

  const remove = async () => {
    await store.rows.delete(row.id);
    toast({
      title: t`Deleted row ${row.label}`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1',
        active && 'bg-surface-2',
      )}
    >
      <button
        type="button"
        className="min-h-12 min-w-24 flex-1 text-start"
        aria-pressed={active}
        onClick={() => onSelect(row.id)}
      >
        <span className="font-semibold">{row.label}</span>{' '}
        <span className="text-sm text-fg-muted">
          {row.line ? t`on map` : t`no line`} ·{' '}
          <Plural value={stones} one="# stone" other="# stones" />
        </span>
      </button>
      <Button
        variant="ghost"
        aria-label={t`Move row ${row.label} up`}
        disabled={first}
        onClick={() => void moveRow(store, row, -1)}
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        aria-label={t`Move row ${row.label} down`}
        disabled={last}
        onClick={() => void moveRow(store, row, 1)}
      >
        ↓
      </Button>
      <Button variant="secondary" onClick={() => onDraw(row.id)}>
        {row.line ? <Trans>Edit line</Trans> : <Trans>Draw line</Trans>}
      </Button>
      <details className="relative">
        <summary
          className="flex min-h-12 cursor-pointer items-center px-3"
          aria-label={t`More for row ${row.label}`}
        >
          ⋯
        </summary>
        <div className="absolute end-0 z-20 flex w-56 flex-col gap-1 rounded-lg bg-surface p-2 shadow-lg">
          <Button variant="ghost" onClick={() => setRenaming(true)}>
            <Trans>Rename</Trans>
          </Button>
          {sections.length > 0 ? (
            <label className="flex flex-col gap-1 px-3 text-sm">
              <Trans>Section</Trans>
              <select
                className="min-h-12 rounded-lg border border-border bg-bg px-2"
                value={row.sectionId ?? ''}
                onChange={(e) => void setRowSection(store, row, e.target.value || null)}
              >
                <option value="">{t`No section`}</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button variant="danger" onClick={() => void remove()}>
            <Trans>Delete row</Trans>
          </Button>
        </div>
      </details>
      {renaming ? (
        <TextPrompt
          title={t`Rename row`}
          label={t`Row label`}
          initial={row.label}
          onSubmit={(label) => void store.rows.update(row.id, { label })}
          onClose={() => setRenaming(false)}
        />
      ) : null}
    </li>
  );
}
