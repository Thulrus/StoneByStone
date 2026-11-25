/** Locales with a catalog in src/i18n/locales/. Keep in sync with lingui.config.ts. */
export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Native names, shown untranslated in the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
};

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'yi']);

export function isSupported(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/** Picks the best supported locale from the browser's preference list. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    if (isSupported(tag)) return tag;
    const lang = tag.split('-')[0]?.toLowerCase();
    if (lang && isSupported(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export function directionOf(locale: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has((locale.split('-')[0] ?? '').toLowerCase()) ? 'rtl' : 'ltr';
}
