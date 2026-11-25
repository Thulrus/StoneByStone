import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}

/**
 * A toggle chip for quick attributes. Selection is shown by a check mark and border weight
 * as well as color, so color is never the only indicator (plan §17).
 */
export function Chip({ selected, onSelectedChange, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelectedChange(!selected)}
      className={cn(
        'inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-base',
        selected ? 'bg-primary text-primary-fg font-semibold' : 'bg-surface text-fg sbs-border',
        className,
      )}
      {...rest}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}
