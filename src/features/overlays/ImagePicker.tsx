import { useLingui } from '@lingui/react/macro';
import type { MouseEvent } from 'react';
import type { LoadedImage } from './image';
import type { Pins } from './usePins';

/** The overlay image; tapping it picks a pixel as a control point. */
export function ImagePicker({ image, pins }: { image: LoadedImage; pins: Pins }) {
  const { t } = useLingui();
  const pick = (e: MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pins.pickSource(
      ((e.clientX - r.left) / r.width) * image.width,
      ((e.clientY - r.top) / r.height) * image.height,
    );
  };
  const marks = [
    ...pins.points.map((p, i) => ({ ...p, label: String(i + 1) })),
    ...(pins.pending ? [{ ...pins.pending, label: '?' }] : []),
  ];
  return (
    <div className="max-h-72 overflow-auto rounded-lg sbs-border">
      <div className="relative w-full min-w-[32rem]">
        <img
          src={image.url}
          alt={t`Overlay image: tap a point you can also find on the map`}
          className="block w-full cursor-crosshair"
          onClick={pick}
        />
        {marks.map((p) => (
          <span
            key={`${p.label}-${p.x}-${p.y}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 sbs-label sbs-label-active"
            style={{ left: `${(p.x / image.width) * 100}%`, top: `${(p.y / image.height) * 100}%` }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
