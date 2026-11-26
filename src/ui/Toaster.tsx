import { useLingui } from '@lingui/react/macro';
import { Toast } from 'radix-ui';
import { useRef, type MouseEvent } from 'react';
import { Button } from './Button';
import { cn } from './cn';
import { useToasts } from './toast-store';

/** Renders queued toasts. Mount once near the app root. */
export function Toaster() {
  const { t } = useLingui();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const viewport = useRef<HTMLOListElement>(null);

  // Radix keeps focus in the toast list after a button closes a toast, and pauses every toast
  // while it has focus, so the next one would never leave. After a tap (not a key press, so
  // keyboard users keep their place), let focus go.
  const releaseFocus = (e: MouseEvent) => {
    if (e.detail === 0) return;
    requestAnimationFrame(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && viewport.current?.contains(el)) el.blur();
      if (document.activeElement === viewport.current) viewport.current?.blur();
    });
  };

  return (
    <Toast.Provider swipeDirection="down" label={t`Notifications`}>
      {toasts.map((item) => (
        <Toast.Root
          key={item.id}
          type={item.tone === 'error' ? 'foreground' : 'background'}
          duration={item.duration ?? (item.action ? 8000 : 4000)}
          onOpenChange={(open) => !open && dismiss(item.id)}
          className={cn(
            'flex items-center gap-3 rounded-xl bg-surface p-3 text-fg shadow-lg sbs-border',
            item.tone === 'error' && 'border-danger',
            'motion-safe:animate-[sbs-slide-up_200ms_ease-out]',
          )}
        >
          <div className="min-w-0 flex-1">
            <Toast.Title className="font-semibold">{item.title}</Toast.Title>
            {item.description && (
              <Toast.Description className="text-sm text-fg-muted">
                {item.description}
              </Toast.Description>
            )}
          </div>
          {item.action && (
            <Toast.Action altText={item.action.label} asChild>
              <Button
                variant="secondary"
                onClick={(e) => {
                  item.action?.onAction();
                  releaseFocus(e);
                }}
              >
                {item.action.label}
              </Button>
            </Toast.Action>
          )}
          <Toast.Close asChild>
            <Button variant="ghost" aria-label={t`Dismiss`} onClick={releaseFocus}>
              <span aria-hidden="true">✕</span>
            </Button>
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport
        ref={viewport}
        className={cn(
          'fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[min(32rem,calc(100vw-1rem))] flex-col gap-2',
          'md:bottom-4 outline-none',
        )}
      />
    </Toast.Provider>
  );
}
