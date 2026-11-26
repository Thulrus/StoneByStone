import { useLingui } from '@lingui/react/macro';
import { useId, type InputHTMLAttributes, type Ref } from 'react';
import type { PersonDraft } from '../../data/transcribe';
import type { ID } from '../../domain';
import { Button } from '../../ui/Button';
import { RelationsList } from '../people/RelationsList';
import { readPerson, type Reading } from './date-preview';

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

export interface PersonFieldsProps {
  person: PersonDraft;
  n: number;
  onChange: (p: PersonDraft) => void;
  onRemove: () => void;
  onLink: () => void;
  whereOf: (monumentId: ID | undefined) => string;
  /** Cemetery setting that orders numeric dates. */
  dateLocale: string;
  nameRef?: Ref<HTMLInputElement>;
}

/** One person on the stone, as carved (plan §9). Enter in any field is Save & next. */
export function PersonFields(props: PersonFieldsProps) {
  const { person, n, onChange, onRemove, onLink, whereOf, nameRef, dateLocale } = props;
  const { t, i18n } = useLingui();
  const read = readPerson(i18n, person, dateLocale);
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
        <Input label={t`Born`} kind="date" reading={read.born} {...field('born')} />
        <Input label={t`Died`} kind="date" reading={read.died} {...field('died')} />
        <Input label={t`Age`} kind="date" reading={read.age} {...field('age')} />
        <Input label={t`Relationship`} placeholder={t`wife of John`} {...field('relationship')} />
      </div>
      <RelationsList personId={person.id} whereOf={whereOf} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onLink}>
          {t`Link to a person…`}
        </Button>
        <Button variant="ghost" onClick={onRemove}>
          {t`Remove person ${n}`}
        </Button>
      </div>
    </fieldset>
  );
}
