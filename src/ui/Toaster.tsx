import { useLingui } from '@lingui/react/macro';
import { Toast } from 'radix-ui';
import { Button } from './Button';
import { cn } from './cn';
import { useToasts } from './toast-store';

/** Renders queued toasts. Mount once near the app root. */
export function Toaster() {
  const { t } = useLingui();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

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
              <Button variant="secondary" onClick={item.action.onAction}>
                {item.action.label}
              </Button>
            </Toast.Action>
          )}
          <Toast.Close asChild>
            <Button variant="ghost" aria-label={t`Dismiss`}>
              <span aria-hidden="true">✕</span>
            </Button>
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport
        className={cn(
          'fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[min(32rem,calc(100vw-1rem))] flex-col gap-2',
          'md:bottom-4 outline-none',
        )}
      />
    </Toast.Provider>
  );
}
