import { I18nProvider } from '@lingui/react';
import { Direction } from 'radix-ui';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { activateLocale, i18n, resolveLocale } from '../i18n/i18n';
import { directionOf } from '../i18n/locales';
import { Toaster } from '../ui/Toaster';
import { usePrefs } from './prefs';
import { createAppRouter } from './routes';
import { UpdatePrompt } from './UpdatePrompt';
import { useApplyTheme } from './useApplyTheme';

const router = createAppRouter();

export function App() {
  useApplyTheme();
  const localePref = usePrefs((s) => s.locale);
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    const next = resolveLocale(localePref);
    void activateLocale(next).then(() => setLocale(next));
  }, [localePref]);

  return (
    <I18nProvider i18n={i18n}>
      <Direction.Provider dir={directionOf(locale)}>
        <RouterProvider router={router} />
        <UpdatePrompt />
        <Toaster />
      </Direction.Provider>
    </I18nProvider>
  );
}
