import type { ReactNode } from 'react';
import { MapTap, Pin } from '../map/layers';
import { LocateButton } from '../map/LocateButton';
import type { Pins } from './usePins';

/** On the map: numbered, draggable control points; a tap places the pending one. */
export function PinMapLayer({ pins, children }: { pins: Pins; children?: ReactNode }) {
  return (
    <>
      {children}
      <LocateButton />
      {pins.pending ? <MapTap onTap={pins.pickMap} /> : null}
      {pins.points.map((p, i) => (
        <Pin
          key={i}
          lngLat={[p.lng, p.lat]}
          label={String(i + 1)}
          className="sbs-label sbs-label-active"
          draggable
          onDragEnd={(ll) => pins.move(i, ll)}
        />
      ))}
    </>
  );
}
