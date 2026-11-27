import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Data-layer tests run in the node environment (`// @vitest-environment node`) because
// fake-indexeddb can't clone jsdom's Blob. Everything DOM-specific is guarded.
const hasDom = typeof window !== 'undefined';

// findBy*/waitFor give up after 1 s by default, which full-suite load (and CI) sometimes
// exceeds. Passing tests don't wait any longer for it.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
});

if (hasDom && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom lacks pointer capture, which Radix uses for swipe handling.
if (hasDom && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
