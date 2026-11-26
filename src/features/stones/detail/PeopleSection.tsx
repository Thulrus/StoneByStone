import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { removePerson } from '../../../data/people';
import { parseName, type ID, type Monument, type Person } from '../../../domain';
import { Button } from '../../../ui/Button';
import { RelationsList } from '../../people/RelationsList';

type WhereOf = (monumentId: ID | undefined) => string;

function PersonRow({ person, n, whereOf }: { person: Person; n: number; whereOf: WhereOf }) {
  const { t } = useLingui();
  const store = useStore();
  const saved = person.name.asCarved ?? '';
  const [draft, setDraft] = useState<string>();
  const save = (text: string) => {
    setDraft(undefined);
    if (text.trim() !== saved) void store.persons.update(person.id, { name: parseName(text) });
  };
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-medium">
            <Trans>Person {n}</Trans>
          </span>
          <input
            className="min-h-12 rounded-lg bg-surface-2 px-3 text-lg"
            value={draft ?? saved}
            placeholder={t`Name as carved`}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={(e) => save(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </label>
        <Button
          variant="ghost"
          aria-label={t`Remove person ${n}`}
          onClick={() => void removePerson(store, person.id)}
        >
          <Trans>Remove</Trans>
        </Button>
      </div>
      {person.relationshipText ? <p className="text-fg-muted">{person.relationshipText}</p> : null}
      <RelationsList personId={person.id} whereOf={whereOf} />
    </li>
  );
}

/** Names on the stone and their links; dates and the rest are edited in desk mode. */
export function PeopleSection({ stone, whereOf }: { stone: Monument; whereOf: WhereOf }) {
  const store = useStore();
  const people = useLiveQuery(() => store.persons.byMonument(stone.id), [store, stone.id]);
  return (
    <section aria-labelledby="stone-people" className="flex flex-col gap-3">
      <h2 id="stone-people" className="text-xl font-semibold">
        <Trans>People</Trans>
      </h2>
      <ul className="flex flex-col gap-3">
        {(people ?? []).map((p, i) => (
          <PersonRow key={p.id} person={p} n={i + 1} whereOf={whereOf} />
        ))}
      </ul>
      <Button
        variant="secondary"
        onClick={() =>
          void store.persons.create({
            cemeteryId: stone.cemeteryId,
            monumentId: stone.id,
            name: {},
            sources: [{ kind: 'stone' }],
          })
        }
      >
        <Trans>Add person</Trans>
      </Button>
    </section>
  );
}
