import { useLayoutEffect, type RefObject } from 'react';

/** Space left under the panel, px (the page's bottom padding). */
const GAP = 16;
const MIN = 320;

/**
 * Size `ref` to fill the window from where it starts down to the phone bottom bar
 * (`[data-bottom-bar]`), measured rather than guessed, so fonts, a wrapped header or a
 * safe-area inset can't push map controls under the bar.
 */
export function useFillViewport(ref: RefObject<HTMLElement | null>, active = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const fit = () => {
      const bar = document.querySelector<HTMLElement>('[data-bottom-bar]');
      const barH = bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(MIN, Math.floor(window.innerHeight - top - barH - GAP))}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    const header = document.querySelector('header');
    if (header) ro?.observe(header);
    if (el.parentElement) ro?.observe(el.parentElement);
    return () => {
      window.removeEventListener('resize', fit);
      ro?.disconnect();
      // React may reuse this element for another tab's panel; don't leave it a fixed height.
      el.style.height = '';
    };
  }, [ref, active]);
}
