import { useMemo, useState } from 'react';
import { fitPins, type SourcePoint } from '../../geo';

export interface Pins {
  points: SourcePoint[];
  /** A source point picked, waiting for its map spot. */
  pending?: { x: number; y: number };
  fit: ReturnType<typeof fitPins>;
  pickSource: (x: number, y: number) => void;
  pickMap: (lngLat: [number, number]) => void;
  move: (i: number, lngLat: [number, number]) => void;
  remove: (i: number) => void;
}

/** Control-point state for pinning a grid or image onto the map (plan §7.4, §22.4). */
export function usePins(initial: readonly SourcePoint[] = []): Pins {
  const [points, setPoints] = useState<SourcePoint[]>([...initial]);
  const [pending, setPending] = useState<{ x: number; y: number }>();
  const fit = useMemo(() => fitPins(points), [points]);
  return {
    points,
    pending,
    fit,
    pickSource: (x, y) => setPending({ x, y }),
    pickMap: ([lng, lat]) => {
      if (!pending) return;
      setPoints((p) => [...p, { ...pending, lng, lat }]);
      setPending(undefined);
    },
    move: (i, [lng, lat]) => setPoints((p) => p.map((q, j) => (j === i ? { ...q, lng, lat } : q))),
    remove: (i) => setPoints((p) => p.filter((_, j) => j !== i)),
  };
}
