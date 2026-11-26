import { useLingui } from '@lingui/react/macro';
import type { Monument, Overlay } from '../../domain';
import { cellKey } from '../schematic/schematic';
import type { Pins } from './usePins';

const CELL = 28;

/** The v1 grid as a small chart; tapping a cell picks its centre as a control point. */
export function GridPicker({
  grid,
  stones,
  pins,
}: {
  grid: Overlay;
  stones: readonly Monument[];
  pins: Pins;
}) {
  const { t } = useLingui();
  const rows = grid.grid?.rows ?? 0;
  const cols = grid.grid?.cols ?? 0;
  const valid = grid.grid?.validCells ? new Set(grid.grid.validCells) : undefined;
  const occupied = new Set(stones.flatMap((m) => (m.legacyGrid ? [cellKey(m.legacyGrid)] : [])));
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = cellKey({ row: r, col: c });
      const inside = !valid || valid.has(k) || occupied.has(k);
      const row = r + 1;
      const col = c + 1;
      cells.push(
        <rect
          key={k}
          role="button"
          aria-label={t`Grid row ${row}, column ${col}`}
          x={c * CELL + 1}
          y={r * CELL + 1}
          width={CELL - 2}
          height={CELL - 2}
          rx={3}
          className={inside ? 'cursor-pointer fill-surface-2' : 'cursor-pointer fill-transparent'}
          onClick={() => pins.pickSource(c + 0.5, r + 0.5)}
        />,
      );
      if (occupied.has(k)) {
        cells.push(
          <circle
            key={`s${k}`}
            cx={c * CELL + CELL / 2}
            cy={r * CELL + CELL / 2}
            r={5}
            className="pointer-events-none fill-fg-muted"
          />,
        );
      }
    }
  }
  const marks = [
    ...pins.points.map((p, i) => ({ ...p, label: String(i + 1) })),
    ...(pins.pending ? [{ ...pins.pending, label: '?' }] : []),
  ];
  return (
    <div className="max-h-64 overflow-auto rounded-lg bg-surface sbs-border">
      <svg width={cols * CELL} height={rows * CELL} aria-label={t`v1 grid`} role="group">
        {cells}
        {marks.map((p) => (
          <g key={`${p.label}-${p.x}-${p.y}`} className="pointer-events-none">
            <circle
              cx={p.x * CELL}
              cy={p.y * CELL}
              r={11}
              className="fill-[#f5c542] stroke-black"
            />
            <text
              x={p.x * CELL}
              y={p.y * CELL + 5}
              textAnchor="middle"
              className="fill-black text-sm font-bold"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
