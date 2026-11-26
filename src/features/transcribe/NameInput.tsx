import { useId, useMemo, useState, type KeyboardEvent, type Ref } from 'react';
import { cn } from '../../ui/cn';
import { Input } from './Input';

export interface NameInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Names to offer for what's typed (plan §9). */
  suggest?: (typed: string) => string[];
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * The name field with autocomplete. Arrow keys pick a suggestion and Enter takes it; with
 * nothing picked, Enter is still Save & next. Escape closes the list.
 */
export function NameInput({ label, value, onChange, suggest, inputRef }: NameInputProps) {
  const listId = useId();
  const optionId = (i: number) => listId + String(i);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => (open && suggest ? suggest(value) : []), [open, suggest, value]);
  const shown = options.length > 0;

  const take = (name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!shown) {
        setOpen(true);
        return;
      }
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => ((a + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (e.key === 'Enter' && shown && active >= 0) {
      e.preventDefault();
      e.stopPropagation();
      take(options[active] ?? value);
    } else if (e.key === 'Escape' && shown) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        label={label}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-activedescendant={shown && active >= 0 ? optionId(active) : undefined}
        onChange={(e) => {
          onChange(e.currentTarget.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
      />
      {shown ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg bg-surface shadow-lg sbs-border"
        >
          {options.map((name, i) => (
            <li
              key={name}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={cn('cursor-pointer px-3 py-2', i === active && 'bg-surface-2 font-medium')}
              onMouseDown={(e) => {
                e.preventDefault();
                take(name);
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
