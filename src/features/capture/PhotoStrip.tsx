import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { useStore } from '../../app/store-context';
import type { ID, Photo } from '../../domain';
import { ROLE_LABEL } from './labels';

/** An `<img>` showing a stored blob; the object URL lives only as long as the element. */
export function BlobImage({ blob, ...rest }: { blob: Blob } & ImgHTMLAttributes<HTMLImageElement>) {
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current;
    if (!el) return;
    const url = URL.createObjectURL(blob);
    el.src = url;
    return () => {
      el.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return <img ref={img} {...rest} />;
}

function Thumb({ photo }: { photo: Photo }) {
  const { t } = useLingui();
  const store = useStore();
  const blob = useLiveQuery(() => store.photos.thumb(photo.id), [store, photo.id]);
  const role = t(ROLE_LABEL[photo.role]);
  return (
    <li className="flex shrink-0 flex-col items-center gap-1">
      {blob ? (
        <BlobImage
          blob={blob}
          alt={t`${role} photo`}
          className="h-24 w-auto rounded-lg sbs-border"
        />
      ) : (
        <div className="h-24 w-18 rounded-lg bg-border" />
      )}
      <span className="text-sm text-fg-muted">{role}</span>
    </li>
  );
}

/** Thumbnails of a stone's photos, in display order. */
export function PhotoStrip({ monumentId }: { monumentId: ID }) {
  const store = useStore();
  const photos = useLiveQuery(() => store.photos.byMonument(monumentId), [store, monumentId]);
  if (!photos?.length) return null;
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((p) => (
        <Thumb key={p.id} photo={p} />
      ))}
    </ul>
  );
}
