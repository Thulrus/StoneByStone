import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Cemetery, ID } from '../../domain';
import { LayoutEditor } from '../../features/cemeteries/setup/LayoutEditor';
import { useLayout, type Layout } from '../../features/cemeteries/useLayout';
import { CemeteryMap } from '../../features/map/CemeteryMap';
import { cn } from '../../ui/cn';
import { useStore } from '../store-context';

type Tab = 'map' | 'setup';

export function CemeteryPage() {
  const { cemeteryId = '' } = useParams();
  const store = useStore();
  // `null` once loaded and not found, so the page doesn't flash "not found" while loading.
  const cemetery = useLiveQuery(
    async () => (await store.cemeteries.resolve(cemeteryId)) ?? null,
    [store, cemeteryId],
  );
  if (cemetery === undefined) return null;
  if (cemetery === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          <Trans>Cemetery not found</Trans>
        </h1>
        <Link to="/" className="text-primary underline">
          <Trans>Back to cemeteries</Trans>
        </Link>
      </div>
    );
  }
  return <CemeteryView key={cemetery.id} cemetery={cemetery} />;
}

function CemeteryView({ cemetery }: { cemetery: Cemetery }) {
  const layout = useLayout(cemetery.id);
  if (!layout) return null;
  // A new cemetery opens on Setup so the first job, adding rows, is in front of the user.
  return (
    <CemeteryTabs
      cemetery={cemetery}
      layout={layout}
      initialTab={layout.rows.length === 0 ? 'setup' : 'map'}
    />
  );
}

function CemeteryTabs({
  cemetery,
  layout,
  initialTab,
}: {
  cemetery: Cemetery;
  layout: Layout;
  initialTab: Tab;
}) {
  const { t } = useLingui();
  const [current, setTab] = useState<Tab>(initialTab);
  const [activeRowId, setActiveRowId] = useState<ID>();
  const [drawRowId, setDrawRowId] = useState<ID>();

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
        <h1 className="flex-1 text-2xl font-bold">{cemetery.name}</h1>
        <div role="tablist" aria-label={t`View`} className="flex gap-2">
          {tabButton('map', t`Map`)}
          {tabButton('setup', t`Setup`)}
        </div>
      </div>
      {current === 'map' ? (
        <div role="tabpanel" className="h-[calc(100dvh-13rem)] min-h-80 overflow-hidden rounded-xl">
          <CemeteryMap
            cemetery={cemetery}
            rows={layout.rows}
            labelOf={layout.labelOf}
            activeRowId={activeRowId}
            onSelectRow={(id) => setActiveRowId((a) => (a === id ? undefined : id))}
            drawRowId={drawRowId}
            onDrawClose={() => {
              setDrawRowId(undefined);
              setTab('setup');
            }}
          />
        </div>
      ) : (
        <div role="tabpanel">
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
        </div>
      )}
    </div>
  );
}
