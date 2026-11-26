import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { fitView, panBy, viewerDpr, zoomAt, type Size, type Vec2, type View } from './geometry';

/**
 * Pointer zoom and pan in canvas device pixels: wheel zooms at the cursor, one pointer drags,
 * two pinch. `size` is read at event time so the canvas can resize under it.
 */
export function usePanZoom(
  canvas: RefObject<HTMLCanvasElement | null>,
  img: Size | undefined,
  size: () => Size,
) {
  const [view, setView] = useState<View>();
  const pointers = useRef(new Map<number, Vec2>());
  const shown = view ?? (img ? fitView(img) : undefined);

  const at = (e: { clientX: number; clientY: number; currentTarget: Element }): Vec2 => {
    const r = e.currentTarget.getBoundingClientRect();
    const dpr = viewerDpr();
    return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
  };

  const zoom = useCallback(
    (factor: number, p?: Vec2) => {
      if (!img) return;
      const c = size();
      setView((v) => zoomAt(v ?? fitView(img), p ?? [c.w / 2, c.h / 2], factor, c, img));
    },
    [img, size],
  );
  const reset = useCallback(() => setView(undefined), []);

  // Native and non-passive, so zooming doesn't also scroll the page.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const dpr = viewerDpr();
      zoom(Math.exp(-e.deltaY * 0.0015), [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [canvas, zoom]);

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, at(e));
    },
    onPointerMove: (e: PointerEvent<HTMLCanvasElement>) => {
      const ps = pointers.current;
      const before = ps.get(e.pointerId);
      if (!before || !img) return;
      const now = at(e);
      const c = size();
      if (ps.size === 1) {
        setView((v) => panBy(v ?? fitView(img), now[0] - before[0], now[1] - before[1], c, img));
      } else if (ps.size === 2) {
        const other = [...ps].find(([id]) => id !== e.pointerId)?.[1];
        if (other) {
          const d0 = Math.hypot(before[0] - other[0], before[1] - other[1]);
          const d1 = Math.hypot(now[0] - other[0], now[1] - other[1]);
          const mid: Vec2 = [(now[0] + other[0]) / 2, (now[1] + other[1]) / 2];
          if (d0 > 0) setView((v) => zoomAt(v ?? fitView(img), mid, d1 / d0, c, img));
        }
      }
      ps.set(e.pointerId, now);
    },
    onPointerUp: (e: PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId);
    },
    onPointerCancel: (e: PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId);
    },
    onDoubleClick: reset,
  };

  return { view: shown, zoom, reset, handlers };
}
