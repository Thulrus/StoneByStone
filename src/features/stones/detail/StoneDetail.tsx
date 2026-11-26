import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { cemeteryPath } from '../../../app/paths';
import { useStore } from '../../../app/store-context';
import type { Cemetery, MapFeature, Monument, Row } from '../../../domain';
import { STATUS_LABEL } from '../labels';
import { StatusIcon } from '../StatusIcon';
import { useStoneLabel } from '../useStoneLabel';
import { AttributesSection } from './AttributesSection';
import { HistorySection } from './HistorySection';
import { PeopleSection } from './PeopleSection';
import { PhotosSection } from './PhotosSection';
import { PositionSection } from './PositionSection';

export interface StoneDetailProps {
  cemetery: Cemetery;
  stone: Monument;
  stones: readonly Monument[];
  features: readonly MapFeature[];
  rows: readonly Row[];
  labelOf: (r: Row) => string;
}

/** Stone detail (plan §6): photos, people, attributes, position, history. */
export function StoneDetail({
  cemetery,
  stone,
  stones,
  features,
  rows,
  labelOf,
}: StoneDetailProps) {
  const { t } = useLingui();
  const store = useStore();
  const stoneLabel = useStoneLabel(rows, labelOf);
  const first = useLiveQuery(
    async () => (await store.persons.byMonument(stone.id))[0]?.name.asCarved,
    [store, stone.id],
  );
  const row = rows.find((r) => r.id === stone.address?.rowId);
  const index = stone.address?.rowIndex;
  const rowName = row ? labelOf(row) : '';
  const n = (index ?? 0) + 1;
  const where = row
    ? index === undefined
      ? t`Row ${rowName}`
      : t`Row ${rowName}, stone ${n}`
    : t`Stone`;
  return (
    <div className="flex max-w-prose flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">{first || where}</h1>
        {first ? <p className="text-fg-muted">{where}</p> : null}
        <p className="flex items-center gap-2 font-medium">
          <StatusIcon status={stone.status} />
          {t(STATUS_LABEL[stone.status])}
        </p>
      </div>
      <PhotosSection monumentId={stone.id} title={where} />
      <PeopleSection stone={stone} whereOf={(id) => stoneLabel(stones.find((m) => m.id === id))} />
      <AttributesSection stone={stone} rows={rows} labelOf={labelOf} />
      <PositionSection
        stone={stone}
        stones={stones}
        features={features}
        rows={rows}
        labelOf={labelOf}
        units={cemetery.settings.units}
      />
      <HistorySection monumentId={stone.id} />
    </div>
  );
}
