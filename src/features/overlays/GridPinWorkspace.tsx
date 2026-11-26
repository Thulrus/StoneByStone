import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import { pinLegacyGrid } from '../../data/legacy-grid';
import type { ControlPoint, Overlay } from '../../domain';
import { toast } from '../../ui/toast-store';
import { CemeteryMap, type CemeteryMapProps } from '../map/CemeteryMap';
import { GridPicker } from './GridPicker';
import { GridPreview } from './GridPreview';
import { PinMapLayer } from './PinMapLayer';
import { PinPanel } from './PinPanel';
import { usePins } from './usePins';

export interface GridPinWorkspaceProps extends Omit<CemeteryMapProps, 'tool'> {
  grid: Overlay;
  onDone: () => void;
}

/** "Place this grid on the map" (plan §22.4): 2 points (similarity) or 3+ (affine). */
export function GridPinWorkspace({ grid, onDone, ...map }: GridPinWorkspaceProps) {
  const { t } = useLingui();
  const store = useStore();
  const pins = usePins(grid.controlPoints as ControlPoint[]);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await pinLegacyGrid(store, grid, pins.points);
      const n = r.stones;
      toast({
        title: t`Placed ${n} stones from the v1 grid`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <CemeteryMap
      {...map}
      tool={{
        map: (
          <PinMapLayer pins={pins}>
            <GridPreview grid={grid} transform={pins.fit?.transform} />
          </PinMapLayer>
        ),
        panel: (
          <PinPanel
            pins={pins}
            sourceHint={t`grid cell`}
            minPoints={2}
            busy={busy}
            onApply={() => void apply()}
            onCancel={onDone}
          >
            <GridPicker grid={grid} stones={map.stones} pins={pins} />
          </PinPanel>
        ),
      }}
    />
  );
}
