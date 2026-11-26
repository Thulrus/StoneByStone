import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import type { Cemetery, ID, MapFeature, Monument, Overlay } from '../../domain';
import { cn } from '../../ui/cn';
import { OfflinePanel } from '../map/OfflinePanel';
import { GridActions } from '../overlays/GridActions';
import { OverlaysPanel } from '../overlays/OverlaysPanel';
import { SchematicView } from '../schematic/SchematicView';
import { StoneSheet } from '../stones/StoneSheet';
import { MapTab } from './MapTab';
import { LayoutEditor } from './setup/LayoutEditor';
import type { Layout } from './useLayout';

export type Tab = 'map' | 'diagram' | 'setup';

/** A cemetery's Map / Diagram / Setup tabs and the stone sheet shared by them. */
export function CemeteryTabs({
  cemetery,
  layout,
  stones,
  overlays,
  features,
  initialTab,
}: {
  cemetery: Cemetery;
  layout: Layout;
  stones: Monument[];
  overlays: Overlay[];
  features: MapFeature[];
  initialTab: Tab;
}) {
  const { t } = useLingui();
  const [current, setTab] = useState<Tab>(initialTab);
  const [activeRowId, setActiveRowId] = useState<ID>();
  const [drawRowId, setDrawRowId] = useState<ID>();
  const [stoneId, setStoneId] = useState<ID>();
  const [pinId, setPinId] = useState<ID>();
  const grid = overlays.find((o) => o.kind === 'legacy-grid');

  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      onClick={() => setTab(id)}
      className={cn(
        'min-h-12 rounded-lg px-4',
        current === id ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="min-w-0 basis-full truncate text-2xl font-bold md:basis-0 md:flex-1"
          title={cemetery.name}
        >
          {cemetery.name}
        </h1>
        <div role="tablist" aria-label={t`View`} className="flex gap-2">
          {tabButton('map', t`Map`)}
          {tabButton('diagram', t`Diagram`)}
          {tabButton('setup', t`Setup`)}
        </div>
      </div>
      {current === 'map' ? (
        <div
          role="tabpanel"
          // Fits between the tabs and the phone's bottom bar, so no map control sits under it.
          className="h-[calc(100dvh-16rem-env(safe-area-inset-bottom))] min-h-80 overflow-hidden rounded-xl md:h-[calc(100dvh-10.5rem)]"
        >
          <MapTab
            cemetery={cemetery}
            rows={layout.rows}
            stones={stones}
            overlays={overlays}
            selectedStoneId={stoneId}
            onSelectStone={setStoneId}
            labelOf={layout.labelOf}
            activeRowId={activeRowId}
            onSelectRow={(id) => setActiveRowId((a) => (a === id ? undefined : id))}
            drawRowId={drawRowId}
            onDrawClose={() => {
              setDrawRowId(undefined);
              setTab('setup');
            }}
            pinId={pinId}
            onPinDone={() => setPinId(undefined)}
          />
        </div>
      ) : current === 'diagram' ? (
        <div role="tabpanel">
          <SchematicView
            sections={layout.sections}
            rowsBySection={layout.rowsBySection}
            labelOf={layout.labelOf}
            stones={stones}
            grid={grid}
            features={features}
            selectedId={stoneId}
            onSelect={setStoneId}
            gridActions={
              grid ? (
                <GridActions
                  grid={grid}
                  onPin={(id) => {
                    setPinId(id);
                    setTab('map');
                  }}
                />
              ) : undefined
            }
          />
        </div>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-4">
          <LayoutEditor
            cemeteryId={cemetery.id}
            sections={layout.sections}
            rowsBySection={layout.rowsBySection}
            counts={layout.counts}
            activeRowId={activeRowId}
            onSelectRow={(id) => setActiveRowId((a) => (a === id ? undefined : id))}
            onDrawRow={(id) => {
              setActiveRowId(id);
              setDrawRowId(id);
              setTab('map');
            }}
          />
          <OverlaysPanel
            cemeteryId={cemetery.id}
            overlays={overlays}
            onPin={(id) => {
              setPinId(id);
              setTab('map');
            }}
          />
          <OfflinePanel cemetery={cemetery} rows={layout.rows} stones={stones} />
        </div>
      )}
      <StoneSheet
        stone={stones.find((m) => m.id === stoneId)}
        rows={layout.rows}
        labelOf={layout.labelOf}
        onClose={() => setStoneId(undefined)}
      />
    </div>
  );
}
