import { useLingui } from '@lingui/react/macro';
import type { PlanMap } from './booklet';

/** A north-up plan of the stones as SVG, so it prints sharp without map tiles. */
export function PlanMapSvg({ map, label }: { map: PlanMap; label: string }) {
  const { t } = useLingui();
  const { width: w, height: h, scale } = map;
  const r = Math.max(2, Math.min(6, w / 250));
  const metres = scale.metres;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className="h-auto max-h-[80vh] w-full border border-border print:max-h-[22cm]"
    >
      {map.boundary.map((p, i) => (
        <polygon key={`b${i}`} points={p} fill="none" stroke="currentColor" strokeWidth={2} />
      ))}
      {map.lines.map((p, i) => (
        <polyline
          key={`l${i}`}
          points={p}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
      ))}
      {map.points.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={r} fill="currentColor" />
      ))}
      <g transform={`translate(${w * 0.04}, ${h - map.bottom / 2})`} fontSize={w / 50}>
        <line x1={0} x2={scale.units} y1={0} y2={0} stroke="currentColor" strokeWidth={3} />
        <text x={scale.units + 8} y={5} fill="currentColor">
          {t`${metres} m`}
        </text>
      </g>
      <g
        transform={`translate(${w * 0.96}, ${map.top * 0.55})`}
        fontSize={w / 40}
        textAnchor="middle"
      >
        <path d={`M0,${-w / 40} L${w / 120},0 L${-w / 120},0 Z`} fill="currentColor" />
        <text y={w / 40} fill="currentColor">
          {t`N`}
        </text>
      </g>
    </svg>
  );
}
