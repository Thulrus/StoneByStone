import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, type ReactNode } from 'react';
import type { ID, MapFeature, Monument, Overlay, Row, Section } from '../../domain';
import { StatusLegend } from '../stones/StatusLegend';
import { LegacyGridView } from './LegacyGridView';
import { groupStones, type Slot } from './schematic';
import { GapSlot, StoneButton } from './StoneButton';

export interface SchematicViewProps {
  sections: readonly Section[];
  rowsBySection: Map<ID | null, Row[]>;
  labelOf: (r: Row) => string;
  stones: readonly Monument[];
  /** The unpinned v1 grid, if any. */
  grid?: Overlay;
  features?: readonly MapFeature[];
  selectedId?: ID;
  onSelect: (id: ID) => void;
  /** Buttons for the v1 grid (pin it, make rows). */
  gridActions?: ReactNode;
}

/** Sections → rows → stones in order, as a diagram that needs no coordinates (plan §7.5). */
export function SchematicView(props: SchematicViewProps) {
  const { sections, rowsBySection, labelOf, stones, selectedId, onSelect } = props;
  const { t } = useLingui();
  const rowIds = useMemo(
    () => new Set([...rowsBySection.values()].flat().map((r) => r.id)),
    [rowsBySection],
  );
  const groups = useMemo(() => groupStones(stones, rowIds), [stones, rowIds]);

  const rowLine = (row: Row) => {
    const slots: Slot[] = groups.byRow.get(row.id) ?? [];
    const name = labelOf(row);
    let n = 0;
    return (
      <li key={row.id} className="flex items-center gap-2 [content-visibility:auto]">
        <span className="w-20 shrink-0 truncate font-semibold" title={name}>
          {row.label}
        </span>
        <div className="flex min-h-12 flex-1 gap-1 overflow-x-auto py-1">
          {slots.length === 0 ? (
            <span className="self-center text-fg-muted">
              <Trans>No stones yet</Trans>
            </span>
          ) : (
            slots.map((m, i) => {
              if (!m) return <GapSlot key={`gap-${i}`} />;
              n++;
              return (
                <StoneButton
                  key={m.id}
                  stone={m}
                  place={t`Row ${name}, stone ${n}`}
                  selected={m.id === selectedId}
                  onSelect={onSelect}
                />
              );
            })
          )}
        </div>
      </li>
    );
  };

  const block = (key: ID | null, heading?: string) => {
    const rows = rowsBySection.get(key) ?? [];
    if (rows.length === 0) return null;
    return (
      <section key={key ?? 'none'} className="flex flex-col gap-1">
        {heading ? <h2 className="text-lg font-bold">{heading}</h2> : null}
        <ol className="flex flex-col gap-1">{rows.map(rowLine)}</ol>
      </section>
    );
  };

  const empty = rowIds.size === 0 && stones.length === 0;
  return (
    <div className="flex flex-col gap-4" aria-label={t`Diagram`}>
      <StatusLegend />
      {empty ? (
        <p className="text-fg-muted">
          <Trans>No rows or stones yet. Add rows in Setup.</Trans>
        </p>
      ) : null}
      {block(null)}
      {sections.map((s) => block(s.id, s.name))}
      {groups.grid.size > 0 || props.grid ? (
        <LegacyGridView
          grid={props.grid}
          cells={groups.grid}
          features={props.features ?? []}
          selectedId={selectedId}
          onSelect={onSelect}
          actions={props.gridActions}
        />
      ) : null}
      {groups.loose.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">
            <Trans>Not in a row</Trans>
          </h2>
          <div className="flex flex-wrap gap-1">
            {groups.loose.map((m, i) => (
              <StoneButton
                key={m.id}
                stone={m}
                place={t`Stone ${i + 1} not in a row`}
                selected={m.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
