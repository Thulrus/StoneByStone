import { Trans, useLingui } from '@lingui/react/macro';
import { useId, useState } from 'react';
import type { PersonDraft } from '../../data/transcribe';
import { Input } from './Input';

type MilitaryDraft = Pick<PersonDraft, 'conflict' | 'rank' | 'unit' | 'marker'>;

/** Military service for one person (plan §10.4). Closed until there is something in it. */
export function MilitaryFields({
  value,
  onChange,
}: {
  value: MilitaryDraft;
  onChange: (patch: Partial<MilitaryDraft>) => void;
}) {
  const { t } = useLingui();
  const conflicts = useId();
  const markers = useId();
  // Only the first render decides, so clearing a field doesn't snap it shut.
  const [filled] = useState(() =>
    Boolean(value.conflict || value.rank || value.unit || value.marker),
  );
  return (
    <details open={filled || undefined} className="rounded-lg px-3 py-2 sbs-border">
      <summary className="min-h-10 cursor-pointer content-center font-medium">
        <Trans>Military service</Trans>
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Input
          label={t`Conflict`}
          list={conflicts}
          value={value.conflict}
          onChange={(e) => onChange({ conflict: e.currentTarget.value })}
        />
        <Input
          label={t`Rank`}
          placeholder={t`Pvt., Capt.`}
          value={value.rank}
          onChange={(e) => onChange({ rank: e.currentTarget.value })}
        />
        <Input
          label={t`Unit, as carved`}
          placeholder={t`Co. B, 12th Vt. Inf.`}
          value={value.unit}
          onChange={(e) => onChange({ unit: e.currentTarget.value })}
        />
        <Input
          label={t`Marker`}
          list={markers}
          value={value.marker}
          onChange={(e) => onChange({ marker: e.currentTarget.value })}
        />
      </div>
      <datalist id={conflicts}>
        <option value={t`Revolutionary War`} />
        <option value={t`War of 1812`} />
        <option value={t`Mexican–American War`} />
        <option value={t`Civil War (Union)`} />
        <option value={t`Civil War (Confederate)`} />
        <option value={t`Spanish–American War`} />
        <option value={t`World War I`} />
        <option value={t`World War II`} />
        <option value={t`Korean War`} />
        <option value={t`Vietnam War`} />
      </datalist>
      <datalist id={markers}>
        <option value={t`Government-issue headstone`} />
        <option value={t`Government-issue flat marker`} />
        <option value={t`GAR star`} />
        <option value={t`Flag holder`} />
        <option value={t`Bronze plaque`} />
      </datalist>
    </details>
  );
}
