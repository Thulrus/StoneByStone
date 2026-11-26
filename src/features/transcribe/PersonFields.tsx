import { useLingui } from '@lingui/react/macro';
import { useId, type InputHTMLAttributes, type Ref } from 'react';
import type { PersonDraft } from '../../data/transcribe';

function Input({
  label,
  kind = 'text',
  ...rest
}: { label: string; kind?: 'text' | 'date' } & InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLInputElement>;
  }) {
  const id = useId();
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
        className="min-h-12 rounded-lg bg-surface px-3 text-base text-fg sbs-border"
        {...rest}
      />
    </div>
  );
}

export interface PersonFieldsProps {
  person: PersonDraft;
  n: number;
  onChange: (p: PersonDraft) => void;
  nameRef?: Ref<HTMLInputElement>;
}

/** One person on the stone, as carved (plan §9). Enter in any field is Save & next. */
export function PersonFields({ person, n, onChange, nameRef }: PersonFieldsProps) {
  const { t } = useLingui();
  const field = (k: keyof Omit<PersonDraft, 'id'>) => ({
    value: person[k],
    onChange: (e: { currentTarget: { value: string } }) =>
      onChange({ ...person, [k]: e.currentTarget.value }),
  });
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg p-3 sbs-border">
      <legend className="px-1 font-medium">{t`Person ${n}`}</legend>
      <Input ref={nameRef} label={t`Name, as carved`} {...field('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t`Born`} kind="date" {...field('born')} />
        <Input label={t`Died`} kind="date" {...field('died')} />
        <Input label={t`Age`} kind="date" {...field('age')} />
        <Input label={t`Relationship`} placeholder={t`wife of John`} {...field('relationship')} />
      </div>
    </fieldset>
  );
}
