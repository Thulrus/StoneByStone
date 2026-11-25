import { useEffect } from 'react';
import { resolveTheme, usePrefs } from './prefs';

const darkQuery = '(prefers-color-scheme: dark)';

/** Writes the resolved theme to `<html data-theme>` and follows the OS setting for "system". */
export function useApplyTheme(): void {
  const pref = usePrefs((s) => s.theme);

  useEffect(() => {
    const mq = window.matchMedia(darkQuery);
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(pref, mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
