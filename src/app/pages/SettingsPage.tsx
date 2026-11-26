import { Trans, useLingui } from '@lingui/react/macro';
import { AboutPanel } from '../../features/settings/AboutPanel';
import { CemeteryDefaultsForm } from '../../features/settings/CemeteryDefaultsForm';
import { ContributorForm } from '../../features/settings/ContributorForm';
import { StoragePanel } from '../../features/settings/StoragePanel';
import { LOCALE_NAMES, SUPPORTED_LOCALES } from '../../i18n/locales';
import { RadioGroup } from '../../ui/RadioGroup';
import { usePrefs, type ThemePref } from '../prefs';

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
    <div className="flex max-w-prose flex-col gap-8">
      <h1 className="text-2xl font-bold">
        <Trans>Settings</Trans>
      </h1>
      <ContributorForm />
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
      <CemeteryDefaultsForm />
      <StoragePanel />
      <AboutPanel />
    </div>
  );
}
