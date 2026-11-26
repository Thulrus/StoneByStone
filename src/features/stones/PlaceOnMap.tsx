import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback } from 'react';
import { useStore } from '../../app/store-context';
import { placeStone } from '../../data/placement';
import type { ID } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { MapTap } from '../map/layers';

/** Map tool: the next tap on the map places this stone there (plan §7.1). */
export function usePlaceOnMap(stoneId: ID | undefined, name: string, onDone: () => void) {
  const { t } = useLingui();
  const store = useStore();
  const place = useCallback(
    ([lng, lat]: [number, number]) => {
      if (!stoneId) return;
      void placeStone(store, stoneId, { lng, lat, source: 'map' }).then(() => {
        toast({
          title: t`Stone placed on the map`,
          action: { label: t`Undo`, onAction: () => void store.undo() },
        });
        onDone();
      });
    },
    [store, stoneId, onDone, t],
  );
  if (!stoneId) return undefined;
  return {
    map: <MapTap onTap={place} />,
    panel: (
      <section
        aria-label={t`Place on the map`}
        className="flex flex-wrap items-center gap-3 bg-surface p-3 sbs-border"
      >
        <p className="flex-1 text-lg">
          <Trans>Tap the map where {name} is.</Trans>
        </p>
        <Button variant="secondary" onClick={onDone}>
          <Trans>Cancel</Trans>
        </Button>
      </section>
    ),
  };
}
