import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import { linkPeople } from '../../data/people';
import { parseCarvedRelation, type ID, type Person, type PersonRelationType } from '../../domain';
import { Field } from '../../ui/Field';
import { RadioGroup } from '../../ui/RadioGroup';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/toast-store';
import { linkCandidates, personLabel } from './candidates';
import { RELATION_LABEL, RELATION_TYPES } from './relation-labels';

export interface LinkPersonDialogProps {
  person: Person;
  /** "Row 1, stone 3" for a person's stone. */
  whereOf: (monumentId: ID | undefined) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Link a person to someone on this or another stone (plan §10.3). The relation and the order
 * of suggestions come from the carved phrase ("son of John & Mary" → parent, John, Mary).
 */
export function LinkPersonDialog({ person, whereOf, open, onOpenChange }: LinkPersonDialogProps) {
  const { t } = useLingui();
  const store = useStore();
  const [type, setType] = useState<PersonRelationType>(
    () => parseCarvedRelation(person.relationshipText ?? '').type ?? 'spouse',
  );
  const [query, setQuery] = useState('');
  const people = useLiveQuery(
    () => (open ? store.persons.listByCemetery(person.cemeteryId) : Promise.resolve([])),
    [store, person.cemeteryId, open],
  );
  const shown = linkCandidates(person, people ?? [], query).slice(0, 20);

  const link = async (other: Person) => {
    await linkPeople(store, person.id, other.id, type);
    onOpenChange(false);
    const name = personLabel(other);
    const rel = t(RELATION_LABEL[type]);
    toast({
      title: t`Linked: ${rel} ${name}`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  const who = personLabel(person) || t`this person`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t`Link ${who} to…`}>
      <div className="flex flex-col gap-4">
        <RadioGroup
          legend={t`The other person is their`}
          name="relation-type"
          value={type}
          onChange={setType}
          options={RELATION_TYPES.map((r) => ({ value: r, label: t(RELATION_LABEL[r]) }))}
        />
        <Field
          label={t`Find by name`}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        {shown.length === 0 ? (
          <p className="text-fg-muted">
            <Trans>No one else to link to yet.</Trans>
          </p>
        ) : (
          <ul aria-label={t`People`} className="flex flex-col gap-1">
            {shown.map(({ person: p }) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void link(p)}
                  className="flex min-h-12 w-full flex-col items-start rounded-lg bg-surface-2 px-3 py-2 text-start"
                >
                  <span className="font-medium">{personLabel(p) || t`(no name yet)`}</span>
                  <span className="text-sm text-fg-muted">{whereOf(p.monumentId)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
