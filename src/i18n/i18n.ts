import { i18n } from '@lingui/core';
import { messages as enMessages } from './locales/en/messages.po';
import { DEFAULT_LOCALE, detectLocale, directionOf, isSupported, type Locale } from './locales';

// The source locale ships in the main bundle so the shell renders without a round trip.
i18n.load(DEFAULT_LOCALE, enMessages);
i18n.activate(DEFAULT_LOCALE);

const loaders: Record<Locale, () => Promise<{ messages: typeof enMessages }>> = {
  en: async () => ({ messages: enMessages }),
};

export function resolveLocale(pref: string): Locale {
  if (pref !== 'auto' && isSupported(pref)) return pref;
  return detectLocale(navigator.languages ?? [navigator.language]);
}

/** Loads (if needed) and activates a locale, and sets `lang`/`dir` on the document. */
export async function activateLocale(locale: Locale): Promise<void> {
  if (i18n.locale !== locale) {
    const { messages } = await loaders[locale]();
    i18n.load(locale, messages);
    i18n.activate(locale);
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = directionOf(locale);
}

export { i18n };
