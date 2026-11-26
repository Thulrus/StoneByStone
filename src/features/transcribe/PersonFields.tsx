import { useLingui } from '@lingui/react/macro';
import type { Ref } from 'react';
import type { PersonDraft } from '../../data/transcribe';
import type { ID } from '../../domain';
import { Button } from '../../ui/Button';
import { RelationsList } from '../people/RelationsList';
import { readPerson } from './date-preview';
import { Input } from './Input';
import { NameInput } from './NameInput';

export interface PersonFieldsProps {
  person: PersonDraft;
  n: number;
  onChange: (p: PersonDraft) => void;
  onRemove: () => void;
  onLink: () => void;
  whereOf: (monumentId: ID | undefined) => string;
  /** Name autocomplete. */
  suggestNames?: (typed: string) => string[];
  /** Cemetery setting that orders numeric dates. */
  dateLocale: string;
  nameRef?: Ref<HTMLInputElement>;
}

/** One person on the stone, as carved (plan §9). Enter in any field is Save & next. */
export function PersonFields(props: PersonFieldsProps) {
  const { person, n, onChange, onRemove, onLink, whereOf, nameRef, dateLocale, suggestNames } =
    props;
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
      <NameInput
        inputRef={nameRef}
        label={t`Name, as carved`}
        value={person.name}
        onChange={(name) => onChange({ ...person, name })}
        suggest={suggestNames}
      />
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
