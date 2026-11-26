import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import type { Monument, PhotoRole, Row } from '../../domain';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { placeStone } from '../../data/placement';
import { toast } from '../../ui/toast-store';
import { Camera } from '../capture/Camera';
import { HoldStill } from '../capture/HoldStill';
import { PhotoStrip } from '../capture/PhotoStrip';
import { useSavePhoto } from '../capture/useSavePhoto';
import { STATUS_LABEL } from './labels';
import { StatusIcon } from './StatusIcon';

export interface StoneSheetProps {
  stone: Monument | undefined;
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  onClose: () => void;
}

/** Summary of the selected stone in a bottom sheet (full stone detail is #42). */
export function StoneSheet({ stone, rows, labelOf, onClose }: StoneSheetProps) {
  const { t } = useLingui();
  const store = useStore();
  const people = useLiveQuery(
    async () => (stone ? store.persons.byMonument(stone.id) : []),
    [store, stone?.id],
  );
  const [camera, setCamera] = useState(false);
  const [role, setRole] = useState<PhotoRole>('front');
  const [holding, setHolding] = useState(false);
  const savePhoto = useSavePhoto();
  const row = rows.find((r) => r.id === stone?.address?.rowId);
  const names = (people ?? []).map(
    (p) =>
      p.name.asCarved ||
      [p.name.given, p.name.surname].filter(Boolean).join(' ') ||
      t`Unnamed person`,
  );

  let where = '';
  if (row) {
    const index = stone?.address?.rowIndex;
    const rowName = labelOf(row);
    where = index === undefined ? t`Row ${rowName}` : t`Row ${rowName}, stone ${index + 1}`;
  } else if (stone?.legacyGrid) {
    const r = stone.legacyGrid.row + 1;
    const c = stone.legacyGrid.col + 1;
    where = t`v1 grid row ${r}, column ${c}`;
  }

  return (
    <>
      <Sheet
        open={stone !== undefined}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
        title={
          names[0] ?? (stone?.address?.plotLabel ? t`Plot ${stone.address.plotLabel}` : t`Stone`)
        }
        description={where || undefined}
      >
        {stone ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-medium">
              <StatusIcon status={stone.status} />
              {t(STATUS_LABEL[stone.status])}
            </p>
            {names.length > 1 ? (
              <ul className="list-inside list-disc">
                {names.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : null}
            <PhotoStrip monumentId={stone.id} />
            {stone.inscription?.text ? (
              <p className="whitespace-pre-line text-fg-muted">{stone.inscription.text}</p>
            ) : null}
            {stone.position ? null : (
              <p className="text-fg-muted">
                <Trans>Not placed on the map yet.</Trans>
              </p>
            )}
            {stone.position?.accuracyM !== undefined ? (
              <p className="text-fg-muted">
                <Trans>Position within about ±{Math.round(stone.position.accuracyM)} m</Trans>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="lg" onClick={() => setCamera(true)}>
                <Trans>Add photo</Trans>
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setHolding(true)}>
                <Trans>Hold still here (GPS)</Trans>
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
      {stone ? (
        <HoldStill
          open={holding}
          onOpenChange={setHolding}
          line={row?.line?.coordinates as [number, number][] | undefined}
          onUse={(position) => {
            setHolding(false);
            void placeStone(store, stone.id, position).then(() =>
              toast({
                title: t`Stone placed by GPS`,
                action: { label: t`Undo`, onAction: () => void store.undo() },
              }),
            );
          }}
        />
      ) : null}
      {stone ? (
        <Camera
          open={camera}
          onClose={() => setCamera(false)}
          title={where || t`Stone`}
          role={role}
          onRoleChange={setRole}
          onCapture={(blob, r) => {
            setCamera(false);
            void savePhoto(stone.id, blob, r);
          }}
        />
      ) : null}
    </>
  );
}
