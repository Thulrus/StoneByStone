import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import {
  presetFromMapping,
  type ColumnMapping,
  type IndexPreset,
} from '../../../data/format/index-csv';
import { saveIndexPreset } from '../../../data/index-import';
import { numericDateOrder } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';

// Locale codes, never shown: they only pick the numeric date order for parseDate.
// eslint-disable-next-line lingui/no-unlocalized-strings
const MONTH_FIRST = 'en-US';
// eslint-disable-next-line lingui/no-unlocalized-strings
const DAY_FIRST = 'en-GB';

/** First row is headers, date order, and saved column presets (apply / save). */
export function ImportOptions({
  hasHeader,
  onHasHeader,
  dateLocale,
  onDateLocale,
  presets,
  onPreset,
  headers,
  mapping,
}: {
  hasHeader: boolean;
  onHasHeader: (v: boolean) => void;
  dateLocale: string;
  onDateLocale: (v: string) => void;
  presets: readonly IndexPreset[];
  onPreset: (p: IndexPreset) => void;
  headers: readonly string[];
  mapping: ColumnMapping;
}) {
  const { t } = useLingui();
  const store = useStore();
  const [name, setName] = useState('');
  const dayFirst = numericDateOrder(dateLocale) !== 'mdy';

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    await saveIndexPreset(store, presetFromMapping(n, headers, mapping, hasHeader, dateLocale));
    toast({ title: t`Saved preset "${n}"` });
    setName('');
  };

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <label className="flex min-h-12 items-center gap-2">
        <input
          type="checkbox"
          className="size-5"
          checked={hasHeader}
          onChange={(e) => onHasHeader(e.currentTarget.checked)}
        />
        <Trans>First row is column names</Trans>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          <Trans>Dates like 3/4/1890 mean</Trans>
        </span>
        <select
          className="min-h-12 rounded-lg bg-surface-2 px-3"
          value={dayFirst ? DAY_FIRST : MONTH_FIRST}
          onChange={(e) => onDateLocale(e.currentTarget.value)}
        >
          <option value={MONTH_FIRST}>{t`4 March (month first)`}</option>
          <option value={DAY_FIRST}>{t`3 April (day first)`}</option>
        </select>
      </label>
      {presets.length > 0 ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            <Trans>Use a saved preset</Trans>
          </span>
          <select
            className="min-h-12 rounded-lg bg-surface-2 px-3"
            value=""
            onChange={(e) => {
              const p = presets.find((x) => x.name === e.currentTarget.value);
              if (p) onPreset(p);
            }}
          >
            <option value="">{t`Choose…`}</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            <Trans>Save these columns as a preset</Trans>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder={t`e.g. County historical society`}
            className="min-h-12 w-64 max-w-full rounded-lg bg-surface px-3 text-base text-fg sbs-border"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          className="whitespace-nowrap"
          disabled={!name.trim()}
        >
          <Trans>Save preset</Trans>
        </Button>
      </form>
    </div>
  );
}
