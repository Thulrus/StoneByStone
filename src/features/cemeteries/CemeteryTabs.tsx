import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import type { Cemetery, ID, MapFeature, Monument, Overlay } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { WalkPanel } from '../capture/walk/WalkPanel';
import { WalkStart } from '../capture/walk/WalkStart';
import { OfflinePanel } from '../map/OfflinePanel';
import { GridActions } from '../overlays/GridActions';
import { OverlaysPanel } from '../overlays/OverlaysPanel';
import { SchematicView } from '../schematic/SchematicView';
import { StoneSheet } from '../stones/StoneSheet';
import { MapTab } from './MapTab';
import { LayoutEditor } from './setup/LayoutEditor';
import { useFillViewport } from './useFillViewport';
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
  const [walkStart, setWalkStart] = useState(false);
  const [walkRowId, setWalkRowId] = useState<ID>();
  const [pendingWalk, setPendingWalk] = useState<ID>();
  const [walkStoneId, setWalkStoneId] = useState<ID>();
  const walkRow = layout.rows.find((r) => r.id === walkRowId);
  const walkPanel = walkRow ? (
    <WalkPanel
      row={walkRow}
      rowName={layout.labelOf(walkRow)}
      onCaptured={setWalkStoneId}
      onEnd={() => {
        setWalkRowId(undefined);
        setWalkStoneId(undefined);
      }}
    />
  ) : undefined;
  const highlighted = walkRow ? walkStoneId : stoneId;
  const grid = overlays.find((o) => o.kind === 'legacy-grid');
  const mapPanel = useRef<HTMLDivElement>(null);
  useFillViewport(mapPanel, current === 'map');

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
        {current !== 'setup' && !walkRow && !drawRowId ? (
          <Button size="lg" onClick={() => setWalkStart(true)}>
            {t`Walk a row`}
          </Button>
        ) : null}
      </div>
      {current === 'map' ? (
        <div ref={mapPanel} role="tabpanel" className="min-h-80 overflow-hidden rounded-xl">
          <MapTab
            cemetery={cemetery}
            rows={layout.rows}
            stones={stones}
            overlays={overlays}
            selectedStoneId={highlighted}
            walk={walkPanel}
            onSelectStone={setStoneId}
            labelOf={layout.labelOf}
            activeRowId={activeRowId}
            onSelectRow={(id) => setActiveRowId((a) => (a === id ? undefined : id))}
            drawRowId={drawRowId}
            onDrawClose={() => {
              setDrawRowId(undefined);
              if (pendingWalk) {
                setWalkRowId(pendingWalk);
                setPendingWalk(undefined);
              } else setTab('setup');
            }}
            pinId={pinId}
            onPinDone={() => setPinId(undefined)}
          />
        </div>
      ) : current === 'diagram' ? (
        <div role="tabpanel" className="flex flex-col gap-3">
          {walkPanel}
          <SchematicView
            sections={layout.sections}
            rowsBySection={layout.rowsBySection}
            labelOf={layout.labelOf}
            stones={stones}
            grid={grid}
            features={features}
            selectedId={highlighted}
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
      <WalkStart
        key={String(walkStart)}
        open={walkStart}
        onOpenChange={setWalkStart}
        cemeteryId={cemetery.id}
        rows={layout.rows}
        labelOf={layout.labelOf}
        counts={layout.counts}
        onStart={(rowId, mode) => {
          setWalkStart(false);
          setActiveRowId(rowId);
          if (mode === 'draw') {
            setPendingWalk(rowId);
            setDrawRowId(rowId);
            setTab('map');
          } else setWalkRowId(rowId);
        }}
      />
      <StoneSheet
        stone={stones.find((m) => m.id === stoneId)}
        rows={layout.rows}
        labelOf={layout.labelOf}
        onClose={() => setStoneId(undefined)}
      />
    </div>
  );
}
