import { useLingui } from '@lingui/react/macro';
import { cn } from '../../ui/cn';
import { STATUS_LABEL } from '../stones/labels';
import { STATUS_STYLE } from '../stones/status-style';
import { STATUSES, type StatusCounts } from './progress';

/** A stacked bar of stones by status. The numbers beside it carry the meaning; this is a glance. */
export function StatusBar({ counts, className }: { counts: StatusCounts; className?: string }) {
  const { t } = useLingui();
  const label = STATUSES.map((s) => `${t(STATUS_LABEL[s])} ${counts[s]}`).join(', ');
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      {counts.total === 0
        ? null
        : STATUSES.map((s) =>
            counts[s] === 0 ? null : (
              <span
                key={s}
                style={{
                  width: `${(counts[s] * 100) / counts.total}%`,
                  backgroundColor: STATUS_STYLE[s].color,
                }}
              />
            ),
          )}
    </div>
  );
}
