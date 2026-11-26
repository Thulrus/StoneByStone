import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { cemeteryProgress, listCemeteries, transcribedShare } from '../../data/cemeteries';
import type { Cemetery } from '../../domain';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { toast } from '../../ui/toast-store';
import { ProgressRing } from './ProgressRing';

function CemeteryCard({ cemetery, onDelete }: { cemetery: Cemetery; onDelete: () => void }) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const progress = useLiveQuery(() => cemeteryProgress(store, cemetery.id), [store, cemetery.id]);
  const share = progress ? transcribedShare(progress) : 0;
  const pct = new Intl.NumberFormat(i18n.locale, { style: 'percent' }).format(share);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface p-3 sbs-border">
      <ProgressRing value={share} label={t`${pct} transcribed`} />
      <Link
        to={cemeteryPath(cemetery.id)}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center"
      >
        <span className="truncate text-lg font-semibold">{cemetery.name}</span>
        <span className="text-sm text-fg-muted">
          {progress && (
            <>
              <Plural value={progress.total} one="# stone" other="# stones" />
              {' · '}
              <Trans>{pct} transcribed</Trans>
            </>
          )}
        </span>
      </Link>
      <Button variant="ghost" aria-label={t`Delete ${cemetery.name}`} onClick={onDelete}>
        <span aria-hidden="true">🗑</span>
      </Button>
    </li>
  );
}

/** The cemeteries on this device (plan §6 Home). */
export function CemeteryList() {
  const { t } = useLingui();
  const store = useStore();
  const cemeteries = useLiveQuery(() => listCemeteries(store), [store]);
  const [deleting, setDeleting] = useState<Cemetery>();

  const confirmDelete = async () => {
    if (!deleting) return;
    const { id, name } = deleting;
    setDeleting(undefined);
    await store.cemeteries.delete(id);
    toast({
      title: t`Deleted ${name}`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  if (!cemeteries) return null;
  if (cemeteries.length === 0) {
    return (
      <p className="text-fg-muted">
        <Trans>No cemeteries on this device yet. Create one, or import a file.</Trans>
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3" aria-label={t`Cemeteries on this device`}>
        {cemeteries.map((c) => (
          <CemeteryCard key={c.id} cemetery={c} onDelete={() => setDeleting(c)} />
        ))}
      </ul>
      <Dialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t`Delete ${deleting?.name ?? ''}?`}
        description={t`It disappears from this list. Its records stay on the device and in any backups, and you can undo right away.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(undefined)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              <Trans>Delete</Trans>
            </Button>
          </>
        }
      />
    </>
  );
}
