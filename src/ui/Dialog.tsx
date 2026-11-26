import { useLingui } from '@lingui/react/macro';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons for the footer, in reading order. */
  actions?: ReactNode;
  /** Visual placement: centered dialog, or a bottom sheet for mobile/thumb-zone use. */
  placement?: 'center' | 'bottom';
}

// Above the sticky bars and map controls (z-10), below toasts (z-50).
const overlay = 'fixed inset-0 z-40 bg-black/50 motion-safe:animate-[sbs-fade_150ms_ease-out]';

const panels = {
  center: cn(
    'fixed start-1/2 top-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
    'rtl:translate-x-1/2 rounded-xl max-h-[85dvh] overflow-y-auto',
  ),
  bottom: cn(
    'fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl',
    'pb-[max(1rem,env(safe-area-inset-bottom))]',
    'motion-safe:animate-[sbs-slide-up_200ms_ease-out]',
  ),
};

/** Shared modal built on Radix Dialog. Use {@link Sheet} for the bottom-sheet variant. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  placement = 'center',
}: DialogProps) {
  const { t } = useLingui();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlay} />
        <RadixDialog.Content
          className={cn('z-40 bg-surface text-fg sbs-border p-4 shadow-xl', panels[placement])}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          {placement === 'bottom' && (
            <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          )}
          <div className="flex items-start justify-between gap-2">
            <RadixDialog.Title className="text-xl font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <Button variant="ghost" aria-label={t`Close`} className="-me-2 -mt-2">
                <span aria-hidden="true">✕</span>
              </Button>
            </RadixDialog.Close>
          </div>
          {description && (
            <RadixDialog.Description className="mt-1 text-fg-muted">
              {description}
            </RadixDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {actions && <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
