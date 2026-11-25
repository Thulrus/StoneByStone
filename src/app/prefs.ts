import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark' | 'sunlight';
export type LocalePref = 'auto' | string;

interface PrefsState {
  theme: ThemePref;
  locale: LocalePref;
  installHintDismissed: boolean;
  setTheme: (theme: ThemePref) => void;
  setLocale: (locale: LocalePref) => void;
  dismissInstallHint: () => void;
}

/**
 * Device-local UI preferences. These are not survey data, so they live in localStorage
 * rather than the `stonebystone` IndexedDB.
 */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'auto',
      installHintDismissed: false,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      dismissInstallHint: () => set({ installHintDismissed: true }),
    }),
    { name: 'stonebystone:prefs', version: 1 },
  ),
);

export function resolveTheme(pref: ThemePref, prefersDark: boolean): 'light' | 'dark' | 'sunlight' {
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}
