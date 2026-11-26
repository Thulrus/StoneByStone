import { Trans, useLingui } from '@lingui/react/macro';
import { Dialog as RadixDialog } from 'radix-ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefs } from '../../app/prefs';
import type { PhotoRole } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { haptic, takeStill } from './camera';
import { CAPTURE_ROLES, ROLE_LABEL } from './labels';
import { useCameraStream } from './useCameraStream';

export interface CameraProps {
  open: boolean;
  onClose: () => void;
  /** Called with the raw still; the caller runs the pipeline and saves it. */
  onCapture: (photo: Blob, role: PhotoRole) => void;
  role: PhotoRole;
  onRoleChange: (role: PhotoRole) => void;
  /** Shown at the top, e.g. "Row 4 · stone 12". */
  title: ReactNode;
  /** Extra buttons above the shutter (walk-a-row: Next stone, Gap, Skip). */
  actions?: ReactNode;
  /** Thumbnail of the last photo taken, as an object URL. */
  lastPhoto?: string | undefined;
}

/**
 * Full-screen in-app camera (plan §8): big shutter at thumb height, haptic confirm, photo
 * roles. Uses the phone's camera app through a file input when the in-app camera is
 * unavailable, or when the user prefers it.
 */
export function Camera(props: CameraProps) {
  const { open, onClose, onCapture, role, onRoleChange, title, actions, lastPhoto } = props;
  const { t } = useLingui();
  const systemCamera = usePrefs((s) => s.systemCamera);
  const setSystemCamera = usePrefs((s) => s.setSystemCamera);
  const state = useCameraStream(open && !systemCamera);
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const [taking, setTaking] = useState(false);

  const stream = state.kind === 'live' ? state.stream : undefined;
  useEffect(() => {
    const v = video.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    void v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [stream]);

  const fallback = systemCamera || state.kind === 'unavailable';

  const shoot = async () => {
    if (fallback) return file.current?.click();
    const v = video.current;
    if (!stream || !v || taking) return;
    setTaking(true);
    setFlash(true);
    haptic();
    try {
      onCapture(await takeStill(v, stream), role);
    } finally {
      setTaking(false);
      setTimeout(() => setFlash(false), 120);
    }
  };

  let notice: ReactNode = null;
  if (systemCamera) notice = <Trans>Using your phone's camera app.</Trans>;
  else if (state.kind === 'starting') notice = <Trans>Starting camera…</Trans>;
  else if (state.kind === 'unavailable')
    notice =
      state.reason === 'denied' ? (
        <Trans>Camera permission was refused. You can still use your phone's camera app.</Trans>
      ) : (
        <Trans>The in-app camera isn't available here. Use your phone's camera app.</Trans>
      );

  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-0 z-40 flex flex-col bg-black text-white',
            'pt-[env(safe-area-inset-top)] pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <RadixDialog.Close asChild>
              <Button variant="ghost" aria-label={t`Close camera`} className="text-white">
                <span aria-hidden="true">✕</span>
              </Button>
            </RadixDialog.Close>
            <RadixDialog.Title className="min-w-0 flex-1 truncate text-lg font-semibold">
              {title}
            </RadixDialog.Title>
            <Button
              variant="ghost"
              className="text-sm text-white"
              aria-pressed={systemCamera}
              onClick={() => setSystemCamera(!systemCamera)}
            >
              {systemCamera ? <Trans>In-app camera</Trans> : <Trans>Phone camera</Trans>}
            </Button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {fallback ? null : (
              <video
                ref={video}
                playsInline
                muted
                aria-label={t`Camera preview`}
                className="h-full w-full object-cover"
              />
            )}
            {notice ? (
              <p className="absolute inset-x-4 top-1/3 text-center text-lg" role="status">
                {notice}
              </p>
            ) : null}
            {flash ? <div aria-hidden="true" className="absolute inset-0 bg-white/70" /> : null}
          </div>

          <div
            role="radiogroup"
            aria-label={t`Photo type`}
            className="flex justify-center gap-2 overflow-x-auto px-3 py-2"
          >
            {CAPTURE_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={r === role}
                onClick={() => onRoleChange(r)}
                className={cn(
                  'min-h-10 rounded-full px-4 text-base',
                  r === role ? 'bg-white font-semibold text-black' : 'border border-white/60',
                )}
              >
                {t(ROLE_LABEL[r])}
              </button>
            ))}
          </div>

          {actions ? (
            <div className="flex flex-wrap justify-center gap-2 px-3 py-1">{actions}</div>
          ) : null}

          <div className="grid grid-cols-3 items-center px-6 pt-2">
            <span />
            <button
              type="button"
              onClick={() => void shoot()}
              disabled={taking || (!fallback && !stream)}
              aria-label={t`Take photo`}
              className={cn(
                'mx-auto size-20 rounded-full border-4 border-white bg-white/90',
                'active:scale-95 disabled:opacity-40',
              )}
            />
            <span className="justify-self-end">
              {lastPhoto ? (
                <img
                  src={lastPhoto}
                  alt={t`Last photo`}
                  className="size-14 rounded-lg border-2 border-white object-cover"
                />
              ) : null}
            </span>
          </div>

          <input
            ref={file}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="camera-file"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (f) {
                haptic();
                onCapture(f, role);
              }
            }}
          />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
