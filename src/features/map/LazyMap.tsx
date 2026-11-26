import { Trans } from '@lingui/react/macro';
import { lazy, Suspense, useState } from 'react';
import type { MapViewProps } from './MapView';

const MapView = lazy(() => import('./MapView'));

/** The map, code-split: MapLibre loads only when a map is first shown. */
export function LazyMap(props: MapViewProps) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-lg bg-surface p-6 text-center">
        <p>
          <Trans>This device can't show the map. Sections and rows still work without it.</Trans>
        </p>
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-64 items-center justify-center text-fg-muted">
          <Trans>Loading map…</Trans>
        </div>
      }
    >
      <MapView
        {...props}
        onError={(e) => {
          setError(true);
          props.onError?.(e);
        }}
      />
    </Suspense>
  );
}
