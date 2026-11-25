import { Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { LOCALE_NAMES, SUPPORTED_LOCALES } from '../../i18n/locales';
import { usePrefs, type ThemePref } from '../prefs';

function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: ReactNode;
  name: string;
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-surface-2"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="size-5 accent-primary"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

export function SettingsPage() {
  const { t } = useLingui();
  const { theme, setTheme, locale, setLocale } = usePrefs();

  const themes: Array<{ value: ThemePref; label: string }> = [
    { value: 'system', label: t`Match device` },
    { value: 'light', label: t`Light` },
    { value: 'dark', label: t`Dark` },
    { value: 'sunlight', label: t`Sunlight (high contrast)` },
  ];

  const locales = [
    { value: 'auto', label: t`Match device` },
    ...SUPPORTED_LOCALES.map((l) => ({ value: l as string, label: LOCALE_NAMES[l] })),
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">
        <Trans>Settings</Trans>
      </h1>
      <RadioGroup
        legend={t`Theme`}
        name="theme"
        value={theme}
        options={themes}
        onChange={setTheme}
      />
      <RadioGroup
        legend={t`Language`}
        name="locale"
        value={locale}
        options={locales}
        onChange={setLocale}
      />
    </div>
  );
}
