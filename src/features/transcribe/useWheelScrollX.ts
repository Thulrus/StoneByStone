import { useEffect, type RefObject } from 'react';

/**
 * Lets a vertical mouse wheel scroll a horizontal strip. It only takes over while the strip
 * can still move that way, so the page scrolls as usual at either end. Pass `key` when the
 * element can mount later (the effect re-attaches when it changes).
 */
export function useWheelScrollX(ref: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      const canMove = e.deltaY < 0 ? el.scrollLeft > 0 : el.scrollLeft < max - 1;
      if (!canMove) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [ref, key]);
}
