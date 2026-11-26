import { useLingui } from '@lingui/react/macro';
import type { Monument } from '../../domain';
import { cn } from '../../ui/cn';
import { STATUS_LABEL } from '../stones/labels';
import { StatusIcon } from '../stones/StatusIcon';

export interface StoneButtonProps {
  stone: Monument;
  /** Where the stone is, for screen readers ("Row 3, stone 2"). */
  place: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

/** One stone in the schematic: a 48 px target with the status shape (plan §17). */
export function StoneButton({ stone, place, selected, onSelect }: StoneButtonProps) {
  const { t } = useLingui();
  const status = t(STATUS_LABEL[stone.status]);
  return (
    <button
      type="button"
      aria-label={`${place}: ${status}`}
      aria-pressed={selected}
      title={stone.address?.plotLabel}
      onClick={() => onSelect(stone.id)}
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-md bg-surface',
        selected ? 'ring-4 ring-[#f5c542]' : 'sbs-border',
      )}
    >
      <StatusIcon status={stone.status} size={24} />
    </button>
  );
}

/** An empty position in a row (a skipped index). */
export function GapSlot() {
  const { t } = useLingui();
  return (
    <span
      role="img"
      aria-label={t`Gap`}
      className="size-12 shrink-0 rounded-md border-2 border-dashed border-border"
    />
  );
}
