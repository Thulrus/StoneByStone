import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import type { ID, Photo, PhotoRole } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';
import { Camera } from '../../capture/Camera';
import { ROLE_LABEL } from '../../capture/labels';
import { BlobImage } from '../../capture/PhotoStrip';
import { useSavePhoto } from '../../capture/useSavePhoto';

const ROLES: PhotoRole[] = ['front', 'back', 'detail', 'context', 'other'];

function PhotoRow({ photo }: { photo: Photo }) {
  const { t } = useLingui();
  const store = useStore();
  const blob = useLiveQuery(() => store.photos.thumb(photo.id), [store, photo.id]);
  const role = t(ROLE_LABEL[photo.role]);
  return (
    <li className="flex items-center gap-3">
      {blob ? (
        <BlobImage blob={blob} alt={t`${role} photo`} className="size-20 rounded-lg object-cover" />
      ) : (
        <span className="size-20 rounded-lg bg-surface-2" />
      )}
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm text-fg-muted">
          <Trans>Photo type</Trans>
        </span>
        <select
          className="min-h-12 rounded-lg bg-surface-2 px-3"
          value={photo.role}
          onChange={(e) =>
            void store.photos.update(photo.id, { role: e.currentTarget.value as PhotoRole })
          }
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE_LABEL[r])}
            </option>
          ))}
        </select>
      </label>
      <Button
        variant="ghost"
        aria-label={t`Delete ${role} photo`}
        onClick={() =>
          void store.photos.delete(photo.id).then(() =>
            toast({
              title: t`Photo deleted`,
              action: { label: t`Undo`, onAction: () => void store.undo() },
            }),
          )
        }
      >
        <Trans>Delete</Trans>
      </Button>
    </li>
  );
}

export function PhotosSection({ monumentId, title }: { monumentId: ID; title: string }) {
  const store = useStore();
  const photos = useLiveQuery(() => store.photos.byMonument(monumentId), [store, monumentId]);
  const [camera, setCamera] = useState(false);
  const [role, setRole] = useState<PhotoRole>('front');
  const savePhoto = useSavePhoto();
  return (
    <section aria-labelledby="stone-photos" className="flex flex-col gap-3">
      <h2 id="stone-photos" className="text-xl font-semibold">
        <Trans>Photos</Trans>
      </h2>
      <ul className="flex flex-col gap-3">
        {(photos ?? []).map((p) => (
          <PhotoRow key={p.id} photo={p} />
        ))}
      </ul>
      <Button variant="secondary" size="lg" onClick={() => setCamera(true)}>
        <Trans>Add photo</Trans>
      </Button>
      <Camera
        open={camera}
        onClose={() => setCamera(false)}
        title={title}
        role={role}
        onRoleChange={setRole}
        onCapture={(blob, r) => {
          setCamera(false);
          void savePhoto(monumentId, blob, r);
        }}
      />
    </section>
  );
}
