import { useLingui } from '@lingui/react/macro';
import { STATUS_LABEL } from './labels';
import { STATUS_ORDER } from './status-style';
import { StatusIcon } from './StatusIcon';

/** Shape + colour + word for each status (plan §17: colour is never the only cue). */
export function StatusLegend({ className }: { className?: string }) {
  const { t } = useLingui();
  return (
    <ul aria-label={t`Status key`} className={className ?? 'flex flex-wrap gap-x-4 gap-y-1'}>
      {STATUS_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-sm">
          <StatusIcon status={s} size={18} />
          {t(STATUS_LABEL[s])}
        </li>
      ))}
    </ul>
  );
}
