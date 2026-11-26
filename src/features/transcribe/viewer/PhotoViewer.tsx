import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../../../ui/Button';
import { BlobImage } from '../../capture/PhotoStrip';
import { cssFilter, cssTransform, type Enhancement } from './filters';
import { toSource, viewerDpr, type Size } from './geometry';
import { PhotoRenderer } from './renderer';
import { usePanZoom } from './usePanZoom';

/** `rgb(…)` → 0…1 channels, for the area around the photo. */
function rgb(css: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (css.match(/[\d.]+/g) ?? []).map(Number);
  return [r / 255, g / 255, b / 255];
}

export interface PhotoViewerProps {
  blob: Blob;
  alt: string;
  enhancement: Enhancement;
}

/**
 * Zoomable, pannable photo with live, non-destructive enhancement (plan §9), drawn with
 * WebGL2. Without it, a plain image with the CSS-filter subset.
 */
export function PhotoViewer({ blob, alt, enhancement }: PhotoViewerProps) {
  const { t } = useLingui();
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<PhotoRenderer | undefined>(undefined);
  const [mode, setMode] = useState<'webgl' | 'css'>('webgl');
  const [img, setImg] = useState<Size>();
  const [size, setSize] = useState<Size>({ w: 1, h: 1 });
  const readSize = useCallback(
    () => ({ w: canvas.current?.width ?? 1, h: canvas.current?.height ?? 1 }),
    [],
  );
  const { view, zoom, reset, handlers } = usePanZoom(canvas, img, readSize);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const r = PhotoRenderer.create(el);
    if (!r) return setMode('css');
    renderer.current = r;
    const fit = () => {
      const dpr = viewerDpr();
      el.width = Math.max(1, Math.round(el.clientWidth * dpr));
      el.height = Math.max(1, Math.round(el.clientHeight * dpr));
      setSize({ w: el.width, h: el.height });
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      r.dispose();
      renderer.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'webgl') return;
    let live = true;
    void createImageBitmap(blob).then((bitmap) => {
      if (!live || !renderer.current) return bitmap.close();
      renderer.current.setImage(bitmap);
      setImg({ w: bitmap.width, h: bitmap.height });
      reset();
      bitmap.close();
    });
    return () => {
      live = false;
    };
  }, [blob, mode, reset]);

  useEffect(() => {
    const r = renderer.current;
    const el = canvas.current;
    if (!r || !el || !img || !view) return;
    const frame = requestAnimationFrame(() => {
      r.draw(
        enhancement,
        toSource(view, size, img, enhancement),
        rgb(getComputedStyle(el).backgroundColor),
      );
      el.dataset.drawn = 'true';
    });
    return () => cancelAnimationFrame(frame);
  }, [enhancement, view, img, size]);

  if (mode === 'css') {
    return (
      <BlobImage
        blob={blob}
        alt={alt}
        data-renderer="css"
        className="max-h-[70dvh] w-full object-contain"
        style={{
          filter: cssFilter(enhancement),
          transform: cssTransform(enhancement),
        }}
      />
    );
  }
  const step = 1.5;
  return (
    <div className="relative">
      <canvas
        ref={canvas}
        role="img"
        aria-label={alt}
        tabIndex={0}
        data-renderer="webgl"
        className="block h-[60dvh] min-h-80 w-full cursor-grab touch-none rounded-xl bg-surface-2 active:cursor-grabbing"
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') zoom(step);
          else if (e.key === '-') zoom(1 / step);
          else if (e.key === '0') reset();
          else return;
          e.preventDefault();
        }}
        {...handlers}
      />
      <div className="absolute end-2 top-2 flex gap-1">
        <Button variant="secondary" aria-label={t`Zoom in`} onClick={() => zoom(step)}>
          +
        </Button>
        <Button variant="secondary" aria-label={t`Zoom out`} onClick={() => zoom(1 / step)}>
          −
        </Button>
        <Button variant="secondary" onClick={reset}>
          <Trans>Fit</Trans>
        </Button>
      </div>
    </div>
  );
}
