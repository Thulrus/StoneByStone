/** Chromium's install event; not in lib.dom. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'installed' | 'ios' | 'chromium' | 'android' | 'other';

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPadOS reports itself as a Mac, so check for touch as well. */
export function isIos(ua: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

export function detectInstallPlatform(hasPromptEvent: boolean): InstallPlatform {
  if (isStandalone()) return 'installed';
  if (isIos(navigator.userAgent, navigator.maxTouchPoints)) return 'ios';
  if (hasPromptEvent) return 'chromium';
  // Android browser that has not (yet) offered a prompt, e.g. Firefox or Samsung Internet.
  if (/Android/.test(navigator.userAgent)) return 'android';
  return 'other';
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

// Capture the event as early as possible; it can fire before React mounts.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
