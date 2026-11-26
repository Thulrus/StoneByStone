import { useId, type InputHTMLAttributes, type Ref } from 'react';
import type { Reading } from './date-preview';

/** A desk-form text input; `reading` shows how a date or age was read (plan §10.1). */
export function Input({
  label,
  kind = 'text',
  reading,
  ...rest
}: {
  label: string;
  kind?: 'text' | 'date';
  reading?: Reading;
} & InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLInputElement>;
  }) {
  const id = useId();
  const hint = useId();
  const hintId = reading ? hint : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        data-kind={kind}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={hintId}
        className="min-h-12 rounded-lg bg-surface px-3 text-base text-fg sbs-border"
        {...rest}
      />
      {reading ? (
        <div id={hintId} className="text-sm" data-testid="date-reading">
          <p className="text-fg-muted">{reading.text}</p>
          {reading.warning ? <p className="font-medium text-danger">{reading.warning}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
