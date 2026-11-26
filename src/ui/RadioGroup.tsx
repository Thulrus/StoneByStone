import type { ReactNode } from 'react';

export interface RadioGroupProps<T extends string> {
  legend: ReactNode;
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
}

/** A fieldset of large, thumb-sized radio rows. */
export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-surface-2"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="size-5 accent-primary"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
