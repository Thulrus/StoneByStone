import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { cemeteryPhotoHashes, importPhotoStones } from '../../data/photo-import';
import { preparePhoto } from '../../data/photos';
import { planPhotoStones, type Cemetery } from '../../domain';
import { Button } from '../../ui/Button';
import { RadioGroup } from '../../ui/RadioGroup';
import { toast } from '../../ui/toast-store';
import type { Layout } from '../cemeteries/useLayout';
import { photoFields } from '../capture/useSavePhoto';
import { useReadPhotos } from './useReadPhotos';

type Grouping = '0' | '10' | '30';

/**
 * Bulk photo import (plan §20.3) for people who photographed a cemetery with an ordinary
 * camera app: photos become stones in EXIF time order, placed by EXIF GPS, optionally into a
 * row. Shots taken moments apart can be one stone. One undo step.
 */
export function PhotoImportView({ cemetery, layout }: { cemetery: Cemetery; layout: Layout }) {
  const { t } = useLingui();
  const store = useStore();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const { state, read, reset } = useReadPhotos(cemetery.id);
  const [grouping, setGrouping] = useState<Grouping>('0');
  const [rowId, setRowId] = useState('');
  const [busy, setBusy] = useState(false);
  const existing = useLiveQuery(
    () => cemeteryPhotoHashes(store, cemetery.id),
    [store, cemetery.id],
  );

  const plan = useMemo(
    () =>
      planPhotoStones(state.shots, {
        groupSeconds: Number(grouping),
        existing: existing ?? new Set(),
      }),
    [state.shots, grouping, existing],
  );
  const withTime = state.shots.filter((s) => s.takenAt).length;
  const withGps = state.shots.filter((s) => s.gps).length;
  const stoneCount = plan.stones.length;
  const read_ = state.shots.length;

  const doImport = async () => {
    setBusy(true);
    try {
      const prepared = [];
      for (const group of plan.stones) {
        prepared.push(
          await Promise.all(
            group.map((s) =>
              preparePhoto(store, {
                monumentId: '',
                ...photoFields(s.processed, 'front', new Date(s.file.lastModified)),
              }),
            ),
          ),
        );
      }
      const made = await importPhotoStones(store, cemetery.id, prepared, {
        label: t`Import photos`,
        ...(rowId ? { rowId } : {}),
      });
      const n = made.length;
      toast({
        title: t`${n} stones added from photos`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
      reset();
      void navigate(cemeteryPath(cemetery.id));
    } catch (e) {
      toast({ tone: 'error', title: t`Import failed`, description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">
          <Trans>Import photos</Trans>
        </h1>
        <p className="max-w-prose text-fg-muted">
          <Trans>
            Took photos with your phone's own camera? Each becomes a stone, in the order they were
            taken, placed where the photo's location says. Nothing is added until you press Import.
          </Trans>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          data-testid="photo-import-input"
          onChange={(e) => {
            void read(Array.from(e.currentTarget.files ?? []));
            e.currentTarget.value = '';
          }}
        />
        <Button
          variant={state.total ? 'secondary' : 'primary'}
          disabled={state.reading || busy}
          onClick={() => input.current?.click()}
        >
          {state.total ? <Trans>Choose other photos</Trans> : <Trans>Choose photos</Trans>}
        </Button>
        {state.reading ? (
          <p role="status">
            <Trans>
              Reading photo {state.done} of {state.total}…
            </Trans>
          </p>
        ) : null}
      </div>

      {state.total > 0 && !state.reading ? (
        <section aria-labelledby="photo-plan" className="flex flex-col gap-4">
          <h2 id="photo-plan" className="text-xl font-semibold">
            <Plural value={stoneCount} one="# stone to add" other="# stones to add" />
          </h2>
          <ul className="flex flex-col gap-1 text-fg-muted">
            <li>
              <Plural value={read_} one="# photo read" other="# photos read" />:{' '}
              <Trans>
                {withTime} with the time taken, {withGps} with a location
              </Trans>
            </li>
            {plan.duplicates.length > 0 ? (
              <li>
                <Plural
                  value={plan.duplicates.length}
                  one="# is already in this cemetery and is skipped"
                  other="# are already in this cemetery and are skipped"
                />
              </li>
            ) : null}
            {state.failed.length > 0 ? (
              <li>
                <Trans>Couldn't read: {state.failed.join(', ')}</Trans>
              </li>
            ) : null}
            {withTime < read_ ? (
              <li>
                <Trans>Photos with no time taken go last, in file-name order.</Trans>
              </li>
            ) : null}
          </ul>
          <RadioGroup<Grouping>
            legend={t`Several photos of one stone?`}
            name="grouping"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: '0', label: t`No: every photo is a different stone` },
              { value: '10', label: t`Photos taken within 10 seconds are one stone` },
              { value: '30', label: t`Photos taken within 30 seconds are one stone` },
            ]}
          />
          <label className="flex max-w-md flex-col gap-1">
            <span className="text-sm font-medium">
              <Trans>Put the stones in a row</Trans>
            </span>
            <select
              className="min-h-12 rounded-lg bg-surface-2 px-3"
              value={rowId}
              onChange={(e) => setRowId(e.currentTarget.value)}
            >
              <option value="">{t`No row: place them by location only`}</option>
              {layout.rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {t`Row ${layout.labelOf(r)}`}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={busy || stoneCount === 0} onClick={() => void doImport()}>
              <Plural value={stoneCount} one="Import # stone" other="Import # stones" />
            </Button>
            {busy ? (
              <p role="status">
                <Trans>Importing…</Trans>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
