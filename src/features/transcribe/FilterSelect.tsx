import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import type { QueueFilter } from './queue';

const FILTER_LABEL: Record<QueueFilter, MessageDescriptor> = {
  photographed: msg`Photographed, not transcribed`,
  located: msg`No photo yet`,
  transcribed: msg`Transcribed, not verified`,
  verified: msg`Verified`,
  all: msg`All stones`,
};
const FILTERS: QueueFilter[] = ['photographed', 'located', 'transcribed', 'verified', 'all'];

/** Which stones the queue holds (plan §9: by status). */
export function FilterSelect({
  value,
  onChange,
}: {
  value: QueueFilter;
  onChange: (f: QueueFilter) => void;
}) {
  const { t } = useLingui();
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium">{t`Show`}</span>
      <select
        className="min-h-12 rounded-lg bg-surface-2 px-3"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as QueueFilter)}
      >
        {FILTERS.map((f) => (
          <option key={f} value={f}>
            {t(FILTER_LABEL[f])}
          </option>
        ))}
      </select>
    </label>
  );
}
