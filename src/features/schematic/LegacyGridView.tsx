import { Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import type { ID, MapFeature, Monument, Overlay } from '../../domain';
import { cellKey } from './schematic';
import { StoneButton } from './StoneButton';

export interface LegacyGridViewProps {
  grid?: Overlay;
  /** Stones by `"row,col"`. */
  cells: Map<string, Monument[]>;
  features: readonly MapFeature[];
  selectedId?: ID;
  onSelect: (id: ID) => void;
  /** Actions shown under the heading (pin to map, make rows). */
  actions?: ReactNode;
}

const PATH_KINDS = new Set(['path', 'road']);

/** The v1 grid as it was drawn in v1, until it is pinned or turned into rows (plan §22). */
export function LegacyGridView({
  grid,
  cells,
  features,
  selectedId,
  onSelect,
  actions,
}: LegacyGridViewProps) {
  const { t } = useLingui();
  let rows = grid?.grid?.rows ?? 0;
  let cols = grid?.grid?.cols ?? 0;
  for (const k of cells.keys()) {
    const [r = 0, c = 0] = k.split(',').map(Number);
    rows = Math.max(rows, r + 1);
    cols = Math.max(cols, c + 1);
  }
  const valid = grid?.grid?.validCells ? new Set(grid.grid.validCells) : undefined;
  const featureAt = new Map<string, MapFeature>();
  for (const f of features) for (const c of f.legacyCells ?? []) featureAt.set(cellKey(c), f);

  const cell = (r: number, c: number) => {
    const k = cellKey({ row: r, col: c });
    const stones = cells.get(k) ?? [];
    const f = featureAt.get(k);
    const inside = !valid || valid.has(k) || stones.length > 0;
    const label = f ? (f.name ?? f.kind) : undefined;
    return (
      <div
        key={k}
        title={label}
        style={f ? { background: f.style?.color } : undefined}
        className={
          !inside
            ? ''
            : f
              ? `flex min-h-12 flex-col items-center justify-center rounded-sm ${
                  f.style?.color ? '' : PATH_KINDS.has(f.kind) ? 'bg-fg-muted/40' : 'bg-surface-2'
                }`
              : 'flex min-h-12 flex-col items-center justify-center gap-1 rounded-sm bg-surface-2/60'
        }
      >
        {f && !PATH_KINDS.has(f.kind) && stones.length === 0 ? (
          <span className="text-xs" aria-label={label}>
            {(label ?? '').slice(0, 3)}
          </span>
        ) : null}
        {stones.map((m) => (
          <StoneButton
            key={m.id}
            stone={m}
            place={t`Grid row ${r + 1}, column ${c + 1}`}
            selected={m.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">
        <Trans>v1 grid</Trans>
      </h2>
      {grid?.transform ? null : (
        <p className="text-fg-muted">
          <Trans>These stones came from a v1 grid and aren't on the map yet.</Trans>
        </p>
      )}
      {actions}
      <div className="overflow-x-auto">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 3rem)` }}
          aria-label={t`v1 grid, ${rows} rows by ${cols} columns`}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => cell(r, c)),
          )}
        </div>
      </div>
    </section>
  );
}
