import type { MonumentStatus } from '../../domain';
import { STATUS_STYLE } from './status-style';

/** The status shape as inline SVG (decorative: pair it with a text label). */
export function StatusIcon({ status, size = 20 }: { status: MonumentStatus; size?: number }) {
  const s = STATUS_STYLE[status];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d={s.shape}
        fill={s.color}
        fillRule="evenodd"
        stroke="white"
        strokeWidth={1.5}
        paintOrder="stroke"
      />
      {s.mark ? (
        <path
          d={s.mark}
          fill="none"
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
